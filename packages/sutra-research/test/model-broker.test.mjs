import test from 'node:test';
import assert from 'node:assert/strict';
import {admitManifest,authorizeResearch} from '../research-session.js';
import {createResearchModelBroker} from '../model-broker.js';
export function modelManifest(){
 return {schema:'sutra-autonomous-research/v1',objective:'Compare battery storage costs',scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false},budget:{maxSearches:4,maxDocuments:8,maxLinkDepth:1,maxDurationSeconds:60,maxDownloadBytes:8388608,maxCostMicros:50000,maxModelCalls:5},providers:[{id:'brave',estimatedMaxCostMicros:1000}],modelPolicy:{allowPublicEvidenceDisclosure:true,roles:[{role:'bot',vendor:'openai',model:'test-bot',maxInputBytes:8192,maxOutputTokens:256,estimatedMaxCostMicros:1000},{role:'orb',vendor:'openai',model:'test-orb',maxInputBytes:16384,maxOutputTokens:1024,estimatedMaxCostMicros:2000},{role:'spark',vendor:'anthropic',model:'test-spark',maxInputBytes:16384,maxOutputTokens:1024,estimatedMaxCostMicros:2000}]}};
}
export function grant(p=modelManifest(),extra={}){const raw=JSON.stringify(p);return authorizeResearch(raw,{approvedPlanPin:admitManifest(raw).planPin,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true,...extra});}
test('model routes are manifest-pinned and require explicit disclosure; reviewer vendor differs',()=>{
 assert.throws(()=>grant(modelManifest(),{approveModelDisclosure:false}),/MODEL_DISCLOSURE_APPROVAL/);
 const p=modelManifest();p.modelPolicy.roles[2].vendor='openai';assert.throws(()=>grant(p),/CRITIC_VENDOR/);
 assert.throws(()=>grant(modelManifest(),{resumeText:'x',resumePin:'x'}),/MODEL_RESUME_UNSUPPORTED/);
});
test('model broker reserves before dispatch, uses official routes, rejects arbitrary tool replies',async()=>{
 const a=grant(),requests=[];let bad=false;
 const broker=createResearchModelBroker({authorization:a,credentials:{openai:'fixture-openai',anthropic:'fixture-anthropic'},exchangeFactory:({routes})=>{assert.equal(routes.length,2);return {close(){},async exchange(req){requests.push(req);assert.equal(a.usage().modelCalls,requests.length);return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'{"queries":[]}',...(bad?{tool_calls:[{}]}:{})}}],usage:{completion_tokens:6}})};}};}});
 try{
  const input={objective:'Compare battery storage costs',searchesCompleted:1,documentsAdmitted:0,passagesAdmitted:0,missingObjectiveTerms:[],attemptedQuestions:[]};
  const r=await broker.consult('bot',input,{beforeDispatch:async()=>assert.equal(requests.length,0)});
  assert.equal(r.receipt.vendor,'openai');assert.ok(!JSON.stringify(r).includes('fixture-openai'));assert.equal(requests[0].endpoint,'https://api.openai.com/v1/chat/completions');
  await assert.rejects(broker.consult('bot',{...input,evidence:['unapproved']}),/MODEL_PACKET/);
  bad=true;await assert.rejects(broker.consult('bot',input),/MODEL_RESPONSE/);
  await assert.rejects(broker.consult('bot',{objective:'password=private'}),/MODEL_SENSITIVE/);assert.equal(requests.length,2);
  await broker.consult('bot',input).catch(()=>{});await assert.rejects(broker.consult('bot',input),/MODEL_BUDGET_EXHAUSTED/);assert.equal(requests.length,3);assert.equal(a.usage().reservedCostMicros,3000);
 }finally{broker.close();a.close();}
});
