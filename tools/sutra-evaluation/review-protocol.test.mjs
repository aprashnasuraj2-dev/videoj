import test from 'node:test';import assert from 'node:assert/strict';
import {validateEvaluationSet,createBlindReviewPacket,freezeReviewedSet,createCorrectionRecord,validateRunRecord} from './review-protocol.mjs';

const build=()=>{
 let n=0;const next=()=> 'H'+String(++n).padStart(3,'0');
 return {schema:1,version:'heldout-v1',status:'draft',purpose:'Human-reviewed held-out evaluation candidate; not development tuning data.',cases:[
  ...Array.from({length:20},(_,i)=>({id:next(),kind:'answerable',prompt:'Answerable prompt '+i,expected:{disposition:'source_backed_unverified',cueRefs:[{sourceId:'source',cueId:'cue-'+i}]}})),
  ...Array.from({length:10},(_,i)=>({id:next(),kind:'unanswerable',prompt:'Unsupported prompt '+i,expected:{disposition:'abstain'}})),
  ...Array.from({length:10},(_,i)=>({id:next(),kind:'conflict',prompt:'Conflict prompt '+i,expected:{disposition:'abstain',sourceRefs:['source-a','source-b']}}))
 ]};
};
const att=set=>({schema:1,setVersion:set.version,reviewedCaseIds:set.cases.map(c=>c.id),reviewedAt:'2026-11-24T08:30:00+05:45',reviewerCount:1,statement:'Human reviewers checked every expected outcome against the designated source material before freeze.'});

test('exact 20/10/10 held-out shape and neutral Hxxx case IDs are required',()=>{
 const set=build();assert.deepEqual(validateEvaluationSet(set).counts,{answerable:20,unanswerable:10,conflict:10});
 for(const mutate of [s=>s.cases.pop(),s=>s.cases[0].kind='unanswerable',s=>s.version='engineering-v1',s=>s.status='frozen',s=>s.cases[0].id='A01']){
  const bad=build();mutate(bad);assert.equal(validateEvaluationSet(bad).valid,false);
 }
});

test('blind review packet hides category and expected evidence, and shuffles grouped source order deterministically',()=>{
 const set=build(),packet=createBlindReviewPacket(set,{orderSeed:'recorded-blind-seed-v1'}),packet2=createBlindReviewPacket(set,{orderSeed:'recorded-blind-seed-v1'});
 const json=JSON.stringify(packet);assert.deepEqual(packet,packet2);assert.equal(packet.cases.length,40);
 for(const secret of ['expected','kind','cue-','source-a','source_backed_unverified'])assert.ok(!json.includes(secret),secret);
 assert.notDeepEqual(packet.cases.map(c=>c.id),set.cases.map(c=>c.id));
 assert.match(packet.packetHash,/^[a-f0-9]{64}$/);
});

test('freeze requires complete structural human attestation and emits deeply immutable canonical identity',()=>{
 const set=build(),manifest=freezeReviewedSet(set,att(set));
 assert.match(manifest.setHash,/^[a-f0-9]{64}$/);assert.equal(manifest.frozenSet.status,'frozen');assert.equal(manifest.reviewerCount,1);assert.match(manifest.limitation,/cannot prove reviewer identity/);
 assert.equal(Object.isFrozen(manifest.frozenSet.cases[0].expected),true);
 assert.throws(()=>{manifest.frozenSet.cases[0].prompt='mutated';},TypeError);
 const missing=att(set);missing.reviewedCaseIds.pop();assert.throws(()=>freezeReviewedSet(set,missing),/all cases/);
 const wrong=att(set);wrong.statement='reviewed';assert.throws(()=>freezeReviewedSet(set,wrong),/statement/);
});

test('corrections require a strictly newer version, explicit changed neutral IDs and reason',()=>{
 const set=build(),manifest=freezeReviewedSet(set,att(set));
 const record=createCorrectionRecord({parentSetHash:manifest.setHash,parentVersion:'heldout-v1',newVersion:'heldout-v2',changedCaseIds:['H001'],reason:'The designated source cue identity changed after a documented corpus correction.',recordedAt:'2026-11-24T08:35:00+05:45'});
 assert.equal(record.policy.includes('never rewrite'),true);assert.equal(record.parentSetHash,manifest.setHash);
 for(const newVersion of ['heldout-v1','heldout-v0'])assert.throws(()=>createCorrectionRecord({...record,newVersion}));
});

test('run record retains exactly one nonempty row for every case including fail/error outcomes',()=>{
 const set=build(),manifest=freezeReviewedSet(set,att(set));
 const rows=manifest.caseIds.map((caseId,i)=>({caseId,outcome:i===0?'fail':i===1?'error':'pass',detail:i<2?'preserved counterexample':'ok'}));
 const score=validateRunRecord({schema:1,setHash:manifest.setHash,setVersion:manifest.version,observedAt:'2026-11-24T08:40:00+05:45',rows},manifest);
 assert.deepEqual(score,{valid:true,total:40,passed:38,failed:1,errors:1});
 assert.throws(()=>validateRunRecord({schema:1,setHash:manifest.setHash,setVersion:manifest.version,observedAt:'2026-11-24T08:40:00+05:45',rows:rows.slice(1)},manifest),/Every frozen case/);
 const empty=structuredClone(rows);empty[0].detail=' ';assert.throws(()=>validateRunRecord({schema:1,setHash:manifest.setHash,setVersion:manifest.version,observedAt:'2026-11-24T08:40:00+05:45',rows:empty},manifest));
});
