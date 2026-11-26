import test from 'node:test';
import assert from 'node:assert/strict';
import {runExpressionCouncil} from '../expression-council.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
const expression='[ocf26] > [ocf25]',scope='reviewed-question-bindings-and-conditional-feedback';
function setup(id,model,proposed=expression){let seed=1;const seen=[],limits={maxCalls:1,maxInputBytes:50000,maxOutputTokens:1024,maxConcurrent:1};
 const workspace=createProviderWorkspace({catalog:[{id,label:id,models:[model]}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,transports:[{providerId:id,send:async req=>{seen.push(req.operation);return {actualInputBytes:1,actualOutputTokens:1,value:{text:JSON.stringify({version:1,kind:'expression',expression:proposed})}};}}]});
 const handle=workspace.addProfile({providerId:id,label:'Operator',credential:'SYNTHETIC_MODEL_SUBSTITUTION_'+id}).handle;return {workspace,seen,routes:[{id:'extractor',role:'Propose a comparison',handle,model,shareScope:scope}]};}
test('explicit provider replacement keeps evidence and compiled proposal identity; stale old route refuses',async()=>{
 const f=await compilerFinanceFixture(),a=setup('provider-a','custom/a'),b=setup('provider-b','custom/b');
 const common={contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false},maxRounds:1};
 const x=await runExpressionCouncil({...common,routes:a.routes,workspace:a.workspace}),y=await runExpressionCouncil({...common,routes:b.routes,workspace:b.workspace});
 assert.equal(x.contractDigest,f.pin);assert.equal(y.contractDigest,f.pin);assert.equal(x.candidates[0].proposalDigest,y.candidates[0].proposalDigest);assert.deepEqual(x.candidates[0].target,y.candidates[0].target);assert.deepEqual(a.seen,b.seen);assert.equal(y.decisionAuthority,'NONE');
 await assert.rejects(runExpressionCouncil({...common,routes:a.routes,workspace:b.workspace}),/ROUTE/);assert.equal(b.seen.length,1);
});

test('substitution can change conditional result but not evidence identity or granted scope',async()=>{
 const f=await compilerFinanceFixture(),a=setup('provider-a','custom/a'),b=setup('provider-b','custom/b','([ocf26]-[ppe26]) > ([ocf25]-[ppe25])');
 const common={contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ocf26','ppe25','ppe26'],includeValues:false},maxRounds:1};
 const [x,y]=await Promise.all([runExpressionCouncil({...common,routes:a.routes,workspace:a.workspace}),runExpressionCouncil({...common,routes:b.routes,workspace:b.workspace})]);
 assert.equal(x.contractDigest,y.contractDigest);assert.notEqual(x.candidates[0].proposalDigest,y.candidates[0].proposalDigest);assert.notEqual(x.candidates[0].target.status,y.candidates[0].target.status);
 assert.equal(x.semanticReview,'REQUIRED');assert.equal(y.semanticReview,'REQUIRED');assert.deepEqual(a.seen,b.seen);assert.equal(a.workspace.budgetSnapshot().global.used.calls,1);assert.equal(b.workspace.budgetSnapshot().global.used.calls,1);
 const limited=setup('provider-c','custom/c','[ppe26] > [ppe25]');const z=await runExpressionCouncil({...common,disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false},routes:limited.routes,workspace:limited.workspace});
 assert.equal(z.candidates.length,0);assert.equal(z.rounds[0].agents[0].status,'REFUSED');assert.equal(limited.seen.length,1);
});

import {prepareApprovedExpressionCouncil} from '../approved-expression-council.js';
test('one-shot plan binds exact route, scope and question; replacement needs a new capability',async()=>{
 const f=await compilerFinanceFixture(),a=setup('provider-a','custom/a'),b=setup('provider-b','custom/b'),disclosure={bindingIds:['ocf25','ocf26'],includeValues:false};
 const common={contractText:f.contractText,contractPin:f.pin,disclosure,maxRounds:1};
 const x=await prepareApprovedExpressionCouncil({...common,routes:a.routes,workspace:a.workspace}),y=await prepareApprovedExpressionCouncil({...common,routes:b.routes,workspace:b.workspace});
 assert.notEqual(x.planPin,y.planPin);assert.equal(a.seen.length+b.seen.length,0);assert.equal(JSON.stringify(x.plan).includes('136162'),false);
 await assert.rejects(y.execute({approveDisclosure:true,approvedPlanPin:x.planPin}),/COUNCIL_APPROVAL_PIN/);assert.equal(b.seen.length,0);
 disclosure.bindingIds.push('ppe25');a.routes[0].role='unapproved changed role';
 const r=await x.execute({approveDisclosure:true,approvedPlanPin:x.planPin});assert.equal(r.contractDigest,f.pin);assert.equal(a.seen[0].role,'Propose a comparison');assert.deepEqual(a.seen[0].bindings.map(x=>x.id),['ocf25','ocf26']);
 await assert.rejects(x.execute({approveDisclosure:true,approvedPlanPin:x.planPin}),/COUNCIL_APPROVAL_CONSUMED/);assert.equal(a.seen.length,1);
 const r2=await y.execute({approveDisclosure:true,approvedPlanPin:y.planPin});assert.equal(r2.candidates[0].proposalDigest,r.candidates[0].proposalDigest);assert.equal(b.seen.length,1);
});
