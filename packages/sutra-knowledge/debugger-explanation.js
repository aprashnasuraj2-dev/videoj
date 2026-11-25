// Diagnostic view over an already replay-verified state; it is not a new claim
// authority or a replacement for global consistency. The fixed model has four
// declared roots, so exhaustive root-subset enumeration is bounded (<= 16).
import {evaluateConclusionDebugger,CLAIMS} from './conclusion-debugger.js';
export const EXPLANATION_VERSION='sutra-debugger-explanation/v1';
const qualification='A consistent evidence subset can support or refute a claim even when the full evidence is contradictory. Subset support is conditional, not authorization to discard conflicting evidence. Declared roots are not certified independent.';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
const contains=(a,b)=>a.every(x=>b.includes(x));
const ordered=(a,b)=>a.length-b.length||(a.join('|')<b.join('|')?-1:a.join('|')>b.join('|')?1:0);
// Call only with a result returned by evaluateConclusionDebugger, not a wire
// object. External consumers must use evaluateDebuggerExplanation below.
export function explainVerifiedDebuggerState(result){
 const worlds=result.projection.worlds,roots=Object.keys(result.groups).sort();
 if(worlds.length!==8||roots.length>4)throw Error('EXPLANATION_SCOPE');
 const all=(1<<worlds.length)-1;
 const rootMasks=Object.fromEntries(roots.map(root=>[root,all]));
 for(const o of result.projection.observations){
  const receipt=result.report.activeEvidence.find(r=>r.observationId===o.id);
  if(!receipt||!Object.hasOwn(rootMasks,receipt.lineage))throw Error('EXPLANATION_EVIDENCE');
  rootMasks[receipt.lineage]&=o.mask;
 }
 const projections={target:worlds,control_ok:result.controlReport.worlds};
 for(const id of CLAIMS)if(projections[id].length!==worlds.length||projections[id].some((w,i)=>w.id!==worlds[i].id))throw Error('EXPLANATION_WORLD_ORDER');
 const subsets=[];
 for(let bits=0;bits<(1<<roots.length);bits++){
  const included=roots.filter((_,i)=>bits&(1<<i)),mask=included.reduce((m,root)=>m&rootMasks[root],all);
  subsets.push({included,mask});
 }
 subsets.sort((a,b)=>ordered(a.included,b.included));
 const conflicts=[],claims={};
 for(const id of CLAIMS)claims[id]={globalState:result.claims[id].state,conditionalSupport:[],conditionalRefutation:[]};
 for(const {included,mask} of subsets){
  if(!mask){if(!conflicts.some(x=>contains(x,included)))conflicts.push(included);continue;}
  for(const id of CLAIMS){
   const survivors=projections[id].filter((_,i)=>mask&(1<<i));
   const decision=survivors[0].decision;
   if(!decisive(decision)||!survivors.every(w=>w.decision===decision))continue;
   const key=decision==='constraint_satisfied'?'conditionalSupport':'conditionalRefutation';
   const list=claims[id][key];
   if(!list.some(x=>contains(x.roots,included)))list.push({roots:included,survivingWorlds:survivors.map(w=>w.id)});
  }
 }
 const frontier=result.report.frontier;
 let next;
 if(result.conflict)next={kind:'adjudicate_conflict',conflict:result.conflict,minimumRepairs:result.diagnostics.minimumCuts.map(c=>({remove:c.removed,states:Object.fromEntries(CLAIMS.map(id=>[id,c.claims[id].state]))}))};
 else if(frontier?.status==='conditional_observation_plan')next={kind:'observe',observationId:frontier.plan.observationId,cost:frontier.plan.cost,worstCost:frontier.plan.worstCost,bestCost:frontier.plan.bestCost,branches:frontier.plan.branches.map(({outcome,next})=>({outcome,worlds:next.worlds,kind:next.kind,decision:next.decision??null,observationId:next.observationId??null,worstRemainingCost:next.worstCost}))};
 else if(frontier?.status==='insufficient_observations')next={kind:'impossible_with_available_observations',witness:frontier.witness};
 else if(frontier?.status==='invariant_decision')next={kind:'decision',decision:frontier.plan.decision};
 else next={kind:'unverified'};
 return freeze({version:EXPLANATION_VERSION,caseDigest:result.caseDigest,historyDigest:result.historyDigest,claims,minimalConflicts:conflicts,next,qualification});
}
export async function evaluateDebuggerExplanation(eventText){
 const result=await evaluateConclusionDebugger(eventText);
 return {result,explanation:explainVerifiedDebuggerState(result)};
}
