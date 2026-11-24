import test from 'node:test';import assert from 'node:assert/strict';
import {validateEvaluationSet,createBlindReviewPacket,freezeReviewedSet,createCorrectionRecord,validateRunRecord} from './review-protocol.mjs';
const build=()=>({schema:1,version:'heldout-v1',status:'draft',purpose:'Human-reviewed held-out evaluation candidate; not development tuning data.',cases:[
 ...Array.from({length:20},(_,i)=>({id:'A'+String(i+1).padStart(2,'0'),kind:'answerable',prompt:'Answerable prompt '+i,expected:{disposition:'source_backed_unverified',cueRefs:[{sourceId:'source',cueId:'cue-'+i}]}})),
 ...Array.from({length:10},(_,i)=>({id:'U'+String(i+1).padStart(2,'0'),kind:'unanswerable',prompt:'Unsupported prompt '+i,expected:{disposition:'abstain'}})),
 ...Array.from({length:10},(_,i)=>({id:'C'+String(i+1).padStart(2,'0'),kind:'conflict',prompt:'Conflict prompt '+i,expected:{disposition:'abstain',sourceRefs:['source-a','source-b']}}))
]});
const att=set=>({schema:1,setVersion:set.version,reviewedCaseIds:set.cases.map(c=>c.id),reviewedAt:'2026-11-24T08:30:00+05:45',reviewerCount:1,statement:'Human reviewers checked every expected outcome against the designated source material before freeze.'});
test('exact 20/10/10 held-out shape is required and development suite cannot be substituted',()=>{
 const set=build();assert.deepEqual(validateEvaluationSet(set).counts,{answerable:20,unanswerable:10,conflict:10});
 for(const mutate of [s=>s.cases.pop(),s=>s.cases[0].kind='unanswerable',s=>s.version='engineering-v1',s=>s.status='frozen']){const bad=build();mutate(bad);assert.equal(validateEvaluationSet(bad).valid,false);}
});
test('blind review packet contains prompts and kinds but no expected answer or cue/source references',()=>{
 const set=build(),packet=createBlindReviewPacket(set),json=JSON.stringify(packet);
 assert.equal(packet.cases.length,40);assert.ok(!json.includes('expected'));assert.ok(!json.includes('cue-'));assert.ok(!json.includes('source-a'));
});
test('freeze requires complete structural human attestation and emits immutable content identity',()=>{
 const set=build(),manifest=freezeReviewedSet(set,att(set));
 assert.match(manifest.setHash,/^[a-f0-9]{64}$/);assert.equal(manifest.frozenSet.status,'frozen');assert.equal(manifest.reviewerCount,1);assert.match(manifest.limitation,/cannot prove reviewer identity/);
 const missing=att(set);missing.reviewedCaseIds.pop();assert.throws(()=>freezeReviewedSet(set,missing),/all cases/);
 const lie=att(set);lie.statement='reviewed';assert.throws(()=>freezeReviewedSet(set,lie),/statement/);
});
test('corrections require a new version, explicit changed IDs and reason without rewriting parent',()=>{
 const set=build(),manifest=freezeReviewedSet(set,att(set));
 const r=createCorrectionRecord({parentSetHash:manifest.setHash,parentVersion:'heldout-v1',newVersion:'heldout-v2',changedCaseIds:['A01'],reason:'The designated source cue identity changed after a documented corpus correction.',recordedAt:'2026-11-24T08:35:00+05:45'});
 assert.equal(r.policy.includes('never rewrite'),true);assert.equal(r.parentSetHash,manifest.setHash);
 assert.throws(()=>createCorrectionRecord({...r,newVersion:'heldout-v1'}));
});
test('run record must retain exactly one row for every case including fail/error outcomes',()=>{
 const set=build(),manifest=freezeReviewedSet(set,att(set));
 const rows=manifest.caseIds.map((caseId,i)=>({caseId,outcome:i===0?'fail':i===1?'error':'pass',detail:i<2?'preserved counterexample':'ok'}));
 const score=validateRunRecord({schema:1,setHash:manifest.setHash,setVersion:manifest.version,observedAt:'2026-11-24T08:40:00+05:45',rows},manifest);
 assert.deepEqual(score,{valid:true,total:40,passed:38,failed:1,errors:1});
 assert.throws(()=>validateRunRecord({schema:1,setHash:manifest.setHash,setVersion:manifest.version,observedAt:'2026-11-24T08:40:00+05:45',rows:rows.slice(1)},manifest),/Every frozen case/);
});
