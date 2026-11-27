import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {runInvestigationReview,ROLE_RECOVERY_PROFILE} from '../investigation-role-review.js';
import {createTaskRecoveryCheckpoint,prepareTaskRecovery} from '../../sutra-runtime/execution-recovery.js';
import {createExecutionJournal} from '../../sutra-runtime/execution-events.js';
import {createExecutionCheckpoint} from '../../sutra-runtime/execution-checkpoint.js';
import {verifyDeterministicExecutionCheckpoint} from '../deterministic-execution-checkpoint.js';
async function paused(n=3){
 const v=await livingFixture(),events=[],args={versionText:v.versionText,versionPin:v.digest};
 const result=await runInvestigationReview({...args,runId:'pause_run',maxNewTasks:n,onExecutionEvent:e=>events.push(e)});
 assert.equal(result.status,'paused');assert.equal(result.artifacts.length,n);
 const cp=await createTaskRecoveryCheckpoint({result,events,recoveryProfile:ROLE_RECOVERY_PROFILE});
 return {v,args,events,result,cp};
}
const recover=(f,extra={})=>prepareTaskRecovery({text:f.cp.text,expectedPin:f.cp.pin,expectedVersion:f.v.digest,recoveryProfile:ROLE_RECOVERY_PROFILE,...extra});
test('pause at admitted boundary, resume only remaining deterministic tasks, exact lineage equals fresh replay',async()=>{
 const f=await paused(),cap=await recover(f),events=[],j=createExecutionJournal();
 const r=await runInvestigationReview({...f.args,runId:'resumed',recovery:cap,onExecutionEvent:e=>{events.push(e);j.accept(e);}});
 assert.equal(r.status,'completed');assert.equal(events.filter(e=>e.type==='task.restore').length,3);assert.equal(events.filter(e=>e.type==='task.state'&&e.payload.status==='executing').length,3);
 assert.equal(j.snapshot('resumed').tasks.filter(t=>t.restored).length,3);
 assert.ok(j.snapshot('resumed').tasks.filter(t=>t.restored).every(t=>t.restored.recoveryPin===f.cp.pin));
 const full=await runInvestigationReview({...f.args,runId:'fresh'});
 assert.deepEqual(r.artifacts,full.artifacts);
 const cp=await createExecutionCheckpoint(r,events),verified=await verifyDeterministicExecutionCheckpoint({...f.args,checkpointText:cp.text,checkpointPin:cp.pin});
 assert.equal(verified.status,'RECOMPUTED_LINEAGE_MATCHES');
 await assert.rejects(runInvestigationReview({...f.args,runId:'again',recovery:cap}),e=>e.code==='CAPABILITY');
});
test('all safe pause cut points recover; partial re-pause can be recovered a second time',async()=>{
 for(const n of [1,2,4,5]){
  const f=await paused(n),r=await runInvestigationReview({...f.args,runId:'resumed',recovery:await recover(f)});
  assert.equal(r.status,'completed');assert.equal(r.artifacts.length,6);
 }
 const f=await paused(1),events=[],r=await runInvestigationReview({...f.args,runId:'second_pause',maxNewTasks:2,recovery:await recover(f),onExecutionEvent:e=>events.push(e)});
 assert.equal(r.status,'paused');assert.equal(r.artifacts.length,3);
 const cp=await createTaskRecoveryCheckpoint({result:r,events,recoveryProfile:ROLE_RECOVERY_PROFILE}),cap=await recover({...f,cp});
 assert.equal((await runInvestigationReview({...f.args,runId:'third_run',recovery:cap})).status,'completed');
});
test('tampered bytes, repinned value, wrong version, wrong profile and same run ID are refused',async()=>{
 const f=await paused();
 await assert.rejects(recover(f,{text:f.cp.text+' '}),e=>e.code==='PIN');
 await assert.rejects(recover(f,{expectedVersion:'sha256:'+'a'.repeat(64)}),e=>e.code==='VERSION');
 await assert.rejects(recover(f,{recoveryProfile:'other/v1'}),e=>e.code==='PROFILE');
 const x=JSON.parse(f.cp.text);x.artifacts[0].value.candidateIds=[];const text=JSON.stringify(x);
 await assert.rejects(recover(f,{text,expectedPin:await casePin(text)}),e=>e.code==='VALUE');
 const cap=await recover(f);await assert.rejects(runInvestigationReview({...f.args,runId:'pause_run',recovery:cap}),e=>e.code==='IDENTITY');
});
test('cancelled or stale runs cannot become recovery artifacts',async()=>{
 const f=await paused(),c=new AbortController();c.abort();const events=[];
 const result=await runInvestigationReview({...f.args,runId:'cancelled',signal:c.signal,maxNewTasks:2,onExecutionEvent:e=>events.push(e)});
 assert.equal(result.status,'cancelled');assert.equal(result.artifacts.length,0);
 await assert.rejects(createTaskRecoveryCheckpoint({result,events,recoveryProfile:ROLE_RECOVERY_PROFILE}),e=>e.code==='NOT_SAFE_PAUSE');
});
