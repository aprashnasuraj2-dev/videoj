import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {prepareHybridInvestigationReview,HYBRID_REVIEW_TASKS} from '../investigation-role-review.js';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
import {createDisclosureConsentInspector} from '../../sutra-consent/index.js';
import {createExecutionJournal} from '../../sutra-runtime/execution-events.js';
function fixture(send){
 let calls=0,seed=1;
 const limits={maxCalls:4,maxInputBytes:100000,maxOutputTokens:1024,maxConcurrent:2};
 const workspace=createProviderWorkspace({catalog:[{id:'test-model',label:'Test Model',models:['m']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,transports:[{providerId:'test-model',async send(req,options){calls++;return send?send(req,options):{actualInputBytes:1,actualOutputTokens:8,value:{text:JSON.stringify({version:1,kind:'expression',expression:'[ocf26]>[ocf25]'})}};}}]});
 const a=workspace.addProfile({providerId:'test-model',label:'Ephemeral fixture',credential:'HYBRID_PRIVATE_CANARY'});
 return {workspace,routes:[{id:'model_critic',role:'Propose alternative conditional meaning',handle:a.handle,model:'m',shareScope:'reviewed-question-bindings-and-conditional-feedback'}],calls:()=>calls};
}
async function prepare(f,version){return prepareHybridInvestigationReview({versionText:version.versionText,versionPin:version.digest,workspace:f.workspace,routes:f.routes,disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false},maxRounds:1});}
test('six operational roles plus approved consultation and comparison share a real dependency graph; no adoption',async()=>{
 const version=await livingFixture('finance'),f=fixture(),p=await prepare(f,version),seen=[],journal=createExecutionJournal();
 const inspector=createDisclosureConsentInspector({decide:i=>{seen.push(i);return 'allow';}});
 assert.equal(f.calls(),0);assert.equal(p.plan.versionDigest,version.digest);
 await assert.rejects(p.execute({approvedPlanPin:version.digest,consentInspector:inspector,runId:'hybrid'}),e=>e.code==='PLAN_PIN');assert.equal(f.calls(),0);
 const r=await p.execute({approvedPlanPin:p.planPin,consentInspector:inspector,runId:'hybrid',onExecutionEvent:e=>journal.accept(e)});
 assert.equal(r.status,'completed');assert.equal(f.calls(),1);assert.equal(seen[0].planPin,p.plan.councilPlanPin);
 assert.equal(r.artifacts.length,8);assert.equal(new Set(r.artifacts.map(a=>a.agentId)).size,6);assert.deepEqual(r.tasks.map(t=>t.id),HYBRID_REVIEW_TASKS.map(t=>t.id));
 const consult=r.artifacts.find(a=>a.taskId==='consult'),compare=r.artifacts.find(a=>a.taskId==='compare'),coordinate=r.artifacts.find(a=>a.taskId==='coordinate');
 assert.equal(consult.value.candidates.length,1);assert.equal(consult.value.decisionAuthority,'NONE');assert.equal(compare.value.generated.length,1);assert.equal(coordinate.value.semanticReview,'REQUIRED');
 assert.equal(compare.provenance.parents.length,3);assert.equal(journal.snapshot('hybrid').status,'completed');assert.doesNotMatch(JSON.stringify(journal.events('hybrid')),/ocf26|HYBRID_PRIVATE_CANARY/);
 await assert.rejects(p.execute({approvedPlanPin:p.planPin,consentInspector:inspector,runId:'again'}),e=>e.code==='CONSUMED');
});
test('consent denial blocks only consultation-dependent tasks; reviewed local artifacts remain available',async()=>{
 const v=await livingFixture('finance'),f=fixture(),p=await prepare(f,v),r=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'deny'}),runId:'hybrid'});
 assert.equal(f.calls(),0);assert.equal(r.status,'partial');
 assert.equal(r.tasks.find(t=>t.id==='consult').status,'failed');assert.equal(r.tasks.find(t=>t.id==='compare').status,'blocked');assert.equal(r.tasks.find(t=>t.id==='coordinate').status,'blocked');
 assert.equal(r.artifacts.length,5);assert.equal(r.artifacts.find(a=>a.taskId==='compute').value.triage,v.report.investigation.triage.state);
});
test('version change while consent is being decided prevents dispatch and discards partial run artifacts',async()=>{
 const v=await livingFixture('finance'),f=fixture(),p=await prepare(f,v);let current=true;
 const r=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=>{current=false;return 'allow';}}),runId:'hybrid',assertCurrent:()=>{if(!current)throw Error('stale')}});
 assert.equal(f.calls(),0);assert.equal(r.status,'stale');assert.deepEqual(r.artifacts,[]);
});
