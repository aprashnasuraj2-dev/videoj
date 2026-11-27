// Trusted operator composition, not a public relay. Hosted I/O is explicitly
// injected by the host. This candidate supplies no default hosted activation.
import {createLoopbackModelExchange} from './loopback-model-exchange.js';
import {createHostedModelExchange} from './hosted-model-exchange.js';
const fail=code=>{const e=new Error('Mixed model exchange refused ('+code+').');e.code=code;throw e;};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
export function createMixedModelExchange({connections,deadlineMs,resolveAll,hostedIO}={}){
 if(!Array.isArray(connections)||connections.length<1||connections.length>4)fail('CONFIG');
 const local=[],hosted=[],classes=new Map();
 for(const c of connections){
  if(!closed(c,['id','label','protocol','endpoint','models','authMode','credentialEnv','transportClass'])||classes.has(c.id))fail('ROUTE');
  const route={connectionId:c.id,protocol:c.protocol,endpoint:c.endpoint,models:c.models,authMode:c.authMode};
  if(c.transportClass==='local')local.push(route);
  else if(c.transportClass==='hosted')hosted.push(route);
  else fail('ROUTE');
  classes.set(c.id,c.transportClass);
 }
 if(hosted.length&&(!closed(hostedIO,['dialTls','requestHttps'])||typeof resolveAll!=='function'))fail('HOSTED_ACTIVATION_REQUIRED');
 let l=null,p=null,closedHost=false;
 try{
  if(local.length)l=createLoopbackModelExchange({routes:local,deadlineMs});
  if(hosted.length)p=createHostedModelExchange({routes:hosted,deadlineMs,resolveAll,io:hostedIO});
 }catch(error){l?.close();p?.close();throw error;}
 return Object.freeze({mode:'explicit-mixed-candidate',async exchange(input,{signal}={}){
  if(closedHost)fail('CLOSED');
  if(!closed(input,['connectionId','protocol','transportClass','endpoint','model','credential','bodyText','maxOutputTokens'])||classes.get(input.connectionId)!==input.transportClass)fail('ROUTE');
  return (input.transportClass==='local'?l:p).exchange(input,{signal});
 },close(){closedHost=true;l?.close();p?.close();}});
}
