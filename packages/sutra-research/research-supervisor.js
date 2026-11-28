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
import {objectiveTerms as terms,createResearchPlan,researchQueryCandidates,browserQueryChoices,questionProgress} from './research-planner.js';
import {rankFrontier,browserFrontierChoices} from './source-ranker.js';
import {plannerInput,admitModelQueries,admitWebDecision,makeEvidencePacket,admitSynthesis,admitReviews,conflictCandidates,admitConflictReviews,assembleIntelligence} from './research-intelligence.js';
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
function nextQueryCandidates(objective,history,docs,passages){
 const covered=new Set(passages.flatMap(p=>p.matched)),missing=terms(objective).filter(w=>!covered.has(w)),domainCount=new Set(docs.map(d=>new URL(d.url).hostname)).size;
 const v=verifyEvidence(docs,passages),potentialDiscrepancies=compareNumericObservations(extractNumericObservations(passages,v.refs)).length;
 return researchQueryCandidates(objective,history,{missing,domainCount,potentialDiscrepancies});
}
export function nextQuery(objective,history,docs,passages){return nextQueryCandidates(objective,history,docs,passages)[0]??null;}
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
export async function runAutonomousResearch({authorization,providers,readDocument,onEvent=()=>{},onCheckpoint=async()=>{},pauseAfterOperations=Infinity,modelBroker,assignedSessionId,beforeOperation=async()=>{},selectDocument=null,selectQuery=null}){
 assertResearchAuthorization(authorization);const a=authorization,plan=a.plan,b=plan.budget,prior=researchResumeState(a);
 if(typeof readDocument!=='function'||typeof onEvent!=='function'||typeof onCheckpoint!=='function'||typeof beforeOperation!=='function'||selectDocument!==null&&typeof selectDocument!=='function'||selectQuery!==null&&typeof selectQuery!=='function'||plan.modelPolicy?.webAccess!=='on_demand'&&plan.providers.some(p=>typeof providers?.[p.id]?.search!=='function')||pauseAfterOperations!==Infinity&&(!Number.isSafeInteger(pauseAfterOperations)||pauseAfterOperations<1||pauseAfterOperations>200))fail('CONFIG');
 if(plan.modelPolicy&&(!modelBroker||typeof modelBroker.consult!=='function'||pauseAfterOperations!==Infinity||prior))fail('MODEL_RUN_CONFIG');
 if(!plan.modelPolicy&&modelBroker)fail('MODEL_SCOPE');
 const restored=prior?validateRestored(prior,b,plan.scope):null;claimResearchRun(a);const researchPlan=createResearchPlan(plan.objective);
 if(assignedSessionId!==undefined&&(typeof assignedSessionId!=='string'||!/^research_[0-9a-f-]{36}$/.test(assignedSessionId)||prior&&prior.sessionId!==assignedSessionId))fail('SESSION_ID');
 const sessionId=prior?.sessionId??assignedSessionId??'research_'+randomUUID(),queries=prior?.queries??[],documents=prior?.documents??[],passages=prior?.passages??[],frontier=prior?.frontier??[],failures=prior?.failures??[],seen=restored?.seen??new Set(),content=restored?.digests??new Set(),domainAttempts=restored?.domains??new Map();
 const modelReceipts=[],modelQueries=[],modelWebActions=[];let intelligence=null,modelOnlyAnswer=null,lastModelPlanDocumentCount=-1;
 const onDemand=plan.modelPolicy?.webAccess==='on_demand',availableProviders=plan.providers.filter(p=>typeof providers?.[p.id]?.search==='function');
 const finalRoles=plan.modelPolicy?.roles.filter(r=>r.role!=='bot')??[];
 const finalCost=finalRoles.reduce((n,r)=>n+r.estimatedMaxCostMicros,0),finalBytes=finalRoles.length*262144;
 function canAcquire(cost,bytes){const u=a.usage();return !plan.modelPolicy||u.reservedCostMicros+cost+finalCost<=b.maxCostMicros&&u.reservedBytes+bytes+finalBytes<=b.maxDownloadBytes;}
 let seq=prior?.sequence??0,wave=0,reason='search_variants_exhausted',pending=null,phase=prior?.phase??'search',slots=prior?.slots??0,state='running',operations=0;
 const emit=(kind,detail)=>{const e=Object.freeze({sessionId,sequence:++seq,kind,...detail});try{onEvent(e);}catch{}};
 const snapshot=()=>({schema:'sutra-autonomous-research-checkpoint/v1',sessionId,planPin:a.planPin,sequence:seq,startedAt:a.startedAt,expiresAt:a.expiresAt,state,phase,slots,queries:structuredClone(queries),documents:structuredClone(documents),passages:structuredClone(passages),frontier:structuredClone(frontier),failures:structuredClone(failures),seen:[...seen],domainAttempts:[...domainAttempts],usage:a.usage(),...(plan.modelPolicy?{modelReceipts:structuredClone(modelReceipts),modelQueries:structuredClone(modelQueries),modelWebActions:structuredClone(modelWebActions),modelOnlyAnswer}:{}),pending:pending&&structuredClone(pending),authority:'NONE',resumePolicy:'fresh exact approval and retained checkpoint digest required; unknown dispatch is not replayed'});
 async function checkpoint(){await onCheckpoint(snapshot());}
 async function operation(kind,role,detail,fn){
  a.assertActive();await beforeOperation(Object.freeze({kind,role}));a.assertActive();pending={kind,role,detail,state:'dispatch_unknown'};emit('operation.pending',{operation:kind,role});await checkpoint();a.assertActive();
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
    if(onDemand&&!modelQueries.some(q=>!queries.some(h=>h.query===q.query))){
     const bot=plan.modelPolicy.roles.find(r=>r.role==='bot');
     if(a.usage().modelCalls+finalRoles.length>=b.maxModelCalls||!canAcquire(bot.estimatedMaxCostMicros,262144)){reason='model_web_decision_budget';break;}
     const covered=new Set(passages.flatMap(p=>p.matched)),missing=terms(plan.objective).filter(w=>!covered.has(w));
     const webAttempted=queries.length>0||modelWebActions.length>0;
     const raw=await consult('bot',plannerInput(plan.objective,queries,documents,passages,missing,{searchAvailable:availableProviders.length>0,openPublicUrls:plan.scope.allowModelPublicUrls===true,webAttempted}));
     if(raw===null){reason='model_web_decision_unavailable';break;}
     let decision;try{decision=admitWebDecision(raw,plan.objective,queries,{allowPublicUrls:plan.scope.allowModelPublicUrls===true,allowQuery:plan.scope.allowPublicQueryParameters===true,webAttempted});}catch(e){failures.push({operation:'model_web_decision',reason:safeCode(e)});reason='model_web_decision_invalid';break;}
     if(decision.action==='answer_without_web'){modelOnlyAnswer={text:decision.answer,sourceStatus:'NO_WEB_EVIDENCE',truthStatus:'UNVERIFIED',authority:'NONE'};reason='model_answer_without_web';break;}
     if(decision.action==='finish_research'){reason='model_requested_synthesis';break;}
     if(decision.action==='open_public_urls'){
      const before=frontier.length;
      for(const url of decision.urls)enqueue(url,0,'model_public_url');
      if(frontier.length===before){reason='model_web_urls_exhausted';break;}
      modelWebActions.push({action:'open_public_urls',urls:decision.urls});
      phase='documents';slots=Math.min(2,frontier.length);pending=null;await checkpoint();continue;
     }
     if(!availableProviders.length){reason='web_access_unavailable';break;}
     modelQueries.push(...decision.queries);
    }
    // Always mode preserves the original mandatory objective search and deterministic fallback.
    if(plan.modelPolicy&&!onDemand&&queries.length>0&&documents.length>lastModelPlanDocumentCount&&!modelQueries.some(q=>!queries.some(h=>h.query===q.query))&&a.usage().modelCalls+finalRoles.length<b.maxModelCalls){
     const bot=plan.modelPolicy.roles.find(r=>r.role==='bot');
     lastModelPlanDocumentCount=documents.length;
     const missing=terms(plan.objective).filter(w=>!new Set(passages.flatMap(p=>p.matched)).has(w));
     const proposed=canAcquire(bot.estimatedMaxCostMicros,262144)?await consult('bot',plannerInput(plan.objective,queries,documents,passages,missing)):null;
     if(proposed!==null)try{modelQueries.push(...admitModelQueries(proposed,plan.objective,queries));}catch(e){failures.push({operation:'model_plan_admission',reason:safeCode(e)});}
    }
    const pendingModelQueries=modelQueries.filter(q=>!queries.some(h=>h.query===q.query));
    const candidates=pendingModelQueries.length?pendingModelQueries:onDemand?[]:nextQueryCandidates(plan.objective,queries,documents,passages);
    if(!candidates.length)break;
    let next=candidates[0];
    if(selectQuery&&candidates.length>1){
     const choices=browserQueryChoices(candidates,queries),selected=await selectQuery(choices,a.signal);a.assertActive();
     const index=choices.findIndex(c=>c.id===selected);if(index<0)fail('QUERY_SELECTION');
     next=candidates[index];emit('browser.query_selected',{role:next.role,candidateId:selected,candidateCount:choices.length,policy:'bounded_admitted_query'});
    }
    if(!availableProviders.length){reason='web_access_unavailable';break;}
    const provider=availableProviders[queries.length%availableProviders.length];
    if(secretLike(next.query))fail('SENSITIVE_QUERY');
    if(!canAcquire(provider.estimatedMaxCostMicros,SEARCH_BYTES)){reason='budget_reserved_for_review';break;}
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
   if(!canAcquire(0,(plan.scope.allowPdf?1048576:262144)+65536)){reason='budget_reserved_for_review';break;}
   let item;
   if(selectDocument){
    const choices=browserFrontierChoices(frontier,domainAttempts);
    if(!choices.length){frontier.length=0;continue;}
    const selected=await selectDocument(choices,a.signal);a.assertActive();
    const choice=choices.find(c=>c.id===selected);if(!choice)fail('FRONTIER_SELECTION');
    const index=Number(choice.id.slice(10));[item]=frontier.splice(index,1);
    if(!item||(domainAttempts.get(new URL(item.url).hostname)??0)>=3)fail('FRONTIER_SELECTION');
    emit('browser.frontier_selected',{role:'drone',candidateId:choice.id,candidateCount:choices.length,policy:'bounded_admitted_frontier'});
   }else{const ranked=rankFrontier(frontier,plan.objective,domainAttempts);frontier.splice(0,frontier.length,...ranked);item=frontier.shift();}
   const host=new URL(item.url).hostname;
   const count=domainAttempts.get(host)??0;if(count>=3)continue;
   domainAttempts.set(host,count+1);slots--;
   const doc=await operation('document','drone',{url:item.url,depth:item.depth},async(signal)=>{
    const d=await readDocument(item.url,{signal:AbortSignal.any([a.signal,signal]),beforeDispatch:async detail=>{pending={...pending,subdispatch:detail};await checkpoint();}});
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
   const packet=makeEvidencePacket(documents,passages,{maxTextBytes:Math.max(256,Math.min(16000,Math.floor(Math.min(orb.maxInputBytes,spark?.maxInputBytes??orb.maxInputBytes)/3)))});
   if(packet.excerpts.length){
    const raw=await consult('orb',{objective:plan.objective,evidence:packet.excerpts});
    if(raw!==null){
     const synthesis=admitSynthesis(raw,packet);
     let reviews=[];
     const candidates=conflictCandidates(packet);
     let conflicts=admitConflictReviews({},candidates,packet);
     if(spark&&(synthesis.claims.length||candidates.length)){
      const candidateClaims=synthesis.claims.map(c=>({claimId:c.id,statement:c.statement,kind:c.kind,citations:c.citations.map(x=>({passageId:x.passageId,quote:x.quote}))}));
      const review=await consult('spark',{objective:plan.objective,claims:candidateClaims,evidence:packet.excerpts,conflictCandidates:candidates});
      if(review!==null)try{const admitted=admitReviews(review,synthesis,packet),assessed=admitConflictReviews(review,candidates,packet);reviews=admitted;conflicts=assessed;}catch(e){failures.push({operation:'model_review_admission',reason:safeCode(e)});}
     }
     a.assertActive();intelligence=assembleIntelligence(synthesis,reviews,modelReceipts,packet,conflicts,plan.modelPolicy.reviewMode);
    }
   }
  }catch(e){failures.push({operation:'model_intelligence',reason:safeCode(e)});}
 }
 if(a.signal.aborted){intelligence=null;modelOnlyAnswer=null;reason='cancelled_or_expired';}
 if(state!=='paused')state='closed';
 const covered=new Set(passages.flatMap(p=>p.matched)),all=terms(plan.objective);
 const verified=verifyEvidence(documents,passages),numericObservations=extractNumericObservations(passages,verified.refs),numericComparisons=compareNumericObservations(numericObservations),lineage=compareSourceLineage(documents),evidenceGraph=createEvidenceGraph(documents,verified.refs,numericObservations,numericComparisons,lineage);
 emit('evidence.indexed',{role:'gear',passages:verified.passageCount});
 const evidenceIndex={...verified,numericObservations,numericComparisons,lineage,evidenceGraph,analysisKind:'deterministic_candidate_index'};
 const report={schema:'sutra-autonomous-research-report/v1',sessionId,planPin:a.planPin,objective:plan.objective,state,terminationReason:reason,researchPlan:{...researchPlan,questions:questionProgress(researchPlan,queries)},queries,documents,passages,evidenceIndex,...(plan.modelPolicy?{intelligence,modelReceipts,modelWebActions,modelOnlyAnswer,modelConfiguration:{webAccess:plan.modelPolicy.webAccess,reviewMode:plan.modelPolicy.reviewMode,roles:plan.modelPolicy.roles.map(({role,vendor,model})=>({role,vendor,model}))}}:{}),failures,usage:a.usage(),coverage:{kind:'lexical diagnostic only',matchedTerms:all.filter(w=>covered.has(w)),unmatchedTerms:all.filter(w=>!covered.has(w))},authority:'NONE',qualification:plan.modelPolicy?'Model output with explicit web provenance; citation integrity and review are not empirical truth, independent verification or sufficiency.':'Candidate excerpts only; no verified factual synthesis, source independence, or sufficiency claim.'};
 emit('report.assembled',{role:'node',status:state,passages:verified.passageCount});
 emit(state==='paused'?'session.pause':'session.close',{reason});await checkpoint();return report;
}
