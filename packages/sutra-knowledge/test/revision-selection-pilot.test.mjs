import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runRevisionPilot} from '../evaluation/revision-selection-pilot.mjs';
test('frozen revision selection pilot has explicit no-savings controls and exact reconstruction',async()=>{
 const spec=JSON.parse(await readFile(new URL('../evaluation/revision-selection-pilot-v1.json',import.meta.url),'utf8'));
 const r=await runRevisionPilot(spec);assert.equal(r.exactCasesCorrect,4);
 assert.deepEqual(r.selectionCounts,{fullReselection:14,targetedReselection:10,avoided:4});
 assert.ok(r.rows.every(x=>x.exactVersionMatch));
 assert.ok(r.rows.filter(x=>x.id.endsWith('_both')).every(x=>x.fullReselection===x.targetedReselection));
});
