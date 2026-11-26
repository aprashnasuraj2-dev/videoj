import test from 'node:test';import assert from 'node:assert/strict';import {scoreBuilderTrials} from './trial.mjs';
const att='I was not part of the SUTRA project team and performed this trial in my own environment using only the released quickstart.';
const base=()=>({schema:1,releaseRevision:'a'.repeat(40),releaseId:'open-kit-v1',artifact:'starter',trials:[
 {builderId:'B01',outsideProjectAttested:true,attestation:att,environment:'Ubuntu 26.04 / Node 22 / Chromium',startedAt:'2026-11-24T00:00:00Z',completedAt:'2026-11-24T00:10:00Z',validResult:true,interventions:[],blockers:[],notes:''},
 {builderId:'B02',outsideProjectAttested:true,attestation:att,environment:'macOS / Node 22 / Safari',startedAt:'2026-11-24T00:20:00Z',completedAt:'2026-11-24T00:34:00Z',validResult:true,interventions:[{kind:'doc_gap',detail:'Needed one clarification in the quickstart.'}],blockers:[],notes:'Synthetic unit fixture only.'}
]});
test('two valid outside-builder rows derive duration and preserve every disclosed intervention',()=>{
 const r=scoreBuilderTrials(base());assert.equal(r.summary.targetResult,'pass');assert.equal(r.summary.validWithin15Minutes,2);assert.equal(r.summary.totalInterventions,1);assert.equal(r.trials[1].durationSeconds,840);assert.match(r.recordHash,/^[a-f0-9]{64}$/);
});
test('slow, failed and blocked attempts remain negative rather than being dropped',()=>{
 const x=base();x.trials[1].completedAt='2026-11-24T00:50:00Z';x.trials[1].validResult=false;x.trials[1].blockers=[{kind:'tool_error',detail:'The generated starter did not run.'}];
 const r=scoreBuilderTrials(x);assert.equal(r.summary.targetResult,'fail');assert.equal(r.summary.validResults,1);assert.equal(r.summary.totalBlockers,1);assert.equal(r.trials.length,2);
});
test('missing attestation, duplicate builders, timezone-free dates and hidden extra fields fail closed',()=>{
 for(const mutate of [
  x=>x.trials[0].outsideProjectAttested=false,x=>x.trials[1].builderId='B01',x=>x.trials[0].startedAt='2026-11-24T00:00:00',
  x=>x.trials[0].email='private@example.com',x=>x.trials.pop()
 ]){const x=base();mutate(x);assert.throws(()=>scoreBuilderTrials(x));}
});
test('changing intervention detail changes immutable record identity',()=>{
 const a=base(),b=base();b.trials[1].interventions[0].detail='Different disclosed clarification.';assert.notEqual(scoreBuilderTrials(a).recordHash,scoreBuilderTrials(b).recordHash);
});
