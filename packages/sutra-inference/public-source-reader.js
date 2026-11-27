// Node-only public source capability: exact static document URLs, no credentials,
// cookies, prompt/query injection, redirects, browser relay or arbitrary tools.
import {lookup} from 'node:dns/promises';
import {connect} from 'node:tls';
import {request} from 'node:https';
import {createPublicRoutePolicy,admitPublicRoutes} from './public-route-policy.js';
import {startPinnedSourceRead} from './pinned-https-socket.js';
const fail=code=>{const e=Error('Public source read refused ('+code+').');e.code=code;throw e;};
const keys=(v,ks)=>v&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v))&&Reflect.ownKeys(v).length===ks.length&&ks.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable&&Object.hasOwn(d,'value');});
export function admitSourceRoutes(sources){
 if(!Array.isArray(sources)||sources.length<1||sources.length>4||Reflect.ownKeys(sources).length!==sources.length+1)fail('SOURCE_CONFIG');
 const routes=[],ids=new Set(),urls=new Set();
 for(let i=0;i<sources.length;i++){
  const d=Object.getOwnPropertyDescriptor(sources,String(i)),s=d?.value;
  if(!d?.enumerable||!keys(s,['id','url','mediaType','maxBytes'])||typeof s.id!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(s.id)||ids.has(s.id)||typeof s.url!=='string'||s.url.length>1024||urls.has(s.url)||!['text/plain','text/csv','application/json'].includes(s.mediaType)||!Number.isSafeInteger(s.maxBytes)||s.maxBytes<1||s.maxBytes>16384)fail('SOURCE_CONFIG');
  ids.add(s.id);urls.add(s.url);routes.push(Object.freeze({...s}));
 }
 admitPublicRoutes(routes.map(s=>({connectionId:s.id,endpoint:s.url,protocol:'public-source-get',models:['document']})));
 return Object.freeze(routes);
}
export function createPublicSourceReader({sources,deadlineMs=10000,resolveAll=async host=>(await lookup(host,{all:true,verbatim:true})).map(({address,family})=>({address,family})),io={dialTls:connect,requestHttps:request}}={}){
 const admitted=admitSourceRoutes(sources);
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000||typeof resolveAll!=='function'||!keys(io,['dialTls','requestHttps'])||typeof io.dialTls!=='function'||typeof io.requestHttps!=='function')fail('SOURCE_CONFIG');
 const {dialTls,requestHttps}=io,byId=new Map(admitted.map(s=>[s.id,s])),consumed=new Set(),pending=new Set();
 const policy=createPublicRoutePolicy({routes:admitted.map(s=>({connectionId:s.id,endpoint:s.url,protocol:'public-source-get',models:['document']})),resolveAll});
 let closed=false;
 async function read(id,{signal}={}){
  if(closed||signal?.aborted)fail('CANCELLED');const s=byId.get(id);if(!s||consumed.has(id))fail('SOURCE_SCOPE');
  consumed.add(id);
  const route=Object.freeze({connectionId:s.id,endpoint:s.url,protocol:'public-source-get',model:'document'});
  return new Promise((resolve,reject)=>{
   let done=false,active,timer;
   const finish=(ok,value)=>{if(done)return;done=true;clearTimeout(timer);pending.delete(cancel);signal?.removeEventListener('abort',cancel);if(!ok){active?.cancel();reject(Object.assign(Error('Public source read refused ('+value+').'),{code:value}));}else resolve(value);};
   const cancel=()=>finish(false,'CANCELLED');pending.add(cancel);signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();return;}
   timer=setTimeout(()=>finish(false,'TIMEOUT'),deadlineMs);
   (async()=>{const lease=await policy.prepare(route);if(done)return;const pin=policy.consume(lease,route);if(done)return;active=startPinnedSourceRead(pin,{mediaType:s.mediaType,maxBytes:s.maxBytes},{dialTls,requestHttps});active.promise.then(v=>finish(true,v),e=>finish(false,e.code));})().catch(()=>finish(false,'ROUTE_OR_DNS'));
  });
 }
 return Object.freeze({read,close(){closed=true;policy.close();for(const cancel of [...pending])cancel();}});
}
