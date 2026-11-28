import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {runInvestigationChallenge} from '../investigation-challenge-review.js';
import {compareInvestigationVersions} from '../investigation-revision.js';
const args=(a,b)=>({beforeText:a.versionText,beforePin:a.digest,afterText:b.versionText,afterPin:b.digest,runId:'challenge_test'});
const comparable=({recomputation,qualification,...rest})=>rest;
test('six roles derive exact selective challenge impact and link admitted artifacts',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,revised:true});
 const r=await runInvestigationChallenge(args(a,b));
 assert.equal(r.status,'completed');assert.equal(r.artifacts.length,6);
 const by=id=>r.artifacts.find(x=>x.taskId===id).value,computed=by('compute'),paths=by('challenge').projection;
 assert.deepEqual(comparable(computed.impact),comparable(await compareInvestigationVersions(a.versionText,a.digest,b.versionText,b.digest)));
 assert.equal(computed.work.baseline.executed,6);assert.equal(computed.work.child.executed,3);assert.equal(computed.work.child.reusedOutcomes,3);
 assert.equal(paths.beforeDigest,a.digest);assert.equal(paths.afterDigest,b.digest);assert.equal(by('coordinate').adoption,'NONE');
 assert.ok(r.artifacts.every(x=>x.provenance.versionDigest===b.digest&&x.value.decisionAuthority==='NONE'));
 assert.equal(r.artifacts.find(x=>x.taskId==='coordinate').provenance.parents.length,5);
});
test('withdrawal is scoped and unrelated revision performs no new arithmetic',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,withdraw:true}),c=await livingFixture('finance',{previousDigest:a.digest,irrelevant:true});
 const r=await runInvestigationChallenge(args(a,b)),s=await runInvestigationChallenge({...args(a,c),runId:'sibling'});
 assert.equal(r.status,'completed');assert.equal(s.status,'completed');
 const by=(r,id)=>r.artifacts.find(x=>x.taskId===id).value;
 assert.equal(by(s,'compute').work.child.executed,0);assert.equal(by(s,'compute').work.child.reusedOutcomes,6);
 assert.ok(by(r,'analysis').candidates.some(x=>x.reviewRequired));
});
test('wrong parent and tampered bytes block dependent tasks; stale results never publish',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,revised:true}),other=await livingFixture('engineering');
 for(const input of [args(other,b),{...args(a,b),afterText:b.versionText+' '}]){
  const r=await runInvestigationChallenge(input);assert.equal(r.status,'partial');assert.equal(r.artifacts.length,0);
 }
 let current=true;
 const r=await runInvestigationChallenge({...args(a,b),assertCurrent:()=>{if(!current)throw Error('stale');},onEvent:e=>{if(e.taskId==='frame'&&e.status==='completed')current=false;}});
 assert.equal(r.status,'stale');assert.ok(!r.artifacts.some(x=>x.taskId==='compute'));
});
