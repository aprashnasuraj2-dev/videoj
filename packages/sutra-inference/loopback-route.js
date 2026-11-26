// Pure shared route admission; no network, credentials, browser APIs or Node dependency.
const ID=/^[a-z][a-z0-9-]{0,31}$/,MODEL=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const protocols=['openai-compatible-json','anthropic-messages-json','ollama-chat-json'];
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const fail=code=>{const e=new Error('Local model exchange refused ('+code+').');e.code=code;throw e;};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>i).every(i=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');});
function routeEndpoint(raw){
 let url;try{url=new URL(raw);}catch{fail('ENDPOINT');}
 if(typeof raw!=='string'||raw.length>2048||url.href!==raw||url.protocol!=='http:'||!['127.0.0.1','[::1]'].includes(url.hostname)||!int(Number(url.port),1024,65535)||url.username||url.password||url.search||url.hash||!/^\/[A-Za-z0-9._/-]+$/.test(url.pathname)||url.pathname.includes('//')||url.pathname.split('/').some(x=>x==='.'||x==='..'))fail('ENDPOINT');
 return Object.freeze({endpoint:raw,hostname:url.hostname==='[::1]'?'::1':'127.0.0.1',family:url.hostname==='[::1]'?6:4,port:Number(url.port),path:url.pathname});
}
export function admitLoopbackRoutes(routes,deadlineMs){
 if(!Array.isArray(routes)||routes.length<1||routes.length>8||!dense(routes)||!int(deadlineMs,1,30000))fail('CONFIG');
 const approved=new Map();
 for(const r of routes){
  if(!closed(r,['connectionId','protocol','endpoint','models','authMode'])||typeof r.connectionId!=='string'||!ID.test(r.connectionId)||approved.has(r.connectionId)||!protocols.includes(r.protocol)||!Array.isArray(r.models)||!dense(r.models)||r.models.length<1||r.models.length>16||r.models.some(x=>typeof x!=='string'||!MODEL.test(x))||new Set(r.models).size!==r.models.length||!['none','bearer','anthropic-key'].includes(r.authMode)||r.authMode==='anthropic-key'&&r.protocol!=='anthropic-messages-json')fail('ROUTE');
  approved.set(r.connectionId,Object.freeze({...routeEndpoint(r.endpoint),protocol:r.protocol,models:Object.freeze([...r.models]),authMode:r.authMode}));
 }
 return approved;
}
