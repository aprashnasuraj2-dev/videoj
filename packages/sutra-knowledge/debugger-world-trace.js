// Diagnostic projection of a replayed fixed binary fixture, not a new evidence source.
import {evaluateConclusionDebugger} from './conclusion-debugger.js';
export const WORLD_TRACE_VERSION='sutra-debugger-world-trace/v1';
const qualification='All eight worlds belong to the declared synthetic model. A world survives exactly when every active computational observation agrees. Blocking roots are hypothetical withdrawal dependencies, not adjudication or permission to discard evidence. Counts are not probabilities.';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const ids=Array.from({length:8},(_,i)=>'w'+i.toString(2).padStart(3,'0'));
const variables=['a','b','c'];
const decision=x=>x==='constraint_satisfied'||x==='constraint_refuted';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function require(ok){if(!ok)throw Error('WORLD_TRACE_PROJECTION_DISAGREEMENT');}
// Call only with a locally replayed result. External data must be replayed first.
export function traceVerifiedDebuggerState(result){
 const p=result.projection,control=result.controlReport.worlds,active=result.report.activeEvidence;
 require(equal(p.worlds.map(w=>w.id),ids)&&equal(control.map(w=>w.id),ids));
 const receipts=new Map(active.map(a=>[a.observationId,a]));
 require(receipts.size===active.length&&p.observations.length===active.length&&new Set(p.observations.map(o=>o.id)).size===active.length);
 const observations=p.observations.map(o=>{
  const a=receipts.get(o.id);require(a&&variables.includes(a.nodeId)&&['0/1','1/1'].includes(a.value)&&Number.isInteger(o.mask)&&o.mask>=0&&o.mask<=255&&Object.hasOwn(result.groups,a.lineage));
  return {id:o.id,variable:a.nodeId,lineage:a.lineage,observedValue:a.value,mask:o.mask};
 }).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const worlds=ids.map((id,i)=>{
  const assumptions=Object.fromEntries(variables.map((v,n)=>[v,id[n+1]+'/1']));
  const checks=observations.map(o=>{
   const expectedValue=assumptions[o.variable],compatible=Boolean(o.mask&(1<<i));
   require(compatible===(expectedValue===o.observedValue));
   return {observationId:o.id,lineage:o.lineage,variable:o.variable,expectedValue,observedValue:o.observedValue,compatible};
  });
  const blockingRoots=[...new Set(checks.filter(c=>!c.compatible).map(c=>c.lineage))].sort();
  const target=p.worlds[i].decision,controlOk=control[i].decision;
  require(decision(target)&&decision(controlOk));
  return {id,assumptions,decisions:{target,control_ok:controlOk},survives:blockingRoots.length===0,blockingRoots,checks};
 });
 const surviving=worlds.filter(w=>w.survives).map(w=>w.id);
 require(equal(surviving,result.claims.target.survivingWorlds)&&equal(surviving,result.claims.control_ok.survivingWorlds));
 return freeze({version:WORLD_TRACE_VERSION,caseDigest:result.caseDigest,historyDigest:result.historyDigest,worlds,qualification});
}
export async function evaluateWorldTrace(eventText){
 const result=await evaluateConclusionDebugger(eventText);
 return {result,trace:traceVerifiedDebuggerState(result)};
}
