// Shared syntax-only source plan admission. The Node transport independently
// validates DNS answers, public IP ranges, TLS hostname and exact peer.
const fail=code=>{const e=Error('Public source plan refused ('+code+').');e.code=code;throw e;};
const keys=(v,ks)=>v&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v))&&Reflect.ownKeys(v).length===ks.length&&ks.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable&&Object.hasOwn(d,'value');});
function endpoint(url){
 let u;try{u=new URL(url);}catch{fail('ENDPOINT');}
 const host=u.hostname,labels=host.split('.');
 if(typeof url!=='string'||url.length>1024||u.href!==url||u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||!/^\/[A-Za-z0-9._/-]+$/.test(u.pathname)||u.pathname.includes('//')||u.pathname.split('/').some(x=>x==='.'||x==='..')||host.length>253||labels.length<2||labels.some(x=>!(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))||!/[a-z]/.test(labels.at(-1))||/(?:^|\.)(localhost|local|internal|lan|home|onion|test|invalid|example|arpa)$/.test(host))fail('ENDPOINT');
}
export function admitPublicSourcePlan(sources){
 if(!Array.isArray(sources)||Object.getPrototypeOf(sources)!==Array.prototype||sources.length<1||sources.length>4||Reflect.ownKeys(sources).length!==sources.length+1)fail('SOURCE_CONFIG');
 const routes=[],ids=new Set(),urls=new Set();
 for(let i=0;i<sources.length;i++){
  const d=Object.getOwnPropertyDescriptor(sources,String(i)),s=d?.value;
  if(!d?.enumerable||!keys(s,['id','url','mediaType','maxBytes'])||typeof s.id!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(s.id)||s.id==='question'||ids.has(s.id)||typeof s.url!=='string'||urls.has(s.url)||!['text/plain','text/csv','application/json'].includes(s.mediaType)||!Number.isSafeInteger(s.maxBytes)||s.maxBytes<1||s.maxBytes>16384)fail('SOURCE_CONFIG');
  endpoint(s.url);ids.add(s.id);urls.add(s.url);routes.push(Object.freeze({...s}));
 }
 return Object.freeze(routes);
}
