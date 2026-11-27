import test from 'node:test';
import assert from 'node:assert/strict';
import {previewModelSmoke,runModelSmoke} from '../live-model-smoke.js';
import {secretLike} from '../research-session.js';
const grant={approvedPlanPin:previewModelSmoke().planPin,approveProviderContact:true,approveEstimatedCost:true,credentials:{gemini:'fixture-gemini-key',groq:'fixture-groq-key',openrouter:'fixture-router-key'}};
function fixture({badVendor}={}){
 const calls=[];return {calls,exchangeFactory:()=>({close(){},async exchange(r){
  calls.push(r);const challenge=JSON.parse(r.bodyText).messages[1].content.match(/[a-f0-9]{16}/)[0];
  return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({challenge,answer:r.connectionId===badVendor?41:42})}}],usage:{completion_tokens:25}})};
 }})};
}
test('three actual wire routes, bounded challenge and fixture designation',async()=>{
 const f=fixture(),r=await runModelSmoke({...grant,exchangeFactory:f.exchangeFactory});
 assert.equal(r.mode,'injected_fixture');assert.equal(r.status,'passed');assert.equal(f.calls.length,3);
 assert.deepEqual(f.calls.map(x=>new URL(x.endpoint).hostname),['generativelanguage.googleapis.com','api.groq.com','openrouter.ai']);assert.ok(!JSON.stringify(r).includes('fixture-'));assert.ok(r.checks.every(c=>c.status==='passed'));
});
test('wrong inference response fails even if HTTP status was 200',async()=>{
 const f=fixture({badVendor:'groq'}),r=await runModelSmoke({...grant,exchangeFactory:f.exchangeFactory});
 assert.equal(r.status,'failed');assert.equal(r.checks[1].reason,'CHALLENGE_MISMATCH');
});
test('credentials and exact approval fail before transport creation',async()=>{
 const f=fixture();await assert.rejects(runModelSmoke({...grant,credentials:{},exchangeFactory:f.exchangeFactory}),/MODEL_CREDENTIAL/);
 await assert.rejects(runModelSmoke({...grant,approvedPlanPin:'wrong',exchangeFactory:f.exchangeFactory}),/APPROVAL/);assert.equal(f.calls.length,0);
 assert.ok(secretLike('gsk_abcdefghijklmnop'));assert.ok(secretLike('AQ.abcdefghijklmnop'));
});

test('tester-selected single model needs only its own credential and exact pin',async()=>{
 const selection={groq:'tester-selected-model'},plan=previewModelSmoke(selection),f=fixture();
 const r=await runModelSmoke({...grant,selection,approvedPlanPin:plan.planPin,credentials:{groq:'fixture-groq-key'},exchangeFactory:f.exchangeFactory});
 assert.equal(r.status,'passed');assert.equal(f.calls.length,1);assert.equal(f.calls[0].model,'tester-selected-model');
 await assert.rejects(runModelSmoke({...grant,selection,exchangeFactory:f.exchangeFactory}),/APPROVAL/);
});
test('structured opt-in binds two-call cost and admits real local read before cited answer',async()=>{
 const selection={groq:'fixture-model'},plan=previewModelSmoke(selection,{structured:true}),calls=[];
 assert.equal(plan.maxRequests,2);assert.notEqual(plan.planPin,previewModelSmoke(selection).planPin);
 const factory=()=>({close(){},async exchange(r){calls.push(r);const value=JSON.parse(JSON.parse(r.bodyText).messages[1].content);let response;
 if(calls.length===1){assert.equal(Object.hasOwn(value,'quote'),false);response={tool:'inspect_evidence',arguments:value};}
 else {assert.match(value.quote,/Synthetic challenge: [a-f0-9]{16}/);response={claims:[{kind:'source_claim',text:'Synthetic source reports a challenge.',citation:{sourceId:value.sourceId,sourceDigest:value.sourceDigest,start:value.start,end:value.end,quote:value.quote}},{kind:'uncertainty',text:'Not empirical evidence.',citation:null}]};}
 return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(response)}}],usage:{completion_tokens:30}})};
 }});
 const g={...grant,selection,structured:true,approvedPlanPin:plan.planPin,exchangeFactory:factory};
 const result=await runModelSmoke(g);assert.equal(result.status,'passed');assert.equal(result.mode,'injected_fixture');assert.equal(calls.length,2);assert.equal(result.checks[0].toolReads,1);assert.doesNotMatch(JSON.stringify(result),/Synthetic challenge|fixture-groq-key/);
 await assert.rejects(runModelSmoke({...g,approvedPlanPin:previewModelSmoke(selection).planPin}),/APPROVAL/);
});
test('invalid structured tool proposal never discloses source or makes second request',async()=>{
 const selection={groq:'fixture-model'},plan=previewModelSmoke(selection,{structured:true});let calls=0;
 const result=await runModelSmoke({...grant,selection,structured:true,approvedPlanPin:plan.planPin,exchangeFactory:()=>({close(){},async exchange(r){calls++;return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({tool:'inspect_evidence',arguments:{sourceId:'other',start:0,end:1}})}}],usage:{completion_tokens:30}})};}})});
 assert.equal(result.status,'failed');assert.equal(calls,1);assert.equal(result.checks[0].reason,'EVIDENCE_ARGUMENTS');
});
