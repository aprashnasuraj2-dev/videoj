import {plain,InferenceError,readSse,makeAccumulator,abortable} from '../../packages/sutra-inference/protocol.js';
import {checkSchema,validateData} from '../../packages/sutra-runtime/vendor/nsdeploy/actions.js';
import {quotaLimits,MAX_INPUT_BYTES} from './quota.js';
export const UPSTREAM='https://api.openai.com/v1/chat/completions';
// No inference backend is selected implicitly. The self-hosted mode requires a
// private authenticated HTTPS gateway; never forward to caller-supplied URLs.
export function inferenceBackend(env={}){
 const mode=env.SUTRA_INFERENCE_BACKEND;
 if(mode==='hosted'){
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

const error=(code,status)=>Response.json({error:{code,message:'Inference is unavailable or stopped; no complete result is claimed.'}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function readJson(request,max=32768){
 const reader=request.body?.getReader();if(!reader)throw Error('body');let total=0;const chunks=[];const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();
 try{for(;;){const {value,done}=await abortable(reader.read(),controller.signal);if(done)break;total+=value.byteLength;if(total>max)throw Error('size');chunks.push(value);}}finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);void reader.cancel().catch(()=>{});}
 const data=new Uint8Array(total);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
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
 return typeof env.SUTRA_ALLOWED_ORIGIN==='string'&&/^https:\/\/[^/]+$/.test(env.SUTRA_ALLOWED_ORIGIN)&&
  Number.isInteger(Number(env.SUTRA_MAX_OUTPUT_TOKENS))&&Number(env.SUTRA_MAX_OUTPUT_TOKENS)>=64&&Number(env.SUTRA_MAX_OUTPUT_TOKENS)<=1024&&
  Number.isInteger(concurrent)&&concurrent>=1&&concurrent<=10&&!!quotaLimits(env)&&
  configuredModels(env).length>0&&env.SUTRA_ENABLE_INFERENCE==='true'&&
  !!inferenceBackend(env)&&
  typeof env.SUTRA_CLIENT_HASH_SECRET==='string'&&env.SUTRA_CLIENT_HASH_SECRET.length>=32&&!!env.SUTRA_QUOTA&&typeof env.SUTRA_MODELS==='string';
}
export async function handleInference(request,env,{fetchImpl=fetch}={}){
 if(request.method!=='POST')return error('METHOD',405);
 if(!inferenceStatus(env))return error('DISABLED',503);
 const origin=new URL(request.url).origin;if(request.headers.get('Origin')!==origin||origin!==env.SUTRA_ALLOWED_ORIGIN||request.headers.has('Authorization')||!request.headers.get('Content-Type')?.startsWith('application/json'))return error('ORIGIN_OR_HEADERS',403);
 const models=configuredModels(env),backend=inferenceBackend(env);const maxOutput=Number(env.SUTRA_MAX_OUTPUT_TOKENS);
 if(!models.length||models.length>3||models.some(m=>!m||m.length>100)||!Number.isInteger(maxOutput)||maxOutput<64||maxOutput>1024)return error('CONFIG',503);
 let body;try{body=validPayload(await readJson(request),models);}catch{return error('PAYLOAD',400);}
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
  try{const signal=AbortSignal.timeout(5000);await abortable(quota.fetch('https://quota.internal/release',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lease}),signal}),signal);}catch{}
 };
 try{
  const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SUTRA_CLIENT_HASH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const identity=`${new Date().toISOString().slice(0,10)}:${(request.headers.get('CF-Connecting-IP')??'unknown').slice(0,64)}`;
  const signature=await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(identity));const clientKey=Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
  quota=env.SUTRA_QUOTA.get(env.SUTRA_QUOTA.idFromName('sutra-inference-global-v1'));
  const quotaSignal=AbortSignal.any([request.signal,AbortSignal.timeout(5000)]);
  const reservation=await abortable(quota.fetch('https://quota.internal/reserve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientKey,inputBytes,outputTokens:maxOutput}),signal:quotaSignal}),quotaSignal);
  if(!reservation.ok)return error(reservation.status===429?'QUOTA':'QUOTA_UNAVAILABLE',reservation.status===429?429:503);
  const reservationData=await abortable(reservation.json(),quotaSignal);
  if(reservationData.allowed!==true||typeof reservationData.lease!=='string'||!/^[0-9a-f-]{36}$/i.test(reservationData.lease))return error('QUOTA_UNAVAILABLE',503);
  lease=reservationData.lease;
 }catch{return error('QUOTA_UNAVAILABLE',503);}
 if(request.signal.aborted){await releaseQuota();return error('CANCELLED',499);}
 const controller=new AbortController(),cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,30000);
 const cleanup=()=>{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);};
 let upstream;
 try{upstream=await abortable(fetchImpl(backend.url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${backend.credential}`},body:upstreamBody,signal:controller.signal}),controller.signal);}
 catch{controller.abort();cleanup();await releaseQuota();return error('UPSTREAM_UNAVAILABLE',502);}
 if(upstream.redirected||!upstream.ok||!upstream.headers.get('content-type')?.includes('text/event-stream')){void upstream.body?.cancel().catch(()=>{});cleanup();await releaseQuota();return error('UPSTREAM_REJECTED',502);}
 const encoder=new TextEncoder();
 const stream=new ReadableStream({
  async start(sink){
   const accumulator=makeAccumulator();
   try{for await(const chunk of readSse(upstream,{signal:controller.signal})){if(chunk.done){accumulator.finish();sink.enqueue(encoder.encode('data: [DONE]\n\n'));sink.close();return;}const clean=accumulator.accept(chunk.data);sink.enqueue(encoder.encode(`data: ${JSON.stringify(clean)}\n\n`));}}
   catch{try{sink.enqueue(encoder.encode('data: {"error":{"code":"INCOMPLETE_STREAM"}}\n\n'));sink.close();}catch{}}
   finally{controller.abort();cleanup();await releaseQuota();}
  },
  cancel(){controller.abort();cleanup();void releaseQuota();},
 });
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
