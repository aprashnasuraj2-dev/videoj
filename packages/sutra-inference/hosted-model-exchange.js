// Trusted Node host candidate. No default resolver, browser relay, or production wiring.
// Test I/O injection is trusted host code, never operator JSON or model output.
import {connect,checkServerIdentity} from 'node:tls';
import {request} from 'node:https';
import {isIP,BlockList} from 'node:net';
import {createPublicRoutePolicy} from './public-route-policy.js';
import {admitBody} from './model-wire-request.js';
const MAX_RESPONSE=262144;
const fail=code=>{const e=new Error('Hosted model exchange refused ('+code+').');e.code=code;throw e;};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>i).every(i=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');});
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const protocols=['openai-compatible-json','anthropic-messages-json'];
function sameAddress(actual,expected,family){
 if(typeof actual!=='string'||actual.includes('%')||isIP(actual)!==family)return false;
 const list=new BlockList(),kind=family===4?'ipv4':'ipv6';
 list.addAddress(expected,kind);return list.check(actual,kind);
}
export function createHostedModelExchange({routes,resolveAll,deadlineMs=15000,io={dialTls:connect,requestHttps:request}}={}){
 if(!Array.isArray(routes)||routes.length<1||routes.length>8||!dense(routes)||!int(deadlineMs,1,30000)||!closed(io,['dialTls','requestHttps'])||typeof io.dialTls!=='function'||typeof io.requestHttps!=='function')fail('CONFIG');
 const {dialTls,requestHttps}=io,auth=new Map(),publicRoutes=[];
 for(const r of routes){
  if(!closed(r,['connectionId','protocol','endpoint','models','authMode'])||auth.has(r.connectionId)||!protocols.includes(r.protocol)||!['none','bearer','anthropic-key'].includes(r.authMode)||r.authMode==='anthropic-key'&&r.protocol!=='anthropic-messages-json')fail('ROUTE');
  auth.set(r.connectionId,r.authMode);publicRoutes.push({connectionId:r.connectionId,protocol:r.protocol,endpoint:r.endpoint,models:r.models});
 }
 const policy=createPublicRoutePolicy({routes:publicRoutes,resolveAll});
 let closedHost=false;const pending=new Set();
 async function exchange(raw){
  if(closedHost)fail('CLOSED');
  if(!closed(raw,['connectionId','protocol','transportClass','endpoint','model','credential','bodyText','maxOutputTokens']))fail('REQUEST');
  const input=Object.freeze({...raw}),authMode=auth.get(input.connectionId);
  if(input.transportClass!=='hosted'||authMode===undefined||!protocols.includes(input.protocol)||!int(input.maxOutputTokens,1,8192))fail('ROUTE');
  if(authMode!=='none'&&(typeof input.credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(input.credential)))fail('AUTH');
  admitBody(input.bodyText,input.model,input.maxOutputTokens,input.protocol);
  const route=Object.freeze({connectionId:input.connectionId,protocol:input.protocol,endpoint:input.endpoint,model:input.model});
  return new Promise((resolve,reject)=>{
   let socket,req,res,timer,done=false,started=false;
   const finish=(ok,value)=>{
    if(done)return;done=true;clearTimeout(timer);pending.delete(cancel);
    if(!ok){res?.destroy();req?.destroy();socket?.destroy();reject(Object.assign(new Error('Hosted model exchange refused ('+value+').'),{code:value}));}
    else{socket?.destroy();resolve(value);}
   };
   const cancel=()=>finish(false,'CANCELLED');pending.add(cancel);
   timer=setTimeout(()=>finish(false,'TIMEOUT'),deadlineMs);
   // Even a resolver that ignores cancellation cannot dial after completion.
   (async()=>{
    const lease=await policy.prepare(route);if(done)return;
    const pin=policy.consume(lease,route);if(done)return;
    socket=dialTls({host:pin.address,port:pin.port,family:pin.family,servername:pin.servername,rejectUnauthorized:true,minVersion:'TLSv1.2',ALPNProtocols:['http/1.1'],lookup:(_host,_options,cb)=>cb(new Error('DNS disabled'))});
    socket.on('error',()=>finish(false,'TLS'));
    socket.on('close',()=>{if(!done&&!res?.complete)finish(false,'TRUNCATED');});
    socket.once('secureConnect',()=>{
     if(done||started)return;started=true;
     try{
      if(socket.encrypted!==true||socket.authorized!==true||socket.remotePort!==pin.port||!sameAddress(socket.remoteAddress,pin.address,pin.family)||!['TLSv1.2','TLSv1.3'].includes(socket.getProtocol())||socket.alpnProtocol!==false&&socket.alpnProtocol!=='http/1.1'||checkServerIdentity(pin.hostname,socket.getPeerCertificate())){finish(false,'TLS_IDENTITY');return;}
      // No credential-bearing request is constructed until the exact peer and
      // hostname have been authenticated. No second dial, agent or redirect.
      const headers={'Host':pin.hostname,'Content-Type':'application/json; charset=utf-8','Accept':'application/json','Accept-Encoding':'identity','Content-Length':Buffer.byteLength(input.bodyText,'utf8'),'Connection':'close'};
      if(pin.protocol==='anthropic-messages-json')headers['anthropic-version']='2023-06-01';
      if(authMode==='bearer')headers.Authorization='Bearer '+input.credential;
      else if(authMode==='anthropic-key')headers['x-api-key']=input.credential;
      let handed=false;
      req=requestHttps({hostname:pin.hostname,port:pin.port,path:pin.path,method:'POST',headers,agent:null,maxHeaderSize:8192,createConnection:()=>{if(handed||done)fail('SOCKET');handed=true;return socket;}},incoming=>{
       res=incoming;if(done){res.destroy();return;}
       const type=res.headers['content-type'],encoding=res.headers['content-encoding'],length=res.headers['content-length'];
       if(res.statusCode!==200||typeof type!=='string'||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type)||encoding!==undefined&&encoding!=='identity'||res.headers['content-range']!==undefined||length!==undefined&&(typeof length!=='string'||!/^\d+$/.test(length)||Number(length)>MAX_RESPONSE)){finish(false,'RESPONSE');return;}
       let received=0;const chunks=[];
       res.on('data',chunk=>{if(done)return;received+=chunk.length;if(received>MAX_RESPONSE){finish(false,'RESPONSE_SIZE');return;}chunks.push(chunk);});
       res.on('aborted',()=>finish(false,'TRUNCATED'));res.on('error',()=>finish(false,'RESPONSE'));
       res.on('end',()=>{
        if(done)return;if(!res.complete||received===0||length!==undefined&&Number(length)!==received){finish(false,'TRUNCATED');return;}
        let bodyText;try{bodyText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,received));}catch{finish(false,'RESPONSE_ENCODING');return;}
        finish(true,Object.freeze({status:200,bodyText}));
       });
      });
      req.on('error',()=>finish(false,'TRANSPORT'));
      req.on('socket',s=>{if(s!==socket)finish(false,'SOCKET');});
      req.on('upgrade',(_response,s)=>{s.destroy();finish(false,'RESPONSE');});
      if(!done)req.end(input.bodyText);
     }catch{finish(false,'TRANSPORT');}
    });
   })().catch(()=>finish(false,'ROUTE_OR_DNS'));
  });
 }
 return Object.freeze({mode:'explicit-hosted-https-candidate',exchange,close(){closedHost=true;policy.close();for(const cancel of [...pending])cancel();}});
}
