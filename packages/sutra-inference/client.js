import {InferenceError,readSse,makeAccumulator,stop,abortable} from './protocol.js';
// Fixed same-origin default-inference path; keys, upstream URLs and BYOK never enter this API.
export function createProviderAdapter({origin,model,fetchImpl=fetch,timeoutMs=30000}={}){
 let base;try{base=new URL(origin);}catch{stop('CONFIG');}
 if(base.origin!==origin||base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname))||typeof model!=='string'||!model||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)stop('CONFIG');
 return {mode:'provider',approvedModel:model,async chat({messages,tools=[],signal}){
  if(signal?.aborted)stop('CANCELLED');const controller=new AbortController(),cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timer=setTimeout(cancel,timeoutMs),url=`${origin}/api/v1/chat/completions`;
  const dispose=body=>{try{void Promise.resolve(body?.cancel()).catch(()=>{});}catch{}};
  let response,received,finished=false;
  try{
   // The injected host may not honor AbortSignal. Finish the caller promptly
   // while disposing any response body that arrives after cancellation.
   const pending=Promise.resolve().then(()=>{
    if(controller.signal.aborted)stop('CANCELLED');
    return fetchImpl(url,{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages,tools,stream:true}),signal:controller.signal});
   }).then(value=>{
    if(finished||controller.signal.aborted){dispose(value?.body);stop('CANCELLED');}
    received=value;return value;
   });
   response=await abortable(pending,controller.signal);
   if(controller.signal.aborted)stop('CANCELLED');
   if(response?.redirected||response?.url&&response.url!==url)stop('TRANSPORT');
   if(!response?.ok)throw new InferenceError(response?.status===503?'UNAVAILABLE':response?.status===429?'QUOTA':'REQUEST_REJECTED');
   if(response.status!==200||response.headers.has('content-range')||!/^text\/event-stream(?:\s*;|$)/i.test(response.headers.get('content-type')??''))stop('STREAM_TYPE');
   const accumulator=makeAccumulator();for await(const chunk of readSse(response,{signal:controller.signal})){if(chunk.done){if(controller.signal.aborted)stop('CANCELLED');return accumulator.finish();}accumulator.accept(chunk.data);}stop('INCOMPLETE_STREAM');
  }catch(error){if(error instanceof InferenceError)throw error;throw new InferenceError(controller.signal.aborted?'CANCELLED':'TRANSPORT');}
  finally{finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.abort();dispose((response??received)?.body);}

 }};
}
