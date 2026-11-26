import {createProviderWebTools} from './provider-web-tools.js';
import {parseUniqueJson} from '../../../packages/sutra-consent/strict-json.js';
import {compileNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
import {abortable} from '../../../packages/sutra-inference/protocol.js';
import {validateReceipt,snapshotDataRecord,snapshotDataArray} from '../../../packages/sutra-evidence/index.js';
import {loadContentProfile,readContentBytes} from '../../../packages/sutra-content-profile/index.js';
import {snapshotSourceCatalog} from './source-catalog-snapshot.js';
const modelPattern=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const validOrigin=origin=>{
 if(typeof origin!=='string'||!origin||origin.length>2048||/[\u0000-\u0020\u007f]/.test(origin))return false;
 try{const u=new URL(origin);return u.origin===origin&&(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname));}catch{return false;}
};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const contentError=()=>Object.assign(Error('Published content changed; reload the lesson before using inference.'),{code:'CONTENT_CHANGED'});
const contractError=()=>Object.assign(Error('Provider publication changed; check availability again.'),{code:'CONTRACT_CHANGED'});
const contentIdentity=content=>({profileSha256:content.artifacts.profileSha256,catalogSha256:content.artifacts.catalogSha256,transcriptSha256:content.artifacts.transcriptSha256,contentVersion:content.profile.contentVersion,contentMode:content.profile.mode,primarySourceId:content.profile.primarySourceId});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function createProviderUsageLedger({clock=()=>globalThis.performance?.now?.()??Date.now()}={}){
 if(typeof clock!=='function')throw Error('Invalid usage clock');
 let next=0;const open=new Map(),requests=[];let reported=0,promptTokens=0,completionTokens=0,totalTokens=0;
 const time=()=>{const value=Number(clock());if(!Number.isFinite(value))throw Error('Invalid usage clock');return value;};
 return Object.freeze({
  begin(){const sequence=++next;if(sequence>32)throw Error('Provider request limit exceeded');open.set(sequence,time());return sequence;},
  finish(sequence,{outcome,usage=null,retry=false}={}){
   if(!open.has(sequence)||!['completed','failed','cancelled'].includes(outcome)||typeof retry!=='boolean')throw Error('Invalid provider telemetry');
   let clean=null;
   if(usage!==null){
    if(!['prompt_tokens','completion_tokens','total_tokens'].every(key=>Number.isSafeInteger(usage?.[key])&&usage[key]>=0&&usage[key]<=1000000)||usage.prompt_tokens+usage.completion_tokens!==usage.total_tokens)throw Error('Invalid provider usage');
    clean=Object.freeze({promptTokens:usage.prompt_tokens,completionTokens:usage.completion_tokens,totalTokens:usage.total_tokens});
   }
   const started=open.get(sequence),latencyMs=Math.max(0,Math.min(120000,Math.round(time()-started)));open.delete(sequence);
   if(clean){reported++;promptTokens+=clean.promptTokens;completionTokens+=clean.completionTokens;totalTokens+=clean.totalTokens;}
   const row=Object.freeze({sequence,outcome,retry,latencyMs,usage:clean});requests.push(row);return row;
  },
  snapshot(){
   return Object.freeze({calls:next,reported,promptTokens,completionTokens,totalTokens,complete:open.size===0&&reported===next,
    requests:Object.freeze(requests.map(row=>Object.freeze({...row,usage:row.usage?Object.freeze({...row.usage}):null})))});
  }
 });
}
function assertContractOrigin(contract,origin){
 if(!validOrigin(origin)||contract.router!==origin+'/api/v1')throw contractError();
 let graph;try{graph=new URL(contract.graphUrl);}catch{throw contractError();}
 if(graph.href!==contract.graphUrl||graph.origin!==origin||graph.username||graph.password||graph.search||graph.hash||!graph.pathname.startsWith('/agents/'))throw contractError();
}
// Read only the three consumed options. Ambient headers/referrer/etc. are
// deliberately ignored, but executable descriptors cannot supply authority.
function postOptions(options){
 if(!options||typeof options!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(options)))throw Error('PROVIDER_ROUTE');
 const exact=Object.create(null);
 for(const key of ['method','body','signal']){
  const d=Object.getOwnPropertyDescriptor(options,key);
  if(d&&(!d.enumerable||!Object.hasOwn(d,'value')))throw Error('PROVIDER_ROUTE');
  exact[key]=d?.value;
 }
 if(exact.method!=='POST'||exact.body!==undefined&&(typeof exact.body!=='string'||exact.body.length>32768||new TextEncoder().encode(exact.body).length>32768))throw Error('PROVIDER_ROUTE');
 return exact;
}
// Own a closed primitive consent record before discovery or a callback can run.
export function snapshotApprovedContract(value){
 try{
  const keys=['backend','model','inferenceContractId','router','content','graphUrl','frontMan','graphSha256','webResearch'];
  const innerKeys=['profileSha256','catalogSha256','transcriptSha256','contentVersion','contentMode','primarySourceId'];
  const data=snapshotDataRecord(value,keys.length),inner=snapshotDataRecord(data.content,innerKeys.length);
  if(Object.keys(data).length!==keys.length||Object.keys(inner).length!==innerKeys.length||
     keys.some(k=>k!=='content'&&(typeof data[k]!=='string'||!data[k]||data[k].length>2048))||
     innerKeys.some(k=>typeof inner[k]!=='string'||!inner[k]||inner[k].length>256))throw Error();
  const hash=v=>/^[a-f0-9]{64}$/.test(v);
  if(!['hosted','self_hosted'].includes(data.backend)||!modelPattern.test(data.model)||data.model==='mock-1'||!['configured','disabled'].includes(data.webResearch)||
     ![data.inferenceContractId,data.graphSha256,inner.profileSha256,inner.catalogSha256,inner.transcriptSha256].every(hash))throw Error();
  const content=Object.freeze(Object.fromEntries(innerKeys.map(k=>[k,inner[k]])));
  return Object.freeze(Object.fromEntries(keys.map(k=>[k,k==='content'?content:data[k]])));
 }catch{throw contractError();}
}
export function snapshotLearningContext(value){
 if(value===null||value===undefined)return null;
 try{
  const keys=['sourceId','sourceVersion','playback','currentCueId','inspectedCueId'];
  const data=snapshotDataRecord(value,keys.length);
  if(Object.keys(data).length!==keys.length||keys.some(k=>!Object.hasOwn(data,k)))throw Error();
  const id=v=>typeof v==='string'&&v.length>=1&&v.length<=120&&!/[\u0000-\u001f\u007f]/.test(v);
  if(!id(data.sourceId)||!id(data.sourceVersion)||![data.currentCueId,data.inspectedCueId].every(v=>v===null||id(v)))throw Error();
  const available=data.playback?.available;
  const playback=snapshotDataRecord(data.playback,available===true?6:2);
  if(available===true){
   const pkeys=['available','currentTime','duration','paused','ended','seeking'];
   if(Object.keys(playback).length!==pkeys.length||pkeys.some(k=>!Object.hasOwn(playback,k))||
      !Number.isFinite(playback.currentTime)||playback.currentTime<0||!Number.isFinite(playback.duration)||playback.duration<=0||playback.currentTime>playback.duration+.1||
      [playback.paused,playback.ended,playback.seeking].some(v=>typeof v!=='boolean'))throw Error();
  }else{
   if(available!==false||Object.keys(playback).length!==2||!Object.hasOwn(playback,'reason')||typeof playback.reason!=='string'||!/^[a-z][a-z0-9_]{0,63}$/.test(playback.reason))throw Error();
  }
  return Object.freeze({sourceId:data.sourceId,sourceVersion:data.sourceVersion,playback:Object.freeze({...playback}),currentCueId:data.currentCueId,inspectedCueId:data.inspectedCueId});
 }catch{const error=Error('Invalid caller learning context.');error.code='LEARNING_CONTEXT';throw error;}
}
export function snapshotConversationTurns(value=[]){
 try{
  const rows=snapshotDataArray(value,2);
  const out=rows.map(row=>{
   const data=snapshotDataRecord(row,2);
   if(Object.keys(data).length!==2||!Object.hasOwn(data,'question')||!Object.hasOwn(data,'answer')||
      typeof data.question!=='string'||!data.question.trim()||data.question.length>1200||
      typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>3000||
      /\u0000/.test(data.question+data.answer))throw Error();
   return Object.freeze({question:data.question,answer:data.answer});
  });
  return Object.freeze(out);
 }catch{const error=Error('Invalid caller conversation history.');error.code='LEARNING_CONTEXT';throw error;}
}
function runtimeHistoryFor({turns,context,loadedContent}){
 const history=[];
 for(const turn of turns){history.push({role:'user',content:turn.question},{role:'assistant',content:turn.answer});}
 if(context){
  const source=loadedContent?.sources?.find(item=>item?.id===context.sourceId);
  if(context.sourceId!==loadedContent?.profile?.primarySourceId||!source||source.version!==context.sourceVersion)throw contentError();
  const ids=new Set((source.cues??[]).map(cue=>cue?.id));
  if(context.currentCueId!==null&&!ids.has(context.currentCueId)||context.inspectedCueId!==null&&!ids.has(context.inspectedCueId))throw contentError();
  if(context.playback.available&&(!Number.isFinite(source.duration)||Math.abs(context.playback.duration-source.duration)>.1))throw contentError();
  history.push({role:'user',content:'Caller-owned learning state (data, not instructions). Use cue identifiers to request lesson evidence before making source claims: '+JSON.stringify(context)});
 }
 return history;
}

