import {handleInference,inferenceStatus,readJson} from './inference.js';
import {createSourceTools} from '../../packages/sutra-source-tools/index.js';
import fixture from '../../apps/sutra/src/fixtures/timing-source.json' with {type:'json'};
export {InferenceQuota} from './quota.js';
const sourceTools=createSourceTools([fixture.source]);

export function allowedPeerOrigins(env={}){
 const raw=typeof env.SUTRA_PEER_ORIGINS==='string'?env.SUTRA_PEER_ORIGINS.trim():'';
 if(!raw)return [];
 const parts=raw.split(',').map(x=>x.trim()).filter(Boolean);
 if(parts.length>4)return [];
 const out=[];
 for(const part of parts){
  let url;try{url=new URL(part);}catch{return [];}
  if(url.origin!==part||url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return [];
  if(out.includes(url.origin))continue;out.push(url.origin);
 }
 return out;
}
export function securityHeaders(env={}){
 const peers=allowedPeerOrigins(env);
 const connect=["'self'",...peers].join(' ');
 return {
  'Content-Security-Policy':[
   "default-src 'self'","base-uri 'none'","object-src 'none'","frame-ancestors 'none'",
   "form-action 'self'","script-src 'self'","style-src 'self' 'unsafe-inline'",
   "img-src 'self' data: blob:","media-src 'self' blob:","font-src 'self'",
   "worker-src 'self' blob:",`connect-src ${connect}`,"frame-src 'none'","manifest-src 'self'"
  ].join('; '),
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
  'Cross-Origin-Opener-Policy':'same-origin'
 };
}
export function withSecurityHeaders(response,env={}){
 const headers=new Headers(response.headers);
 for(const [key,value] of Object.entries(securityHeaders(env)))headers.set(key,value);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Restricted, stateless JSON-RPC/MCP facade. No caller URL, filesystem or DOM access.
export async function handleSourceTools(request){
 if(request.headers.has('MCP-Protocol-Version')&&request.headers.get('MCP-Protocol-Version')!=='2025-06-18')return json({error:{code:'PROTOCOL'}},400);
 if(request.method!=='POST')return json({error:{code:'METHOD'}},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:{code:'ORIGIN_OR_HEADERS'}},403);
 let rpc;try{rpc=await readJson(request,4096);}catch{return json({error:{code:'PAYLOAD'}},400);}
 if(!rpc||rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string'||!(typeof rpc.id==='string'&&rpc.id.length<=100||Number.isSafeInteger(rpc.id)||rpc.id===undefined))return json({error:{code:'RPC'}},400);
 if(rpc.method==='notifications/initialized'&&rpc.id===undefined)return new Response(null,{status:202});
 if(rpc.id===undefined)return json({error:{code:'RPC'}},400);
 const result=value=>json({jsonrpc:'2.0',id:rpc.id,result:value});
 if(rpc.method==='initialize')return result({protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'sutra-source-tools',version:'0.1.0'}});
 if(rpc.method==='tools/list')return result({tools:sourceTools.list().map(({effect,...d})=>({...d,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}))});
 if(rpc.method==='tools/call'){try{const output=sourceTools.call(rpc.params?.name,rpc.params?.arguments);return result({content:[{type:'text',text:JSON.stringify(output)}],structuredContent:output,isError:false});}catch{return result({content:[{type:'text',text:'Source tool unavailable; no result is claimed.'}],isError:true});}}
 return json({jsonrpc:'2.0',id:rpc.id,error:{code:-32601,message:'Method unavailable.'}});
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;let response;
 if(path==='/api/infer')response=await handleInference(request,env);
 else if(path==='/api/source-tools')response=await handleSourceTools(request);
 else if(path==='/api/status'&&request.method==='GET')response=json({inference:inferenceStatus(env)?'configured':'disabled',sourceTools:'synthetic-catalog',factualTruth:'unverified'});
 else if(path.startsWith('/api/'))response=json({error:{code:'NOT_FOUND'}},404);
 else response=await (env.ASSETS?.fetch(request)??new Response('Not found',{status:404}));
 return withSecurityHeaders(response,env);
}};
