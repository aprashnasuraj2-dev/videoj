import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {prepareHostedHybridGateway,HOSTED_GATEWAY_PROFILES,resolveHostedAddresses} from '../hosted-hybrid-gateway.js';
async function fixture(){
 const v=await livingFixture(),wire=JSON.parse(v.versionText),p=HOSTED_GATEWAY_PROFILES[0];
 const c={version:'sutra-mixed-expression-council/v1',contractText:wire.contractText,contractPin:wire.contractPin,disclosure:{bindingIds:['first','baseline'],includeValues:false},connections:[{id:'one',label:'Official route',endpoint:p.endpoint,protocol:p.protocol,authMode:p.authMode,credentialEnv:p.credentialEnv,models:['fixture-model'],transportClass:'hosted'}],agents:[{id:'critic',role:'Compare',connectionId:'one',model:'fixture-model'}],budget:{maxCalls:1,maxInputBytes:100000,maxOutputTokens:256,maxConcurrent:1},maxRounds:1,maxOutputTokens:128,roundPolicy:'fixed',timeoutMs:5000,transportDeadlineMs:2000};
 const text=()=>JSON.stringify({version:'sutra-mixed-hybrid-operator/v1',versionText:v.versionText,versionPin:v.digest,councilConfigText:JSON.stringify(c)});
 return {c,text};
}
test('official recipient gateway preview is inert, wrong pins or missing approval cannot read secrets',async()=>{
 const f=await fixture();let reads=0,dns=0;
 const g=await prepareHostedHybridGateway({configText:f.text(),readCredential:()=>{reads++;return null;},resolveAll:()=>{dns++;throw Error('never');}});
 assert.equal(g.preview.recipients[0].vendor,'openai');assert.equal(reads,0);assert.equal(dns,0);
 for(const opts of [{approvedPlanPin:'wrong',approveDisclosure:true,approveHosted:true},{approvedPlanPin:g.planPin,approveDisclosure:true},{approvedPlanPin:g.planPin,approveHosted:true}]){
  await assert.rejects(g.execute(opts),e=>e.code==='APPROVAL');
 }
 assert.equal(reads,0);assert.equal(dns,0);
 await assert.rejects(g.execute({approvedPlanPin:g.planPin,approveDisclosure:true,approveHosted:true}),e=>e.code==='CREDENTIAL_REQUIRED');
 assert.equal(reads,1);assert.equal(dns,0);
 await assert.rejects(g.execute({approvedPlanPin:g.planPin,approveDisclosure:true,approveHosted:true}),e=>e.code==='CONSUMED');
});
test('endpoint, auth and credential alias substitution rejected before any DNS or credential access',async()=>{
 const f=await fixture(),original={...f.c.connections[0]};
 for(const patch of [{endpoint:'https://api.openai.com/v1/other'},{endpoint:'https://api.attacker.example.com/v1/chat/completions'},{credentialEnv:'SUTRA_HOSTED_ANTHROPIC'},{authMode:'none',credentialEnv:null}]){
  f.c.connections[0]={...original,...patch};
  await assert.rejects(prepareHostedHybridGateway({configText:f.text(),readCredential:()=>{throw Error('must not read');}}),e=>e.code==='RECIPIENT_POLICY');
 }
 await assert.rejects(resolveHostedAddresses('attacker.example.com'),e=>e.code==='HOST');
});
test('real gateway composition refuses private DNS answer before TLS dial or HTTP, result is not an admitted model proposal',async()=>{
 const f=await fixture();let dns=0,dials=0;
 const g=await prepareHostedHybridGateway({configText:f.text(),readCredential:()=> 'TEST_HOSTED_GATEWAY_SECRET',resolveAll:async()=>{dns++;return [{address:'127.0.0.1',family:4}];},hostedIO:{dialTls(){dials++;throw Error('never');},requestHttps(){throw Error('never');}}});
 const result=await g.execute({approvedPlanPin:g.planPin,approveDisclosure:true,approveHosted:true});
 assert.equal(dns,1);assert.equal(dials,0);assert.equal(result.result.artifacts.find(a=>a.taskId==='consult').value.candidates.length,0);assert.doesNotMatch(JSON.stringify(result),/TEST_HOSTED_GATEWAY_SECRET/);
});
