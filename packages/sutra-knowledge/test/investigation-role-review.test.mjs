import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {runInvestigationReview,ROLE_REVIEW_TASKS} from '../investigation-role-review.js';
test('six distinct deterministic roles perform pinned computation, contrast and exposure',async()=>{
 const v=await livingFixture('finance'),events=[];
 const r=await runInvestigationReview({versionText:v.versionText,versionPin:v.digest,runId:'review',onEvent:e=>events.push(e)});
 assert.equal(r.status,'completed');assert.equal(r.artifacts.length,6);assert.equal(new Set(r.artifacts.map(a=>a.agentId)).size,6);
 const get=id=>r.artifacts.find(a=>a.taskId===id).value;
 assert.equal(get('compute').triage,v.report.investigation.triage.state);assert.deepEqual(get('compute').verification,v.report.investigation.verification);
 assert.equal(get('challenge').cut.minimumCohorts,1);assert.equal(get('coordinate').decisionAuthority,'NONE');assert.equal(get('coordinate').semanticReview,'REQUIRED');
 assert.equal(events.every(e=>e.version===v.digest&&!Object.hasOwn(e,'value')),true);
 for(const task of ROLE_REVIEW_TASKS)for(const dep of task.dependsOn)assert.ok(events.find(e=>e.taskId===dep&&e.status==='completed').sequence<events.find(e=>e.taskId===task.id&&e.status==='executing').sequence);
});
test('withdrawn evidence remains unresolved, not silently refuted; engineering cohort remains distinct',async()=>{
 const v=await livingFixture('engineering',{withdraw:true}),r=await runInvestigationReview({versionText:v.versionText,versionPin:v.digest,runId:'review'});
 assert.equal(r.status,'completed');const a=r.artifacts.find(a=>a.taskId==='analysis').value;
 assert.ok(a.unresolved.includes('secondary_view'));assert.equal(a.opposingPairs.length,0);
});
test('wrong pin stops dependency chain; stale version discards all artifacts',async()=>{
 const v=await livingFixture(),bad=await runInvestigationReview({versionText:v.versionText+' ',versionPin:v.digest,runId:'review'});
 assert.equal(bad.status,'partial');assert.equal(bad.artifacts.length,0);assert.equal(bad.tasks[0].status,'failed');assert.ok(bad.tasks.slice(1).every(t=>t.status==='blocked'));
 let current=true;const stale=await runInvestigationReview({versionText:v.versionText,versionPin:v.digest,runId:'review',assertCurrent:()=>{if(!current)throw Error('stale')},onEvent:e=>{if(e.taskId==='frame'&&e.status==='completed')current=false}});
 assert.equal(stale.status,'stale');assert.deepEqual(stale.artifacts,[]);
});
test('pre-cancelled review cannot start a local role',async()=>{
 const v=await livingFixture(),c=new AbortController();c.abort();const events=[];
 const r=await runInvestigationReview({versionText:v.versionText,versionPin:v.digest,runId:'review',signal:c.signal,onEvent:e=>events.push(e)});
 assert.equal(r.status,'cancelled');assert.deepEqual(r.artifacts,[]);assert.ok(events.every(e=>e.status==='cancelled'));
});
