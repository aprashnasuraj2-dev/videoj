import {plain,InferenceError,readSse,makeAccumulator,abortable} from '../../packages/sutra-inference/protocol.js';
import {checkSchema} from '../../packages/sutra-runtime/vendor/nsdeploy/actions.js';
export const UPSTREAM='https://api.openai.com/v1/chat/completions';
const error=(code,status)=>Response.json({error:{code,message:'Inference is unavailable or stopped; no complete result is claimed.'}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function readJson(request,max=32768){
 const reader=request.body?.getReader();if(!reader)throw Error('body');let total=0;const chunks=[];const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();
 try{for(;;){const {value,done}=await abortable(reader.read(),controller.signal);if(done)break;total+=value.byteLength;if(total>max)throw Error('size');chunks.push(value);}}finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);void reader.cancel().catch(()=>{});}
 const data=new Uint8Array(total);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}
function validPayload(body,models){
 if(!plain(body)||Object.keys(body).some(k=>!['model','messages','tools','stream'].includes(k))||!models.includes(body.model)||body.stream!==true||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>32||!Array.isArray(body.tools)||body.tools.length>16)throw Error();
 let chars=0;const calls=new Set();let user=false;
 for(const message of body.messages){
  if(!plain(message)||!['system','user','assistant','tool'].includes(message.role)||Object.keys(message).some(k=>!['role','content','tool_calls','tool_call_id','name'].includes(k)))throw Error();
  if(typeof message.content!=='string'&&!(message.role==='assistant'&&message.content===null))throw Error();chars+=(message.content??'').length;if(chars>24000)throw Error();if(message.role==='user')user=true;
  if(message.tool_calls!==undefined){if(message.role!=='assistant'||!Array.isArray(message.tool_calls)||message.tool_calls.length>2)throw Error();for(const call of message.tool_calls){if(!plain(call)||call.type!=='function'||typeof call.id!=='string'||call.id.length>100||calls.has(call.id)||!plain(call.function)||!/^\w{1,100}$/.test(call.function.name??'')||typeof call.function.arguments!=='string'||call.function.arguments.length>8000)throw Error();calls.add(call.id);}}
  if(message.role==='tool'&&(!calls.has(message.tool_call_id)||typeof message.content!=='string'))throw Error();
 }
 if(!user)throw Error();
 for(const tool of body.tools){if(!plain(tool)||tool.type!=='function'||!plain(tool.function)||Object.keys(tool.function).some(k=>!['name','description','parameters'].includes(k))||!/^\w{1,100}$/.test(tool.function.name??'')||typeof tool.function.description!=='string')throw Error();checkSchema(tool.function.parameters);if(tool.function.parameters.type!=='object'||tool.function.parameters.additionalProperties!==false)throw Error();}
 return body;
}
export function inferenceStatus(env){
 const concurrent=Number(env.SUTRA_MAX_CONCURRENT);
 return typeof env.SUTRA_ALLOWED_ORIGIN==='string'&&/^https:\/\/[^/]+$/.test(env.SUTRA_ALLOWED_ORIGIN)&&
  Number.isInteger(Number(env.SUTRA_MAX_OUTPUT_TOKENS))&&Number(env.SUTRA_MAX_OUTPUT_TOKENS)>=64&&Number(env.SUTRA_MAX_OUTPUT_TOKENS)<=1024&&
  Number.isInteger(concurrent)&&concurrent>=1&&concurrent<=10&&
  env.SUTRA_MODELS?.split(',').length<=3&&!!env.SUTRA_MODELS?.trim()&&env.SUTRA_ENABLE_INFERENCE==='true'&&
  typeof env.SUTRA_PROVIDER_KEY==='string'&&env.SUTRA_PROVIDER_KEY.length>=8&&
  typeof env.SUTRA_CLIENT_HASH_SECRET==='string'&&env.SUTRA_CLIENT_HASH_SECRET.length>=32&&!!env.SUTRA_QUOTA&&typeof env.SUTRA_MODELS==='string';
}
export async function handleInference(request,env,{fetchImpl=fetch}={}){
 if(request.method!=='POST')return error('METHOD',405);
 if(!inferenceStatus(env))return error('DISABLED',503);
 const origin=new URL(request.url).origin;if(request.headers.get('Origin')!==origin||origin!==env.SUTRA_ALLOWED_ORIGIN||request.headers.has('Authorization')||!request.headers.get('Content-Type')?.startsWith('application/json'))return error('ORIGIN_OR_HEADERS',403);
 const models=env.SUTRA_MODELS.split(',').map(s=>s.trim());const maxOutput=Number(env.SUTRA_MAX_OUTPUT_TOKENS);
 if(!models.length||models.length>3||models.some(m=>!m||m.length>100)||!Number.isInteger(maxOutput)||maxOutput<64||maxOutput>1024)return error('CONFIG',503);
 let body;try{body=validPayload(await readJson(request),models);}catch{return error('PAYLOAD',400);}
 let quota,lease,released=false;
 const releaseQuota=async()=>{
  if(released||!quota||!lease)return;released=true;
  try{await quota.fetch('https://quota.internal/release',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lease})});}catch{}
 };
 try{
  const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SUTRA_CLIENT_HASH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const identity=`${new Date().toISOString().slice(0,10)}:${(request.headers.get('CF-Connecting-IP')??'unknown').slice(0,64)}`;
  const signature=await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(identity));const clientKey=Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
  quota=env.SUTRA_QUOTA.get(env.SUTRA_QUOTA.idFromName('sutra-inference-global-v1'));
  const quotaSignal=AbortSignal.any([request.signal,AbortSignal.timeout(5000)]);
  const reservation=await abortable(quota.fetch('https://quota.internal/reserve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientKey}),signal:quotaSignal}),quotaSignal);
  if(!reservation.ok)return error(reservation.status===429?'QUOTA':'QUOTA_UNAVAILABLE',reservation.status===429?429:503);
  const reservationData=await abortable(reservation.json(),quotaSignal);
  if(reservationData.allowed!==true||typeof reservationData.lease!=='string'||!/^[0-9a-f-]{36}$/i.test(reservationData.lease))return error('QUOTA_UNAVAILABLE',503);
  lease=reservationData.lease;
 }catch{return error('QUOTA_UNAVAILABLE',503);}
 if(request.signal.aborted){await releaseQuota();return error('CANCELLED',499);}
 const controller=new AbortController(),cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,30000);
 const cleanup=()=>{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);};
 let upstream;
 try{upstream=await abortable(fetchImpl(UPSTREAM,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.SUTRA_PROVIDER_KEY}`},body:JSON.stringify({...body,max_completion_tokens:maxOutput,stream_options:{include_usage:true},...(body.tools.length?{tool_choice:'auto'}:{})}),signal:controller.signal}),controller.signal);}
 catch{controller.abort();cleanup();await releaseQuota();return error('UPSTREAM_UNAVAILABLE',502);}
 if(!upstream.ok||!upstream.headers.get('content-type')?.includes('text/event-stream')){void upstream.body?.cancel().catch(()=>{});cleanup();await releaseQuota();return error('UPSTREAM_REJECTED',502);}
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
