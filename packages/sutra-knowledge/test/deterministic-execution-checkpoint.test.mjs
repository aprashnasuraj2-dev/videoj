import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {runInvestigationReview} from '../investigation-role-review.js';
import {runInvestigationChallenge} from '../investigation-challenge-review.js';
import {casePin} from '../pinned-investigation.js';
import {createExecutionCheckpoint,createExecutionRecording,openExecutionCheckpoint,projectExecutionCheckpoint} from '../../sutra-runtime/execution-checkpoint.js';
import {verifyDeterministicExecutionCheckpoint} from '../deterministic-execution-checkpoint.js';
async function fixture(){const v=await livingFixture(),events=[],result=await runInvestigationReview({versionText:v.versionText,versionPin:v.digest,runId:'recorded',onExecutionEvent:e=>events.push(e)});return {v,events,result,cp:await createExecutionCheckpoint(result,events)};}
test('unified recording replays lifecycle and fresh computation reproduces six linked artifacts',async()=>{
 const {v,cp}=await fixture();
 assert.equal(cp.snapshot.status,'completed');assert.equal(cp.checkpoint.events.length,20);assert.equal(cp.checkpoint.artifactPins.length,6);
 assert.equal(projectExecutionCheckpoint(cp,0).snapshot,null);
 assert.ok(projectExecutionCheckpoint(cp,1).snapshot.tasks.every(t=>t.status==='queued'));
 assert.ok(projectExecutionCheckpoint(cp,20).snapshot.tasks.every(t=>t.status==='completed'));
 assert.doesNotMatch(cp.text,/sourceText|credential|versionText|questionDigest/);
 const r=await verifyDeterministicExecutionCheckpoint({checkpointText:cp.text,checkpointPin:cp.pin,versionText:v.versionText,versionPin:v.digest});
 assert.equal(r.status,'RECOMPUTED_LINEAGE_MATCHES');
});
test('repinned illegal events, false lineage, wrong version, incomplete recordings refuse',async()=>{
 const {v,cp,events}=await fixture();
 await assert.rejects(openExecutionCheckpoint(cp.text+' ',cp.pin,v.digest),e=>e.code==='PIN');
 await assert.rejects(openExecutionCheckpoint(cp.text,cp.pin,'sha256:'+'b'.repeat(64)),e=>e.code==='VERSION');
 await assert.rejects(createExecutionRecording(events.slice(0,-1)),e=>e.code==='INCOMPLETE');
 const x=JSON.parse(cp.text);x.events[1].payload.status='completed';let t=JSON.stringify(x);
 await assert.rejects(openExecutionCheckpoint(t,await casePin(t),v.digest),e=>e.code==='TRANSITION');
 x.events[1].payload.status='executing';x.artifactPins[1].parents[0].artifactDigest='sha256:'+'0'.repeat(64);t=JSON.stringify(x);
 await assert.rejects(openExecutionCheckpoint(t,await casePin(t),v.digest),e=>e.code==='LINEAGE');
});
test('matching internally forged links cannot pass fresh digest comparison; recorded-only cannot execute',async()=>{
 const {v,cp,events}=await fixture(),x=JSON.parse(cp.text);
 x.artifactPins.at(-1).artifactDigest='sha256:'+'0'.repeat(64);const t=JSON.stringify(x);
 const args={versionText:v.versionText,versionPin:v.digest};
 assert.equal((await verifyDeterministicExecutionCheckpoint({...args,checkpointText:t,checkpointPin:await casePin(t)})).status,'RECOMPUTED_LINEAGE_DIFFERS');
 const record=await createExecutionRecording(events);assert.equal(record.checkpoint.artifactPins,null);
 await assert.rejects(verifyDeterministicExecutionCheckpoint({...args,checkpointText:record.text,checkpointPin:record.pin}),e=>e.code==='NOT_DETERMINISTIC_COMPLETED');
});
test('challenge history requires both exact versions for fresh comparison',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,revised:true}),events=[];
 const result=await runInvestigationChallenge({beforeText:a.versionText,beforePin:a.digest,afterText:b.versionText,afterPin:b.digest,runId:'challenge',onExecutionEvent:e=>events.push(e)});
 const cp=await createExecutionCheckpoint(result,events),args={checkpointText:cp.text,checkpointPin:cp.pin,versionText:b.versionText,versionPin:b.digest,beforeText:a.versionText,beforePin:a.digest};
 assert.equal((await verifyDeterministicExecutionCheckpoint(args)).status,'RECOMPUTED_LINEAGE_MATCHES');
 await assert.rejects(verifyDeterministicExecutionCheckpoint({...args,beforeText:undefined}));
});
