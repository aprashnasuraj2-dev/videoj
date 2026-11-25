// Exact bounded review-suite selection over already evaluated synthetic worlds.
// This reduces proposed human review items, not the cost of evaluating the grid.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {evaluateSemanticWorldGrid} from './semantic-world-grid.js';
import {prepareReviewedCompilerContract,compilePreparedReviewedProposal} from './reviewed-claim-compiler.js';
export const VERSION='sutra-semantic-probe-suite/v1';
const QUAL='Selects an exact bounded review subset of already evaluated synthetic worlds. Structural duplicate programs do not multiply pair coverage; declared meanings remain distinct. Witness minimality is scoped to evaluated proper subsets of that assignment. Unsearched or unresolved worlds remain explicit. No reduction in grid evaluation work, equivalence, physical feasibility, semantic validity, source truth, or decision authority established.';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const fail=x=>{throw TypeError('PROBE_SUITE_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const decisive=x=>x==='constraint_satisfied'||x==='constraint_refuted';
const baseline=s=>s==='CONDITIONALLY_SATISFIED'?'constraint_satisfied':s==='CONDITIONALLY_REFUTED'?'constraint_refuted':null;
const count=x=>{let n=0;while(x){x&=x-1;n++;}return n;};
const orderedKey=a=>JSON.stringify(a.map(x=>[x.bindingId,x.value]));
export async function evaluateSemanticProbeSuite(versionText,versionPin,planText,planPin){
 if(typeof planPin!=='string'||await casePin(planText)!==planPin)fail('PIN');
 const p=parse(planText,6);
 if(!keys(p,['version','versionDigest','gridPlanText','gridPlanDigest','maxReviewWorlds'])||p.version!==1||p.versionDigest!==versionPin||typeof p.gridPlanText!=='string'||!Number.isSafeInteger(p.maxReviewWorlds)||p.maxReviewWorlds<1||p.maxReviewWorlds>16)fail('PLAN');
 const version=await replayInvestigationVersion(versionText,versionPin),raw=parse(versionText,6);
 const grid=await evaluateSemanticWorldGrid(versionText,versionPin,p.gridPlanText,p.gridPlanDigest);
 const groups=[],bySignature=new Map(),excluded=[];
 for(const c of version.investigation.candidates){
  const b=baseline(c.computation?.status);
  if(!b){excluded.push({id:c.id,state:c.computation?.status??'REFUSED'});continue;}
  const sig=c.computation.targetSignature;
  if(!bySignature.has(sig)){const g={id:c.id,signature:sig,baseline:b,members:[]};groups.push(g);bySignature.set(sig,g);}
  const g=bySignature.get(sig);if(g.baseline!==b)fail('STRUCTURE_DIVERGENCE');
  g.members.push({id:c.id,meaning:c.meaning});
 }
 const original=new Map();
 if(groups.length){
  const batch=parse(raw.batchText,5),cap=await prepareReviewedCompilerContract(raw.contractText,raw.contractPin);
  const compiled=await compilePreparedReviewedProposal(cap,batch.proposals.find(x=>x.id===groups[0].id).proposalText);
  for(const b of compiled.bindings)original.set(b.id,b.value);
 }
 const worlds=grid.worlds.map(w=>{
  const states=new Map(w.rows.map(r=>[r.id,r.state])),groupStates=new Map();
  for(const g of groups){
   const values=new Set(g.members.map(m=>states.get(m.id)));
   if(values.size!==1||values.has(undefined))fail('STRUCTURE_DIVERGENCE');
   groupStates.set(g.id,[...values][0]);
  }
  return {id:w.id,assignment:w.assignment,groupStates,changedBindings:w.assignment.filter(a=>a.value!==original.get(a.bindingId)).map(a=>a.bindingId)};
 });
 const worldByAssignment=new Map(worlds.map(w=>[orderedKey(w.assignment),w]));
 const pairs=[],alreadyDivergent=[];
 for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
  const a=groups[i],b=groups[j];
  if(a.baseline!==b.baseline){alreadyDivergent.push({left:a.id,right:b.id});continue;}
  pairs.push({left:a.id,right:b.id,witnessWorldIds:[],unresolvedWorldIds:[],witnesses:[]});
 }
 const distinguishing=(w,p)=>{const a=w.groupStates.get(p.left),b=w.groupStates.get(p.right);return decisive(a)&&decisive(b)&&a!==b;};
 for(const pair of pairs)for(const w of worlds){
  const left=w.groupStates.get(pair.left),right=w.groupStates.get(pair.right);
  if(!decisive(left)||!decisive(right)){pair.unresolvedWorldIds.push(w.id);continue;}
  if(!distinguishing(w,pair))continue;
  pair.witnessWorldIds.push(w.id);
  const n=w.changedBindings.length,missing=[],unresolved=[],smaller=[];
  // Empty subset is known from agreeing decisive baseline. Check every nonempty
  // proper subset, not merely the single-coordinate changes.
  for(let mask=1;mask<(1<<n)-1;mask++){
   const retained=w.changedBindings.filter((_,i)=>mask&(1<<i));
   const assignment=w.assignment.map(a=>({bindingId:a.bindingId,value:retained.includes(a.bindingId)?a.value:original.get(a.bindingId)}));
   const sub=worldByAssignment.get(orderedKey(assignment));
   if(!sub){missing.push(retained);continue;}
   const l=sub.groupStates.get(pair.left),r=sub.groupStates.get(pair.right);
   if(!decisive(l)||!decisive(r))unresolved.push(sub.id);else if(distinguishing(sub,pair))smaller.push(sub.id);
  }
  if(!n)fail('BASELINE_DIVERGENCE');
  pair.witnesses.push({worldId:w.id,changedBindings:w.changedBindings,minimality:smaller.length?'NONMINIMAL_TESTED_WITNESS':missing.length||unresolved.length?'MINIMALITY_NOT_ESTABLISHED':'MINIMAL_WITHIN_DECLARED_TESTED_SUBSETS',untestedProperSubsets:missing,unresolvedProperWorldIds:unresolved,smallerWitnessWorldIds:smaller});
 }
 for(const pair of pairs)pair.status=pair.witnessWorldIds.length?'WITNESS_FOUND':pair.unresolvedWorldIds.length?'UNRESOLVED_IN_EVALUATED_WORLDS':grid.coverage.truncated?'NO_WITNESS_EVALUATED_PREFIX_ONLY':'NO_WITNESS_DECLARED_GRID_ONLY';
 const masks=worlds.map(w=>pairs.reduce((m,p,i)=>p.witnessWorldIds.includes(w.id)?m|(1<<i):m,0));
 const all=masks.reduce((a,b)=>a|b,0),limit=1<<worlds.length;
 // Exact subset optimization: maximum distinct structural pair coverage,
 // minimum number of review worlds, then fewest changed bindings, then
 // deterministic lexicographic world ID order. <= 16 worlds and 28 pairs.
 let best={mask:0,covered:0,worldCount:0,changes:0,ids:[]};
 const cover=new Uint32Array(limit),cost=new Uint16Array(limit),size=new Uint8Array(limit);
 for(let subset=1;subset<limit;subset++){
  const bit=subset&-subset,i=31-Math.clz32(bit),rest=subset^bit;
  cover[subset]=cover[rest]|masks[i];cost[subset]=cost[rest]+worlds[i].changedBindings.length;size[subset]=size[rest]+1;
  if(size[subset]>p.maxReviewWorlds)continue;
  const covered=count(cover[subset]),n=size[subset],changes=cost[subset];
  if(covered<best.covered||covered===best.covered&&(n>best.worldCount||n===best.worldCount&&changes>best.changes))continue;
  const ids=worlds.filter((_,i)=>subset&(1<<i)).map(w=>w.id);
  if(covered>best.covered||n<best.worldCount||changes<best.changes||JSON.stringify(ids)<JSON.stringify(best.ids))best={mask:subset,covered,worldCount:n,changes,ids};
 }
 const selected=worlds.filter(w=>best.ids.includes(w.id)).map(w=>({id:w.id,assignment:w.assignment,changedBindings:w.changedBindings,covers:pairs.filter(p=>p.witnessWorldIds.includes(w.id)).map(p=>({left:p.left,right:p.right}))}));
 const uncovered=pairs.filter((_,i)=>(all&(1<<i))&&!(cover[best.mask]&(1<<i))).map(p=>({left:p.left,right:p.right}));
 return freeze({version:VERSION,versionDigest:versionPin,planDigest:planPin,gridPlanDigest:p.gridPlanDigest,budget:p.maxReviewWorlds,gridCoverage:grid.coverage,
  structuralGroups:groups,excluded,alreadyDivergent,pairs,selectedWorlds:selected,uncoveredDistinguishablePairs:uncovered,
  counts:{candidateCount:version.investigation.candidates.length,structuralGroups:groups.length,eligiblePairs:pairs.length,distinguishablePairs:count(all),selectedWorlds:best.worldCount,coveredPairs:best.covered,totalChangedBindings:best.changes},
  optimization:'EXACT_SUBSET_MAX_PAIR_COVERAGE_THEN_MIN_WORLDS_THEN_MIN_CHANGED_BINDINGS_THEN_WORLD_ID',decisionAuthority:'NONE',qualification:QUAL});
}
export async function exportSemanticProbeSuite(versionText,versionPin,planText,planPin){
 const result=await evaluateSemanticProbeSuite(versionText,versionPin,planText,planPin);
 const bundleText=JSON.stringify({version:VERSION,versionText,versionDigest:versionPin,planText,planDigest:planPin,result});
 const byteLength=new TextEncoder().encode(bundleText).length,portable=byteLength<=262144;
 return freeze({result,bundleText:portable?bundleText:null,byteLength,portable,snapshotPin:portable?await casePin(bundleText):null});
}
