import test from 'node:test';
import assert from 'node:assert/strict';
import {runExpressionCouncil} from '../expression-council.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
const expression='[ocf26] > [ocf25]',scope='reviewed-question-bindings-and-conditional-feedback';
function setup(id,model){let seed=1;const seen=[],limits={maxCalls:1,maxInputBytes:50000,maxOutputTokens:1024,maxConcurrent:1};
 const workspace=createProviderWorkspace({catalog:[{id,label:id,models:[model]}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,transports:[{providerId:id,send:async req=>{seen.push(req.operation);return {actualInputBytes:1,actualOutputTokens:1,value:{text:JSON.stringify({version:1,kind:'expression',expression})}};}}]});
 const handle=workspace.addProfile({providerId:id,label:'Operator',credential:'SYNTHETIC_MODEL_SUBSTITUTION_'+id}).handle;return {workspace,seen,routes:[{id:'extractor',role:'Propose a comparison',handle,model,shareScope:scope}]};}
test('explicit provider replacement keeps evidence and compiled proposal identity; stale old route refuses',async()=>{
 const f=await compilerFinanceFixture(),a=setup('provider-a','custom/a'),b=setup('provider-b','custom/b');
 const common={contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false},maxRounds:1};
 const x=await runExpressionCouncil({...common,routes:a.routes,workspace:a.workspace}),y=await runExpressionCouncil({...common,routes:b.routes,workspace:b.workspace});
 assert.equal(x.contractDigest,f.pin);assert.equal(y.contractDigest,f.pin);assert.equal(x.candidates[0].proposalDigest,y.candidates[0].proposalDigest);assert.deepEqual(x.candidates[0].target,y.candidates[0].target);assert.deepEqual(a.seen,b.seen);assert.equal(y.decisionAuthority,'NONE');
 await assert.rejects(runExpressionCouncil({...common,routes:a.routes,workspace:b.workspace}),/ROUTE/);assert.equal(b.seen.length,1);
});
