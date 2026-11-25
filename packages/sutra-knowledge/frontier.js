// Finite hypothesis discrimination. Exact bounded minimax observation policy.
// No probabilities, no assumed scientific truth, no autonomous physical action.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createVerifier} from './index.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const id=x=>typeof x==='string'&&ID.test(x);
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const fail=()=>{throw TypeError('FRONTIER_PROFILE_REFUSED');};
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
function admit(text){
 const x=parseUniqueJson(text,{maxChars:262144,maxDepth:8});
 if(!keys(x,['version','decisionId','costUnit','worlds','observations'])||x.version!==1||!id(x.decisionId)||!id(x.costUnit)||
 !Array.isArray(x.worlds)||x.worlds.length<1||x.worlds.length>12||!Array.isArray(x.observations)||x.observations.length>8)fail();
 const worlds=new Set(),tests=new Set();
 for(const w of x.worlds){
  if(!keys(w,['id','graphText','constraintId'])||!id(w.id)||worlds.has(w.id)||!id(w.constraintId)||typeof w.graphText!=='string'||w.graphText.length>65536)fail();
  const g=parseUniqueJson(w.graphText,{maxChars:65536,maxDepth:12});
  if(!Array.isArray(g?.nodes)||g.nodes.filter(n=>n?.id===w.constraintId&&n.kind==='constraint').length!==1)fail();
  worlds.add(w.id);
 }
 for(const o of x.observations){
  if(!keys(o,['id','cost','outcomes'])||!id(o.id)||tests.has(o.id)||!Number.isSafeInteger(o.cost)||o.cost<1||o.cost>1000000||
  !keys(o.outcomes,[...worlds])||Object.values(o.outcomes).some(v=>!id(v)))fail();
  tests.add(o.id);
 }
 x.worlds.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 x.observations.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 return x;
}
const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
const ids=(mask,worlds)=>worlds.filter((_,i)=>mask&(1<<i)).map(w=>w.id);
export async function evaluateFrontier(text){
 const c=admit(text),worlds=[];
 for(const w of c.worlds){
  const result=await createVerifier().evaluate(w.graphText);
  const receipt=result.report.receipts.find(r=>r.id===w.constraintId);
  worlds.push({id:w.id,decision:receipt.outcome.status,graphDigest:result.report.graphDigest,receiptDigest:receipt.receiptDigest});
 }
 const all=(1<<worlds.length)-1;
 const unresolved=worlds.filter(w=>!decisive(w.decision)).map(w=>w.id);
 const base={version:1,decisionId:c.decisionId,costUnit:c.costUnit,worlds,
  qualification:'Optimal only over declared finite worlds, deterministic observation partitions and additive costs. Neither model completeness nor observation validity is verified.'};
 if(unresolved.length)return freeze({...base,status:'unresolved_worlds',unresolved,plan:null,statesEvaluated:0});
 const memo=new Map();
 function solve(mask){
  if(memo.has(mask))return memo.get(mask);
  const active=worlds.filter((_,i)=>mask&(1<<i));
  if(active.every(w=>w.decision===active[0].decision)){
   const result={kind:'decision',worlds:ids(mask,worlds),decision:active[0].decision,worstCost:0,bestCost:0};
   memo.set(mask,result);return result;
  }
  let best=null;
  for(const test of c.observations){
   const groups=new Map();
   for(let i=0;i<worlds.length;i++)if(mask&(1<<i)){
    const label=test.outcomes[worlds[i].id];groups.set(label,(groups.get(label)??0)|(1<<i));
   }
   // A previously used observation is constant within its branch, so a mask
   // is sufficient state. Every nontrivial partition strictly decreases it.
   if(groups.size<2)continue;
   const branches=[];let viable=true;
   for(const [label,subset] of [...groups].sort(([a],[b])=>a<b?-1:a>b?1:0)){
    const next=solve(subset);if(!next){viable=false;break;}branches.push({outcome:label,next});
   }
   if(!viable)continue;
   const candidate={kind:'observe',worlds:ids(mask,worlds),observationId:test.id,cost:test.cost,
    worstCost:test.cost+Math.max(...branches.map(b=>b.next.worstCost)),
    bestCost:test.cost+Math.min(...branches.map(b=>b.next.bestCost)),branches};
   if(!best||candidate.worstCost<best.worstCost||
    candidate.worstCost===best.worstCost&&candidate.bestCost<best.bestCost)best=candidate;
  }
  memo.set(mask,best);return best;
 }
 const plan=solve(all);
 if(plan)return freeze({...base,status:plan.kind==='decision'?'invariant_decision':'conditional_observation_plan',plan,statesEvaluated:memo.size});
 // A pair with different outcomes but identical observation signatures is
 // an explicit impossibility witness for the offered deterministic tests.
 let witness=null;
 for(const a of worlds)for(const b of worlds)if(!witness&&a.decision!==b.decision&&
  c.observations.every(o=>o.outcomes[a.id]===o.outcomes[b.id]))witness=[a.id,b.id];
 return freeze({...base,status:'insufficient_observations',witness,plan:null,statesEvaluated:memo.size});
}
