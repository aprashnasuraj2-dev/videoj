// Host admission of model outputs. Citation integrity does NOT establish entailment.
import {digest,secretLike} from './research-session.js';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {verifyEvidence,extractNumericObservations,compareNumericObservations} from './evidence-index.js';
const fail=code=>{throw Object.assign(Error('Research intelligence refused: '+code),{code});};
const exact=(o,k)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const text=(s,max)=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=max&&!/[\u0000-\u001f\u007f\ud800-\udfff]/u.test(s)&&!secretLike(s);
const id=(prefix,x)=>prefix+'_'+digest(JSON.stringify(x)).slice(7,31);
// Snapshot exact acquisition identity without including URLs or timestamps in
// model disclosures. Fixtures lacking acquisition metadata remain span-only.
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function acquisitionPin(d){
 if(typeof d.rawDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(d.rawDigest)||typeof d.retrievedAt!=='string'||typeof d.url!=='string'||typeof d.mediaType!=='string'||typeof d.parser!=='string')return null;
 return digest(JSON.stringify([d.id,d.textDigest,d.rawDigest,d.url,d.finalUrl??d.url,d.retrievedAt,d.mediaType,d.parser,d.extractionTruncated===true,d.pageMap??[]]));
}
const questions=new Set(['primary','counterevidence','comparability','gaps']);
export function plannerInput(objective,history,documents,passages,coverage,capabilities){
 // No source text, titles, URLs, model-written claims or prior model outputs.
 return {objective,searchesCompleted:history.length,documentsAdmitted:documents.length,passagesAdmitted:passages.length,missingObjectiveTerms:coverage,attemptedQuestions:[...new Set(history.map(q=>q.questionId).filter(q=>questions.has(q)))],...(capabilities?{webCapabilities:capabilities}:{})};
}
export function admitModelQueries(value,objective,history){
 if(!exact(value,['queries'])||!Array.isArray(value.queries)||value.queries.length>4)fail('PLAN_SCHEMA');
 const seen=new Set(history.map(q=>q.query)),out=[];
 for(const q of value.queries){
  if(!exact(q,['suffix','questionId'])||!text(q.suffix,150)||!questions.has(q.questionId)||!/^[\p{L}\p{N}][\p{L}\p{N} -]*$/u.test(q.suffix)||/\d{7,}/.test(q.suffix)||/(?:\b(?:https?|www|password|credentials?|secret|upload|execute|token|authorization)\b)/i.test(q.suffix))fail('PLAN_QUERY');
  const query=objective+' '+q.suffix.replace(/ +/g,' ');if(query.length>1200||secretLike(query))fail('PLAN_QUERY');if(seen.has(query))continue;seen.add(query);
  out.push({query,role:q.questionId==='counterevidence'||q.questionId==='comparability'?'spark':'drone',questionId:q.questionId,reason:'manifest-approved model planner refinement',origin:'model-planner'});
 }
 return out;
}
// Model-directed web access is a proposal, never direct network authority.
export function admitWebDecision(value,objective,history,{allowPublicUrls=false,webAttempted=history.length>0}={}){
 if(!value||!['search','open_public_urls','answer_without_web','finish_research'].includes(value.webAction))fail('WEB_DECISION');
 if(value.webAction==='open_public_urls'){
  if(!allowPublicUrls||!exact(value,['webAction','urls'])||!Array.isArray(value.urls)||value.urls.length<1||value.urls.length>3)fail('WEB_URL_SCOPE');
  const urls=[];for(const raw of value.urls){
   if(typeof raw!=='string'||raw.length>2048||secretLike(raw))fail('WEB_URL');
   let url;try{url=admitDocumentURL(raw,{allowQuery:false});}catch{fail('WEB_URL');}
   if(!urls.includes(url))urls.push(url);
  }
  return {action:'open_public_urls',urls};
 }
 if(value.webAction==='search'){
  if(!exact(value,['webAction','queries']))fail('WEB_DECISION');
  const queries=admitModelQueries({queries:value.queries},objective,history);
  if(!queries.length)fail('WEB_DECISION_EMPTY');
  return {action:'search',queries};
 }
 if(value.webAction==='finish_research'){
  if(!exact(value,['webAction'])||!webAttempted)fail('WEB_DECISION');
  return {action:'finish_research'};
 }
 if(!exact(value,['webAction','answer'])||webAttempted||!text(value.answer,3000))fail('WEB_DECISION');
 return {action:'answer_without_web',answer:value.answer};
}
export function makeEvidencePacket(documents,passages,{maxPassages=24,maxTextBytes=16000}={}){
 if(!Number.isSafeInteger(maxPassages)||maxPassages<1||maxPassages>48||!Number.isSafeInteger(maxTextBytes)||maxTextBytes<256||maxTextBytes>48000)fail('PACKET_LIMIT');
 // Verify the same detached data used for subsequent model/reviewer admission.
 const v=verifyEvidence(documents,passages);
 documents=structuredClone(documents);passages=structuredClone(passages);
 const byDoc=new Map(documents.map(d=>[d.id,freeze(d)]));
 // Round-robin over sources to avoid filling context with one source.
 const groups=new Map();for(let i=0;i<passages.length;i++){const p=passages[i];if(secretLike(p.supportingText))continue;if(!groups.has(p.sourceId))groups.set(p.sourceId,[]);groups.get(p.sourceId).push({ref:v.refs[i],p});}
 const excerpts=[],map=new Map();let bytes=0;
 for(let round=0;round<8&&excerpts.length<maxPassages;round++)for(const group of groups.values()){
  if(excerpts.length>=maxPassages)break;const x=group[round];if(!x)continue;
  const {ref,p}=x,d=byDoc.get(p.sourceId);
  // No raw source URL, model credentials, document bodies or local paths disclosed.
  const e=freeze({passageId:ref.id,sourceId:p.sourceId,sourceDigest:p.sourceDigest,locator:ref.locator,quote:p.supportingText});
  const size=Buffer.byteLength(JSON.stringify(e));if(bytes+size>maxTextBytes)continue;bytes+=size;excerpts.push(e);map.set(ref.id,freeze({ref,p,d,acquisitionPin:acquisitionPin(d)}));
 }
 return Object.freeze({excerpts:Object.freeze(excerpts),map:Object.freeze({get:key=>map.get(key),has:key=>map.has(key),get size(){return map.size;}}),disclosedBytes:bytes,availablePassages:passages.length});
}
function admitCitations(citations,packet,{minimum=1,maximum=3}={}){
 if(!Array.isArray(citations)||citations.length<minimum||citations.length>maximum)fail('CITATION_COUNT');
 const seen=new Set(),spans=new Set(),out=[];
 for(const c of citations){
  if(!exact(c,['passageId','quote'])||!text(c.quote,600)||c.quote.length<8||typeof c.passageId!=='string'||seen.has(c.passageId))fail('CITATION_SCHEMA');
  const item=packet.map.get(c.passageId);if(!item)fail('CITATION_UNKNOWN');
  const offset=item.p.supportingText.indexOf(c.quote);
  if(offset<0)fail('CITATION_QUOTE');
  // Refuse ambiguous subspan rather than invent an offset.
  if(item.p.supportingText.indexOf(c.quote,offset+1)>=0)fail('CITATION_AMBIGUOUS');
  const start=item.ref.locator.startOffset+offset,end=start+c.quote.length;
  if(item.d.text.slice(start,end)!==c.quote)fail('CITATION_QUOTE');
  const spanKey=JSON.stringify([item.ref.sourceId,item.ref.sourceDigest,start,end]);if(spans.has(spanKey))fail('CITATION_DUPLICATE');spans.add(spanKey);
  seen.add(c.passageId);out.push({passageId:c.passageId,sourceId:item.ref.sourceId,sourceDigest:item.ref.sourceDigest,quote:c.quote,locator:{...item.ref.locator,startOffset:start,endOffset:end},verification:'exact_span_only',...(item.acquisitionPin?{acquisitionPin:item.acquisitionPin}:{})});
 }
 return out;
}
export function admitSynthesis(value,packet){
 if(!exact(value,['claims','gaps'])||!Array.isArray(value.claims)||value.claims.length>8||!Array.isArray(value.gaps)||value.gaps.length>8||value.gaps.some(x=>!text(x,500)))fail('SYNTHESIS_SCHEMA');
 const claims=[],seen=new Set();
 for(const c of value.claims){
  if(!exact(c,['statement','kind','citations'])||!text(c.statement,700)||!['reported','inference'].includes(c.kind)||seen.has(c.statement))fail('CLAIM_SCHEMA');
  const citations=admitCitations(c.citations,packet);seen.add(c.statement);
  claims.push({id:id('claim',[c.statement,c.kind,citations]),statement:c.statement,kind:c.kind,citations,truthStatus:'UNVERIFIED',reviewStatus:'not_reviewed'});
 }
 return {claims,gaps:[...new Set(value.gaps)]};
}
export function admitReviews(value,synthesis,packet){
 if(!(exact(value,['reviews'])||exact(value,['reviews','conflicts']))||!Array.isArray(value.reviews)||value.reviews.length!==synthesis.claims.length)fail('REVIEW_SCHEMA');
 const claims=new Map(synthesis.claims.map(c=>[c.id,c])),seen=new Set(),reviews=[];
 for(const r of value.reviews){
  if(!exact(r,['claimId','verdict','reason','citations'])||!claims.has(r.claimId)||seen.has(r.claimId)||!['supported','qualified','contradicted','insufficient'].includes(r.verdict)||!text(r.reason,700))fail('REVIEW_SCHEMA');
  const citations=admitCitations(r.citations,packet,{minimum:r.verdict==='insufficient'?0:1,maximum:3});
  seen.add(r.claimId);reviews.push({claimId:r.claimId,verdict:r.verdict,reason:r.reason,citations,authority:'NONE'});
 }
 return reviews;
}
// Every candidate pair contains independently locatable evidence on both sides.
// A different host or vendor is not proof of independent source origin.
export function conflictCandidates(packet){
 const passages=packet.excerpts.map(e=>packet.map.get(e.passageId).p),refs=packet.excerpts.map(e=>packet.map.get(e.passageId).ref);
 const numbers=extractNumericObservations(passages,refs),byId=new Map(numbers.map(n=>[n.id,n])),pairs=[],seen=new Set();
 for(const c of compareNumericObservations(numbers)){
  const a=byId.get(c.left),b=byId.get(c.right);if(!a||!b||a.sourceId===b.sourceId)continue;
  const key=[a.passageId,b.passageId].sort().join(':');if(seen.has(key)||pairs.length>=8)continue;seen.add(key);
  pairs.push({id:id('conflict',[key]),leftPassageId:a.passageId,rightPassageId:b.passageId,kind:'numeric_discrepancy_candidate'});
 }
 return pairs;
}
export function admitConflictReviews(value,candidates,packet){
 const candidateMap=new Map(candidates.map(c=>[c.id,c])),seen=new Set(),out=[];
 const raw=value?.conflicts??[];
 if(!Array.isArray(raw)||raw.length>12)fail('CONFLICT_SCHEMA');
 for(const c of raw){
  if(!exact(c,['candidateId','relation','reason','citations'])||typeof c.candidateId!=='string'||!['conflicting','different_scope','different_period','different_definition','different_unit','insufficient'].includes(c.relation)||!text(c.reason,700))fail('CONFLICT_SCHEMA');
  const citations=admitCitations(c.citations,packet,{minimum:2,maximum:2});
  const [a,b]=citations;if(a.sourceId===b.sourceId)fail('CONFLICT_SOURCES');
  const pair=[a.passageId,b.passageId].sort(),key=pair.join(':');if(seen.has(key))fail('CONFLICT_DUPLICATE');seen.add(key);
  const detected=candidateMap.get(c.candidateId);
  if(c.candidateId!=='new'&&(!detected||[detected.leftPassageId,detected.rightPassageId].sort().join(':')!==key))fail('CONFLICT_CANDIDATE');
  if(c.candidateId==='new'&&candidates.some(x=>[x.leftPassageId,x.rightPassageId].sort().join(':')===key))fail('CONFLICT_CANDIDATE');
  out.push({id:detected?.id??id('conflict',[key]),kind:detected?.kind??'semantic_conflict_candidate',relation:c.relation,reason:c.reason,citations,status:['conflicting','insufficient'].includes(c.relation)?'unresolved':'model_explanation_unverified',authority:'NONE'});
 }
 for(const c of candidates)if(!out.some(x=>x.id===c.id))out.push({...c,relation:'not_reviewed',status:'unresolved',citations:[],reason:'The reviewer did not return a validated assessment.',authority:'NONE'});
 return out;
}
export function assembleIntelligence(synthesis,reviews,receipts,packet,conflicts=[],reviewMode='independence_unproven'){
 const byId=new Map(reviews.map(r=>[r.claimId,r]));
 const claims=synthesis.claims.map(c=>{
  const r=byId.get(c.id),cited=new Set(c.citations.map(x=>x.passageId));
  const affected=conflicts.filter(x=>x.status==='unresolved'&&(x.citations.some(k=>cited.has(k.passageId))||cited.has(x.leftPassageId)||cited.has(x.rightPassageId))).map(x=>x.id);
  const publicationStatus=c.kind==='inference'&&affected.length?'withheld_from_findings':r?.verdict==='supported'?(affected.length?'candidate_qualified':'candidate_reviewed'):r?.verdict==='qualified'?'candidate_qualified':'withheld_from_findings';
  return {...c,reviewStatus:r?.verdict??'not_reviewed',review:r??null,conflictIds:affected,publicationStatus};
 });
 return {schema:'sutra-research-intelligence/v1',claims,gaps:synthesis.gaps,conflicts,receipts,reviewMode,packet:{disclosedPassages:packet.excerpts.length,availablePassages:packet.availablePassages,disclosedBytes:packet.disclosedBytes},authority:'NONE',qualification:'Exact quotations were validated against acquired extraction. Model review is a semantic opinion, not proof of truth, entailment, independence or completeness. Disputed, insufficient and unreviewed claims are excluded from findings.'};
}
