import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {buildHostedHybridPlan} from '../hosted-plan.js';
import {prepareHostedHybridGateway} from '../hosted-hybrid-gateway.js';
const roles=['planner','researcher','coder','analyst','critic','coordinator'];
async function fixture(){
 const v=await livingFixture(),specialists=roles.map((id,i)=>({id,role:'Specialist '+id,vendor:['openai','anthropic','gemini'][i%3],model:'test-model-'+i,bindingIds:['first','baseline'],includeValues:false,feedbackFrom:[]}));
 return {versionText:v.versionText,versionPin:v.digest,specialists};
}
test('browser-safe compiler creates six slots across three approved vendors and matches independently admitted host pin',async()=>{
 const f=await fixture(),b=await buildHostedHybridPlan(f),g=await prepareHostedHybridGateway({configText:b.text,readCredential:()=>{throw Error('never');}});
 assert.equal(b.planPin,g.planPin);assert.equal(g.preview.agents.length,6);assert.equal(g.preview.recipients.length,3);assert.equal(g.preview.budget.maxCalls,6);assert.equal(g.preview.budget.maxOutputTokens,1536);
 assert.ok(g.preview.agentDisclosures.every(s=>!s.feedbackFrom.length&&s.bindings.every(b=>!Object.hasOwn(b,'valueLexeme'))));
 assert.deepEqual(g.preview.agents.map(x=>x.id),roles);
});
test('plan builder rejects unknown vendor, executable fields, wider peer flow and excess slots before export',async()=>{
 const f=await fixture();
 await assert.rejects(buildHostedHybridPlan({...f,maxRounds:2}),e=>e.code==='CONFIG');
 const s=structuredClone(f.specialists);s[0].vendor='arbitrary';await assert.rejects(buildHostedHybridPlan({...f,specialists:s}),e=>e.code==='SPECIALIST');
 const x=structuredClone(f.specialists);x[0].credential='not a valid plan field';await assert.rejects(buildHostedHybridPlan({...f,specialists:x}),e=>e.code==='SPECIALIST');
 const y=structuredClone(f.specialists);y[0].bindingIds=['first'];y[0].feedbackFrom=[y[1].id];await assert.rejects(buildHostedHybridPlan({...f,specialists:y}),e=>e.code==='DISCLOSURE_FLOW');
});