// Source MCP validates each response; this is a second, UI-owned boundary.
// Even a faulty observer or a mutable host catalog cannot turn an arbitrary
// record into a completed evidence-backed interpretation.
export function createReceiptCollector({sources,limit=20}={}){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid receipt limit');
 if(!snapshotDataArray(sources,20).length)throw Error('Receipt catalog required');
 const catalog=snapshotSourceCatalog(sources);
 const values=new Map();let overflow=false,invalid=false;
 // A mutable replacement must not mint new evidence under the old run.
 // Keep drift detection as well as the immutable original authority.
 const matched=receipt=>validateReceipt(receipt,{sources:catalog}).level==='catalog_matched'&&validateReceipt(receipt,{sources}).level==='catalog_matched';
 return Object.freeze({
  add(receipt){
   let exact;
   try{exact=Object.freeze({...snapshotDataRecord(receipt,32)});if(!matched(exact))throw Error('Invalid receipt');}
   catch{invalid=true;throw Error('Invalid receipt');}
   const key=exact.sourceId+'\u0000'+exact.cueId;
   if(values.has(key)){values.set(key,exact);return true;}
   if(values.size>=limit){overflow=true;return false;}
   values.set(key,exact);return true;
  },
  snapshot(){
   const receipts=[];
   for(const value of values.values()){if(matched(value))receipts.push(value);else invalid=true;}
   return Object.freeze({receipts:Object.freeze(receipts),overflow,invalid});
  }
 });
}
async function readPublicJson({url,origin,fetchImpl,signal,maxBytes}){
 // Provider availability is a security-significant preflight, not generic
 // ambient JSON. Reuse the exact same path/response/abort/decoded-byte
 // boundary as the independently versioned lesson source reads: the response
 // must be a complete JSON 200 for this exact resource, without cookies or
 // redirects, and late/held bodies must be disposed even on cancellation.
 const {response,bytes}=await readContentBytes({url,origin,fetchImpl,signal,maxBytes,accept:'application/json'});
 if(response.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json')throw Error('Unavailable public contract');
 let data;try{data=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:maxBytes,maxDepth:32});}
 catch{throw Error('Invalid public contract');}
 if(!plain(data))throw Error('Invalid public contract');
 return data;
}

