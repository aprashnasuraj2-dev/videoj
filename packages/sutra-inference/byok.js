import {InferenceError,readSse,makeAccumulator,stop,abortable} from './protocol.js';

export const OPENROUTER_ORIGIN='https://openrouter.ai';
export const OPENROUTER_CHAT_URL=OPENROUTER_ORIGIN+'/api/v1/chat/completions';

function validSecret(value){return typeof value==='string'&&value.length>=8&&value.length<=512&&!/[\u0000-\u0020\u007f]/.test(value);}
function validModel(value){return typeof value==='string'&&value.trim().length>0&&value.length<=120&&!/[\u0000-\u001f\u007f]/.test(value);}

/**
 * Browser-direct BYOK adapter for one fixed permitted router.
 * The key lives only in this closure and is never exposed as a property or return value.
 */
export function createOpenRouterByokAdapter({key,model,fetchImpl=fetch,timeoutMs=30000}={}){
 if(!validSecret(key)||!validModel(model)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)stop('BYOK_CONFIG');
 let secret=key;const selectedModel=model.trim();
 const adapter={
  mode:'provider',
  routerId:'openrouter',
  routerOrigin:OPENROUTER_ORIGIN,
  model:selectedModel,
  configured:()=>secret.length>0,
  clear(){secret='';},
  async chat({messages,tools=[],signal}){
   if(!secret)stop('BYOK_KEY_MISSING');
   if(signal?.aborted)stop('CANCELLED');
   const controller=new AbortController(),cancel=()=>controller.abort();
   signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,timeoutMs);
   const body={model:selectedModel,messages,tools,stream:true,stream_options:{include_usage:true},...(tools.length?{tool_choice:'auto'}:{})};
   try{
    const response=await abortable(fetchImpl(OPENROUTER_CHAT_URL,{
     method:'POST',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',
     headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json',Accept:'text/event-stream'},
     body:JSON.stringify(body),signal:controller.signal
    }),controller.signal);
    if(!response.ok){
     void response.body?.cancel().catch(()=>{});
     throw new InferenceError(response.status===401||response.status===403?'BYOK_AUTH':response.status===402?'BYOK_CREDIT':response.status===429?'BYOK_QUOTA':'BYOK_REQUEST_REJECTED');
    }
    if(!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream'))stop('STREAM_TYPE');
    const accumulator=makeAccumulator();
    for await(const chunk of readSse(response,{signal:controller.signal})){
     if(chunk.done)return accumulator.finish();
     accumulator.accept(chunk.data);
    }
    stop('INCOMPLETE_STREAM');
   }catch(error){
    if(error instanceof InferenceError)throw error;
    throw new InferenceError(controller.signal.aborted?'CANCELLED':'TRANSPORT');
   }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',cancel);
   }
  }
 };
 return Object.freeze(adapter);
}
