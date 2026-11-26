// Node-only, trusted host opt-in transport for a separately approved local model.
// No browser import, public relay, DNS, redirects, proxy, discovery or auto fallback.
import {request} from 'node:http';
import {admitLoopbackRoutes} from './loopback-route.js';
import {admitBody} from './model-wire-request.js';
const MAX_RESPONSE=262144;
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const fail=code=>{const e=new Error('Local model exchange refused ('+code+').');e.code=code;throw e;};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
export function createLoopbackModelExchange({routes,deadlineMs=10000}={}){
 const approved=admitLoopbackRoutes(routes,deadlineMs);
 let closedHost=false;const pending=new Set();
 async function exchange(input){
  if(closedHost)fail('CLOSED');
  if(!closed(input,['connectionId','protocol','transportClass','endpoint','model','credential','bodyText','maxOutputTokens']))fail('REQUEST');
  const route=approved.get(input.connectionId);
  if(!route||input.transportClass!=='local'||input.protocol!==route.protocol||input.endpoint!==route.endpoint||!route.models.includes(input.model)||!int(input.maxOutputTokens,1,8192))fail('ROUTE');
  admitBody(input.bodyText,input.model,input.maxOutputTokens,route.protocol);
  const headers={'Content-Type':'application/json; charset=utf-8','Accept':'application/json','Accept-Encoding':'identity','Content-Length':Buffer.byteLength(input.bodyText,'utf8'),'Connection':'close'};
  if(route.protocol==='anthropic-messages-json')headers['anthropic-version']='2023-06-01';
  // No-key local inference ignores the vault's opaque synthetic placeholder.
  // Only host-approved authentication modes can put a credential on the wire.
  if(route.authMode!=='none'){
   if(typeof input.credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(input.credential))fail('AUTH');
   if(route.authMode==='bearer')headers.Authorization='Bearer '+input.credential;
   else headers['x-api-key']=input.credential;
  }
  return new Promise((resolve,reject)=>{
   let req,res,timer,done=false;
   const finish=(ok,value)=>{
    if(done)return;done=true;clearTimeout(timer);pending.delete(cancel);
    if(!ok){res?.destroy();req?.destroy();reject(Object.assign(new Error('Local model exchange refused ('+value+').'),{code:value}));}
    else resolve(value);
   };
   const cancel=()=>finish(false,'CANCELLED');pending.add(cancel);
   timer=setTimeout(()=>finish(false,'TIMEOUT'),deadlineMs);
   try{
    // Literal loopback addresses, explicit family, direct socket; no proxy agent.
    // Reject any unexpected resolver call rather than allow DNS.
    req=request({hostname:route.hostname,family:route.family,port:route.port,path:route.path,method:'POST',headers,agent:false,maxHeaderSize:8192,lookup:(_host,_options,cb)=>cb(new Error('DNS disabled'))},incoming=>{
     res=incoming;
     if(done){res.destroy();return;}
     const type=res.headers['content-type'],encoding=res.headers['content-encoding'],length=res.headers['content-length'];
     if(res.statusCode!==200||typeof type!=='string'||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type)||encoding!==undefined&&encoding!=='identity'||res.headers['content-range']!==undefined||length!==undefined&&(!/^\d+$/.test(length)||Number(length)>MAX_RESPONSE)){finish(false,'RESPONSE');return;}
     let received=0;const chunks=[];
     res.on('data',chunk=>{if(done)return;received+=chunk.length;if(received>MAX_RESPONSE){finish(false,'RESPONSE_SIZE');return;}chunks.push(chunk);});
     res.on('aborted',()=>finish(false,'TRUNCATED'));
     res.on('error',()=>finish(false,'RESPONSE'));
     res.on('end',()=>{
      if(done)return;
      if(!res.complete||received===0||length!==undefined&&Number(length)!==received){finish(false,'TRUNCATED');return;}
      let bodyText;try{bodyText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,received));}catch{finish(false,'RESPONSE_ENCODING');return;}
      finish(true,Object.freeze({status:200,bodyText}));
     });
    });
    req.on('error',()=>finish(false,'TRANSPORT'));
    req.on('upgrade',(_response,socket)=>{socket.destroy();finish(false,'RESPONSE');});
    req.end(input.bodyText);
   }catch{finish(false,'TRANSPORT');}
  });
 }
 return Object.freeze({mode:'explicit-local-loopback-exchange',exchange,close(){closedHost=true;for(const cancel of [...pending])cancel();}});
}
