import {compileNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
import {abortable} from '../../../packages/sutra-inference/protocol.js';
import {loadContentProfile} from '../../../packages/sutra-content-profile/index.js';
const modelPattern=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const validOrigin=origin=>{const u=new URL(origin);return u.origin===origin&&(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname));};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const contentError=()=>Object.assign(Error('Published content changed; reload the lesson before using inference.'),{code:'CONTENT_CHANGED'});
const contractError=()=>Object.assign(Error('Provider publication changed; check availability again.'),{code:'CONTRACT_CHANGED'});
const contentIdentity=content=>({profileSha256:content.artifacts.profileSha256,catalogSha256:content.artifacts.catalogSha256,transcriptSha256:content.artifacts.transcriptSha256,contentVersion:content.profile.contentVersion,contentMode:content.profile.mode,primarySourceId:content.profile.primarySourceId});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function readPublicJson({url,origin,fetchImpl,signal,maxBytes}){
 const response=await abortable(fetchImpl(url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'},signal}),signal);
 if(!response.ok||response.redirected||!response.headers.get('content-type')?.includes('application/json')||response.url&&new URL(response.url).origin!==origin)throw Error('Unavailable public contract');
 const reader=response.body?.getReader();if(!reader)throw Error('Unavailable public contract');let size=0;const parts=[];
 try{for(;;){const {done,value}=await abortable(reader.read(),signal);if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('Oversized public contract');parts.push(value);}}finally{void reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!plain(data))throw Error('Invalid public contract');return data;
}
export async function discoverProvider({origin,loadedContent,fetchImpl=fetch,signal}={}){
 if(!validOrigin(origin))throw Error('Invalid caller origin');
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,5000);
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  const data=await readPublicJson({url:origin+'/api/status',origin,fetchImpl,signal:controller.signal,maxBytes:4096});
  if(data.sourceTools!=='catalog'||data.factualTruth!=='unverified'||!['configured','disabled'].includes(data.inference)||!plain(data.content)||Object.keys(data.content).some(k=>!['mode','contentVersion','catalogSha256','primarySourceId'].includes(k)))throw Error('Invalid status');
  const allowedDisabled=['inference','sourceTools','content','factualTruth'];
  const allowedConfigured=[...allowedDisabled,'model','routerBase','publisherFunded','byok'];
  const allowed=data.inference==='disabled'?allowedDisabled:allowedConfigured;
  if(Object.keys(data).some(k=>!allowed.includes(k)))throw Error('Unexpected status metadata');
  if(data.inference==='disabled'){if(Object.keys(data).some(k=>!allowedDisabled.includes(k)))throw Error('Invalid disabled status');return {state:'disabled'};}
  if(typeof data.model!=='string'||!modelPattern.test(data.model)||data.model==='mock-1'||data.routerBase!=='/api/v1'||data.publisherFunded!==true||data.byok!==false)throw Error('Invalid model/router status');
  if(!loadedContent)throw contentError();
  const content=await loadContentProfile({baseUrl:origin+'/content/',fetchImpl,signal:controller.signal});
  if(!same(contentIdentity(content),contentIdentity(loadedContent)))throw contentError();
  if(content.profile.mode!==data.content.mode||content.profile.contentVersion!==data.content.contentVersion||content.profile.catalog.sha256!==data.content.catalogSha256||content.profile.primarySourceId!==data.content.primarySourceId)throw Error('Published content does not match configured source catalog');
  const manifest=await readPublicJson({url:origin+'/agents/agent-manifest.json',origin,fetchImpl,signal:controller.signal,maxBytes:32768});
  const router=manifest.llm_router;
  if(!plain(router)||Object.keys(router).some(k=>!['base_url','mock','publisher_funded'].includes(k))||router.base_url!==origin+data.routerBase||router.mock!==false||router.publisher_funded!==true)throw Error('Published router does not match configured provider');
  if(manifest.coded_tools||manifest.actions||manifest.deployment?.direct_byok!==false)throw Error('Published deployment contradicts no-BYOK policy');
  if(!Array.isArray(manifest.networks))throw Error('Missing published networks');
  const entries=manifest.networks.filter(x=>plain(x)&&x.name==='source_learner');
  if(entries.length!==1||typeof entries[0].hocon!=='string'||typeof entries[0].front_man!=='string')throw Error('Missing exact source learner');
  const graphUrl=new URL(entries[0].hocon,origin+'/agents/');
  if(graphUrl.origin!==origin||graphUrl.username||graphUrl.password||graphUrl.search||graphUrl.hash||!graphUrl.pathname.startsWith('/agents/'))throw Error('Invalid source learner URL');
  const graph=await readPublicJson({url:graphUrl.href,origin,fetchImpl,signal:controller.signal,maxBytes:65536});
  if(!plain(graph.llm_config)||Object.keys(graph.llm_config).some(k=>k!=='model_name')||graph.llm_config.model_name!==data.model)throw Error('Published model does not match configured provider');
  const published={definition:graph,name:'source_learner',frontMan:entries[0].front_man,artifacts:{manifest:origin+'/agents/agent-manifest.json',definition:graphUrl.href}};
  compileNetwork(graph,{name:published.name,frontMan:published.frontMan,allowSourceTools:true});
  const contract=Object.freeze({model:data.model,router:router.base_url,content:Object.freeze(contentIdentity(content)),graphUrl:graphUrl.href,frontMan:published.frontMan,graphSha256:await sha(graph)});
  controller.signal.throwIfAborted();
  return {state:'configured',model:data.model,contract,published};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
export async function runProviderLesson({origin,approvedContract,loadedContent,question,fetchImpl=fetch,signal}={}){
 const model=approvedContract?.model;
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
  // Recheck immediately before every explicit run, then execute that exact in-memory graph.
  // The caller's mounted lesson remains the authority for local source receipts.
  const fresh=await discoverProvider({origin,loadedContent,fetchImpl,signal:controller.signal});
  if(fresh.state!=='configured'||!same(fresh.contract,approvedContract))throw contractError();
  controller.signal.throwIfAborted();
  const result=await runNetwork({...fresh.published,request:question.trim(),model:measured,signal:controller.signal,sourceTools:{origin,sources:loadedContent.sources,fetchImpl,onReceipt:receipt=>{const key=receipt.sourceId+'\u0000'+receipt.cueId;if(receipts.size<20||receipts.has(key))receipts.set(key,receipt);}}});
  return {model,text:result.text,agentCalls:result.agentCalls,modelCalls:result.modelCalls,receipts:[...receipts.values()],usage:{...usage,complete:usage.reported===usage.calls},truthStatus:'unverified'};
 }catch(error){
  // Only independently validated receipts survive a failed run. Never retain partial model text.
  const code=signal?.aborted?'CANCELLED':typeof error?.code==='string'&&/^[A-Z_]{2,64}$/.test(error.code)?error.code:'RUN_FAILED';
  const stopped=new Error('Provider lesson stopped');stopped.code=code;
  stopped.partial=Object.freeze({receipts:[...receipts.values()],usage:{...usage,complete:false},agentCalls:error?.diagnostics?.agentCalls??null,modelCalls:error?.diagnostics?.modelCalls??usage.calls});
  throw stopped;
 }finally{signal?.removeEventListener('abort',abort);controller.abort();}
}
