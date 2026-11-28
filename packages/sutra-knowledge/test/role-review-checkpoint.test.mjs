import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {runInvestigationReview} from '../investigation-role-review.js';
import {casePin} from '../pinned-investigation.js';
import {createRoleReviewCheckpoint,openRoleReviewCheckpoint,projectRoleReviewEvents,verifyRoleReviewCheckpoint} from '../role-review-checkpoint.js';
async function fixture(){
 const version=await livingFixture(),events=[],result=await runInvestigationReview({versionText:version.versionText,versionPin:version.digest,runId:'review',onEvent:e=>events.push(e)});
 const cp=await createRoleReviewCheckpoint(result,events);return {version,events,result,cp};
}
test('portable exact checkpoint retains only metadata and artifact digests; fresh deterministic recompute matches',async()=>{
 const {version,cp}=await fixture();assert.equal(cp.checkpoint.artifactPins.length,6);assert.equal(cp.checkpoint.events.length,18);
 assert.equal(cp.text.includes('sourceText'),false);assert.equal(cp.text.includes('versionText'),false);assert.equal(cp.text.includes('credential'),false);
 assert.ok(projectRoleReviewEvents(cp,0).taskStates.every(t=>t.status==='queued'));assert.ok(projectRoleReviewEvents(cp,18).taskStates.every(t=>t.status==='completed'));
 const r=await verifyRoleReviewCheckpoint({checkpointText:cp.text,checkpointPin:cp.pin,versionText:version.versionText,versionPin:version.digest});assert.equal(r.status,'RECOMPUTED_ARTIFACT_DIGESTS_MATCH');assert.equal(r.decisionAuthority,'NONE');
});
test('tampered pin, different version and repinned illegal transition refuse',async()=>{
 const {version,cp}=await fixture();
 await assert.rejects(openRoleReviewCheckpoint(cp.text+' ',cp.pin,version.digest),e=>e.code==='PIN');
 await assert.rejects(openRoleReviewCheckpoint(cp.text,cp.pin,'sha256:'+'b'.repeat(64)),e=>e.code==='VERSION');
 const bad=JSON.parse(cp.text);bad.events[0].status='completed';let text=JSON.stringify(bad);
 await assert.rejects(openRoleReviewCheckpoint(text,await casePin(text),version.digest),e=>e.code==='TRANSITION');
 bad.events[0].status='executing';bad.events[0].secret='hidden';text=JSON.stringify(bad);
 await assert.rejects(openRoleReviewCheckpoint(text,await casePin(text),version.digest),e=>e.code==='EVENT');
});
test('repinned forged artifact hash never becomes a reproduced artifact',async()=>{
 const {version,cp}=await fixture(),bad=JSON.parse(cp.text);bad.artifactPins[0].digest='sha256:'+'0'.repeat(64);
 const text=JSON.stringify(bad),p=await casePin(text);
 const r=await verifyRoleReviewCheckpoint({checkpointText:text,checkpointPin:p,versionText:version.versionText,versionPin:version.digest});assert.equal(r.status,'RECOMPUTED_ARTIFACT_DIGESTS_DIFFER');
});
test('cancelled history can be inspected but cannot resume or recompute under old authority',async()=>{
 const version=await livingFixture(),c=new AbortController(),events=[];c.abort();
 const result=await runInvestigationReview({versionText:version.versionText,versionPin:version.digest,runId:'review',signal:c.signal,onEvent:e=>events.push(e)});
 const cp=await createRoleReviewCheckpoint(result,events);assert.equal(cp.checkpoint.status,'cancelled');assert.equal(cp.checkpoint.artifactPins.length,0);
 await assert.rejects(verifyRoleReviewCheckpoint({checkpointText:cp.text,checkpointPin:cp.pin,versionText:version.versionText,versionPin:version.digest}),e=>e.code==='NOT_COMPLETED');
});

test('checkpoint creation refuses event accessors without invoking them',async()=>{
 const {result,events}=await fixture();let reads=0;const bad=[...events];bad[0]={...events[0]};Object.defineProperty(bad[0],'taskId',{enumerable:true,get(){reads++;return events[0].taskId;}});
 await assert.rejects(createRoleReviewCheckpoint(result,bad),e=>e.code==='EVENT');assert.equal(reads,0);
});
