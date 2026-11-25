// Finite semantic × hypothetical quantity grid. No empirical probabilities.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {challengeSemanticInterpretations} from './semantic-counterfactual.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
export const VERSION='sutra-semantic-world-grid/v1';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const fail=x=>{throw TypeError('WORLD_GRID_'+x);};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
const admittedRational=/^(-?(?:0|[1-9]\d{0,47}))\/([1-9]\d{0,47})$/;
function rational(s){
 if(typeof s!=='string'||!admittedRational.test(s)||s.startsWith('-0'))fail('VALUE');
 const [n,d]=s.split('/').map(BigInt);let a=n<0n?-n:n,b=d;while(b)[a,b]=[b,a%b];
 return (n/a)+'/'+(d/a);
}
function readAxes(raw,versionPin,bindings){
 if(!keys(raw,['version','versionDigest','axes','maxAssignments'])||raw.version!==1||raw.versionDigest!==versionPin||!Number.isSafeInteger(raw.maxAssignments)||raw.maxAssignments<1||raw.maxAssignments>16||!Array.isArray(raw.axes)||!raw.axes.length||raw.axes.length>4)fail('PLAN');
 const seen=new Set();
 return raw.axes.map(a=>{
  if(!keys(a,['bindingId','values'])||!bindings.has(a.bindingId)||seen.has(a.bindingId)||!Array.isArray(a.values)||a.values.length<2||a.values.length>4)fail('AXIS');
  seen.add(a.bindingId);const values=a.values.map(rational);
  if(new Set(values).size!==values.length)fail('DUPLICATE_VALUE');
  return {bindingId:a.bindingId,values};
 }).sort((a,b)=>sort(a.bindingId,b.bindingId));
}
// Mixed-radix iterator with O(number of axes) working space; no eager
// Cartesian-product allocation. Deterministic input value order is retained.
function* assignments(axes){
 const cursor=axes.map(()=>0);
 while(true){
  yield axes.map((a,i)=>({bindingId:a.bindingId,value:a.values[cursor[i]]}));
  let i=cursor.length-1;
  while(i>=0&&++cursor[i]===axes[i].values.length){cursor[i]=0;i--;}
  if(i<0)return;
 }
}
export async function evaluateSemanticWorldGrid(versionText,versionPin,planText,planPin){
 if(typeof planPin!=='string'||await casePin(planText)!==planPin)fail('PIN');
 const version=await replayInvestigationVersion(versionText,versionPin),raw=parse(versionText,6),contract=parse(raw.contractText),batch=parse(raw.batchText,5),plan=parse(planText,6);
 const axes=readAxes(plan,versionPin,new Set(contract.bindings.map(b=>b.id)));
 const total=axes.reduce((n,a)=>n*a.values.length,1),scenarios=[];
 for(const a of assignments(axes)){
  scenarios.push({id:'world_'+String(scenarios.length+1).padStart(2,'0'),replacements:a});
  if(scenarios.length===plan.maxAssignments)break;
 }
 const scenarioText=JSON.stringify({version:1,contractDigest:raw.contractPin,batchDigest:await casePin(raw.batchText),scenarios});
 const result=await challengeSemanticInterpretations(raw.contractText,raw.contractPin,raw.batchText,raw.annotationText,raw.annotationPin,scenarioText,await casePin(scenarioText));
 const states=new Map(result.baseline.map(x=>[x.id,x]));
 const grid=result.scenarios.map(s=>({id:s.id,assignment:s.replacements,rows:result.baseline.map(b=>{
  const row=s.rows.find(r=>r.id===b.id);
  return row?{id:b.id,state:row.conditionalState,reportDigest:row.graphDigest,execution:'FRESH_MATCHED_CACHED'}:{id:b.id,state:b.conditionalState,reportDigest:null,execution:'BASELINE_UNRESOLVED_NOT_EVALUATED'};
 }),witnesses:s.witnesses}));
 const candidates=result.baseline.map(b=>{
  const rows=grid.map(w=>w.rows.find(r=>r.id===b.id));
  const values=[...new Set(rows.map(r=>r.state))].sort(sort);
  let status;
  if(b.status!=='DECISIVE')status='BASELINE_UNRESOLVED_NOT_EVALUATED';
  else if(values.includes('constraint_satisfied')&&values.includes('constraint_refuted'))status='VARIES_IN_EVALUATED_GRID';
  else if(values.some(s=>!decisive(s)))status='UNRESOLVED_IN_EVALUATED_GRID';
  else if(grid.length<total)status='SAME_IN_EVALUATED_PREFIX_ONLY';
  else status='SAME_IN_DECLARED_GRID_ONLY';
  return {id:b.id,baseline:b.conditionalState,states:values,status};
 });
 // Distinguish changes to the semantic program from changes to quantities.
 // These are scenario assignments only: no new evidence and no adoption.
 const firstAdmitted=version.investigation.candidates.find(c=>c.admission==='ADMITTED');
 let originalValues=null;
 if(firstAdmitted){
  const proposal=batch.proposals.find(p=>p.id===firstAdmitted.id);
  const c=await compileReviewedProposal(raw.contractText,raw.contractPin,proposal.proposalText);
  originalValues=Object.fromEntries(c.bindings.map(b=>[b.id,b.value]));
 }
 const interactionWitnesses=[];
 if(originalValues)for(const w of grid){
  const changed=w.assignment.filter(a=>a.value!==originalValues[a.bindingId]);
  if(changed.length<2)continue;
  // Only assert the scoped interaction if ALL one-change assignments are
  // actually evaluated and decisive with no distinguishing result for that pair.
  const singles=changed.map(a=>grid.find(g=>g.assignment.every(x=>x.value===(x.bindingId===a.bindingId?a.value:originalValues[x.bindingId]))));
  if(singles.some(x=>!x))continue;
  for(const witness of w.witnesses){
   if(singles.every(s=>{
    const l=s.rows.find(r=>r.id===witness.left),r=s.rows.find(r=>r.id===witness.right);
    return decisive(l.state)&&decisive(r.state)&&l.state===r.state;
   }))interactionWitnesses.push({worldId:w.id,left:witness.left,right:witness.right,changedBindings:changed.map(x=>x.bindingId),singleWorldIds:singles.map(s=>s.id)});
  }
 }
 return freeze({version:VERSION,versionDigest:versionPin,planDigest:planPin,axes,
  semanticAxis:{candidateIds:[...states.keys()],status:'SUPPLIED_CANDIDATE_PROGRAMS_ONLY'},
  coverage:{totalAssignments:total,evaluatedAssignments:grid.length,truncated:grid.length<total,totalCandidateCells:total*states.size,evaluatedGridCells:grid.length*states.size,executedCells:grid.reduce((n,w)=>n+w.rows.filter(r=>r.execution==='FRESH_MATCHED_CACHED').length,0)},
  candidates,worlds:grid,interactionWitnesses,decisionAuthority:'NONE',
  qualification:'A finite Cartesian grid of declared synthetic quantity values crossed with supplied semantic programs. The evaluated prefix is order-dependent. Unknown or refused baseline programs remain visible but are not evaluated. Interactions are scoped to evaluated single-change comparisons, not proof of causality or physical feasibility. No empirical probability, complete meaning coverage, source revision or authority.'});
}
