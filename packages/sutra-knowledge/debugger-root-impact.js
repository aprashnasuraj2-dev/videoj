// Read-only presentation projection over a locally replayed fixed fixture.
// No evidence is withdrawn, restored, authenticated or adjudicated here.
import {CLAIMS} from './conclusion-debugger.js';
import {traceVerifiedDebuggerState} from './debugger-world-trace.js';
const require=x=>{if(!x)throw Error('ROOT_IMPACT_DISAGREEMENT');};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function state(worlds,claim){
 if(!worlds.length)return 'CONFLICTED';
 const decisions=new Set(worlds.map(w=>w.decisions[claim]));
 if(decisions.size!==1)return 'UNDERDETERMINED';
 return decisions.has('constraint_satisfied')?'SUPPORTED':'REFUTED';
}
export function rootImpactVerifiedState(result){
 const trace=traceVerifiedDebuggerState(result),active=result.report.activeEvidence,allArtifacts=result.activeArtifacts;
 const roots=Object.keys(result.groups).sort(),seen=new Set(),current=trace.worlds.filter(w=>w.survives);
 for(const claim of CLAIMS)require(state(current,claim)===result.claims[claim].state);
 const impacts=roots.map(lineage=>{
  const readings=active.filter(a=>a.lineage===lineage),artifacts=allArtifacts.filter(a=>a.lineage===lineage);
  require(readings.length===1&&artifacts.length>0&&eq(artifacts.map(a=>a.id),result.groups[lineage]));
  const reading=readings[0],original=artifacts.find(a=>a.parent===null);
  require(original&&original.id===reading.sourceId&&original.digest===reading.sourceDigest&&original.observationId===reading.observationId);
  for(const a of artifacts){require(!seen.has(a.id)&&a.observationId===reading.observationId&&(a===original||a.parent===original.id));seen.add(a.id);}
  const retained=trace.worlds.filter(w=>w.blockingRoots.every(r=>r===lineage));
  const claims=Object.fromEntries(CLAIMS.map(claim=>[claim,{state:state(retained,claim),changed:state(retained,claim)!==result.claims[claim].state}]));
  return {lineage,reading:{id:reading.observationId,variable:reading.nodeId,value:reading.value},original:original.id,
   artifacts:[original,...artifacts.filter(a=>a!==original)].map(a=>({...a})),
   newlyAdmitted:retained.filter(w=>!w.survives).map(w=>w.id),survivingWorlds:retained.map(w=>w.id),claims};
 });
 require(seen.size===allArtifacts.length&&roots.length===result.declaredRoots&&roots.length===active.length);
 return freeze(impacts);
}
