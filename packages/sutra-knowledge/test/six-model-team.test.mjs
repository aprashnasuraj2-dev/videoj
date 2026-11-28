import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {prepareHybridInvestigationReview} from '../investigation-role-review.js';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
import {createDisclosureConsentInspector} from '../../sutra-consent/index.js';
import {createExecutionJournal} from '../../sutra-runtime/execution-events.js';
const roles=['planner','researcher','coder','analyst','critic','coordinator'];
function team(){
 const seen=[],limits={maxCalls:8,maxInputBytes:100000,maxOutputTokens:2048,maxConcurrent:2};let seed=1,active=0,peak=0;
 const catalog=roles.map((r,i)=>({id:'vendor-'+i,label:r,models:['m-'+i]}));
 const workspace=createProviderWorkspace({catalog,globalLimits:limits,defaultProfileLimits:limits,clock:()=>0,randomBytes:n=>new Uint8Array(n).fill(seed++),transports:catalog.map((p,i)=>({providerId:p.id,async send(req){active++;peak=Math.max(peak,active);seen.push({provider:req.providerId,op:req.operation});await new Promise(r=>setImmediate(r));active--;return {actualInputBytes:1,actualOutputTokens:4,value:{text:JSON.stringify({version:1,kind:'expression',expression:i%2?'[first]<[baseline]':'[first]>[baseline]'})}};}}))});
 const routes=catalog.map((p,i)=>({id:roles[i],role:'Specialist '+roles[i],handle:workspace.addProfile({providerId:p.id,label:roles[i],credential:'SPECIALIST_PRIVATE_'+i+'_CANARY'}).handle,model:p.models[0],shareScope:'reviewed-question-bindings-and-conditional-feedback'}));
 return {workspace,routes,seen,peak:()=>peak};
}
test('six independently routed specialist slots, two simultaneous calls, six proposals and exact per-slot scope',async()=>{
 const v=await livingFixture(),f=team(),journal=createExecutionJournal(),disclosure={bindingIds:['first','baseline'],includeValues:false,agentScopes:roles.map(agentId=>({agentId,bindingIds:['first','baseline'],includeValues:false,feedbackFrom:[]}))};
 const p=await prepareHybridInvestigationReview({versionText:v.versionText,versionPin:v.digest,...f,disclosure,maxRounds:1,maxOutputTokens:128});
 const r=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'allow'}),runId:'six_team',onExecutionEvent:e=>journal.accept(e)});
 assert.equal(r.status,'completed');assert.equal(f.seen.length,6);assert.equal(f.peak(),2);assert.equal(new Set(f.seen.map(x=>x.provider)).size,6);
 assert.ok(f.seen.every(x=>x.op.bindings.every(b=>!Object.hasOwn(b,'valueLexeme'))));
 const consult=r.artifacts.find(a=>a.taskId==='consult').value;assert.equal(consult.coverage.admittedSlots,6);assert.equal(consult.coverage.plannedSlots,6);assert.equal(consult.candidates.length,2);
 assert.equal(journal.snapshot('six_team').tasks.find(t=>t.id==='consult').consultationSlots.length,6);
 assert.doesNotMatch(JSON.stringify(journal.events('six_team')),/SPECIALIST_PRIVATE/);
});
test('six specialists cannot bypass eight slot-round bound; broader peer feedback remains denied',async()=>{
 const v=await livingFixture(),f=team(),args={versionText:v.versionText,versionPin:v.digest,...f,disclosure:{bindingIds:['first','baseline'],includeValues:false}};
 await assert.rejects(prepareHybridInvestigationReview({...args,maxRounds:2}),e=>e.code==='CONFIG');assert.equal(f.seen.length,0);
 const scopes=roles.map(agentId=>({agentId,bindingIds:['first','baseline'],includeValues:false,feedbackFrom:[]}));scopes[1].bindingIds=['first'];scopes[1].feedbackFrom=[roles[0]];
 await assert.rejects(prepareHybridInvestigationReview({...args,disclosure:{...args.disclosure,agentScopes:scopes}}),e=>e.code==='DISCLOSURE_FLOW');assert.equal(f.seen.length,0);
});
