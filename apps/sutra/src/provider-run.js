import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
import {abortable} from '../../../packages/sutra-inference/protocol.js';
const modelPattern=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const validOrigin=origin=>{const u=new URL(origin);return u.origin===origin&&(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname));};
export async function discoverProvider({origin,fetchImpl=fetch,signal}={}){
 if(!validOrigin(origin))throw Error('Invalid caller origin');
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,5000);
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  const response=await abortable(fetchImpl(origin+'/api/status',{method:'GET',redirect:'error',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal}),controller.signal);
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json')||response.url&&new URL(response.url).origin!==origin)throw Error('Unavailable status');
  const reader=response.body?.getReader();if(!reader)throw Error('Unavailable status');let size=0;const parts=[];
  try{for(;;){const {done,value}=await abortable(reader.read(),controller.signal);if(done)break;size+=value.byteLength;if(size>2048)throw Error('Oversized status');parts.push(value);}}finally{void reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(data?.sourceTools!=='synthetic-catalog'||data.factualTruth!=='unverified'||!['configured','disabled'].includes(data.inference))throw Error('Invalid status');
  if(data.inference==='disabled'){if(Object.hasOwn(data,'model'))throw Error('Invalid disabled status');return {state:'disabled'};}
  if(typeof data.model!=='string'||!modelPattern.test(data.model)||data.model==='mock-1')throw Error('Invalid model status');
  return {state:'configured',model:data.model};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
export async function runProviderLesson({origin,baseUrl,model,question,sources,fetchImpl=fetch,signal}={}){
 if(!validOrigin(origin)||typeof model!=='string'||!modelPattern.test(model)||model==='mock-1'||typeof question!=='string'||!question.trim()||question.length>1200)throw Error('Invalid run input');
 const controller=new AbortController(),abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const receipts=new Map(),usage={calls:0,reported:0,promptTokens:0,completionTokens:0,totalTokens:0};
 const adapter=createProviderAdapter({origin,model,fetchImpl});
 const measured={...adapter,async chat(args){
  usage.calls++;const answer=await adapter.chat(args);
  if(answer.usage){usage.reported++;usage.promptTokens+=answer.usage.prompt_tokens;usage.completionTokens+=answer.usage.completion_tokens;usage.totalTokens+=answer.usage.total_tokens;}
  return answer;
 }};
 try{
  const published=await loadLocalNetwork({baseUrl,expectedOrigin:origin,networkName:'source_learner',allowSourceTools:true,fetchImpl,signal:controller.signal});
  const result=await runNetwork({...published,request:question.trim(),model:measured,signal:controller.signal,sourceTools:{origin,sources,fetchImpl,onReceipt:receipt=>{const key=receipt.sourceId+'\u0000'+receipt.cueId;if(receipts.size<20||receipts.has(key))receipts.set(key,receipt);}}});
  return {model,text:result.text,agentCalls:result.agentCalls,modelCalls:result.modelCalls,receipts:[...receipts.values()],usage:{...usage,complete:usage.reported===usage.calls},truthStatus:'unverified'};
 }finally{signal?.removeEventListener('abort',abort);controller.abort();}
}
