import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {evaluateRankedMappings} from './mapping-harness.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../apps/sutra/src/fixtures/timing-source.json',import.meta.url)));
const setup=()=>{const source=structuredClone(fixture.source);source.duration=20;source.cues=[{id:'exact',start:2,end:3,text:'Timing marker calibration sequence.'},{id:'alternate',start:4,end:5,text:'Calibration sequence for timing marker.'},{id:'other',start:6,end:7,text:'Unrelated source evidence.'}];return source;};
test('ranked evaluation compares primary against alternatives and traces every displayed mapping to immutable raw source identity',()=>{
 const source=setup(),input={sources:[source],sourceArtifacts:{[source.id]:'apps/sutra/src/fixtures/timing-source.json'},now:()=>fixture.receipt.retrievedAt,cases:[
  {id:'competing',query:'timing marker calibration sequence',acceptableCueIds:['exact','alternate']},
  {id:'only-alternative',query:'timing marker calibration sequence',acceptableCueIds:['alternate']},
  {id:'missing',query:'voltage transformer absent',acceptableCueIds:[]}
 ]};
 const a=evaluateRankedMappings(input),b=evaluateRankedMappings(input);assert.deepEqual(a,b);assert.equal(a.schema,1);assert.equal(a.caseCount,3);
 assert.equal(a.cases[0].primary.cueId,'exact');assert.equal(a.cases[0].alternatives[0].cueId,'alternate');assert.equal(a.cases[0].disambiguation.fallback,'abstain');
 assert.equal(a.cases[1].matchedRank,2);assert.equal(a.cases[1].alternativeHit,true);assert.equal(a.cases[1].reciprocalRank,.5);
 assert.equal(a.cases[0].evidenceTrace.length,2);assert.equal(a.cases[0].evidenceTrace[0].artifact,'apps/sutra/src/fixtures/timing-source.json');assert.match(a.cases[0].evidenceTrace[0].sourceHash,/^[a-f0-9]{64}$/);
 assert.equal(a.metrics.top1Accuracy,.5);assert.equal(a.metrics.meanReciprocalRank,.75);assert.equal(a.metrics.alternativeRecoveryRate,.5);assert.equal(a.metrics.abstentionAccuracy,1);assert.equal(a.metrics.evidenceCoverage,1);
 assert.match(a.limitation,/not factual truth/);
});
test('evaluation fails closed on missing artifact traces, impossible ground truth and mismatched source-artifact keys',()=>{
 const source=setup(),base={sources:[source],now:()=>fixture.receipt.retrievedAt,cases:[{id:'x',query:'timing marker',acceptableCueIds:['exact']}]};
 assert.throws(()=>evaluateRankedMappings({...base,sourceArtifacts:{}}),/artifact/);
 assert.throws(()=>evaluateRankedMappings({...base,sourceArtifacts:{[source.id]:'apps/sutra/src/fixtures/timing-source.json',extra:'x.json'}}),/Unknown/);
 assert.throws(()=>evaluateRankedMappings({...base,sourceArtifacts:{[source.id]:'apps/sutra/src/fixtures/timing-source.json'},cases:[{id:'x',query:'timing marker',acceptableCueIds:['absent']}]}),/case/);
});
