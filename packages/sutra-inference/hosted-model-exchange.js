// Trusted Node host candidate. No default resolver, browser relay, or production wiring.
// Test I/O injection is trusted host code, never operator JSON or model output.
import {connect} from 'node:tls';
import {request} from 'node:https';
import {startPinnedHttps} from './pinned-https-socket.js';
import {createPublicRoutePolicy} from './public-route-policy.js';
import {admitBody} from './model-wire-request.js';
const fail=code=>{const e=new Error('Hosted model exchange refused ('+code+').');e.code=code;throw e;};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>i).every(i=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');});
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const protocols=['openai-compatible-json','anthropic-messages-json'];
export function createHostedModelExchange({routes,resolveAll,deadlineMs=15000,io={dialTls:connect,requestHttps:request}}={}){
 if(!Array.isArray(routes)||routes.length<1||routes.length>8||!dense(routes)||!int(deadlineMs,1,30000)||!closed(io,['dialTls','requestHttps'])||typeof io.dialTls!=='function'||typeof io.requestHttps!=='function')fail('CONFIG');
 const {dialTls,requestHttps}=io,auth=new Map(),publicRoutes=[];
 for(const r of routes){
  if(!closed(r,['connectionId','protocol','endpoint','models','authMode'])||auth.has(r.connectionId)||!protocols.includes(r.protocol)||!['none','bearer','anthropic-key'].includes(r.authMode)||r.authMode==='anthropic-key'&&r.protocol!=='anthropic-messages-json')fail('ROUTE');
  auth.set(r.connectionId,r.authMode);publicRoutes.push({connectionId:r.connectionId,protocol:r.protocol,endpoint:r.endpoint,models:r.models});
 }
 const policy=createPublicRoutePolicy({routes:publicRoutes,resolveAll});
 let closedHost=false;const pending=new Set();
 async function exchange(raw,{signal}={}){
  if(signal?.aborted)fail('CANCELLED');
  if(closedHost)fail('CLOSED');
  if(!closed(raw,['connectionId','protocol','transportClass','endpoint','model','credential','bodyText','maxOutputTokens']))fail('REQUEST');
  const input=Object.freeze({...raw}),authMode=auth.get(input.connectionId);
  if(input.transportClass!=='hosted'||authMode===undefined||!protocols.includes(input.protocol)||!int(input.maxOutputTokens,1,8192))fail('ROUTE');
  if(authMode!=='none'&&(typeof input.credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(input.credential)))fail('AUTH');
  admitBody(input.bodyText,input.model,input.maxOutputTokens,input.protocol);
  const route=Object.freeze({connectionId:input.connectionId,protocol:input.protocol,endpoint:input.endpoint,model:input.model});
  return new Promise((resolve,reject)=>{
   let active,timer,done=false;
   const finish=(ok,value)=>{
    if(done)return;done=true;clearTimeout(timer);pending.delete(cancel);signal?.removeEventListener('abort',cancel);
    if(!ok){active?.cancel();reject(Object.assign(new Error('Hosted model exchange refused ('+value+').'),{code:value}));}
    else resolve(value);
   };
   const cancel=()=>finish(false,'CANCELLED');pending.add(cancel);signal?.addEventListener('abort',cancel,{once:true});
   if(signal?.aborted){cancel();return;}
   timer=setTimeout(()=>finish(false,'TIMEOUT'),deadlineMs);
   // Even a resolver that ignores cancellation cannot dial after completion.
   (async()=>{
    const lease=await policy.prepare(route);if(done)return;
    const pin=policy.consume(lease,route);if(done)return;
    active=startPinnedHttps(pin,input,authMode,{dialTls,requestHttps});
    active.promise.then(value=>finish(true,value),error=>finish(false,error.code));
   })().catch(()=>finish(false,'ROUTE_OR_DNS'));
  });
 }
 return Object.freeze({mode:'explicit-hosted-https-candidate',exchange,close(){closedHost=true;policy.close();for(const cancel of [...pending])cancel();}});
}
