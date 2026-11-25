// Separate, host-pinned hypothetical acquisition/read accounting profile.
// It does not acquire evidence, spend money, authorize disclosure or alter replay.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const cost=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000&&!Object.is(x,-0);
const sort=(a,b)=>a<b?-1:a>b?1:0;
const fail=code=>{throw TypeError(code);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const decisive=x=>x==='constraint_satisfied'||x==='constraint_refuted';
export const ECON_VERSION='sutra-source-economics/v1';
const QUAL='Exact minimax only over declared finite deterministic worlds and offered fields, with nonnegative one-time per-source acquisition and per-field read costs. No probability, verified real cost, independent evidence, disclosure permission or automatic acquisition. Best cost describes the selected policy, not a separately optimized objective.';
// Pure finite policy kernel. Exported for exhaustive test comparison, not an
// admission or authority boundary; public replay below derives all partitions.
export function solveSourcePolicy(worlds,offers,sourceCosts,initiallyAcquired=[]){
 const ids=mask=>worlds.filter((_,i)=>mask&(1<<i)).map(w=>w.id);
 const initial=initiallyAcquired.reduce((m,id)=>m|(1<<sourceCosts.findIndex(s=>s.id===id)),0);
 const all=(1<<worlds.length)-1,memo=new Map();
 const unresolved=worlds.filter(w=>!decisive(w.decision)).map(w=>w.id);
 if(!worlds.length)return {status:'inconsistent_observations',plan:null,statesEvaluated:0};
 if(unresolved.length)return {status:'unresolved_worlds',unresolved,plan:null,statesEvaluated:0};
 function solve(mask,acquired){
  const key=mask+'|'+acquired;
  if(memo.has(key))return memo.get(key);
  if(memo.size>=3072)fail('ECON_STATE_LIMIT');
  // At most 2^8 test subsets, each induces <=12 distinct nonempty cells.
  // Acquired mask is a deterministic function of the selected subset.
  const active=worlds.filter((_,i)=>mask&(1<<i));
  if(active.every(w=>w.decision===active[0].decision)){
   const p={kind:'decision',worlds:ids(mask),decision:active[0].decision,worstCost:0,bestCost:0};
   memo.set(key,p);return p;
  }
  let best=null;
  for(const o of offers){
   const groups=new Map();
   for(let i=0;i<worlds.length;i++)if(mask&(1<<i)){
    const label=o.outcomes[worlds[i].id];groups.set(label,(groups.get(label)??0)|(1<<i));
   }
   // Constant reads give no information; nonnegative acquisition can be
   // deferred until a later informative read of that same source.
   if(groups.size<2)continue;
   const i=sourceCosts.findIndex(s=>s.id===o.sourceId),bit=1<<i;
   const acquire=acquired&bit?0:sourceCosts[i].cost,step=acquire+o.readCost;
   const branches=[];let viable=true;
   for(const [outcome,subset] of [...groups].sort(([a],[b])=>sort(a,b))){
    const next=solve(subset,acquired|bit);
    if(!next){viable=false;break;}
    branches.push({outcome,next});
   }
   if(!viable)continue;
   const p={kind:'observe',worlds:ids(mask),observationId:o.id,sourceId:o.sourceId,acquisitionCost:acquire,readCost:o.readCost,cost:step,worstCost:step+Math.max(...branches.map(b=>b.next.worstCost)),bestCost:step+Math.min(...branches.map(b=>b.next.bestCost)),branches};
   // Minimax, then stable observation identifier. Do not claim global
   // minimum best-branch cost: minimax slack in another branch can defeat it.
   if(!best||p.worstCost<best.worstCost||p.worstCost===best.worstCost&&sort(p.observationId,best.observationId)<0)best=p;
  }
  memo.set(key,best);return best;
 }
 const plan=solve(all,initial);
 if(plan)return {status:plan.kind==='decision'?'invariant_decision':'conditional_observation_plan',plan,statesEvaluated:memo.size};
 let witness=null;
 for(const a of worlds)for(const b of worlds)if(!witness&&a.decision!==b.decision&&offers.every(o=>o.outcomes[a.id]===o.outcomes[b.id]))witness=[a.id,b.id];
 if(!witness)fail('ECON_WITNESS_INVARIANT');
 return {status:'insufficient_observations',plan:null,witness,statesEvaluated:memo.size};
}
export async function sourceEconomicsExport(caseText,caseDigest,eventText,economicText,economicDigest){
 if(typeof economicDigest!=='string'||!SHA.test(economicDigest))fail('ECON_PIN_REQUIRED');
 if(await casePin(economicText)!==economicDigest)fail('ECON_PIN_MISMATCH');
 const base=await alignedInvestigationExport(caseText,caseDigest,eventText);
 const c=parseUniqueJson(caseText,{maxChars:262144,maxDepth:9});
 const e=parseUniqueJson(economicText,{maxChars:262144,maxDepth:8});
 if(!keys(e,['version','caseDigest','eventDigest','costUnit','sourceCosts','fieldCosts','initiallyAcquired'])||e.version!==1||e.caseDigest!==caseDigest||e.eventDigest!==base.result.eventDigest||e.costUnit!==c.costUnit)fail('ECON_PROFILE');
 function schedule(rows,ids){
  if(!Array.isArray(rows)||rows.length!==ids.length||rows.some(r=>!keys(r,['id','cost'])||!ids.includes(r.id)||!cost(r.cost))||new Set(rows.map(r=>r.id)).size!==rows.length)fail('ECON_COST_SCHEDULE');
  return rows.slice().sort((a,b)=>sort(a.id,b.id));
 }
 const sourceCosts=schedule(e.sourceCosts,c.sources.map(s=>s.id));
 const fieldCosts=schedule(e.fieldCosts,c.offers.map(o=>o.id));
 if(!Array.isArray(e.initiallyAcquired)||e.initiallyAcquired.length>sourceCosts.length||e.initiallyAcquired.some(id=>typeof id!=='string'||!ID.test(id)||!sourceCosts.some(s=>s.id===id))||new Set(e.initiallyAcquired).size!==e.initiallyAcquired.length)fail('ECON_ACQUIRED');
 const {report,observationValues}=base.result;
 const worlds=report.worlds.filter(w=>report.survivingWorlds.includes(w.id));
 const offers=observationValues.map(v=>{
  const o=c.offers.find(x=>x.id===v.id);
  const outcomes=Object.fromEntries(v.outcomes.flatMap(g=>g.worlds.map(id=>[id,g.label])));
  if(!o||Object.keys(outcomes).length!==worlds.length||worlds.some(w=>!Object.hasOwn(outcomes,w.id)))fail('ECON_PARTITION');
  return {id:o.id,sourceId:o.sourceId,readCost:fieldCosts.find(x=>x.id===o.id).cost,outcomes};
 }).sort((a,b)=>sort(a.id,b.id));
 const result=solveSourcePolicy(worlds,offers,sourceCosts,e.initiallyAcquired);
 // Reprice the SAME economic schedule with acquisition charged on every
 // field read: a controlled counterfactual, not the legacy declared costs.
 const independent=solveSourcePolicy(worlds,offers.map(o=>({...o,readCost:o.readCost+sourceCosts.find(s=>s.id===o.sourceId).cost})),sourceCosts.map(s=>({...s,cost:0})),[]);
 const legacy=report.frontier;
 const comparison={legacyDeclaredWorstCost:legacy?.plan?.worstCost??null,perFieldCounterfactualWorstCost:independent.plan?.worstCost??null,sharedAcquisitionWorstCost:result.plan?.worstCost??null,avoidedCost:independent.plan&&result.plan?independent.plan.worstCost-result.plan.worstCost:null};
 if(comparison.avoidedCost!==null&&comparison.avoidedCost<0)fail('ECON_MONOTONICITY');
 return freeze({version:ECON_VERSION,caseText,eventText,economicText,caseDigest,eventDigest:base.result.eventDigest,economicDigest,costUnit:e.costUnit,initiallyAcquired:e.initiallyAcquired.slice().sort(sort),availableObservationIds:offers.map(o=>o.id),survivingWorlds:worlds.map(w=>w.id),result,comparison,qualification:QUAL});
}
