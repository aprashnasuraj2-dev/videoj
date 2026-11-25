import test from 'node:test';
import assert from 'node:assert/strict';
import {debuggerBaseline,debuggerCopies,debuggerRead,evaluateConclusionDebugger,exportDebuggerState} from '../conclusion-debugger.js';
const run=events=>evaluateConclusionDebugger(JSON.stringify(events));
const withdraw=lineage=>({type:'withdraw_lineage',lineage});
const restore=lineage=>({type:'restore_lineage',lineage});
test('critical withdrawal changes only dependent conclusion; irrelevant withdrawal leaves decision intact',async()=>{
 const baseline=await debuggerBaseline(),start=await run(baseline);
 assert.equal(start.claims.target.state,'SUPPORTED');assert.equal(start.claims.control_ok.state,'SUPPORTED');
 assert.deepEqual(start.diagnostics.minimumCuts.map(x=>x.removed),[['sample_one']]);
 const missing=await run([...baseline,withdraw('sample_one')]);
 assert.equal(missing.claims.target.state,'UNDERDETERMINED');assert.equal(missing.claims.control_ok.state,'SUPPORTED');
 assert.equal(missing.claims.target.survivingWorlds.length,4);assert.ok(missing.nextObservation);
 const irrelevant=await run([...baseline,withdraw('sample_control')]);
 assert.equal(irrelevant.claims.target.state,'SUPPORTED');assert.equal(irrelevant.claims.control_ok.state,'UNDERDETERMINED');
 const restored=await run([...baseline,withdraw('sample_one'),restore('sample_one')]);
 assert.equal(restored.claims.target.state,'UNDERDETERMINED','restore availability must not resurrect evidence');
 const reread=await run([...baseline,withdraw('sample_one'),restore('sample_one'),await debuggerRead('read_a')]);
 assert.equal(reread.claims.target.state,'SUPPORTED');
});
test('ten report artifacts contribute one declared lineage; conflicting root cannot be outvoted',async()=>{
 const baseline=await debuggerBaseline(),copies=await debuggerCopies(),start=await run(baseline);
 const copied=await run([...baseline,copies]);
 assert.equal(copied.activeArtifacts.length,11);assert.equal(copied.groups.sample_one.length,10);
 assert.equal(copied.declaredRoots,2);assert.deepEqual(copied.claims,start.claims);assert.deepEqual(copied.projection,start.projection);
 const events=[...baseline,copies,await debuggerRead('read_b')],conflict=await run(events);
 assert.equal(conflict.claims.target.state,'CONFLICTED');assert.equal(conflict.claims.target.survivingWorlds.length,0);
 assert.equal(conflict.activeArtifacts.length,12);assert.equal(conflict.declaredRoots,3);
 assert.deepEqual(conflict.conflict,['read_a','read_b']);assert.equal(conflict.nextObservation,null);
 assert.deepEqual(conflict.diagnostics.minimumCuts.map(x=>x.removed),[['sample_one'],['sample_two']]);
 const repaired=await run([...events,withdraw('sample_one')]);
 assert.equal(repaired.claims.target.state,'UNDERDETERMINED');assert.equal(repaired.claims.control_ok.state,'SUPPORTED');
 assert.equal(repaired.activeArtifacts.length,2);assert.equal(repaired.groups.sample_one,undefined);
 assert.deepEqual(repaired.nextObservation,{id:'read_c',cost:3,worstCost:3,bestCost:3});
 const done=await run([...events,withdraw('sample_one'),await debuggerRead('read_c')]);
 assert.equal(done.claims.target.state,'REFUTED');assert.deepEqual(done.claims.target.survivingWorlds,['w111']);
 assert.deepEqual(done.diagnostics.minimumCuts.map(x=>x.removed),[['sample_three'],['sample_two']]);
 assert.deepEqual(await run(events),conflict);
 assert.deepEqual((await exportDebuggerState(events)).result,conflict);
});
test('copy tamper, invented ancestry, duplicate, early copy and stale restoration refuse',async()=>{
 const baseline=await debuggerBaseline(),copies=await debuggerCopies();
 for(const mutate of [
  e=>{e.artifacts[0].text+=' ';},
  e=>{e.artifacts[0].text=e.artifacts[0].text.replace('lab_a','lab_b');},
  e=>{e.artifacts[0]=e.artifacts[1];},
  e=>{e.artifacts.pop();},
  e=>{e.artifacts[0].text=e.artifacts[0].text.replace('0/1','1/1');},
  e=>{e.artifacts[0].extra=true;}
 ]){
  const bad=structuredClone(copies);mutate(bad);await assert.rejects(run([...baseline,bad]));
 }
 await assert.rejects(run([copies]));await assert.rejects(run([...baseline,copies,copies]));
 await assert.rejects(run([...baseline,copies,withdraw('sample_one'),restore('sample_one'),copies]));
 const changed=structuredClone(baseline);changed[0].sourceText+=' ';await assert.rejects(run(changed));
 await assert.rejects(evaluateConclusionDebugger('[{"type":"read","type":"add_copies"}]'));
 await assert.rejects(run(Array(25).fill(copies)));
});
