import test from 'node:test';
import assert from 'node:assert/strict';
import {admitManifest,authorizeResearch,digest} from '../research-session.js';
import {createResearchModelBroker} from '../model-broker.js';
import {runAutonomousResearch} from '../research-supervisor.js';
const defaultModel={vendor:'groq',model:'fixture-model',maxInputBytes:16384,maxOutputTokens:1024,estimatedMaxCostMicros:1000};
const manifest=(providers=[],overrides=[])=>({schema:'sutra-autonomous-research/v1',objective:'Explain battery storage costs',scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false},budget:{maxSearches:3,maxDocuments:6,maxLinkDepth:0,maxDurationSeconds:60,maxDownloadBytes:8388608,maxCostMicros:20000,maxModelCalls:3},providers,modelPolicy:{allowPublicEvidenceDisclosure:true,defaultModel,roles:overrides}});
function setup(p,answer){
 const raw=JSON.stringify(p),a=authorizeResearch(raw,{approvedPlanPin:admitManifest(raw).planPin,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true});
 const requests=[],calls=[];
 const modelBroker=createResearchModelBroker({authorization:a,credentials:{groq:'fixture-groq-key',gemini:'fixture-gemini-key'},exchangeFactory:({routes})=>({close(){},async exchange(req){
  const body=JSON.parse(req.bodyText),input=JSON.parse(body.messages.at(-1).content);requests.push({req,input});
  const v=answer(input,requests.length);
  return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(v)}}],usage:{completion_tokens:32}})};
 }})});
 const run=(providers={})=>runAutonomousResearch({authorization:a,modelBroker,providers,readDocument:async url=>{calls.push(url);a.reserve('document',{bytes:262144});const text='Battery storage costs were USD 100 million in 2025.';return {url,text,textDigest:digest(text),rawDigest:digest(text),links:[],mediaType:'text/plain'};}});
 return {a,requests,calls,run,close(){modelBroker.close();a.close();}};
}
test('one selected model resolves all roles; optional second-model overrides are explicit and pinned',()=>{
 const p=admitManifest(JSON.stringify(manifest())).plan;
 assert.equal(p.modelPolicy.webAccess,'on_demand');assert.equal(p.modelPolicy.reviewMode,'same_configured_model_self_review');assert.equal(new Set(p.modelPolicy.roles.map(r=>r.model)).size,1);
 const p2=admitManifest(JSON.stringify(manifest([],[{...defaultModel,role:'spark',vendor:'gemini',model:'other-model'}]))).plan;
 assert.equal(p2.modelPolicy.roles.find(r=>r.role==='spark').vendor,'gemini');assert.equal(p2.modelPolicy.reviewMode,'different_configured_models_independence_unproven');
});
test('simple model task runs with no search key or provider, no fictitious citations',async()=>{
 const f=setup(manifest(),()=>({webAction:'answer_without_web',answer:'Battery storage stores energy for later use.'}));
 try{const r=await f.run();assert.equal(r.terminationReason,'model_answer_without_web');assert.equal(r.usage.searches,0);assert.equal(r.modelOnlyAnswer.sourceStatus,'NO_WEB_EVIDENCE');assert.equal(r.intelligence,null);assert.equal(f.requests.length,1);assert.equal(f.calls.length,0);}finally{f.close();}
});
test('model requests web only through configured host; unavailable capability is explicit',async()=>{
 const f=setup(manifest(),()=>({webAction:'search',queries:[{suffix:'annual public data',questionId:'primary'}]}));
 try{const r=await f.run();assert.equal(r.terminationReason,'web_access_unavailable');assert.equal(r.usage.searches,0);assert.equal(r.modelOnlyAnswer,null);}finally{f.close();}
});
test('same single model executes planning, acquisition-directed synthesis and self-review',async()=>{
 const f=setup(manifest([{id:'brave',estimatedMaxCostMicros:1000}]),(input,n)=>{
  if(n===1)return {webAction:'search',queries:[{suffix:'annual data',questionId:'primary'}]};
  if(n===2){const e=input.evidence[0];return {claims:[{statement:'A source reports battery costs.',kind:'reported',citations:[{passageId:e.passageId,quote:e.quote}]}],gaps:[]};}
  const c=input.claims[0],e=input.evidence[0];return {reviews:[{claimId:c.claimId,verdict:'supported',reason:'The excerpt reports the figure.',citations:[{passageId:e.passageId,quote:e.quote}]}],conflicts:[]};
 });
 try{const r=await f.run({brave:{search:async q=>{assert.match(q,/annual data/);return [{url:'https://public.org/report'}];}}});assert.equal(r.usage.searches,1);assert.equal(r.usage.modelCalls,3);assert.equal(r.intelligence.reviewMode,'same_configured_model_self_review');assert.equal(r.intelligence.claims[0].truthStatus,'UNVERIFIED');assert.equal(r.modelOnlyAnswer,null);assert.equal(new Set(f.requests.map(x=>x.req.model)).size,1);}finally{f.close();}
});
