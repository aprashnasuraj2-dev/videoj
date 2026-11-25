// Explicit host-pinned observation actions, including same-source bundles.
// Exposure is a declared abstract additive resource, NOT a privacy guarantee.
// This module only plans; it cannot read, disclose, fetch or spend.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const bounded=(n,max=1000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max&&!Object.is(n,-0);
const sort=(a,b)=>a<b?-1:a>b?1:0;
const fail=c=>{throw TypeError(c);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const decisive=x=>['constraint_satisfied','constraint_refuted'].includes(x);
const QUAL='Finite deterministic declared worlds, explicit candidate actions and abstract additive exposure units only. Minimax effort subject to a worst-branch exposure cap, with one-time source acquisition. Exposure numbers are not measured privacy risk; action listing is not authorization. No physical measurement, payment, bulk access, data disclosure or other action performed.';
export const DISCLOSURE_VERSION='sutra-disclosure-frontier/v1';
// Pure internal policy solver. Caller-facing admission derives partitions
// and bounds action sets from the pinned case, not from a peer verdict.
export function solveDisclosure(worlds,actions,sources,initiallyAcquired,budget){
 if(!worlds.length)return {status:'inconsistent_observations',plan:null,statesEvaluated:0};
 if(worlds.some(w=>!decisive(w.decision)))return {status:'unresolved_worlds',plan:null,statesEvaluated:0};
 const all=(1<<worlds.length)-1;
 const sourceIndex=new Map(sources.map((s,i)=>[s.id,i]));
 const initial=initiallyAcquired.reduce((mask,s)=>mask|(1<<sourceIndex.get(s)),0);
 const ids=mask=>worlds.filter((_,i)=>mask&(1<<i)).map(w=>w.id);
 const memo=new Map();
 function solve(mask,acquired,left){
  const key=mask+'|'+acquired+'|'+left;
  if(memo.has(key))return memo.get(key);
  // At most 8 distinct actions, each informative at most once on a
  // branch; each action subset induces at most 12 nonempty cells.
  if(memo.size>=3072)fail('DISCLOSURE_STATE_LIMIT');
  const active=worlds.filter((_,i)=>mask&(1<<i));
  if(active.every(w=>w.decision===active[0].decision)){
   const p={kind:'decision',worlds:ids(mask),decision:active[0].decision,worstCost:0,worstExposure:0};
   memo.set(key,p);return p;
  }
  let best=null;
  for(const a of actions){
   if(a.exposure>left)continue;
   const groups=new Map();
   for(let i=0;i<worlds.length;i++)if(mask&(1<<i)){
    const outcome=a.outcomes[worlds[i].id];groups.set(outcome,(groups.get(outcome)??0)|(1<<i));
   }
   if(groups.size<2)continue;
   const index=sourceIndex.get(a.sourceId),bit=1<<index;
   const acquisitionCost=acquired&bit?0:sources[index].cost,cost=acquisitionCost+a.readCost;
   const branches=[];
   for(const [outcome,subset] of [...groups].sort(([a],[b])=>sort(a,b))){
    const next=solve(subset,acquired|bit,left-a.exposure);if(!next)break;
    branches.push({outcome,next});
   }
   if(branches.length!==groups.size)continue;
   const p={kind:'observe',worlds:ids(mask),actionId:a.id,sourceId:a.sourceId,observationIds:a.observationIds,acquisitionCost,readCost:a.readCost,cost,exposure:a.exposure,worstCost:cost+Math.max(...branches.map(b=>b.next.worstCost)),worstExposure:a.exposure+Math.max(...branches.map(b=>b.next.worstExposure)),branches};
   // Only effort is optimized; deterministic tie-break by action ID.
   if(!best||p.worstCost<best.worstCost||p.worstCost===best.worstCost&&sort(p.actionId,best.actionId)<0)best=p;
  }
  memo.set(key,best);return best;
 }
 const plan=solve(all,initial,budget);
 if(plan)return {status:plan.kind==='decision'?'invariant_decision':'conditional_observation_plan',plan,statesEvaluated:memo.size};
 let witness=null;
 for(const a of worlds)for(const b of worlds)if(!witness&&a.decision!==b.decision&&actions.every(o=>o.outcomes[a.id]===o.outcomes[b.id]))witness=[a.id,b.id];
 return {status:witness?'insufficient_observations':'exposure_budget_infeasible',plan:null,witness,statesEvaluated:memo.size};
}
export async function disclosureFrontierExport(caseText,caseDigest,eventText,policyText,policyDigest){
 if(typeof policyDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(policyDigest))fail('DISCLOSURE_PIN_REQUIRED');
 if(await casePin(policyText)!==policyDigest)fail('DISCLOSURE_PIN_MISMATCH');
 const base=await alignedInvestigationExport(caseText,caseDigest,eventText);
 const c=parseUniqueJson(caseText,{maxChars:262144,maxDepth:9}),p=parseUniqueJson(policyText,{maxChars:262144,maxDepth:8});
 if(!keys(p,['version','caseDigest','eventDigest','costUnit','exposureUnit','exposureBudget','sourceCosts','initiallyAcquired','actions'])||p.version!==1||p.caseDigest!==caseDigest||p.eventDigest!==base.result.eventDigest||p.costUnit!==c.costUnit||!id(p.exposureUnit)||!bounded(p.exposureBudget,8000000))fail('DISCLOSURE_PROFILE');
 const sources=p.sourceCosts;
 if(!Array.isArray(sources)||sources.length!==c.sources.length||sources.some(s=>!keys(s,['id','cost'])||!c.sources.some(x=>x.id===s.id)||!bounded(s.cost))||new Set(sources.map(s=>s.id)).size!==sources.length)fail('DISCLOSURE_SOURCE_COSTS');
 if(!Array.isArray(p.initiallyAcquired)||p.initiallyAcquired.length>sources.length||p.initiallyAcquired.some(s=>!sources.some(x=>x.id===s))||new Set(p.initiallyAcquired).size!==p.initiallyAcquired.length)fail('DISCLOSURE_ACQUIRED');
 if(!Array.isArray(p.actions)||p.actions.length>8||new Set(p.actions.map(a=>a?.id)).size!==p.actions.length)fail('DISCLOSURE_ACTIONS');
 const fields=new Map(c.offers.map(o=>[o.id,o]));
 for(const a of p.actions){
  if(!keys(a,['id','sourceId','observationIds','readCost','exposure'])||!id(a.id)||!sources.some(s=>s.id===a.sourceId)||!bounded(a.readCost)||!bounded(a.exposure)||!Array.isArray(a.observationIds)||a.observationIds.length<1||a.observationIds.length>8||new Set(a.observationIds).size!==a.observationIds.length||a.observationIds.some(i=>fields.get(i)?.sourceId!==a.sourceId))fail('DISCLOSURE_ACTION');
 }
 const {report,observationValues}=base.result,worlds=report.worlds.filter(w=>report.survivingWorlds.includes(w.id));
 const values=new Map(observationValues.map(v=>[v.id,Object.fromEntries(v.outcomes.flatMap(g=>g.worlds.map(w=>[w,g.label])))]));
 const actions=[],excludedActions=[];
 for(const a of p.actions.slice().sort((a,b)=>sort(a.id,b.id))){
  const unavailable=a.observationIds.filter(i=>!values.has(i));
  if(unavailable.length){excludedActions.push({id:a.id,unavailableObservationIds:unavailable.slice().sort(sort)});continue;}
  const observationIds=a.observationIds.slice().sort(sort);
  // Joint outcome is an unambiguous JSON tuple of independently derived
  // field labels; no peer-provided partition or concatenation collisions.
  const outcomes=Object.fromEntries(worlds.map(w=>[w.id,JSON.stringify(observationIds.map(i=>values.get(i)[w.id]))]));
  actions.push({...a,observationIds,outcomes});
 }
 const ordered=sources.slice().sort((a,b)=>sort(a.id,b.id)),initial=p.initiallyAcquired.slice().sort(sort);
 const unrestricted=solveDisclosure(worlds,actions,ordered,initial,actions.reduce((n,a)=>n+a.exposure,0));
 const constrained=solveDisclosure(worlds,actions,ordered,initial,p.exposureBudget);
 if(constrained.plan&&(!unrestricted.plan||constrained.plan.worstCost<unrestricted.plan.worstCost||constrained.plan.worstExposure>p.exposureBudget))fail('DISCLOSURE_INVARIANT');
 if(constrained.status==='exposure_budget_infeasible'&&!unrestricted.plan)fail('DISCLOSURE_INVARIANT');
 return freeze({version:DISCLOSURE_VERSION,caseText,eventText,policyText,caseDigest,eventDigest:base.result.eventDigest,policyDigest,costUnit:p.costUnit,exposureUnit:p.exposureUnit,exposureBudget:p.exposureBudget,survivingWorlds:worlds.map(w=>w.id),availableActionIds:actions.map(a=>a.id),excludedActions,unrestricted,constrained,qualification:QUAL});
}
