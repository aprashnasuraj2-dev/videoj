import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runSignaturePilot} from '../evaluation/semantic-signature-pilot.mjs';
test('frozen matched signature pilot retains minority-correct candidates without claiming semantic selection',async()=>{
 const spec=JSON.parse(await readFile(new URL('../evaluation/semantic-signature-pilot-v1.json',import.meta.url),'utf8')),r=await runSignaturePilot(spec);
 assert.equal(r.cases,6);assert.equal(r.exactCasesCorrect,6);assert.equal(r.distinguishingCases,4);
 assert.equal(r.summary.raw_signature_majority.correctLost,2);assert.equal(r.summary.deduplicated_signature_majority.correctLost,0);assert.equal(r.summary.retain_all.correctLost,0);
 assert.equal(r.summary.retain_all.allCorrect,1);assert.ok(r.summary.retain_all.retainedWrongCandidates>0);
 assert.equal(r.rows.find(x=>x.id==='P04').witnessFound,false);assert.equal(r.rows.find(x=>x.id==='P05').witnesses.filter(x=>x.scenario!=='s03').length,0);
 assert.ok(r.rows.every(x=>x.decisionAuthority==='NONE'));
});