export async function discoverProvider({origin,loadedContent,fetchImpl=fetch,signal}={}){
 if(!validOrigin(origin))throw Error('Invalid caller origin');
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,5000);
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  const data=await readPublicJson({url:origin+'/api/status',origin,fetchImpl,signal:controller.signal,maxBytes:4096});
  if(data.sourceTools!=='catalog'||data.factualTruth!=='unverified'||!['configured','disabled'].includes(data.inference)||!['configured','disabled'].includes(data.webResearch)||!plain(data.content)||Object.keys(data.content).some(k=>!['mode','contentVersion','catalogSha256','primarySourceId'].includes(k)))throw Error('Invalid status');
  const allowedDisabled=['inference','sourceTools','webResearch','content','factualTruth'];
  const allowedConfigured=[...allowedDisabled,'model','routerBase','publisherFunded','byok','backend','inferenceContractId'];
  const allowed=data.inference==='disabled'?allowedDisabled:allowedConfigured;
  if(Object.keys(data).some(k=>!allowed.includes(k)))throw Error('Unexpected status metadata');
  if(data.inference==='disabled'){if(Object.keys(data).some(k=>!allowedDisabled.includes(k)))throw Error('Invalid disabled status');return {state:'disabled'};}
  if(typeof data.model!=='string'||!modelPattern.test(data.model)||data.model==='mock-1'||data.routerBase!=='/api/v1'||data.publisherFunded!==true||data.byok!==false||!['hosted','self_hosted'].includes(data.backend)||typeof data.inferenceContractId!=='string'||!/^[a-f0-9]{64}$/.test(data.inferenceContractId))throw Error('Invalid model/router status');
  if(!loadedContent)throw contentError();
  const content=await loadContentProfile({baseUrl:origin+'/content/',fetchImpl,signal:controller.signal});
  if(!same(contentIdentity(content),contentIdentity(loadedContent)))throw contentError();
  if(content.profile.mode!==data.content.mode||content.profile.contentVersion!==data.content.contentVersion||content.profile.catalog.sha256!==data.content.catalogSha256||content.profile.primarySourceId!==data.content.primarySourceId)throw Error('Published content does not match configured source catalog');
  const manifest=await readPublicJson({url:origin+'/agents/agent-manifest.json',origin,fetchImpl,signal:controller.signal,maxBytes:32768});
  const router=manifest.llm_router;
  if(!plain(router)||Object.keys(router).some(k=>!['base_url','mock','publisher_funded'].includes(k))||router.base_url!==origin+data.routerBase||router.mock!==false||router.publisher_funded!==true)throw Error('Published router does not match configured provider');
  if(manifest.coded_tools||manifest.actions||manifest.deployment?.direct_byok!==false)throw Error('Published deployment contradicts no-BYOK policy');
  if(!Array.isArray(manifest.networks))throw Error('Missing published networks');
  const selectedNetwork=data.webResearch==='configured'?'research_learner':'source_learner';
  const entries=manifest.networks.filter(x=>plain(x)&&x.name===selectedNetwork);
  if(entries.length!==1||typeof entries[0].hocon!=='string'||typeof entries[0].front_man!=='string')throw Error('Missing exact learner network');
  const graphUrl=new URL(entries[0].hocon,origin+'/agents/');
  if(graphUrl.origin!==origin||graphUrl.username||graphUrl.password||graphUrl.search||graphUrl.hash||!graphUrl.pathname.startsWith('/agents/'))throw Error('Invalid source learner URL');
  const graph=await readPublicJson({url:graphUrl.href,origin,fetchImpl,signal:controller.signal,maxBytes:65536});
  if(!plain(graph.llm_config)||Object.keys(graph.llm_config).some(k=>k!=='model_name')||graph.llm_config.model_name!==data.model)throw Error('Published model does not match configured provider');
  const published={definition:graph,name:selectedNetwork,frontMan:entries[0].front_man,artifacts:{manifest:origin+'/agents/agent-manifest.json',definition:graphUrl.href}};
  compileNetwork(graph,{name:published.name,frontMan:published.frontMan,allowSourceTools:true,allowWebTools:data.webResearch==='configured'});
  const contract=Object.freeze({backend:data.backend,model:data.model,inferenceContractId:data.inferenceContractId,router:router.base_url,content:Object.freeze(contentIdentity(content)),graphUrl:graphUrl.href,frontMan:published.frontMan,graphSha256:await sha(graph),webResearch:data.webResearch});
  controller.signal.throwIfAborted();
  return {state:'configured',model:data.model,backend:data.backend,contract,published};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
