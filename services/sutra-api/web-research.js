import {readBoundedResponse,isFullJson} from '../../packages/sutra-runtime/bounded-response.js';
import {parseUniqueJson} from '../../packages/sutra-runtime/strict-json.js';
import {admitPublicWebUrl} from '../../packages/sutra-runtime/web-access.js';
import {inferenceContractId,inferenceStatus,clientKeyForRequest,readJson,isJsonRequest} from './inference.js';
import {admissionWindow,ADMISSION_MS} from './quota.js';
import {readQuotaReply} from './quota-transport.js';
import {webResearchConfig} from './web-research-config.js';

const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const TOKEN_MS=120000,PROVIDER_MS=12000,MAX_PROVIDER_BYTES=65536;
const error=(code,status)=>Response.json({error:{code,message:'Web research is unavailable or stopped; no evidence is claimed.'}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const clean=(value,max)=>{
 if(typeof value!=='string')throw Error('WEB_RESPONSE');
 const text=value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
 if(text.length<=max)return text;
 const cut=text.slice(0,max);return /[\ud800-\udbff]$/.test(cut)?cut.slice(0,-1):cut;
};
const b64url=bytes=>{
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const from64=value=>{
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value)||value.length>4096)throw Error('WEB_TOKEN');
 const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
 const binary=atob(padded),out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;
};
const sameBytes=(a,b)=>{
 if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
};
async function hmac(secret,value){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)));
}
async function issueToken({secret,url,contractId,clientKey,clock}){
 const now=clock();if(!Number.isSafeInteger(now))throw Error('WEB_CLOCK');
 const body=JSON.stringify({version:1,url,contractId,clientKey,expiresAt:now+TOKEN_MS});
 return b64url(enc.encode(body))+'.'+b64url(await hmac(secret,body));
}
async function verifyToken({secret,token,contractId,clientKey,clock}){
 if(typeof token!=='string'||token.length>4096||token.split('.').length!==2)throw Error('WEB_TOKEN');
 const [encoded,signature]=token.split('.');
 let body;try{body=dec.decode(from64(encoded));}catch{throw Error('WEB_TOKEN');}
 const expected=await hmac(secret,body),actual=from64(signature);
 if(!sameBytes(expected,actual))throw Error('WEB_TOKEN');
 let payload;try{payload=parseUniqueJson(body,{maxChars:3072,maxDepth:8});}catch{throw Error('WEB_TOKEN');}
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).sort().join(',')!=='clientKey,contractId,expiresAt,url,version'||
    payload.version!==1||payload.contractId!==contractId||payload.clientKey!==clientKey||!Number.isSafeInteger(payload.expiresAt))throw Error('WEB_TOKEN');
 const now=clock();if(!Number.isSafeInteger(now)||payload.expiresAt<=now||payload.expiresAt-now>TOKEN_MS)throw Error('WEB_TOKEN');
 const url=admitPublicWebUrl(payload.url);if(!url||url!==payload.url)throw Error('WEB_TOKEN');
 return url;
}
async function reserveWeb(request,env){
 const window=admissionWindow();
 const signal=AbortSignal.any([request.signal,AbortSignal.timeout(ADMISSION_MS)]);
 const clientKey=await clientKeyForRequest(request,env.SUTRA_CLIENT_HASH_SECRET,window.day);signal.throwIfAborted();
 const quota=env.SUTRA_QUOTA.get(env.SUTRA_QUOTA.idFromName('sutra-inference-global-v1'));
 const admission=await readQuotaReply(quota,'/web-request',{clientKey,...window},signal);
 if(admission.status!==200||Date.now()>=window.admitUntil){
  const e=Error('WEB_QUOTA');e.code=admission.status===429?'WEB_QUOTA':'WEB_QUOTA_UNAVAILABLE';throw e;
 }
 return clientKey;
}
async function providerJson(config,path,payload,signal,fetchImpl){
 const controller=new AbortController(),cancel=()=>controller.abort();
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const timer=setTimeout(cancel,PROVIDER_MS);
 try{
  const providerFetch=(url,{referrer,referrerPolicy,...init})=>fetchImpl(url,{...init,redirect:'manual'});
  const {bytes}=await readBoundedResponse({
   url:config.providerOrigin+path,fetchImpl:providerFetch,signal:controller.signal,maxBytes:MAX_PROVIDER_BYTES,
   init:{method:'POST',headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json'},body:JSON.stringify(payload)},
   inspect(response){
    if(response.status===402||response.status===429){const e=Error('WEB_PROVIDER_QUOTA');e.code='WEB_PROVIDER_QUOTA';throw e;}
    if(response.status>=500){const e=Error('WEB_PROVIDER_UNAVAILABLE');e.code='WEB_PROVIDER_UNAVAILABLE';throw e;}
    if(!isFullJson(response)){const e=Error('WEB_PROVIDER_RESPONSE');e.code='WEB_PROVIDER_RESPONSE';throw e;}
    return true;
   }
  });
  signal?.throwIfAborted();controller.signal.throwIfAborted();
  let value;try{value=parseUniqueJson(dec.decode(bytes),{maxChars:MAX_PROVIDER_BYTES,maxDepth:32});}catch{throw Error('WEB_PROVIDER_RESPONSE');}
  if(value?.success!==true||!value.data||typeof value.data!=='object'||Array.isArray(value.data))throw Error('WEB_PROVIDER_RESPONSE');
  return value.data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.abort();}
}
function providerFailure(error,request){
 if(request.signal.aborted)return errorResponse('WEB_CANCELLED',499);
 if(error?.code==='WEB_PROVIDER_QUOTA')return errorResponse('WEB_QUOTA',429);
 if(error?.code==='WEB_QUOTA')return errorResponse('WEB_QUOTA',429);
 if(error?.code==='WEB_QUOTA_UNAVAILABLE')return errorResponse('WEB_QUOTA_UNAVAILABLE',503);
 if(error?.name==='AbortError'||error?.code==='ABORTED')return errorResponse('WEB_TIMEOUT',504);
 return errorResponse('WEB_UNAVAILABLE',502);
}
const errorResponse=(code,status)=>error(code,status);

export async function handleWebResearch(request,env={},{fetchImpl=fetch,clock=Date.now}={}){
 const url=new URL(request.url),path=url.pathname;
 if(!['/api/web/search','/api/web/read'].includes(path))return error('WEB_ROUTE',404);
 if(request.method!=='POST')return error('METHOD',405);
 if(request.headers.get('Origin')!==url.origin||request.headers.has('Authorization')||!isJsonRequest(request))return error('ORIGIN_OR_HEADERS',403);
 const config=webResearchConfig(env);
 if(!config||!inferenceStatus(env))return error('WEB_DISABLED',503);
 let contractId;try{contractId=await inferenceContractId(env);}catch{return error('WEB_DISABLED',503);}
 if(request.headers.get('X-Sutra-Inference-Contract')!==contractId)return error('INFERENCE_CONTRACT_MISMATCH',409);
 if(request.signal.aborted)return error('WEB_CANCELLED',499);
 let body;try{body=await readJson(request,4096);}catch{return error(request.signal.aborted?'WEB_CANCELLED':'PAYLOAD',request.signal.aborted?499:400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return error('PAYLOAD',400);
 if(path==='/api/web/search'){
  if(Object.keys(body).length!==1||typeof body.query!=='string')return error('PAYLOAD',400);
  const query=body.query.normalize('NFKC').trim();
  if(!query||query.length>300||/[\u0000-\u001f\u007f]/.test(query))return error('PAYLOAD',400);
  let clientKey;try{clientKey=await reserveWeb(request,env);}catch(e){return providerFailure(e,request);}
  try{
   const data=await providerJson(config,'/v2/search',{query,limit:4,sources:[{type:'web'}],domainTools:false,timeout:10000,safe:true},request.signal,fetchImpl);
   if(!Array.isArray(data.web)||data.web.length>4)return error('WEB_UNAVAILABLE',502);
   const sources=[];
   for(const raw of data.web){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
    const admitted=admitPublicWebUrl(raw.url);if(!admitted)continue;
    const token=await issueToken({secret:config.tokenSecret,url:admitted,contractId,clientKey,clock});
    sources.push({url:admitted,title:clean(raw.title??'',180),snippet:clean(raw.description??'',350),token});
   }
   return Response.json({status:'discovery_only',truthStatus:'unverified',sources},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch(e){return providerFailure(e,request);}
 }
 if(Object.keys(body).length!==1||typeof body.token!=='string')return error('PAYLOAD',400);
 let clientKey;try{clientKey=await clientKeyForRequest(request,env.SUTRA_CLIENT_HASH_SECRET,admissionWindow().day);}catch{return error('WEB_QUOTA_UNAVAILABLE',503);}
 let target;try{target=await verifyToken({secret:config.tokenSecret,token:body.token,contractId,clientKey,clock});}catch{return error('WEB_READ_REFUSED',403);}
 try{await reserveWeb(request,env);}catch(e){return providerFailure(e,request);}
 try{
  const data=await providerJson(config,'/v2/scrape',{url:target,formats:['markdown'],onlyMainContent:true,timeout:10000},request.signal,fetchImpl);
  const meta=data.metadata;
  if(meta?.statusCode!==200||meta.error||admitPublicWebUrl(meta.sourceURL)!==target||admitPublicWebUrl(meta.url)!==target||typeof data.markdown!=='string')return error('WEB_READ_REFUSED',502);
  const text=clean(data.markdown,60000);if(!text)return error('WEB_READ_REFUSED',502);
  return Response.json({status:'source_claim',truthStatus:'unverified',url:target,text},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return providerFailure(e,request);}
}
