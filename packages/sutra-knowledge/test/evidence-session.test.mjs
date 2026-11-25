import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateEvidenceSession,sourceDigest} from '../evidence-session.js';
import {conflictFixture,demonstrateConflict} from '../examples/conflict.mjs';
test('hash-valid conflicting sources return minimum cardinality witness, not consensus; shared lineage withdrawal removes copies',async()=>{
 const {conflict,withdrawn,restored}=await demonstrateConflict();
 assert.equal(conflict.activeEvidence.length,3);
 assert.deepEqual(conflict.conflict,['read_a','read_b']);
 assert.deepEqual(conflict.lineageGroups,{sample_one:['read_a','read_copy'],sample_two:['read_b']});
 assert.equal(conflict.frontier,null);assert.equal(conflict.truthStatus,'unverified');
 assert.deepEqual(withdrawn.unavailableSources,['lab_a','lab_copy']);assert.deepEqual(withdrawn.survivingWorlds,['w10','w11']);
 assert.equal(withdrawn.frontier.plan.observationId,'read_c');assert.equal(withdrawn.frontier.plan.worstCost,3);
 assert.deepEqual(restored.unavailableSources,[]);assert.equal(restored.activeEvidence.length,1);
 assert.deepEqual(restored.worlds,conflict.worlds);assert.ok(Object.isFrozen(conflict.history));
});
test('hash match cannot force an undeclared observation value; singleton conflict',async()=>{
 const {caseText,texts}=await conflictFixture();const c=JSON.parse(caseText);
 const text=texts.lab_a.replace('"0/1"','"2/1"');c.sources.find(s=>s.id==='lab_a').digest=await sourceDigest(text);
 const r=await evaluateEvidenceSession(JSON.stringify(c),JSON.stringify([{type:'read',observationId:'read_a',sourceText:text}]));
 assert.equal(r.status,'inconsistent_observations');assert.deepEqual(r.conflict,['read_a']);assert.deepEqual(r.survivingWorlds,[]);
});
test('tampering, scope substitution, duplicate observation, unavailable source and dimension mismatch fail closed',async()=>{
 const {caseText,read,texts}=await conflictFixture();
 for(const events of [[{...read('read_a','lab_a'),sourceText:texts.lab_a.replace('"0/1"','"1/1"')}],
  [read('read_a','lab_a'),read('read_a','lab_a')],[{type:'withdraw_source',sourceId:'lab_a'},read('read_a','lab_a')],
  [{type:'restore_lineage',lineage:'sample_one'}],[{type:'read',observationId:'unknown',sourceText:texts.lab_a}]]){
  await assert.rejects(()=>evaluateEvidenceSession(caseText,JSON.stringify(events)),/EVIDENCE_/);
 }
 for(const mutate of [t=>t.replace('synthetic_binary_models','wrong_scope'),t=>t.replace('[0,0,0]','[1,0,0]'),t=>t.replace('"0/1"','"0/2"')]){
  const c=JSON.parse(caseText),text=mutate(texts.lab_a);c.sources.find(s=>s.id==='lab_a').digest=await sourceDigest(text);
  await assert.rejects(()=>evaluateEvidenceSession(JSON.stringify(c),JSON.stringify([{type:'read',observationId:'read_a',sourceText:text}])),/EVIDENCE_/);
 }
});
test('single source withdrawal does not silently remove independent declared lineages; restored source requires fresh read',async()=>{
 const {caseText,read}=await conflictFixture();
 const events=[read('read_a','lab_a'),read('read_copy','lab_copy'),read('read_b','lab_b'),{type:'withdraw_source',sourceId:'lab_a'}];
 const r=await evaluateEvidenceSession(caseText,JSON.stringify(events));
 assert.deepEqual(r.conflict,['read_b','read_copy']);
 const restored=await evaluateEvidenceSession(caseText,JSON.stringify([...events,{type:'withdraw_source',sourceId:'lab_copy'},{type:'restore_source',sourceId:'lab_a'}]));
 assert.deepEqual(restored.activeEvidence.map(e=>e.observationId),['read_b']);
 assert.deepEqual(restored.survivingWorlds,['w10','w11']);
});
