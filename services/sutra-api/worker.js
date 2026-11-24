import {handleInference,inferenceStatus,inferenceBackend,configuredModels,inferenceContractId,readJson,clientKeyForRequest} from './inference.js';
import {createSourceTools} from '../../packages/sutra-source-tools/index.js';
import {abortable} from '../../packages/sutra-inference/protocol.js';
import {sourceQuotaLimits} from './quota.js';
import {validateData} from '../../packages/sutra-runtime/vendor/nsdeploy/actions.js';
import contentProfileDocument from '../../apps/sutra/public/content/content-profile.json' with {type:'json'};
import sourceCatalogDocument from '../../apps/sutra/public/content/source-catalog.json' with {type:'json'};
import {validateContentProfile} from '../../packages/sutra-content-profile/index.js';
export {InferenceQuota} from './quota.js';
const activeContent=validateContentProfile(contentProfileDocument,sourceCatalogDocument);
const sourceTools=createSourceTools(activeContent.sources);
const bindingKeys=['SUTRA_CONTENT_VERSION','SUTRA_CONTENT_MODE','SUTRA_CATALOG_SHA256','SUTRA_TRANSCRIPT_SHA256'];
export function contentBindingMatches(env={}){
 const configured=bindingKeys.some(key=>env[key]!==undefined);
 const required=env.SUTRA_ENABLE_INFERENCE==='true'||env.SUTRA_MAX_DAILY_SOURCE_READS!==undefined||env.SUTRA_MAX_CLIENT_SOURCE_READS!==undefined;
 if(!configured)return !required;
 if(bindingKeys.some(key=>typeof env[key]!=='string'||!env[key]))return false;
 return env.SUTRA_CONTENT_VERSION===activeContent.profile.contentVersion&&env.SUTRA_CONTENT_MODE===activeContent.profile.mode&&
  env.SUTRA_CATALOG_SHA256===activeContent.profile.catalog.sha256&&env.SUTRA_TRANSCRIPT_SHA256===activeContent.source.hash;
}
const sourceDefinitions=new Map(sourceTools.list().map(definition=>[definition.name,definition]));

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
export function withCachePolicy(response,request){
 const url=new URL(request.url),path=url.pathname,headers=new Headers(response.headers);
 const complete=response.status===200&&!headers.has('Content-Range');
 let policy='public, max-age=0, must-revalidate';
 if(path.startsWith('/api/'))policy='no-store';
 else if(complete&&(path.startsWith('/assets/')||path.startsWith('/agents/v/')))policy='public, max-age=31536000, immutable';
 else {
  // A caller-defined ?v= value is not evidence of immutable media bytes.
  // Only the complete digest-shaped reviewed lesson path is safely
  // content-addressed. Its poster and VTT derivatives are not necessarily
  // bound to the media hash, so they retain revalidation semantics.
  const media=path.match(/^\/media\/release\/([a-f0-9]{64})\/lesson\.(?:mp4|webm)$/);
  const params=[...url.searchParams];
  if(complete&&media&&(params.length===0||params.length===1&&params[0][0]==='v'&&params[0][1]===media[1]))policy='public, max-age=31536000, immutable';
 }
 headers.set('Cache-Control',policy);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Restricted, stateless JSON-RPC/MCP facade. No caller URL, filesystem or DOM access.
const validClientCapabilities=caps=>{
 if(!caps||typeof caps!=='object'||Array.isArray(caps)||Object.keys(caps).some(k=>!['roots','sampling','elicitation'].includes(k)))return false;
 if(caps.roots!==undefined&&(!caps.roots||typeof caps.roots!=='object'||Array.isArray(caps.roots)||Object.keys(caps.roots).some(k=>k!=='listChanged')||caps.roots.listChanged!==undefined&&typeof caps.roots.listChanged!=='boolean'))return false;
 for(const key of ['sampling','elicitation'])if(caps[key]!==undefined&&(!caps[key]||typeof caps[key]!=='object'||Array.isArray(caps[key])||Object.keys(caps[key]).length))return false;
 return true;
};
export async function handleSourceTools(request,env={}){
 if(request.headers.has('MCP-Protocol-Version')&&request.headers.get('MCP-Protocol-Version')!=='2025-06-18')return json({error:{code:'PROTOCOL'}},400);
 if(request.method!=='POST')return json({error:{code:'METHOD'}},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:{code:'ORIGIN_OR_HEADERS'}},403);
 if(request.signal.aborted)return json({error:{code:'SOURCE_CANCELLED'}},499);
 let rpc;try{rpc=await readJson(request,4096);}catch{return json({error:{code:request.signal.aborted?'SOURCE_CANCELLED':'PAYLOAD'}},request.signal.aborted?499:400);}
 if(request.signal.aborted)return json({error:{code:'SOURCE_CANCELLED'}},499);
 if(!rpc||typeof rpc!=='object'||Array.isArray(rpc)||Object.keys(rpc).some(k=>!['jsonrpc','id','method','params'].includes(k))||rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string'||!(typeof rpc.id==='string'&&rpc.id.length<=100||Number.isSafeInteger(rpc.id)||rpc.id===undefined))return json({error:{code:'RPC'}},400);
 const emptyParams=value=>value===undefined||value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===0;
 if(rpc.method==='notifications/initialized'&&rpc.id===undefined){
  if(!emptyParams(rpc.params))return json({error:{code:'RPC'}},400);
  return new Response(null,{status:202});
 }
 if(rpc.id===undefined)return json({error:{code:'RPC'}},400);
 const result=value=>json({jsonrpc:'2.0',id:rpc.id,result:value});
 if(rpc.method==='initialize'){
  const p=rpc.params;
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['protocolVersion','capabilities','clientInfo'].includes(k))||p.protocolVersion!=='2025-06-18'||!validClientCapabilities(p.capabilities)||!p.clientInfo||typeof p.clientInfo!=='object'||Array.isArray(p.clientInfo)||Object.keys(p.clientInfo).some(k=>!['name','version'].includes(k))||typeof p.clientInfo.name!=='string'||!p.clientInfo.name||p.clientInfo.name.length>100||typeof p.clientInfo.version!=='string'||!p.clientInfo.version||p.clientInfo.version.length>40)return json({error:{code:'RPC'}},400);
  return result({protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'sutra-source-tools',version:'0.1.0'}});
 }
 if(rpc.method==='tools/list'){if(!emptyParams(rpc.params))return json({error:{code:'RPC'}},400);return result({tools:sourceTools.list().map(({effect,...d})=>({...d,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}))});}
 if(rpc.method==='tools/call'){
  if(!rpc.params||typeof rpc.params!=='object'||Array.isArray(rpc.params)||Object.keys(rpc.params).some(k=>!['name','arguments'].includes(k)))return json({error:{code:'RPC'}},400);
  const definition=sourceDefinitions.get(rpc.params?.name);
  try{if(!definition)throw Error();validateData(definition.inputSchema,rpc.params?.arguments);}catch{return result({content:[{type:'text',text:'Source tool unavailable; no result is claimed.'}],isError:true});}
  const sourceQuotaRequested=env.SUTRA_MAX_DAILY_SOURCE_READS!==undefined||env.SUTRA_MAX_CLIENT_SOURCE_READS!==undefined;
  if(sourceQuotaRequested){
   if(!sourceQuotaLimits(env)||!env.SUTRA_QUOTA||typeof env.SUTRA_CLIENT_HASH_SECRET!=='string'||env.SUTRA_CLIENT_HASH_SECRET.length<32)return json({error:{code:'SOURCE_QUOTA_UNAVAILABLE'}},503);
   try{
    const clientKey=await clientKeyForRequest(request,env.SUTRA_CLIENT_HASH_SECRET);if(request.signal.aborted)return json({error:{code:'SOURCE_CANCELLED'}},499);
    const quota=env.SUTRA_QUOTA.get(env.SUTRA_QUOTA.idFromName('sutra-inference-global-v1')),signal=AbortSignal.any([request.signal,AbortSignal.timeout(5000)]);signal.throwIfAborted();
    const admission=await abortable(quota.fetch('https://quota.internal/source-read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientKey}),signal}),signal);
    if(!admission.ok)return json({error:{code:admission.status===429?'SOURCE_QUOTA':'SOURCE_QUOTA_UNAVAILABLE'}},admission.status===429?429:503);
   }catch{return json({error:{code:request.signal.aborted?'SOURCE_CANCELLED':'SOURCE_QUOTA_UNAVAILABLE'}},request.signal.aborted?499:503);}
  }
  if(request.signal.aborted)return json({error:{code:'SOURCE_CANCELLED'}},499);
  try{const output=sourceTools.call(rpc.params?.name,rpc.params?.arguments);return result({content:[{type:'text',text:JSON.stringify(output)}],structuredContent:output,isError:false});}catch{return result({content:[{type:'text',text:'Source tool unavailable; no result is claimed.'}],isError:true});}
 }
 return json({jsonrpc:'2.0',id:rpc.id,error:{code:-32601,message:'Method unavailable.'}});
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;let response;
 const inferencePath=path==='/api/infer'||path==='/api/v1/chat/completions';
 const contentBoundPath=inferencePath||path==='/api/source-tools'||path==='/api/status';
 const catalogPrecondition=request.headers.get('X-Sutra-Catalog-Sha256');
 if(contentBoundPath&&!contentBindingMatches(env)){
  response=json({error:{code:'CONTENT_BINDING_MISMATCH'}},503);
 }
 // Optional public precondition for snapshot-aware callers. Generic portable
 // clients retain their existing router/MCP contract; this is not access control.
 else if((inferencePath||path==='/api/source-tools')&&request.method==='POST'&&request.headers.get('Origin')===new URL(request.url).origin&&catalogPrecondition!==null&&catalogPrecondition!==activeContent.profile.catalog.sha256){
  response=json({error:{code:'CONTENT_VERSION_MISMATCH'}},409);
 }
 else if(inferencePath)response=await handleInference(request,env);
 else if(path==='/api/source-tools')response=await handleSourceTools(request,env);
 else if(path==='/api/status'&&request.method==='GET'){
  let contractId=null;if(inferenceStatus(env)){try{contractId=await inferenceContractId(env);}catch{}}
  const configured=!!contractId;
  response=json({inference:configured?'configured':'disabled',...(configured?{model:configuredModels(env)[0],routerBase:'/api/v1',publisherFunded:true,byok:false,backend:inferenceBackend(env).mode,inferenceContractId:contractId}:{}),sourceTools:'catalog',content:{mode:activeContent.profile.mode,contentVersion:activeContent.profile.contentVersion,catalogSha256:activeContent.profile.catalog.sha256,primarySourceId:activeContent.profile.primarySourceId},factualTruth:'unverified'});
 }
 else if(path.startsWith('/api/'))response=json({error:{code:'NOT_FOUND'}},404);
 else response=await (env.ASSETS?.fetch(request)??new Response('Not found',{status:404}));
 return withSecurityHeaders(withCachePolicy(response,request),env);
}};
