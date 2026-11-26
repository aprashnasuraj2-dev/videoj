import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {scorePairedBenchmark} from '../benchmark-paired-score.js';
const goldText=JSON.stringify({version:1,cases:[{id:'a',label:'supported'},{id:'b',label:'refuted'},{id:'c',label:'underdetermined'}]});
async function fixture(){const goldPin=await casePin(goldText);return {version:1,goldPin,arms:[{id:'first',predictions:[{id:'a',label:'supported'},{id:'b',label:'abstain'},{id:'c',label:'error'}]},{id:'second',predictions:[{id:'a',label:'supported'},{id:'b',label:'refuted'},{id:'c',label:'supported'}]}]};}
async function run(r){const text=JSON.stringify(r);return scorePairedBenchmark(goldText,await casePin(goldText),text,await casePin(text));}
test('accuracy among answers cannot hide low coverage; paired counts retain failures',async()=>{const r=await run(await fixture());assert.equal(r.arms[0].accuracyAnswered,1);assert.equal(r.arms[0].accuracyAll,1/3);assert.equal(r.arms[1].coverage,1);assert.equal(r.arms[1].unsupportedDecisive,1);assert.deepEqual(r.paired,{bothCorrect:1,firstOnly:0,secondOnly:1,neitherCorrect:1});});
test('all abstain produces undefined selective accuracy; unmatched or duplicate cases refuse',async()=>{const f=await fixture();f.arms[0].predictions.forEach(p=>p.label='abstain');assert.equal((await run(f)).arms[0].accuracyAnswered,null);f.arms[0].predictions.pop();await assert.rejects(run(f),/BENCHMARK_PREDICTIONS/);const d=await fixture();d.arms[0].predictions[1].id='a';await assert.rejects(run(d),/BENCHMARK_PREDICTIONS/);});
