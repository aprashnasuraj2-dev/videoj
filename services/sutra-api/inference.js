import {plain,InferenceError,readSse,makeAccumulator,abortable,MAX_SSE_BYTES} from '../../packages/sutra-inference/protocol.js';
import {checkSchema,validateData} from '../../packages/sutra-runtime/vendor/nsdeploy/actions.js';
import {quotaLimits,sourceQuotaLimits,MAX_INPUT_BYTES,admissionWindow,ADMISSION_MS} from './quota.js';
import {readQuotaReply} from './quota-transport.js';
export const UPSTREAM='https://api.openai.com/v1/chat/completions';
export async function clientKeyForRequest(request,secretValue,day=new Date().toISOString().slice(0,10)){
 if(typeof secretValue!=='string'||secretValue.length<32)throw Error('CLIENT_KEY_CONFIG');
 const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode(secretValue),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const identity=`${day}:${(request.headers.get('CF-Connecting-IP')??'unknown').slice(0,64)}`;
 const signature=await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(identity));
 return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
}
// No inference backend is selected implicitly. The self-hosted mode requires a
// private authenticated HTTPS gateway; never forward to caller-supplied URLs.
export function inferenceBackend(env={}){
 const mode=env.SUTRA_INFERENCE_BACKEND;
 if(mode==='hosted'){
  if(env.SUTRA_SELF_HOSTED_UPSTREAM_URL!==undefined)return null;
  return typeof env.SUTRA_PROVIDER_KEY==='string'&&env.SUTRA_PROVIDER_KEY.length>=8
   ?Object.freeze({mode,url:UPSTREAM,credential:env.SUTRA_PROVIDER_KEY}):null;
 }
 if(mode!=='self_hosted')return null;
 if(typeof env.SUTRA_SELF_HOSTED_UPSTREAM_URL!=='string'||typeof env.SUTRA_SELF_HOSTED_TOKEN!=='string'||env.SUTRA_SELF_HOSTED_TOKEN.length<32)return null;
 let url;try{url=new URL(env.SUTRA_SELF_HOSTED_UPSTREAM_URL);}catch{return null;}
 const host=url.hostname;
 const labels=host.split('.');
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/v1/chat/completions'||url.href!==env.SUTRA_SELF_HOSTED_UPSTREAM_URL||
  !/^[a-z0-9.-]+$/.test(host)||labels.length<2||labels.some(label=>!label||label.startsWith('-')||label.endsWith('-'))||
  /^(?:[0-9.]+|localhost)$/i.test(host)||['local','localhost','internal','invalid'].includes(labels.at(-1)))return null;
 return Object.freeze({mode,url:url.href,credential:env.SUTRA_SELF_HOSTED_TOKEN});
}

