// Closed, separately pinned semantic annotations over the existing reviewed compiler.
// Annotation text is a proposal, not evidence entailment or a human sign-off.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {triageReviewedInterpretations,createSemanticTriageSession} from './semantic-triage.js';
export const VERSION='sutra-semantic-investigation/v1';
export const FACETS=Object.freeze(['entity','definition','time','population','geography','condition','measurement','baseline','quantifier','negation','modality','causality','method']);
export const OBLIGATIONS=Object.freeze(['intent','evidenceSelection','extraction','entityResolution','scope','relationshipSelection','methodValidity','computation','communication']);
const HASH=/^sha256:[a-f0-9]{64}$/,ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const id=x=>typeof x==='string'&&ID.test(x);
const validText=(s,n)=>typeof s==='string'&&s.length<=n&&s.trim().length>0&&!/[\ud800-\udfff]/u.test(s);
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const fail=x=>{throw TypeError('SEMANTIC_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const parse=(s,depth=12)=>parseUniqueJson(s,{maxChars:262144,maxDepth:depth});
const sorts=(a,b)=>a<b?-1:a>b?1:0;
function readAnnotations(a,contractPin,batchPin,ids){
 if(!keys(a,['version','contractDigest','batchDigest','candidates'])||a.version!==1||a.contractDigest!==contractPin||a.batchDigest!==batchPin||!Array.isArray(a.candidates)||a.candidates.length!==ids.size)fail('ANNOTATIONS');
 const seen=new Set();
 for(const c of a.candidates){
  if(!keys(c,['id','meaning','facets'])||!ids.has(c.id)||seen.has(c.id)||!validText(c.meaning,2048)||!keys(c.facets,FACETS))fail('CANDIDATE');
  seen.add(c.id);
  for(const k of FACETS){
   const f=c.facets[k];if(f===null)continue;
   if(!keys(f,['statement','references'])||!validText(f.statement,1024)||!Array.isArray(f.references)||f.references.length>8)fail('FACET');
   const refs=new Set();
   for(const r of f.references){
    if(!keys(r,['kind','id'])||!['binding','claim'].includes(r.kind)||!id(r.id)||refs.has(r.kind+':'+r.id))fail('REFERENCE');
    refs.add(r.kind+':'+r.id);
   }
  }
 }
 return a.candidates.slice().sort((a,b)=>sorts(a.id,b.id));
}
async function evaluateWithTriage(contractText,contractPin,batchText,annotationText,annotationPin,evaluateTriage){
 if(typeof annotationPin!=='string'||!HASH.test(annotationPin)||await casePin(annotationText)!==annotationPin)fail('ANNOTATION_PIN');
 const batchPin=await casePin(batchText);
 // Existing compiler owns source bytes, numeric token admission, graph validation and computation.
 const triage=await evaluateTriage(contractText,contractPin,batchText);
 const c=parse(contractText,9),b=parse(batchText,5),ids=new Set(b.proposals.map(p=>p.id));
 const annotated=readAnnotations(parse(annotationText),contractPin,batchPin,ids);
 const source=new Map(c.sources.map(s=>[s.id,s]));
 source.set('question',{id:'question',text:c.question.text,digest:c.question.digest,lineage:'user_question'});
 const bindings=new Map(c.bindings.map(x=>[x.id,x]));
 const proposals=new Map(b.proposals.map(x=>[x.id,x.proposalText]));
 const entries=new Map(triage.contrast.entries.map(x=>[x.id,x]));
 const exactSpan=s=>({...s,sourceDigest:source.get(s.sourceId).digest,declaredLineage:source.get(s.sourceId).lineage});
 const candidates=annotated.map(a=>{
  const entry=entries.get(a.id);
  const admitted=entry.admission==='ADMITTED';
  // Only parse claims after the compiler has admitted their exact byte spans.
  const p=admitted?parse(proposals.get(a.id),9):null;
  const claims=new Map((p?.claims??[]).map(x=>[x.id,x]));
  const used=new Set(entry.computation?.bindingIds??[]);
  const facets=Object.fromEntries(FACETS.map(k=>{
   const f=a.facets[k];
   if(f===null)return [k,{status:'UNSPECIFIED',statement:null,references:[]}];
   const references=f.references.map(r=>{
    if(!admitted)return {...r,status:'PROPOSAL_REFUSED',span:null};
    if(r.kind==='binding'){
     const b=bindings.get(r.id);if(!b)fail('UNKNOWN_BINDING');
     return {...r,status:used.has(r.id)?'TARGET_BINDING':'CONTEXT_ONLY_BINDING',span:exactSpan(b.span),declaredType:b.type};
    }
    const claim=claims.get(r.id);if(!claim)fail('UNKNOWN_CLAIM');
    return claim.kind==='quoted_assertion'?{...r,status:'EXACT_QUOTE_ONLY',span:exactSpan(claim.span)}:{...r,status:'PROPOSED_NOT_SOURCE_BOUND',span:null};
   });
   const sourceBound=references.some(r=>r.span!==null);
   return [k,{status:sourceBound?'SOURCE_LINKED_DECLARATION':'UNSUPPORTED_DECLARATION',statement:f.statement,references}];
  }));
  const obligations=Object.fromEntries(OBLIGATIONS.map(k=>[k,'UNRESOLVED']));
  obligations.extraction=admitted?'EXACT_ADMITTED_SPANS_ONLY':'UNRESOLVED';
  obligations.computation=entry.computation?.status??'REFUSED';
  return {id:a.id,meaning:a.meaning,meaningStatus:'PROPOSED_UNVERIFIED',facets,obligations,
    questionSpan:p?exactSpan(p.questionSpan):null,questionCoverage:p?(p.questionSpan.start===0&&p.questionSpan.end===new TextEncoder().encode(c.question.text).length?'FULL_QUESTION_SPAN':'PARTIAL_QUESTION_SPAN'):'REFUSED',
    admission:entry.admission,reason:entry.reason,computation:entry.computation};
 });
 return freeze({version:VERSION,contractDigest:contractPin,batchDigest:batchPin,annotationDigest:annotationPin,
  originalQuestion:{text:c.question.text,digest:c.question.digest},candidates,triage,
  verification:{sourceIntegrity:'PINNED_BYTES_ONLY',sourceAuthenticity:'UNVERIFIED',extractionFidelity:'EXACT_SPANS_NOT_ENTAILMENT',entityResolution:'UNVERIFIED',scopeConsistency:'DECLARED_NOT_ESTABLISHED',semanticInterpretation:'UNVERIFIED',methodValidity:'UNVERIFIED',computationalCorrectness:'PER_CANDIDATE_CONDITIONAL',empiricalSupport:'UNVERIFIED',freshness:'UNVERIFIED',externalApplicability:'UNVERIFIED'},
  qualification:'Candidate annotations and source links do not establish entailment, intended meaning, authenticity, method validity, or empirical truth. No external authority. Supplied candidates only.'});
}

export async function evaluateSemanticInvestigation(contractText,contractPin,batchText,annotationText,annotationPin){return evaluateWithTriage(contractText,contractPin,batchText,annotationText,annotationPin,triageReviewedInterpretations);}
function semanticSession(triage){
 let busy=false;
 return Object.freeze({async evaluate(contractText,contractPin,batchText,annotationText,annotationPin){
  if(busy)throw Error('SEMANTIC_SESSION_BUSY');busy=true;
  try{
   const next=triage.fork();let stats;
   const result=await evaluateWithTriage(contractText,contractPin,batchText,annotationText,annotationPin,async(...args)=>{const out=await next.triage(...args);stats=out.stats;return out.result;});
   // A bad annotation or facet reference must not commit arithmetic cache state.
   triage=next;return freeze({result,stats});
  }finally{busy=false;}
 },fork(){if(busy)throw Error('SEMANTIC_SESSION_BUSY');return semanticSession(triage.fork());}});
}
export function createSemanticInvestigationSession(){return semanticSession(createSemanticTriageSession());}
