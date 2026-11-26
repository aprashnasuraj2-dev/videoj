import test from 'node:test';
import assert from 'node:assert/strict';
import {admitLocalCouncilConfig,LOCAL_COUNCIL_VERSION} from '../local-council-config.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {casePin} from '../pinned-investigation.js';
async function fixture(){
 const f=await compilerFinanceFixture();
 return {version:LOCAL_COUNCIL_VERSION,contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false},connections:[{id:'local-model',label:'Local model',protocol:'ollama-chat-json',endpoint:'http://127.0.0.1:11434/api/chat',models:['my/model'],authMode:'none',credentialEnv:null}],agents:[{id:'analyst',role:'Investigate',connectionId:'local-model',model:'my/model'}],budget:{maxCalls:2,maxInputBytes:10000,maxOutputTokens:512,maxConcurrent:1},maxRounds:2,maxOutputTokens:256,roundPolicy:'fixed',timeoutMs:15000,transportDeadlineMs:10000};
}
test('shared config preflight binds exact bytes, admits native local models, returns frozen reviewed scope',async()=>{
 const c=await fixture(),wire=JSON.stringify(c,null,2),a=await admitLocalCouncilConfig(wire);
 assert.equal(a.planPin,await casePin(wire));assert.equal(a.config.connections[0].protocol,'ollama-chat-json');assert.ok(Object.isFrozen(a.config.connections[0]));assert.equal(a.disclosure.scopes[0].bindingIds.length,2);
 assert.notEqual((await admitLocalCouncilConfig(wire+' ')).planPin,a.planPin);
});
test('shared preflight rejects unsupported endpoints and authentication, invalid reviewed pin and unused routes',async()=>{
 const c=await fixture();
 for(const edit of [x=>x.connections[0].endpoint='https://private.example.com/api/chat',x=>x.connections[0].authMode='anthropic-key',x=>x.contractPin='sha256:'+'0'.repeat(64),x=>x.connections[0].credentialEnv='API_KEY',x=>x.connections.push({...x.connections[0],id:'unused'})]){
  const v=structuredClone(c);edit(v);await assert.rejects(admitLocalCouncilConfig(JSON.stringify(v)));
 }
});
