// Adaptive bounded supervisor. Every wave uses the unchanged investigation DAG.
// Search results are discovery only; extracted passages are candidates, not truth.
import {randomUUID} from 'node:crypto';
import {runTaskGraph} from '../sutra-runtime/investigation-tasks.js';
import {digest,secretLike,assertResearchAuthorization,researchResumeState,claimResearchRun} from './research-session.js';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {SEARCH_BYTES} from './providers.js';
import {verifyPassage,verifyEvidence,extractNumericObservations,compareNumericObservations,compareSourceLineage,createEvidenceGraph} from './evidence-index.js';
export {verifyPassage} from './evidence-index.js';
const fail=code=>{throw Object.assign(Error('Research supervisor refused: '+code),{code});};
import {objectiveTerms as terms,createResearchPlan,chooseResearchQuery,questionProgress} from './research-planner.js';
import {rankFrontier} from './source-ranker.js';
import {plannerInput,admitModelQueries,makeEvidencePacket,admitSynthesis,admitReviews,assembleIntelligence} from './research-intelligence.js';
const safeCode=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'OPERATION_FAILED';
export function extractPassages(doc,objective){
 if(typeof doc.text!=='string'||doc.textDigest!==digest(doc.text))fail('DOCUMENT_DIGEST');
 const words=terms(objective),out=[];
 // Stable UTF-16 offsets into stored extraction, not raw byte offsets.
 for(const m of doc.text.matchAll(/[^.!?\n\f]{1,560}(?:[.!?]+|(?=[.!?\n\f]|$))?/gu)){
  const start=m.index,end=start+m[0].length;if(end-start<15||end-start>600||secretLike(m[0]))continue;
  const lower=m[0].toLowerCase(),matched=words.filter(w=>lower.includes(w));if(!matched.length)continue;
  const page=doc.pageMap?.find(x=>start>=x.startOffset&&end<=x.endOffset)?.page;
  if(doc.mediaType==='application/pdf'&&!page)continue;
  out.push({sourceId:doc.id,sourceDigest:doc.textDigest,locator:{startOffset:start,endOffset:end,coordinateSystem:'utf16-extracted-text',...(page?{page}:{})},supportingText:m[0],matched,verificationStatus:'unverified',kind:'candidate_passage'});
 }
 return out.sort((a,b)=>b.matched.length-a.matched.length||a.locator.startOffset-b.locator.startOffset).slice(0,8);
}
export function nextQuery(objective,history,docs,passages){
 const covered=new Set(passages.flatMap(p=>p.matched)),missing=terms(objective).filter(w=>!covered.has(w)),domainCount=new Set(docs.map(d=>new URL(d.url).hostname)).size;
 const v=verifyEvidence(docs,passages),potentialDiscrepancies=compareNumericObservations(extractNumericObservations(passages,v.refs)).length;
 return chooseResearchQuery(objective,history,{missing,domainCount,potentialDiscrepancies});
}
function validateRestored(s,b,scope){
 const routeOptions={allowQuery:scope.allowPublicQueryParameters===true};
 const ids=new Set(),urls=new Set(),digests=new Set();
 const isDigest=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
 for(const [i,d] of s.documents.entries()){
  if(!d||d.id!=='source_'+(i+1)||ids.has(d.id)||typeof d.text!=='string'||d.text.length>100000||d.textDigest!==digest(d.text)||!isDigest(d.rawDigest)||admitDocumentURL(d.url,routeOptions)!==d.url||urls.has(d.url)||!Array.isArray(d.links)||d.links.length>40)fail('RESUME_DOCUMENT');
  ids.add(d.id);urls.add(d.url);digests.add(d.textDigest);digests.add(d.rawDigest);
 }
 for(const p of s.passages)if(!verifyPassage(p,s.documents.find(d=>d.id===p.sourceId))||!Array.isArray(p.matched)||p.matched.length>16||p.matched.some(x=>typeof x!=='string'||x.length>1000))fail('RESUME_PASSAGE');
 const seen=new Set(s.seen);if(seen.size!==s.seen.length||s.seen.some(x=>admitDocumentURL(x,routeOptions)!==x)||[...urls].some(x=>!seen.has(x)))fail('RESUME_FRONTIER');
 const queued=new Set();
 for(const x of s.frontier){if(!x||!seen.has(x.url)||queued.has(x.url)||urls.has(x.url)||!Number.isSafeInteger(x.depth)||x.depth<0||x.depth>b.maxLinkDepth)fail('RESUME_FRONTIER');queued.add(x.url);}
 const domains=new Map(s.domainAttempts);if(domains.size!==s.domainAttempts.length||s.domainAttempts.some(x=>!Array.isArray(x)||x.length!==2||typeof x[0]!=='string'||!Number.isSafeInteger(x[1])||x[1]<1||x[1]>3))fail('RESUME_FRONTIER');
 return {seen,domains,digests};
}
export async function runAutonomousResearch({authorization,providers,readDocument,onEvent=()=>{},onCheckpoint=async()=>{},pauseAfterOperations=Infinity,modelBroker}){
 assertResearchAuthorization(authorization);const a=authorization,plan=a.plan,b=plan.budget,prior=researchResumeState(a);
 if(typeof readDocument!=='function'||typeof onEvent!=='function'||typeof onCheckpoint!=='function'||plan.providers.some(p=>typeof providers[p.id]?.search!=='function')||pauseAfterOperations!==Infinity&&(!Number.isSafeInteger(pauseAfterOperations)||pauseAfterOperations<1||pauseAfterOperations>200))fail('CONFIG');
 if(plan.modelPolicy&&(!modelBroker||typeof modelBroker.consult!=='function'||pauseAfterOperations!==Infinity||prior))fail('MODEL_RUN_CONFIG');
 if(!plan.modelPolicy&&modelBroker)fail('MODEL_SCOPE');
 const restored=prior?validateRestored(prior,b,plan.scope):null;claimResearchRun(a);const researchPlan=createResearchPlan(plan.objective);
 const sessionId=prior?.sessionId??'research_'+randomUUID(),queries=prior?.queries??[],documents=prior?.documents??[],passages=prior?.passages??[],frontier=prior?.frontier??[],failures=prior?.failures??[],seen=restored?.seen??new Set(),content=restored?.digests??new Set(),domainAttempts=restored?.domains??new Map();
 const modelReceipts=[],modelQueries=[];let intelligence=null,modelPlanAttempted=false;
 let seq=prior?.sequence??0,wave=0,reason='search_variants_exhausted',pending=null,phase=prior?.phase??'search',slots=prior?.slots??0,state='running',operations=0;
 const emit=(kind,detail)=>{const e=Object.freeze({sessionId,sequence:++seq,kind,...detail});try{onEvent(e);}catch{}};
 const snapshot=()=>({schema:'sutra-autonomous-research-checkpoint/v1',sessionId,planPin:a.planPin,sequence:seq,startedAt:a.startedAt,expiresAt:a.expiresAt,state,phase,slots,queries:structuredClone(queries),documents:structuredClone(documents),passages:structuredClone(passages),frontier:structuredClone(frontier),failures:structuredClone(failures),seen:[...seen],domainAttempts:[...domainAttempts],usage:a.usage(),...(plan.modelPolicy?{modelReceipts:structuredClone(modelReceipts),modelQueries:structuredClone(modelQueries)}:{}),pending:pending&&structuredClone(pending),authority:'NONE',resumePolicy:'fresh exact approval and retained checkpoint digest required; unknown dispatch is not replayed'});
 async function checkpoint(){await onCheckpoint(snapshot());}
 async function operation(kind,role,detail,fn){
  a.assertActive();pending={kind,role,detail,state:'dispatch_unknown'};emit('operation.pending',{operation:kind,role});await checkpoint();a.assertActive();
  const task={id:'work',kind:'research_operation',agentId:role,dependsOn:[]};
  let error;
  const result=await runTaskGraph({tasks:[task],handlers:{research_operation:{execute:async({signal:taskSignal})=>{try{return await fn(taskSignal);}catch(e){error=safeCode(e);throw e;}},admit:x=>x}},runId:'wave_'+(++wave)+'_'+randomUUID(),version:a.planPin,signal:a.signal,timeoutMs:30000,concurrency:1,maxPerAgent:1,onEvent:e=>emit('runtime.task',{wave:e.runId,role:e.agentId,status:e.status,taskKind:e.kind})});
  a.assertActive();
  if(result.status!=='completed'){const e=error??'WAVE_'+result.status.toUpperCase();pending={...pending,state:error?'failed':'dispatch_unknown'};await checkpoint();if(!error||e==='BUDGET_EXHAUSTED')fail(e);failures.push({operation:kind,detail,reason:e});emit('operation.failed',{operation:kind,role,reason:e});return null;}
  emit('operation.completed',{operation:kind,role});return result.artifacts[0].value;
 }
 async function consult(role,input){
  const r=await operation('model',role,{role},signal=>modelBroker.consult(role,input,{signal,beforeDispatch:checkpoint}));
  if(r){modelReceipts.push(r.receipt);emit('model.response',{role,vendor:r.receipt.vendor,model:r.receipt.model});}
  pending=null;await checkpoint();return r?.value??null;
 }
 function enqueue(raw,depth,provider,meta={}){
  let url;try{url=admitDocumentURL(raw,{allowQuery:plan.scope.allowPublicQueryParameters===true});}catch{return;}if(secretLike(url)||seen.has(url)||depth>b.maxLinkDepth||frontier.length>=240)return;
  seen.add(url);frontier.push({url,depth,provider,title:typeof meta.title==='string'?meta.title.slice(0,300):'',rank:Number.isSafeInteger(meta.rank)&&meta.rank>=1&&meta.rank<=10?meta.rank:10});
 }
 try{
  emit(prior?'session.resume':'session.open',{planPin:a.planPin});await checkpoint();
  while(true){
   a.assertActive();
   if(operations>=pauseAfterOperations){state='paused';reason='operator_pause_boundary';break;}
   if(phase==='search'){
    if(a.usage().documents>=b.maxDocuments&&queries.length>=2){reason='document_budget_exhausted';break;}
    if(a.usage().searches>=b.maxSearches){reason='search_budget_exhausted';break;}
    if(queries.length>=3&&queries.some(q=>q.role==='spark')&&queries.slice(-2).every(q=>q.waveOutcome?.newDocuments===0&&q.waveOutcome?.newPassages===0)){reason='diminishing_returns_unverified';break;}
    // The first search remains an objective search. Subsequent waves can use a model-generated refinement.
    if(plan.modelPolicy&&queries.length>0&&!modelPlanAttempted){
     modelPlanAttempted=true;
     const missing=terms(plan.objective).filter(w=>!new Set(passages.flatMap(p=>p.matched)).has(w));
     const proposed=await consult('bot',plannerInput(plan.objective,queries,documents,passages,missing));
     if(proposed!==null)try{modelQueries.push(...admitModelQueries(proposed,plan.objective,queries));}catch(e){failures.push({operation:'model_plan_admission',reason:safeCode(e)});}
    }
    const modelNext=modelQueries.find(q=>!queries.some(h=>h.query===q.query));
    const next=modelNext??nextQuery(plan.objective,queries,documents,passages);if(!next)break;
    const provider=plan.providers[queries.length%plan.providers.length];
    if(secretLike(next.query))fail('SENSITIVE_QUERY');
    a.reserve('search',{bytes:SEARCH_BYTES,costMicros:provider.estimatedMaxCostMicros});
    const query={...next,provider:provider.id,documentsBefore:documents.length,passagesBefore:passages.length};queries.push(query);
    const results=await operation('search',next.role,{query:next.query,provider:provider.id},signal=>providers[provider.id].search(next.query,{signal:AbortSignal.any([a.signal,signal])}));
    if(results!==null){
     if(!Array.isArray(results)||results.length>10)fail('SEARCH_RESULT');
     for(const r of results)if(typeof r?.url==='string')enqueue(r.url,0,provider.id,r);
    }
    phase='documents';slots=2;pending=null;operations++;await checkpoint();continue;
   }
   if(slots===0||!frontier.length||a.usage().documents>=b.maxDocuments){const q=queries.at(-1);if(q&&Number.isSafeInteger(q.documentsBefore)&&Number.isSafeInteger(q.passagesBefore))q.waveOutcome={newDocuments:documents.length-q.documentsBefore,newPassages:passages.length-q.passagesBefore};phase='search';slots=0;await checkpoint();continue;}
   const ranked=rankFrontier(frontier,plan.objective,domainAttempts);frontier.splice(0,frontier.length,...ranked);const item=frontier.shift(),host=new URL(item.url).hostname;
   const count=domainAttempts.get(host)??0;if(count>=3)continue;
   domainAttempts.set(host,count+1);slots--;
   const doc=await operation('document','drone',{url:item.url,depth:item.depth},async(signal)=>{
    const d=await readDocument(item.url,{signal:AbortSignal.any([a.signal,signal])});
    if(!d||d.url!==item.url||typeof d.text!=='string'||d.textDigest!==digest(d.text)||!Array.isArray(d.links)||d.links.length>40)fail('DOCUMENT');
    const text=d.text.slice(0,100000);
    const pageMap=d.pageMap?.filter(p=>p.startOffset<text.length).map(p=>({...p,endOffset:Math.min(p.endOffset,text.length)}));
    return {...d,text,textDigest:digest(text),extractionTruncated:text.length!==d.text.length,...(pageMap?{pageMap}:{})};
   });
   if(doc&&!content.has(doc.rawDigest)&&!content.has(doc.textDigest)){
    content.add(doc.rawDigest);content.add(doc.textDigest);
    const saved={...doc,id:'source_'+(documents.length+1)};documents.push(saved);
    for(const p of extractPassages(saved,plan.objective))if(verifyPassage(p,saved))passages.push(p);
    for(const link of saved.links)enqueue(link,item.depth+1,'reference');
    emit('evidence.admitted',{sourceId:saved.id,passages:passages.filter(p=>p.sourceId===saved.id).length});
   }
   pending=null;operations++;await checkpoint();
  }
 }catch(e){
  const code=safeCode(e);
  if(code==='BUDGET_EXHAUSTED')reason='budget_exhausted';else if(a.signal.aborted||code==='INACTIVE')reason='cancelled_or_expired';else{reason='operation_interrupted';failures.push({operation:'supervisor',reason:code});}
 }
 if(plan.modelPolicy&&state!=='paused'&&!a.signal.aborted&&passages.length&&reason!=='operation_interrupted'){
  // Both recipients see only bounded verified public excerpts. Preserve enough
  // context for the independent reviewer to inspect competing evidence.
  try{
   const orb=plan.modelPolicy.roles.find(r=>r.role==='orb'),spark=plan.modelPolicy.roles.find(r=>r.role==='spark');
   const packet=makeEvidencePacket(documents,passages,{maxTextBytes:Math.max(256,Math.min(16000,Math.floor(Math.min(orb.maxInputBytes,spark.maxInputBytes)/3)))});
   if(packet.excerpts.length){
    const raw=await consult('orb',{objective:plan.objective,evidence:packet.excerpts});
    if(raw!==null){
     const synthesis=admitSynthesis(raw,packet);
     let reviews=[];
     if(synthesis.claims.length){
      const candidateClaims=synthesis.claims.map(c=>({claimId:c.id,statement:c.statement,kind:c.kind,citations:c.citations.map(x=>({passageId:x.passageId,quote:x.quote}))}));
      const review=await consult('spark',{objective:plan.objective,claims:candidateClaims,evidence:packet.excerpts});
      if(review!==null)try{reviews=admitReviews(review,synthesis,packet);}catch(e){failures.push({operation:'model_review_admission',reason:safeCode(e)});}
     }
     intelligence=assembleIntelligence(synthesis,reviews,modelReceipts,packet);
    }
   }
  }catch(e){failures.push({operation:'model_intelligence',reason:safeCode(e)});}
 }
 if(state!=='paused')state='closed';
 const covered=new Set(passages.flatMap(p=>p.matched)),all=terms(plan.objective);
 const verified=verifyEvidence(documents,passages),numericObservations=extractNumericObservations(passages,verified.refs),numericComparisons=compareNumericObservations(numericObservations),lineage=compareSourceLineage(documents),evidenceGraph=createEvidenceGraph(documents,verified.refs,numericObservations,numericComparisons,lineage);
 const evidenceIndex={...verified,numericObservations,numericComparisons,lineage,evidenceGraph,analysisKind:'deterministic_candidate_index'};
 const report={schema:'sutra-autonomous-research-report/v1',sessionId,planPin:a.planPin,objective:plan.objective,state,terminationReason:reason,researchPlan:{...researchPlan,questions:questionProgress(researchPlan,queries)},queries,documents,passages,evidenceIndex,...(plan.modelPolicy?{intelligence,modelReceipts}:{}),failures,usage:a.usage(),coverage:{kind:'lexical diagnostic only',matchedTerms:all.filter(w=>covered.has(w)),unmatchedTerms:all.filter(w=>!covered.has(w))},authority:'NONE',qualification:plan.modelPolicy?'Candidate model synthesis with exact-span citations and separately configured review; empirical truth, entailment, source independence and sufficiency remain unverified.':'Candidate excerpts only; no verified factual synthesis, source independence, or sufficiency claim.'};
 emit(state==='paused'?'session.pause':'session.close',{reason});await checkpoint();return report;
}
