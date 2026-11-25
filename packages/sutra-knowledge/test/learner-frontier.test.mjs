import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContentProfile} from '../../sutra-content-profile/index.js';
import {planTimingLesson,readLessonCue,resolveTimingLesson} from '../learner-frontier.js';
const publicRoot=new URL('../../../apps/sutra/public/',import.meta.url);
async function content(){
 return loadContentProfile({baseUrl:'https://lesson.example/content/',fetchImpl:async url=>{
  const pathname=new URL(url).pathname;
  const file=new URL('.'+pathname,publicRoot);
  return new Response(await fs.readFile(file),{headers:{'content-type':pathname.endsWith('.json')?'application/json':'text/plain'}});
 }});
}
test('real legacy catalog and transcript bytes drive a prediction-revision learning loop',async()=>{
 const c=await content(),p=await planTimingLesson();
 assert.equal(p.plan.observationId,'read_catalog_cue');assert.equal(p.plan.worstCost,1);
 const receipt=readLessonCue(c);assert.equal(receipt.start,2);assert.equal(receipt.end,4);
 const r=await resolveTimingLesson({content:c,receiptText:JSON.stringify(receipt),prediction:'not_before'});
 assert.equal(r.status,'catalog_question_resolved');assert.equal(r.answer,'before');
 assert.equal(r.feedback,'prediction_revised');assert.deepEqual(r.excludedWorlds,['start_four']);
 assert.equal(r.remaining.plan.worstCost,0);assert.equal(r.evidence.level,'catalog_matched');assert.equal(r.truthStatus,'unverified');
 assert.equal(r.evidence.transcriptSha256,c.artifacts.transcriptSha256);
});
test('tampered receipts, stale source versions and self-verification cannot prune worlds',async()=>{
 const c=await content(),receipt=readLessonCue(c);
 for(const changed of [{start:4},{sourceVersion:'v0'},{excerpt:'forged'},{verification:'verified'},{mediaHash:'0'.repeat(64)}]){
  const r=await resolveTimingLesson({content:c,receiptText:JSON.stringify({...receipt,...changed}),prediction:'before'});
  assert.equal(r.status,'receipt_refused');assert.equal(r.remaining,undefined);
 }
 await assert.rejects(()=>resolveTimingLesson({content:c,receiptText:JSON.stringify(receipt),prediction:'verified'}),/LESSON_PREDICTION_REFUSED/);
});
test('valid current receipt outside declared worlds abstains rather than forcing either answer',async()=>{
 // Deliberately altered trusted test catalog: exercises unknown-world handling,
 // not a claim that these changed metadata bytes were published by the legacy app.
 const c=structuredClone(await content());c.source.cues[0].start=3;
 const r=await resolveTimingLesson({content:c,receiptText:JSON.stringify(readLessonCue(c)),prediction:'unsure'});
 assert.equal(r.status,'outside_declared_worlds');assert.equal(r.answer,undefined);assert.equal(r.remaining,undefined);
});