// Match the media type, not a prefix such as application/jsonp.
export const isJsonRequest=request=>/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??'');
const error=(code,status)=>Response.json({error:{code,message:'Inference is unavailable or stopped; no complete result is claimed.'}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function readJson(request,max=32768){
 request.signal.throwIfAborted();
 if(!Number.isSafeInteger(max)||max<1||max>32768)throw Error('size');
 const reader=request.body?.getReader();if(!reader)throw Error('body');
 const data=new Uint8Array(max);let total=0,empty=0,chunks=0;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);const cancel=()=>controller.abort();
 request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();
 try{
  for(;;){
   controller.signal.throwIfAborted();
   const {value,done}=await abortable(reader.read(),controller.signal);
   controller.signal.throwIfAborted();
   if(done)break;
   if(!(value instanceof Uint8Array)||value.byteLength>max-total||!value.byteLength&&++empty>256)throw Error('size');
   if(++chunks%1024===0){await new Promise(resolve=>setTimeout(resolve,0));controller.signal.throwIfAborted();}
   if(!value.byteLength)continue;
   data.set(value,total);total+=value.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data.subarray(0,total)));
 }finally{
  clearTimeout(timer);request.signal.removeEventListener('abort',cancel);
  try{void Promise.resolve(reader.cancel()).catch(()=>{});}catch{}
  try{reader.releaseLock();}catch{}
 }
}
function validPayload(body,models){
 if(!plain(body)||Object.keys(body).some(k=>!['model','messages','tools','tool_choice','stream'].includes(k))||!models.includes(body.model)||body.stream!==true||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>32)throw Error();
 const tools=body.tools===undefined?[]:body.tools;if(!Array.isArray(tools)||tools.length>16)throw Error();
 if(body.tool_choice!==undefined&&(body.tool_choice!=='auto'||!tools.length))throw Error();
 const toolByName=new Map();
 for(const tool of tools){
  if(!plain(tool)||Object.keys(tool).some(k=>!['type','function'].includes(k))||tool.type!=='function'||!plain(tool.function)||Object.keys(tool.function).some(k=>!['name','description','parameters'].includes(k))||!/^\w{1,100}$/.test(tool.function.name??'')||typeof tool.function.description!=='string'||tool.function.description.length>2000||toolByName.has(tool.function.name))throw Error();
  checkSchema(tool.function.parameters);if(tool.function.parameters.type!=='object'||tool.function.parameters.additionalProperties!==false)throw Error();
  toolByName.set(tool.function.name,tool.function.parameters);
 }
 let chars=0,user=false;const seenCalls=new Set(),pending=new Map();
 for(const message of body.messages){
  if(!plain(message)||!['system','user','assistant','tool'].includes(message.role)||Object.keys(message).some(k=>!['role','content','tool_calls','tool_call_id','name'].includes(k)))throw Error();
  if(typeof message.content!=='string'&&!(message.role==='assistant'&&message.content===null))throw Error();
  chars+=(message.content??'').length;if(chars>24000)throw Error();if(message.role==='user')user=true;
  if(message.role==='tool'){
   if(message.tool_calls!==undefined||typeof message.tool_call_id!=='string'||!pending.has(message.tool_call_id)||message.name!==pending.get(message.tool_call_id))throw Error();
   pending.delete(message.tool_call_id);continue;
  }
  if(message.tool_call_id!==undefined||message.name!==undefined||pending.size)throw Error();
  if(message.tool_calls!==undefined){
   if(message.role!=='assistant'||!Array.isArray(message.tool_calls)||!message.tool_calls.length||message.tool_calls.length>8)throw Error();
   for(const call of message.tool_calls){
    if(!plain(call)||Object.keys(call).some(k=>!['id','type','function'].includes(k))||call.type!=='function'||typeof call.id!=='string'||!call.id||call.id.length>100||seenCalls.has(call.id)||!plain(call.function)||Object.keys(call.function).some(k=>!['name','arguments'].includes(k))||!/^\w{1,100}$/.test(call.function.name??'')||typeof call.function.arguments!=='string'||call.function.arguments.length>8000)throw Error();
    const schema=toolByName.get(call.function.name);if(!schema)throw Error();
    let args;try{args=JSON.parse(call.function.arguments);validateData(schema,args);}catch{throw Error();}
    seenCalls.add(call.id);pending.set(call.id,call.function.name);
   }
  }
 }
 if(!user||pending.size)throw Error();
 return {model:body.model,messages:body.messages,tools,stream:true};
}
const modelPattern=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
export function configuredModels(env={}){
 if(typeof env.SUTRA_MODELS!=='string')return [];
 const models=env.SUTRA_MODELS.split(',').map(s=>s.trim());
 return models.length<=3&&new Set(models).size===models.length&&models.every(m=>modelPattern.test(m)&&m!=='mock-1')?models:[];
}
export function inferenceStatus(env={}){
 const concurrent=Number(env.SUTRA_MAX_CONCURRENT);
 const sourceQuotaRequested=env.SUTRA_MAX_DAILY_SOURCE_READS!==undefined||env.SUTRA_MAX_CLIENT_SOURCE_READS!==undefined;
 return (!sourceQuotaRequested||!!sourceQuotaLimits(env))&& typeof env.SUTRA_ALLOWED_ORIGIN==='string'&&/^https:\/\/[^/]+$/.test(env.SUTRA_ALLOWED_ORIGIN)&&
  Number.isInteger(Number(env.SUTRA_MAX_OUTPUT_TOKENS))&&Number(env.SUTRA_MAX_OUTPUT_TOKENS)>=64&&Number(env.SUTRA_MAX_OUTPUT_TOKENS)<=1024&&
  Number.isInteger(concurrent)&&concurrent>=1&&concurrent<=10&&!!quotaLimits(env)&&
  configuredModels(env).length>0&&env.SUTRA_ENABLE_INFERENCE==='true'&&
  !!inferenceBackend(env)&&
  typeof env.SUTRA_CLIENT_HASH_SECRET==='string'&&env.SUTRA_CLIENT_HASH_SECRET.length>=32&&!!env.SUTRA_QUOTA&&typeof env.SUTRA_MODELS==='string';
}
// Public, opaque configuration version; NOT a credential, model attestation or consent token.
// Domain-separated from daily client HMACs. No question, client identifier or raw secret leaves this function.
export async function inferenceContractId(env={},snapshot={backend:inferenceBackend(env),models:configuredModels(env),maxOutput:Number(env.SUTRA_MAX_OUTPUT_TOKENS)}){
 const {backend,models,maxOutput}=snapshot;
 if(!backend||typeof env.SUTRA_CLIENT_HASH_SECRET!=='string'||env.SUTRA_CLIENT_HASH_SECRET.length<32)throw Error('CONTRACT_CONFIG');
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(env.SUTRA_CLIENT_HASH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const message=JSON.stringify(['sutra-inference-contract-v2',backend.mode,backend.url,backend.credential,models,maxOutput,env.SUTRA_ALLOWED_ORIGIN,quotaLimits(env),sourceQuotaLimits(env),[env.SUTRA_CONTENT_MODE,env.SUTRA_CONTENT_VERSION,env.SUTRA_CATALOG_SHA256,env.SUTRA_TRANSCRIPT_SHA256]]);
 const signature=await crypto.subtle.sign('HMAC',key,enc.encode(message));
 return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function handleInference(request,env,{fetchImpl=fetch}={}){
 if(request.method!=='POST')return error('METHOD',405);
 if(request.signal.aborted)return error('CANCELLED',499);
 if(!inferenceStatus(env))return error('DISABLED',503);
 const origin=new URL(request.url).origin;if(request.headers.get('Origin')!==origin||origin!==env.SUTRA_ALLOWED_ORIGIN||request.headers.has('Authorization')||!isJsonRequest(request))return error('ORIGIN_OR_HEADERS',403);
 const models=configuredModels(env),backend=inferenceBackend(env);const maxOutput=Number(env.SUTRA_MAX_OUTPUT_TOKENS);
 if(!models.length||models.length>3||models.some(m=>!m||m.length>100)||!Number.isInteger(maxOutput)||maxOutput<64||maxOutput>1024)return error('CONFIG',503);
 // Snapshot-aware requests must pin the exact server configuration before body read,
 // quota or upstream contact. Generic portable callers may omit both preconditions.
 const expected=request.headers.get('X-Sutra-Inference-Contract');
 if(expected!==null||request.headers.has('X-Sutra-Catalog-Sha256')){
  let matches=false;
  try{matches=/^[a-f0-9]{64}$/.test(expected??'')&&expected===await inferenceContractId(env,{backend,models,maxOutput});}catch{}
  if(!matches)return Response.json({error:{code:'INFERENCE_CONTRACT_MISMATCH'}},{status:409,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Sutra-Precondition':'inference'}});
 }
 if(request.signal.aborted)return error('CANCELLED',499);
 let body;try{body=validPayload(await readJson(request),models);}catch{return error(request.signal.aborted?'CANCELLED':'PAYLOAD',request.signal.aborted?499:400);}
 if(request.signal.aborted)return error('CANCELLED',499);
 const upstreamBody=JSON.stringify({...body,
  ...(backend.mode==='self_hosted'?{max_tokens:maxOutput}:{max_completion_tokens:maxOutput}),
  stream_options:{include_usage:true},
  ...(backend.mode==='hosted'&&body.tools.length?{tool_choice:'auto'}:{})
 });
 const inputBytes=new TextEncoder().encode(upstreamBody).byteLength;
 if(inputBytes<1||inputBytes>MAX_INPUT_BYTES)return error('PAYLOAD',400);
 let quota,lease,released=false;
 const releaseQuota=async()=>{
  if(released||!quota||!lease)return;released=true;
  try{const signal=AbortSignal.timeout(ADMISSION_MS);await readQuotaReply(quota,'/release',{lease},signal);}catch{}
 };
 try{
  const window=admissionWindow(),quotaSignal=AbortSignal.any([request.signal,AbortSignal.timeout(ADMISSION_MS)]);
  const clientKey=await clientKeyForRequest(request,env.SUTRA_CLIENT_HASH_SECRET,window.day);
  quotaSignal.throwIfAborted();
  quota=env.SUTRA_QUOTA.get(env.SUTRA_QUOTA.idFromName('sutra-inference-global-v1'));
  const reservation=await readQuotaReply(quota,'/reserve',{clientKey,inputBytes,outputTokens:maxOutput,...window},quotaSignal);
  if(reservation.status!==200)return error(reservation.status===429?'QUOTA':'QUOTA_UNAVAILABLE',reservation.status===429?429:503);
  lease=reservation.data.lease;
  if(Date.now()>=window.admitUntil){await releaseQuota();return error('QUOTA_UNAVAILABLE',503);}
 }catch{return error(request.signal.aborted?'CANCELLED':'QUOTA_UNAVAILABLE',request.signal.aborted?499:503);}
 if(request.signal.aborted){await releaseQuota();return error('CANCELLED',499);}
 const controller=new AbortController(),cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,30000);
 const cleanup=()=>{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);};
 let upstream,received,finished=false;
 const dispose=body=>{try{void Promise.resolve(body?.cancel()).catch(()=>{});}catch{}};
 try{
  // An injected or upstream transport may ignore AbortSignal and return a
  // response after the public request has timed out. Such late bodies must
  // never be streamed, retained or represented as a successful provider call.
  const incoming=Promise.resolve().then(()=>{
   controller.signal.throwIfAborted();
   // Cloudflare Workers supports manual, not redirect:'error'. Never follow
   // a redirect carrying a server credential; require exact full SSE 200.
   return fetchImpl(backend.url,{method:'POST',redirect:'manual',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${backend.credential}`},body:upstreamBody,signal:controller.signal});
  }).then(value=>{
   if(finished||controller.signal.aborted){dispose(value?.body);throw Error('Cancelled upstream');}
   received=value;return value;
  });
  upstream=await abortable(incoming,controller.signal);
  controller.signal.throwIfAborted();
 }catch{finished=true;dispose((upstream??received)?.body);controller.abort();cleanup();await releaseQuota();return error('UPSTREAM_UNAVAILABLE',502);}
 finally{finished=true;}
 if(upstream?.redirected||upstream?.url&&upstream.url!==backend.url||upstream?.status!==200||upstream.headers.has('content-range')||
    !/^text\/event-stream(?:\s*;|$)/i.test(upstream.headers.get('content-type')??'')){
  dispose(upstream?.body);controller.abort();cleanup();await releaseQuota();return error('UPSTREAM_REJECTED',502);
 }
 const encoder=new TextEncoder(),accumulator=makeAccumulator();
 const iterator=readSse(upstream,{signal:controller.signal})[Symbol.asyncIterator]();
 let terminal=false,finalized,sink,emitted=0,consumerCancelled=false;
 // Finalize exactly once on EOF, parser rejection, client cancellation or
 // deadline, including while a backpressured consumer issues no more reads.
 const finish=()=>{
  if(finalized)return finalized;
  terminal=true;controller.signal.removeEventListener('abort',onAbort);
  controller.abort();cleanup();
  finalized=(async()=>{
   try{await iterator.return();}catch{}
   // The generator may never have been entered. Dispose an unlocked
   // upstream body in that case as well as after iterator cleanup.
   dispose(upstream.body);
   await releaseQuota();
  })();
  return finalized;
 };
 const onAbort=()=>{
  if(terminal)return;
  try{sink?.error(new InferenceError('CANCELLED'));}catch{}
  void finish();
 };
 const send=(out,text)=>{
  const bytes=encoder.encode(text);
  if(bytes.byteLength>MAX_SSE_BYTES-emitted)throw new InferenceError('STREAM_SIZE');
  emitted+=bytes.byteLength;out.enqueue(bytes);
 };
 const stream=new ReadableStream({
  start(out){
   sink=out;controller.signal.addEventListener('abort',onAbort,{once:true});
   if(controller.signal.aborted)onAbort();
  },
  async pull(out){
   if(terminal)return;
   try{
    controller.signal.throwIfAborted();
    const frame=await iterator.next();
    if(terminal)return;
    controller.signal.throwIfAborted();
    if(frame.done)throw new InferenceError('INCOMPLETE_STREAM');
    if(frame.value.done){
     accumulator.finish();controller.signal.throwIfAborted();
     const doneBytes=encoder.encode('data: [DONE]\n\n');
     if(doneBytes.byteLength>MAX_SSE_BYTES-emitted)throw new InferenceError('STREAM_SIZE');
     // Do not expose successful terminal completion before the bounded lease
     // release attempt settles. The next explicit run should not race our
     // own successful teardown. Failed release still falls back to lease TTL.
     await finish();
     if(consumerCancelled)return;
     if(request.signal.aborted){try{out.error(new InferenceError('CANCELLED'));}catch{}return;}
     try{out.enqueue(doneBytes);out.close();}catch{try{out.error(new InferenceError('INCOMPLETE_STREAM'));}catch{}}
     return;
    }
    const clean=accumulator.accept(frame.value.data);
    send(out,`data: ${JSON.stringify(clean)}\n\n`);
   }catch{
    if(terminal)return;
    try{send(out,'data: {"error":{"code":"INCOMPLETE_STREAM"}}\n\n');out.close();}
    catch{try{out.error(new InferenceError('INCOMPLETE_STREAM'));}catch{}}
    await finish();
   }
  },
  cancel(){consumerCancelled=true;return finish();},
 });
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
