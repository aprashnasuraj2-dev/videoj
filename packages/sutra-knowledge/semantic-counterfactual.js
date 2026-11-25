// Explicit synthetic perturbations of admitted typed graphs, never source revisions.
// Shared binding identity is perturbed consistently in every occurrence/candidate.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
import {evaluateSemanticInvestigation} from './semantic-investigation.js';
import {createVerifier} from './index.js';
export const VERSION='sutra-semantic-counterfactual/v1';
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/,HASH=/^sha256:[a-f0-9]{64}$/;
const fail=x=>{throw TypeError('COUNTERFACTUAL_'+x);};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const parse=(t,d=9)=>parseUniqueJson(t,{maxChars:262144,maxDepth:d});
const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
function rational(v){
 if(typeof v!=='string'||!/^(-?(?:0|[1-9]\d{0,47}))\/([1-9]\d{0,47})$/.test(v)||v.startsWith('-0'))fail('RATIONAL');
 const [n,d]=v.split('/').map(BigInt);let a=n<0n?-n:n,b=d;
 while(b){[a,b]=[b,a%b];}
 return (n/a).toString()+'/'+(d/a).toString();
}
function plan(t,contractPin,batchPin,bindings){
 const p=parse(t,6);
 if(!keys(p,['version','contractDigest','batchDigest','scenarios'])||p.version!==1||p.contractDigest!==contractPin||p.batchDigest!==batchPin||!Array.isArray(p.scenarios)||!p.scenarios.length||p.scenarios.length>16)fail('PLAN');
 const ids=new Set();
 return p.scenarios.map(s=>{
  if(!keys(s,['id','replacements'])||typeof s.id!=='string'||!ID.test(s.id)||ids.has(s.id)||!Array.isArray(s.replacements)||!s.replacements.length||s.replacements.length>4)fail('SCENARIO');
  ids.add(s.id);const seen=new Set();
  const replacements=s.replacements.map(r=>{
   if(!keys(r,['bindingId','value'])||!bindings.has(r.bindingId)||seen.has(r.bindingId))fail('BINDING');
   seen.add(r.bindingId);return {bindingId:r.bindingId,value:rational(r.value)};
  }).sort((a,b)=>sort(a.bindingId,b.bindingId));
  return {id:s.id,replacements};
 }).sort((a,b)=>sort(a.id,b.id));
}
function targetState(run,target){return run.report.receipts.find(x=>x.id===target)?.outcome.status??'unresolved';}
const fromCompiler=s=>s==='CONDITIONALLY_SATISFIED'?'constraint_satisfied':s==='CONDITIONALLY_REFUTED'?'constraint_refuted':null;
export async function challengeSemanticInterpretations(contractText,contractPin,batchText,annotationText,annotationPin,planText,planPin){
 if(typeof planPin!=='string'||!HASH.test(planPin)||await casePin(planText)!==planPin)fail('PLAN_PIN');
 const investigation=await evaluateSemanticInvestigation(contractText,contractPin,batchText,annotationText,annotationPin);
 const c=parse(contractText),b=parse(batchText,5),by=new Map(b.proposals.map(p=>[p.id,p.proposalText]));
 const scenarios=plan(planText,contractPin,investigation.batchDigest,new Set(c.bindings.map(x=>x.id)));
 const runs=[],base=[];
 for(const candidate of investigation.candidates){
  const baseline=fromCompiler(candidate.computation?.status);
  if(!baseline){base.push({id:candidate.id,status:'UNRESOLVED_OR_REFUSED',conditionalState:candidate.computation?.status??'REFUSED'});continue;}
  const r=await compileReviewedProposal(contractText,contractPin,by.get(candidate.id));
  const graph=JSON.parse(r.graphText),inputBindings=new Map(r.nodes.filter(n=>n.kind==='input').map(n=>[n.id,n.bindingId]));
  const used=new Set(r.nodes.find(n=>n.id===r.target.id).bindings);
  // Synthetic basis is explicit and stable across scenarios; no source pin is
  // presented as provenance for hypothetical numbers.
  for(const n of graph.nodes)if(n.kind==='input')n.basis='synthetic counterfactual '+inputBindings.get(n.id);
  const verifier=createVerifier(),initial=await verifier.evaluate(JSON.stringify(graph));
  if(targetState(initial,r.target.id)!==baseline)fail('BASELINE_DIVERGENCE');
  runs.push({id:candidate.id,graph,inputBindings,used,verifier,target:r.target.id,baseline});
  base.push({id:candidate.id,status:'DECISIVE',conditionalState:baseline});
 }
 const outcomes=[];
 for(const s of scenarios){
  const replacement=new Map(s.replacements.map(x=>[x.bindingId,x.value])),rows=[];
  for(const r of runs){
   const graph=structuredClone(r.graph),changed=[];
   for(const n of graph.nodes)if(n.kind==='input'&&replacement.has(r.inputBindings.get(n.id))){
    const value=replacement.get(r.inputBindings.get(n.id));
    if(rational(n.value)!==value){n.value=value;changed.push(n.id);}
   }
   const text=JSON.stringify(graph),cached=await r.verifier.evaluate(text),fresh=await createVerifier().evaluate(text);
   // Calculation reuse is permitted only when it produces the same entire
   // report as a fresh run. No untrusted cache or external receipts.
   if(cached.reportText!==fresh.reportText)fail('INCREMENTAL_REPLAY_DIVERGENCE');
   const state=targetState(fresh,r.target);
   rows.push({id:r.id,conditionalState:state,changedInputNodes:changed.sort(sort),targetBindingsPerturbed:s.replacements.filter(x=>r.used.has(x.bindingId)).map(x=>x.bindingId),
    graphDigest:fresh.report.graphDigest,incrementalMatchesFull:true,executed:cached.stats.executed.length,reused:cached.stats.reused.length});
  }
  const witnesses=[];
  for(let i=0;i<runs.length;i++)for(let j=i+1;j<runs.length;j++){
   const l=runs[i],r=runs[j],a=rows[i],b=rows[j];
   if(l.baseline===r.baseline&&decisive(a.conditionalState)&&decisive(b.conditionalState)&&a.conditionalState!==b.conditionalState)witnesses.push({left:l.id,right:r.id,leftState:a.conditionalState,rightState:b.conditionalState});
  }
  outcomes.push({id:s.id,replacements:s.replacements,rows,witnesses});
 }
 return freeze({version:VERSION,contractDigest:contractPin,batchDigest:investigation.batchDigest,annotationDigest:annotationPin,planDigest:planPin,
  baseline:base,scenarios:outcomes,coverage:'EXPLICIT_FINITE_SYNTHETIC_SCENARIOS_ONLY',decisionAuthority:'NONE',
  qualification:'A distinguishing synthetic scenario exposes different formal behavior, not which interpretation is correct. No source replacement, physical feasibility, causal effect, exhaustive equivalence or empirical truth claimed. Reuse counts compare sequential cached calculations with fresh replay; not end-to-end speedup.'});
}
