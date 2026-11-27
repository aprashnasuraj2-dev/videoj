// Host admission of model outputs. Citation integrity does NOT establish entailment.
import {digest,secretLike} from './research-session.js';
import {verifyEvidence} from './evidence-index.js';
const fail=code=>{throw Object.assign(Error('Research intelligence refused: '+code),{code});};
const exact=(o,k)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const text=(s,max)=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=max&&!/[\u0000-\u001f\u007f\ud800-\udfff]/u.test(s)&&!secretLike(s);
const id=(prefix,x)=>prefix+'_'+digest(JSON.stringify(x)).slice(7,31);
const questions=new Set(['primary','counterevidence','comparability','gaps']);
export function plannerInput(objective,history,documents,passages,coverage){
 // No source text, titles, URLs, model-written claims or prior model outputs.
 return {objective,searchesCompleted:history.length,documentsAdmitted:documents.length,passagesAdmitted:passages.length,missingObjectiveTerms:coverage,attemptedQuestions:[...new Set(history.map(q=>q.questionId).filter(q=>questions.has(q)))]};
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
export function makeEvidencePacket(documents,passages,{maxPassages=24,maxTextBytes=16000}={}){
 if(!Number.isSafeInteger(maxPassages)||maxPassages<1||maxPassages>48||!Number.isSafeInteger(maxTextBytes)||maxTextBytes<256||maxTextBytes>48000)fail('PACKET_LIMIT');
 const v=verifyEvidence(documents,passages),byDoc=new Map(documents.map(d=>[d.id,d]));
 // Round-robin over sources to avoid filling context with one source.
 const groups=new Map();for(let i=0;i<passages.length;i++){const p=passages[i];if(secretLike(p.supportingText))continue;if(!groups.has(p.sourceId))groups.set(p.sourceId,[]);groups.get(p.sourceId).push({ref:v.refs[i],p});}
 const excerpts=[],map=new Map();let bytes=0;
 for(let round=0;round<8&&excerpts.length<maxPassages;round++)for(const group of groups.values()){
  if(excerpts.length>=maxPassages)break;const x=group[round];if(!x)continue;
  const {ref,p}=x,d=byDoc.get(p.sourceId);
  // No raw source URL, model credentials, document bodies or local paths disclosed.
  const e={passageId:ref.id,sourceId:p.sourceId,sourceDigest:p.sourceDigest,locator:ref.locator,quote:p.supportingText};
  const size=Buffer.byteLength(JSON.stringify(e));if(bytes+size>maxTextBytes)continue;bytes+=size;excerpts.push(e);map.set(ref.id,{ref,p,d});
 }
 return {excerpts,map,disclosedBytes:bytes,availablePassages:passages.length};
}
function admitCitations(citations,packet,{minimum=1,maximum=3}={}){
 if(!Array.isArray(citations)||citations.length<minimum||citations.length>maximum)fail('CITATION_COUNT');
 const seen=new Set(),out=[];
 for(const c of citations){
  if(!exact(c,['passageId','quote'])||!text(c.quote,600)||typeof c.passageId!=='string'||seen.has(c.passageId))fail('CITATION_SCHEMA');
  const item=packet.map.get(c.passageId);if(!item)fail('CITATION_UNKNOWN');
  const offset=item.p.supportingText.indexOf(c.quote);
  if(offset<0)fail('CITATION_QUOTE');
  // Refuse ambiguous subspan rather than invent an offset.
  if(item.p.supportingText.indexOf(c.quote,offset+1)>=0)fail('CITATION_AMBIGUOUS');
  const start=item.ref.locator.startOffset+offset,end=start+c.quote.length;
  if(item.d.text.slice(start,end)!==c.quote)fail('CITATION_QUOTE');
  seen.add(c.passageId);out.push({passageId:c.passageId,sourceId:item.ref.sourceId,sourceDigest:item.ref.sourceDigest,quote:c.quote,locator:{...item.ref.locator,startOffset:start,endOffset:end},verification:'exact_span_only'});
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
 if(!exact(value,['reviews'])||!Array.isArray(value.reviews)||value.reviews.length!==synthesis.claims.length)fail('REVIEW_SCHEMA');
 const claims=new Map(synthesis.claims.map(c=>[c.id,c])),seen=new Set(),reviews=[];
 for(const r of value.reviews){
  if(!exact(r,['claimId','verdict','reason','citations'])||!claims.has(r.claimId)||seen.has(r.claimId)||!['supported','qualified','contradicted','insufficient'].includes(r.verdict)||!text(r.reason,700))fail('REVIEW_SCHEMA');
  const citations=admitCitations(r.citations,packet,{minimum:r.verdict==='insufficient'?0:1,maximum:3});
  seen.add(r.claimId);reviews.push({claimId:r.claimId,verdict:r.verdict,reason:r.reason,citations,authority:'NONE'});
 }
 return reviews;
}
export function assembleIntelligence(synthesis,reviews,receipts,packet){
 const byId=new Map(reviews.map(r=>[r.claimId,r]));
 const claims=synthesis.claims.map(c=>{const r=byId.get(c.id);return {...c,reviewStatus:r?.verdict??'not_reviewed',review:r??null,publicationStatus:r?.verdict==='supported'?'candidate_reviewed':r?.verdict==='qualified'?'candidate_qualified':'withheld_from_findings'};});
 return {schema:'sutra-research-intelligence/v1',claims,gaps:synthesis.gaps,receipts,packet:{disclosedPassages:packet.excerpts.length,availablePassages:packet.availablePassages,disclosedBytes:packet.disclosedBytes},authority:'NONE',qualification:'Exact quotations were validated against acquired extraction. Model review is a semantic opinion, not proof of truth, entailment, independence or completeness. Disputed, insufficient and unreviewed claims are excluded from findings.'};
}