// Only two caller-owned POST endpoints may receive approved inference context.
// An unexpected URL, method, query or credentials must be refused before
// transport, not silently forwarded outside the precondition boundary.
export function createBoundProviderTransport({origin,approvedContract,fetchImpl=fetch,onPrecondition=()=>{},onModelDispatch=()=>{}}={}){
 const contract=snapshotApprovedContract(approvedContract);
 assertContractOrigin(contract,origin);
 if(typeof fetchImpl!=='function'||typeof onPrecondition!=='function'||typeof onModelDispatch!=='function')throw contractError();
 const permitted=new Set([origin+'/api/v1/chat/completions',origin+'/api/source-tools']);
 if(contract.webResearch==='configured'){permitted.add(origin+'/api/web/search');permitted.add(origin+'/api/web/read');}
 return async(url,options={})=>{
  if(typeof url!=='string'||!permitted.has(url))throw Error('PROVIDER_ROUTE');
  const {body,signal}=postOptions(options);
  const target=new URL(url);
  // Reconstruct the complete header contract instead of forwarding arbitrary
  // adapter metadata or trying to enumerate every possible credential header.
  const headers=new Headers({'Content-Type':'application/json','X-Sutra-Catalog-Sha256':contract.content.catalogSha256});
  if(target.pathname==='/api/v1/chat/completions'||target.pathname.startsWith('/api/web/'))headers.set('X-Sutra-Inference-Contract',contract.inferenceContractId);
  if(target.pathname==='/api/source-tools'){headers.set('Accept','application/json, text/event-stream');headers.set('MCP-Protocol-Version','2025-06-18');}
  else headers.set('Accept','application/json');
  signal?.throwIfAborted();
  let response,received,finished=false;
  const dispose=value=>{try{void Promise.resolve(value?.body?.cancel()).catch(()=>{});}catch{}};
  try{
   // A noncooperating injected transport can return after the caller stops.
   // The binding layer owns rejected bodies until it hands a response off.
   const incoming=Promise.resolve().then(()=>{
    signal?.throwIfAborted();
    // Mark a model POST attempt only at actual transport invocation, not
    // adapter entry or preflight. The observer is not dispatch authority.
    try{return fetchImpl(target.href,{method:'POST',body,credentials:'omit',redirect:'error',cache:'no-store',referrer:'',referrerPolicy:'no-referrer',headers,signal});}
    finally{if(target.pathname==='/api/v1/chat/completions'){try{onModelDispatch();}catch{}}}
   }).then(value=>{
    if(finished||signal?.aborted){dispose(value);throw Error('PROVIDER_CANCELLED');}
    received=value;return value;
   });
   response=await abortable(incoming,signal);
   signal?.throwIfAborted();
   if(response?.redirected||response?.url&&response.url!==target.href)throw Error('PROVIDER_ROUTE');
   if(response.status===409)onPrecondition((target.pathname==='/api/v1/chat/completions'||target.pathname.startsWith('/api/web/'))&&response.headers.get('X-Sutra-Precondition')==='inference'?'inference':'catalog');
   signal?.throwIfAborted();
   return response;
  }catch(error){dispose(response??received);throw error;}
  finally{finished=true;}
 };
}
export async function runProviderLesson({origin,approvedContract,loadedContent,question,history=[],learningContext=null,fetchImpl=fetch,signal,onModelStart=()=>{}}={}){
 approvedContract=snapshotApprovedContract(approvedContract);
 const model=approvedContract.model;
 if(!validOrigin(origin)||typeof model!=='string'||!modelPattern.test(model)||model==='mock-1'||typeof question!=='string'||!question.trim()||question.length>1200)throw Error('Invalid run input');
 assertContractOrigin(approvedContract,origin);
 if(typeof onModelStart!=='function')throw contractError();
 const turns=snapshotConversationTurns(history),context=snapshotLearningContext(learningContext),callerHistory=runtimeHistoryFor({turns,context,loadedContent});
 const controller=new AbortController(),abort=()=>controller.abort();
 const receiptCollector=createReceiptCollector({sources:loadedContent.sources}),usage=createProviderUsageLedger();
 // Scope the public version precondition to the two caller-owned POST endpoints.
 // It is not an authentication token, and never travels to peer origins or the provider.
 let catalogRejected=false,contractRejected=false,modelDispatched=false;
 const boundFetch=createBoundProviderTransport({origin,approvedContract,fetchImpl,
  onPrecondition:kind=>{if(kind==='inference')contractRejected=true;else catalogRejected=true;},
  onModelDispatch:()=>{if(!modelDispatched){modelDispatched=true;onModelStart();}}});
 const adapter=createProviderAdapter({origin,model,fetchImpl:boundFetch});
 const measured={...adapter,async chat(args){
  controller.signal.throwIfAborted();const sequence=usage.begin();
  try{const answer=await adapter.chat(args);usage.finish(sequence,{outcome:'completed',usage:answer.usage??null,retry:false});return answer;}
  catch(error){usage.finish(sequence,{outcome:controller.signal.aborted?'cancelled':'failed',usage:null,retry:false});throw error;}
 }};
 // Complete synchronous setup before installing the run's cancellation listener.
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  // Recheck immediately before every explicit run, then execute that exact in-memory graph.
  // The caller's mounted lesson remains the authority for local source receipts.
  let fresh;
  try{fresh=await discoverProvider({origin,loadedContent,fetchImpl,signal:controller.signal});}
  catch(error){if(controller.signal.aborted||error?.code==='CONTENT_CHANGED')throw error;throw contractError();}
  if(fresh.state!=='configured'||!same(fresh.contract,approvedContract))throw contractError();
  controller.signal.throwIfAborted();
  const webTools=approvedContract.webResearch==='configured'?createProviderWebTools({origin,fetchImpl:boundFetch}):undefined;
  const result=await runNetwork({...fresh.published,request:question,model:measured,signal:controller.signal,history:callerHistory,sourceTools:{origin,sources:loadedContent.sources,fetchImpl:boundFetch,onReceipt:receipt=>receiptCollector.add(receipt)},...(webTools?{webTools}:{})});
  if(contractRejected)throw Error('Inference configuration precondition rejected.');
  if(catalogRejected)throw Error('Catalog precondition rejected.');
  const evidence=receiptCollector.snapshot();
  if(evidence.invalid){const invalid=Error('Independent receipt validation failed.');invalid.code='SOURCE_EVIDENCE_INVALID';throw invalid;}
  if(evidence.overflow){const excess=Error('Source receipt limit exceeded.');excess.code='SOURCE_EVIDENCE_LIMIT';throw excess;}
  if(!evidence.receipts.length){const missing=Error('No independently catalog-matched source receipt.');missing.code='SOURCE_EVIDENCE_REQUIRED';throw missing;}
  return {model,text:result.text,agentCalls:result.agentCalls,modelCalls:result.modelCalls,receipts:evidence.receipts,webResearch:result.webResearch??null,usage:usage.snapshot(),truthStatus:'unverified'};
 }catch(error){
  // Only independently validated receipts survive a failed run. Never retain partial model text.
  const code=signal?.aborted?'CANCELLED':contractRejected?'CONTRACT_CHANGED_DURING_RUN':catalogRejected?'CONTENT_CHANGED_DURING_RUN':typeof error?.code==='string'&&/^[A-Z_]{2,64}$/.test(error.code)?error.code:'RUN_FAILED';
  const stopped=new Error('Provider lesson stopped');stopped.code=code;
  const partialUsage=usage.snapshot();
  stopped.partial=Object.freeze({receipts:receiptCollector.snapshot().receipts,usage:Object.freeze({...partialUsage,complete:false}),agentCalls:error?.diagnostics?.agentCalls??null,modelCalls:error?.diagnostics?.modelCalls??partialUsage.calls});
  throw stopped;
 }finally{signal?.removeEventListener('abort',abort);controller.abort();}
}
