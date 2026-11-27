import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareApprovedExpressionCouncil} from '../approved-expression-council.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
import {createDisclosureConsentInspector} from '../../sutra-consent/index.js';

const scope='reviewed-question-bindings-and-conditional-feedback';
function setup(){
 let calls=0,seed=1;
 const limits={maxCalls:2,maxInputBytes:100000,maxOutputTokens:2048,maxConcurrent:1};
 const workspace=createProviderWorkspace({
  catalog:[{id:'local-a',label:'Local A',models:['local/a']}],
  globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,
  transports:[{providerId:'local-a',async send(){calls++;return {actualInputBytes:1,actualOutputTokens:8,value:{text:JSON.stringify({version:1,kind:'expression',expression:'[ocf26]>[ocf25]'})}};}}]
 });
 const profile=workspace.addProfile({providerId:'local-a',label:'Local profile',credential:'SYNTHETIC_COUNCIL_SECRET'});
 return {workspace,route:{id:'reviewer',role:'Propose one comparison',handle:profile.handle,model:'local/a',shareScope:scope},calls:()=>calls};
}
async function prepare(s,{includeValues=true}={}){
 const f=await compilerFinanceFixture();
 return prepareApprovedExpressionCouncil({
  contractText:f.contractText,contractPin:f.pin,
  disclosure:{bindingIds:['ocf25','ocf26'],includeValues},
  routes:[s.route],workspace:s.workspace,maxRounds:1,maxOutputTokens:128,timeoutMs:5000
 });
}

test('common disclosure consent denies before any model dispatch and consumes the exact approval',async()=>{
 const s=setup(),approval=await prepare(s);
 const denied=createDisclosureConsentInspector({decide:async()=>({decision:'deny',scope:'once'})});
 await assert.rejects(approval.execute({consentInspector:denied,approvedPlanPin:approval.planPin}),e=>e.code==='CONSENT_DENIED');
 assert.equal(s.calls(),0);
 await assert.rejects(approval.execute({consentInspector:denied,approvedPlanPin:approval.planPin}),/COUNCIL_APPROVAL_CONSUMED/);
 assert.equal(s.calls(),0);
 assert.deepEqual(denied.exportEvents().map(e=>[e.type,e.decision??null]),[['intent',null],['decision','deny']]);
});

test('common disclosure consent is bound to exact plan scope and omits reviewed values from its event history',async()=>{
 const s=setup(),approval=await prepare(s),seen=[];
 assert.equal(approval.consentIntent.planPin,approval.planPin);
 assert.equal(approval.consentIntent.operation,'model_inference');
 assert.deepEqual(approval.consentIntent.disclosure,['ocf25','ocf26']);
 assert.deepEqual(approval.consentIntent.preview,{ocf25:'136162',ocf26:'182935'});
 const consent=createDisclosureConsentInspector({decide:async intent=>{seen.push(intent);return {decision:'allow',scope:'once'};}});
 await assert.rejects(approval.execute({consentInspector:consent,approvedPlanPin:'sha256:'+'0'.repeat(64)}),/COUNCIL_APPROVAL_PIN/);
 assert.equal(s.calls(),0);assert.equal(seen.length,0);
 const result=await approval.execute({consentInspector:consent,approvedPlanPin:approval.planPin});
 assert.equal(s.calls(),1);assert.equal(result.decisionAuthority,'NONE');assert.equal(seen.length,1);
 assert.equal(seen[0].planPin,approval.planPin);assert.equal(seen[0].preview.ocf25,'136162');
 const exported=JSON.stringify(consent.exportEvents());
 assert.doesNotMatch(exported,/136162|182935|SYNTHETIC_COUNCIL_SECRET/);
 assert.deepEqual(consent.exportEvents().map(e=>e.type),['intent','decision','outcome']);
});

test('route invalidation after consent preview cannot dispatch under the old approved plan',async()=>{
 const s=setup(),approval=await prepare(s,{includeValues:false});
 s.workspace.removeProfile(s.route.handle);
 let decisions=0;
 const consent=createDisclosureConsentInspector({decide:async()=>{decisions++;return {decision:'allow',scope:'once'};}});
 await assert.rejects(approval.execute({consentInspector:consent,approvedPlanPin:approval.planPin}));
 assert.equal(decisions,1);assert.equal(s.calls(),0);
 await assert.rejects(approval.execute({consentInspector:consent,approvedPlanPin:approval.planPin}),/COUNCIL_APPROVAL_CONSUMED/);
});
