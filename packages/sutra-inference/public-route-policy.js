// Node-only hosted egress admission candidate. No network primitive or credentials.
// A trusted resolver must supply every address. A future transport MUST connect
// directly to the admitted IP, retain the original TLS hostname and enforce
// certificate/remote-address checks; this module does not authorize a relay.
import {isIP,BlockList} from 'node:net';
const ID=/^[a-z][a-z0-9-]{0,31}$/,MODEL=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const fail=code=>{const e=new Error('Public route refused ('+code+').');e.code=code;throw e;};
const closed=(x,ks)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===ks.length&&ks.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>i).every(i=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');});
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const denied4=new BlockList();
for(const [ip,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]])denied4.addSubnet(ip,prefix,'ipv4');
const global6=new BlockList(),denied6=new BlockList();global6.addSubnet('2000::',3,'ipv6');
// Conservative IPv6 subset. Reject all transition, documentation and
// protocol-assignment ranges below; this is not an Internet routability proof.
for(const [ip,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])denied6.addSubnet(ip,prefix,'ipv6');
export function publicAddress(address){
 if(typeof address!=='string'||address.length>45||address.includes('%'))return false;
 const family=isIP(address);
 if(family===4)return !denied4.check(address,'ipv4');
 if(family===6)return global6.check(address,'ipv6')&&!denied6.check(address,'ipv6');
 return false;
}
function parseEndpoint(endpoint){
 let u;try{u=new URL(endpoint);}catch{fail('ENDPOINT');}
 if(typeof endpoint!=='string'||endpoint.length>2048||u.href!==endpoint||u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||!/^\/[A-Za-z0-9._/-]+$/.test(u.pathname)||u.pathname.includes('//')||u.pathname.split('/').some(x=>x==='.'||x==='..'))fail('ENDPOINT');
 const host=u.hostname,labels=host.split('.');
 if(host.length>253||labels.length<2||isIP(host)||labels.some(x=>!(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))||!/[a-z]/.test(labels.at(-1))||/(?:^|\.)(localhost|local|internal|lan|home|onion|test|invalid|example|arpa)$/.test(host))fail('ENDPOINT');
 return Object.freeze({endpoint,hostname:host,path:u.pathname,port:443});
}
export function admitPublicRoutes(routes){
 if(!Array.isArray(routes)||routes.length<1||routes.length>8||!dense(routes))fail('CONFIG');
 const approved=new Map();
 for(const r of routes){
  if(!closed(r,['connectionId','protocol','endpoint','models'])||typeof r.connectionId!=='string'||!ID.test(r.connectionId)||approved.has(r.connectionId)||typeof r.protocol!=='string'||!ID.test(r.protocol)||!Array.isArray(r.models)||r.models.length<1||r.models.length>16||!dense(r.models)||r.models.some(x=>typeof x!=='string'||!MODEL.test(x))||new Set(r.models).size!==r.models.length)fail('ROUTE');
  approved.set(r.connectionId,Object.freeze({...parseEndpoint(r.endpoint),connectionId:r.connectionId,protocol:r.protocol,models:Object.freeze([...r.models])}));
 }
 return approved;
}
function checkAnswers(raw){
 if(!Array.isArray(raw)||raw.length<1||raw.length>16||!dense(raw))fail('DNS_ANSWERS');
 const seen=new Set(),out=[];
 for(const row of raw){
  if(!closed(row,['address','family'])||!integer(row.family,4,6)||row.family===5||isIP(row.address)!==row.family||!publicAddress(row.address))fail('DNS_ADDRESS');
  if(!seen.has(row.address)){seen.add(row.address);out.push(Object.freeze({address:row.address,family:row.family}));}
 }
 // Fixed selection: never retry a failed address automatically.
 return Object.freeze(out.sort((a,b)=>a.family-b.family||(a.address<b.address?-1:a.address>b.address?1:0)));
}
export function createPublicRoutePolicy({routes,resolveAll,clock=()=>Math.floor(performance.now()),ttlMs=5000}={}){
 const approved=admitPublicRoutes(routes);
 if(typeof resolveAll!=='function'||typeof clock!=='function'||!integer(ttlMs,1,10000))fail('CONFIG');
 const leases=new WeakMap();let last=-1,closedHost=false;
 const now=()=>{const t=clock();if(!integer(t,0,Number.MAX_SAFE_INTEGER-ttlMs)||t<last)fail('CLOCK');last=t;return t;};
 function match(input){
  if(!closed(input,['connectionId','protocol','endpoint','model']))fail('REQUEST');
  const r=approved.get(input.connectionId);
  if(!r||r.protocol!==input.protocol||r.endpoint!==input.endpoint||!r.models.includes(input.model))fail('ROUTE');
  return r;
 }
 return Object.freeze({
  mode:'hosted-public-route-policy-only',
  async prepare(input){
   if(closedHost)fail('CLOSED');
   const r=match(input),model=input.model,start=now();
   let answers;
   try{answers=checkAnswers(await resolveAll(r.hostname));}catch(e){if(e?.code==='DNS_ANSWERS'||e?.code==='DNS_ADDRESS')throw e;fail('DNS');}
   if(closedHost)fail('CLOSED');
   const end=now();if(end-start>=ttlMs)fail('EXPIRED');
   const selected=answers[0];
   // Opaque identity: no deserialized or copied lease is accepted.
   const lease=Object.freeze({kind:'sutra-public-route-lease/v1'});
   leases.set(lease,Object.freeze({route:r,model,selected,expiresAt:start+ttlMs}));
   return lease;
  },
  consume(lease,input){
   if(closedHost)fail('CLOSED');
   const saved=leases.get(lease);if(!saved)fail('LEASE');
   leases.delete(lease); // even a wrong route consumes the grant
   const r=match(input);
   if(r!==saved.route||input.model!==saved.model)fail('ROUTE');
   if(now()>=saved.expiresAt)fail('EXPIRED');
   return Object.freeze({connectionId:r.connectionId,protocol:r.protocol,endpoint:r.endpoint,model:saved.model,hostname:r.hostname,servername:r.hostname,path:r.path,port:443,address:saved.selected.address,family:saved.selected.family,expiresAt:saved.expiresAt,redirects:'deny',dns:'pinned-address-only',tls:'verify-original-hostname-and-peer-address',authority:'HOST_TRANSPORT_REQUIRED'});
  },
  close(){closedHost=true;}
 });
}
