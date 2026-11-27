// Adaptive bounded supervisor. Every wave uses the unchanged investigation DAG.
// Search results are discovery only; extracted passages are candidates, not truth.
import {randomUUID} from 'node:crypto';
import {runTaskGraph} from '../sutra-runtime/investigation-tasks.js';
import {digest,secretLike} from './research-session.js';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {SEARCH_BYTES} from './providers.js';
const fail=code=>{throw Object.assign(Error('Research supervisor refused: '+code),{code});};
const stopWords=new Set('the and for from that this with what which are was were how why does into about have has their than can could would should between compare investigate analysis'.split(' '));
const terms=s=>[...new Set((s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[]).filter(x=>!stopWords.has(x)))].slice(0,16);
const safeCode=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'OPERATION_FAILED';
export function extractPassages(doc,objective){
 if(typeof doc.text!=='string'||doc.textDigest!==digest(doc.text))fail('DOCUMENT_DIGEST');
 const words=terms(objective),out=[];
 // Stable UTF-16 offsets into stored extraction, not raw byte offsets.
 for(const m of doc.text.matchAll(/[^.!?\n]+(?:[.!?]+|$)/gu)){
  const start=m.index,end=start+m[0].length;if(end-start<15||end-start>600||secretLike(m[0]))continue;
  const lower=m[0].toLowerCase(),matched=words.filter(w=>lower.includes(w));if(!matched.length)continue;
  out.push({sourceId:doc.id,sourceDigest:doc.textDigest,locator:{startOffset:start,endOffset:end,coordinateSystem:'utf16-extracted-text'},supportingText:m[0],matched,verificationStatus:'unverified',kind:'candidate_passage'});
 }
 return out.sort((a,b)=>b.matched.length-a.matched.length||a.locator.startOffset-b.locator.startOffset).slice(0,8);
}
export function verifyPassage(p,doc){
 return Boolean(p&&doc&&p.sourceId===doc.id&&p.sourceDigest===doc.textDigest&&doc.textDigest===digest(doc.text)&&p.locator?.coordinateSystem==='utf16-extracted-text'&&Number.isSafeInteger(p.locator.startOffset)&&Number.isSafeInteger(p.locator.endOffset)&&p.locator.startOffset>=0&&p.locator.endOffset>p.locator.startOffset&&p.locator.endOffset<=doc.text.length&&doc.text.slice(p.locator.startOffset,p.locator.endOffset)===p.supportingText);
}
export function nextQuery(objective,history,docs,passages){
 if(!history.length)return {query:objective,role:'drone',reason:'initial discovery'};
 const covered=new Set(passages.flatMap(p=>p.matched)),missing=terms(objective).filter(w=>!covered.has(w));
 const hosts=new Set(docs.map(d=>new URL(d.url).hostname));
 const variants=[];
 if(history.length===1)variants.push({query:objective+' '+(missing.length?'primary evidence '+missing.slice(0,4).join(' '):' limitations contradictory evidence'),role:missing.length?'drone':'spark',reason:missing.length?'uncovered objective terms':'independent counterevidence pass'});
 if(hosts.size<2)variants.push({query:objective+' independent primary sources',role:'spark',reason:'insufficient domain diversity'});
 variants.push({query:objective+' counterarguments limitations',role:'spark',reason:'challenge first interpretation'},{query:objective+' official data methodology',role:'drone',reason:'seek primary data'},{query:objective+' systematic review evidence gaps',role:'spark',reason:'investigate unresolved questions'});
 return variants.find(v=>!history.some(h=>h.query===v.query))??null;
}
export async function runAutonomousResearch({authorization,providers,readDocument,onEvent=()=>{},onCheckpoint=async()=>{}}){
 const a=authorization,plan=a.plan,b=plan.budget;
 if(typeof readDocument!=='function'||typeof onEvent!=='function'||typeof onCheckpoint!=='function'||plan.providers.some(p=>typeof providers[p.id]?.search!=='function'))fail('CONFIG');
 const sessionId='research_'+randomUUID(),queries=[],documents=[],passages=[],frontier=[],failures=[],seen=new Set(),content=new Set(),domainAttempts=new Map();
 let seq=0,wave=0,reason='search_variants_exhausted',pending=null;
 const emit=(kind,detail)=>{const e=Object.freeze({sessionId,sequence:++seq,kind,...detail});try{onEvent(e);}catch{}};
 const snapshot=()=>({schema:'sutra-autonomous-research-checkpoint/v1',sessionId,planPin:a.planPin,sequence:seq,queries:structuredClone(queries),documents:structuredClone(documents),passages:structuredClone(passages),frontier:structuredClone(frontier),failures:structuredClone(failures),seen:[...seen],domainAttempts:[...domainAttempts],usage:a.usage(),pending:pending&&structuredClone(pending),authority:'NONE',resumePolicy:'manual reconciliation required; no automatic remote replay'});
 async function checkpoint(){await onCheckpoint(snapshot());}
 async function operation(kind,role,detail,fn){
  a.assertActive();pending={kind,role,detail,state:'dispatch_unknown'};emit('operation.pending',{operation:kind,role});await checkpoint();a.assertActive();
  const task={id:'work',kind:'research_operation',agentId:role,dependsOn:[]};
  let error;
  const result=await runTaskGraph({tasks:[task],handlers:{research_operation:{execute:async()=>{try{return await fn();}catch(e){error=safeCode(e);throw e;}},admit:x=>x}},runId:'wave_'+(++wave)+'_'+randomUUID(),version:a.planPin,signal:a.signal,timeoutMs:30000,concurrency:1,maxPerAgent:1});
  a.assertActive();
  if(result.status!=='completed'){const e=error??'WAVE_'+result.status.toUpperCase();pending={...pending,state:error?'failed':'dispatch_unknown'};await checkpoint();if(!error||e==='BUDGET_EXHAUSTED')fail(e);failures.push({operation:kind,detail,reason:e});emit('operation.failed',{operation:kind,role,reason:e});return null;}
  emit('operation.completed',{operation:kind,role});return result.artifacts[0].value;
 }
 function enqueue(raw,depth,provider){
  let url;try{url=admitDocumentURL(raw);}catch{return;}if(secretLike(url)||seen.has(url)||depth>b.maxLinkDepth||frontier.length>=240)return;
  seen.add(url);frontier.push({url,depth,provider});
 }
 try{
  emit('session.open',{planPin:a.planPin});await checkpoint();
  while(true){
   a.assertActive();
   if(a.usage().searches>=b.maxSearches){reason='search_budget_exhausted';break;}
   const next=nextQuery(plan.objective,queries,documents,passages);if(!next)break;
   const provider=plan.providers[queries.length%plan.providers.length];
   // All queries are derived from the authorized objective, never remote text.
   if(secretLike(next.query))fail('SENSITIVE_QUERY');
   a.reserve('search',{bytes:SEARCH_BYTES,costMicros:provider.estimatedMaxCostMicros});
   const query={...next,provider:provider.id};queries.push(query);
   const results=await operation('search',next.role,{query:next.query,provider:provider.id},()=>providers[provider.id].search(next.query,{signal:a.signal}));
   if(results!==null){
    if(!Array.isArray(results)||results.length>10)fail('SEARCH_RESULT');
    for(const r of results)if(typeof r?.url==='string')enqueue(r.url,0,provider.id);
   }
   pending=null;await checkpoint();
   // Reserve opportunity for further searches: at most two docs per round.
   for(let acquired=0;acquired<2&&frontier.length&&a.usage().documents<b.maxDocuments;){
    const item=frontier.shift(),host=new URL(item.url).hostname;
    const count=domainAttempts.get(host)??0;if(count>=3)continue;
    domainAttempts.set(host,count+1);acquired++;
    const doc=await operation('document','drone',{url:item.url,depth:item.depth},async()=>{
     const d=await readDocument(item.url);
     if(!d||d.url!==item.url||typeof d.text!=='string'||d.textDigest!==digest(d.text)||!Array.isArray(d.links)||d.links.length>40)fail('DOCUMENT');
     // Runtime artifact size ceiling; truncate explicitly and re-digest extraction.
     const text=d.text.slice(0,100000);
     return {...d,text,textDigest:digest(text),extractionTruncated:text.length!==d.text.length};
    });
    if(doc&&!content.has(doc.rawDigest)&&!content.has(doc.textDigest)){
     content.add(doc.rawDigest);content.add(doc.textDigest);
     const saved={...doc,id:'source_'+(documents.length+1)};documents.push(saved);
     for(const p of extractPassages(saved,plan.objective))if(verifyPassage(p,saved))passages.push(p);
     for(const link of saved.links)enqueue(link,item.depth+1,'reference');
     emit('evidence.admitted',{sourceId:saved.id,passages:passages.filter(p=>p.sourceId===saved.id).length});
    }
    pending=null;await checkpoint();
   }
   // Always attempt an independent follow-up query when budget permits.
   if(a.usage().documents>=b.maxDocuments&&queries.length>=2){reason='document_budget_exhausted';break;}
  }
 }catch(e){
  const code=safeCode(e);
  if(code==='BUDGET_EXHAUSTED')reason='budget_exhausted';else if(a.signal.aborted||code==='INACTIVE')reason='cancelled_or_expired';else{reason='operation_interrupted';failures.push({operation:'supervisor',reason:code});}
 }
 const covered=new Set(passages.flatMap(p=>p.matched)),all=terms(plan.objective);
 const report={schema:'sutra-autonomous-research-report/v1',sessionId,planPin:a.planPin,objective:plan.objective,terminationReason:reason,queries,documents,passages,failures,usage:a.usage(),coverage:{kind:'lexical diagnostic only',matchedTerms:all.filter(w=>covered.has(w)),unmatchedTerms:all.filter(w=>!covered.has(w))},authority:'NONE',qualification:'Candidate excerpts only; no verified factual synthesis, source independence, or sufficiency claim.'};
 emit('session.close',{reason});await checkpoint();return report;
}
