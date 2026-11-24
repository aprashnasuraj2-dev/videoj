import {InferenceError,readSse,makeAccumulator,stop,abortable} from './protocol.js';
// Fixed same-origin default-inference path; keys, upstream URLs and BYOK never enter this API.
export function createProviderAdapter({origin,model,fetchImpl=fetch,timeoutMs=30000}={}){
 let base;try{base=new URL(origin);}catch{stop('CONFIG');}
 if(base.origin!==origin||base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname))||typeof model!=='string'||!model||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)stop('CONFIG');
 return {mode:'provider',approvedModel:model,async chat({messages,tools=[],signal}){
  if(signal?.aborted)stop('CANCELLED');const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,timeoutMs);
  try{
   const response=await abortable(fetchImpl(`${origin}/api/v1/chat/completions`,{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages,tools,stream:true}),signal:controller.signal}),controller.signal);
   if(!response.ok)throw new InferenceError(response.status===503?'UNAVAILABLE':response.status===429?'QUOTA':'REQUEST_REJECTED');
   if(!response.headers.get('content-type')?.includes('text/event-stream'))stop('STREAM_TYPE');
   const accumulator=makeAccumulator();for await(const chunk of readSse(response,{signal:controller.signal})){if(chunk.done)return accumulator.finish();accumulator.accept(chunk.data);}stop('INCOMPLETE_STREAM');
  }catch(error){if(error instanceof InferenceError)throw error;throw new InferenceError(controller.signal.aborted?'CANCELLED':'TRANSPORT');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }};
}
