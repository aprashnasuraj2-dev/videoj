import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runLivingPilot} from '../evaluation/living-pilot.mjs';
test('frozen synthetic development pilot scores all candidate states and compares coverage without semantic authority',async()=>{
 const spec=JSON.parse(await readFile(new URL('../evaluation/living-pilot-v1.json',import.meta.url),'utf8'));
 const r=await runLivingPilot(spec);
 assert.equal(r.exactCasesCorrect,16);assert.equal(r.caseCount,16);
 assert.equal(r.methods.sutra.unsupportedDecisive,0);
 assert.deepEqual(r.methods.sutra,r.methods.enumerate_all);
 assert.equal(r.methods.sutra.answered,4);
 assert.ok(r.methods.first_candidate.unsupportedDecisive>0);
 assert.ok(r.rows.every(x=>x.semanticAuthority==='UNVERIFIED'));
});
