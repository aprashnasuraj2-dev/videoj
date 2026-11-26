import test from 'node:test';
import assert from 'node:assert/strict';
import {runExpressionCouncil} from '../expression-council.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
const A='EXPRESSION_CANARY_A_123456',B='EXPRESSION_CANARY_B_678901',scope='reviewed-question-bindings-and-conditional-feedback';
const correct='([ocf26] - [ppe26]) > ([ocf25] - [ppe25])',alternative='[ocf26] > [ocf25]';
const proposal=(expression,extra={})=>JSON.stringify({version:1,kind:'expression',expression,...extra});
const bindings=['ocf25','ppe25','ocf26','ppe26'];
function setup(a,b,{cap=8}={}){
 let seed=1;const seen=[];
 const limits={maxCalls:cap,maxInputBytes:100000,maxOutputTokens:8192,maxConcurrent:Math.min(2,cap)};
 const transport=(providerId,fn)=>({providerId,send:async input=>{seen.push(input);return {actualInputBytes:1,actualOutputTokens:1,value:{text:await fn(input.operation)}};}});
 const workspace=createProviderWorkspace({catalog:[{id:'my-llm',label:'My private LLM',models:['custom/a']},{id:'other-llm',label:'Other API',models:['custom/b']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,transports:[transport('my-llm',a),transport('other-llm',b)]});
 const pa=workspace.addProfile({providerId:'my-llm',label:'A',credential:A}),pb=workspace.addProfile({providerId:'other-llm',label:'B',credential:B});
 return {workspace,seen,routes:[{id:'director',role:'Interpret the user question',handle:pa.handle,model:'custom/a',shareScope:scope},{id:'challenger',role:'Challenge interpretations',handle:pb.handle,model:'custom/b',shareScope:scope}]};
}
async function run(s,overrides={}){
 const f=await compilerFinanceFixture();
 return runExpressionCouncil({contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:bindings,includeValues:false},routes:s.routes,workspace:s.workspace,...overrides});
}
test('two custom agents generate distinct formulas, consume actual verifier feedback, retain divergence after convergence',async()=>{
 const s=setup(op=>proposal(op.round===1?alternative:correct),()=>proposal(correct));
 const r=await run(s);
 assert.equal(r.rounds.length,2);assert.equal(r.candidates.length,2);assert.equal(r.uniqueCompiledProposals,2);assert.equal(r.agreement,'SAME_CANDIDATE');assert.equal(r.state,'DIVERGENT_CONDITIONAL_OUTCOMES');
 assert.equal(r.semanticReview,'REQUIRED');assert.equal(r.decisionAuthority,'NONE');assert.equal(r.candidates.find(x=>x.expression===correct).target.status,'CONDITIONALLY_REFUTED');
 assert.equal(r.candidates.find(x=>x.expression===alternative).target.status,'CONDITIONALLY_SATISFIED');assert.equal(r.triage.groups.satisfied.length,1);assert.equal(r.triage.groups.refuted.length,1);
 assert.deepEqual(s.seen[2].operation.feedback.map(x=>x.verification),['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED']);
 assert.deepEqual(s.seen[2].operation.feedback,s.seen[3].operation.feedback);
 const messages=JSON.stringify(s.seen.map(x=>x.operation));
 for(const forbidden of ['136162','115948','normalized_filing','graphText','proposalText',A,B])assert.equal(messages.includes(forbidden),false,forbidden);
 assert.ok(r.candidates.every(x=>x.authorship==='MODEL_PROPOSAL'&&x.semanticReview==='REQUIRED'));
});
test('explicit value scope shares only selected numeric lexemes, never source text or other bindings',async()=>{
 const s=setup(()=>proposal(alternative),()=>proposal(alternative));
 const r=await run(s,{disclosure:{bindingIds:['ocf25','ocf26'],includeValues:true},maxRounds:1});
 assert.equal(r.state,'SINGLE_ADMITTED_PROPOSAL');assert.equal(r.candidates.length,1);
 const sent=s.seen[0].operation.bindings;
 assert.deepEqual(sent.map(x=>[x.id,x.valueLexeme]),[['ocf25','136162'],['ocf26','182935']]);
 assert.equal(JSON.stringify(s.seen[0].operation).includes('64551'),false);
});
test('guessing undisclosed binding, extra verdict, duplicate field and code-like expressions are refused',async()=>{
 for(const output of [proposal(correct),proposal(alternative,{verified:true}),proposal('[ocf26] > 1'),proposal('[ocf26]; fetch("https://bad.example")'),'{"version":1,"kind":"expression","expression":"[ocf26]>[ocf25]","expression":"[ppe26]>[ppe25]"}']){
  const s=setup(()=>output,()=>proposal(alternative));const r=await run(s,{disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false}});
  assert.equal(r.rounds[0].agents[0].status,'REFUSED');assert.equal(r.rounds[1].agents.length,1);assert.equal(s.seen.length,3);assert.equal(r.candidates.length,1);
  assert.equal(JSON.stringify(s.seen[2].operation.feedback).includes('bad.example'),false);
 }
});
test('abstention stays explicit; stale pin and missing disclosure stop before provider dispatch',async()=>{
 const s=setup(()=>JSON.stringify({version:1,kind:'abstain'}),()=>proposal(correct));
 const r=await run(s);assert.equal(r.rounds[0].agents[0].status,'ABSTAINED');assert.equal(r.agreement,'INCOMPLETE');assert.equal(r.candidates.length,1);
 const t=setup(()=>proposal(correct),()=>proposal(correct));
 await assert.rejects(run(t,{contractPin:'sha256:'+'0'.repeat(64)}),/COMPILER_CONTRACT_PIN_MISMATCH/);
 await assert.rejects(run(t,{disclosure:{bindingIds:['not_present'],includeValues:false}}),e=>e.code==='DISCLOSURE');
 await assert.rejects(run(t,{routes:[{...t.routes[0],shareScope:'all'}]}),e=>e.code==='ROUTE');
 assert.equal(t.seen.length,0);
});
test('typed-structure agreement is not semantic approval and no fabricated data is used',async()=>{
 const s=setup(()=>proposal('[ocf26]>[ocf25]'),()=>proposal('[ocf26] > [ocf25]'));
 const r=await run(s,{maxRounds:1});assert.equal(r.candidates.length,2);assert.equal(r.uniqueCompiledProposals,1);assert.equal(r.state,'SINGLE_ADMITTED_PROPOSAL');assert.equal(r.semanticReview,'REQUIRED');
});
test('cancellation publishes no unfinished round and preflight cap prevents excessive slots',async()=>{
 const s=setup(()=>new Promise(()=>{}),()=>proposal(correct));
 const r=await run(s,{timeoutMs:10});assert.equal(r.state,'INCOMPLETE_CANCELLED');assert.equal(r.rounds.length,0);assert.equal(r.candidates.length,0);
 const t=setup(()=>proposal(correct),()=>proposal(correct));await assert.rejects(run(t,{routes:[...t.routes,{...t.routes[0],id:'third'}],maxRounds:3}),e=>e.code==='CONFIG');assert.equal(t.seen.length,0);
});

test('host stops redundant rounds on compiled identity but preserves historical divergence and semantic review',async()=>{
 const s=setup(op=>proposal(op.round===1?alternative:correct),()=>proposal(correct));
 const r=await run(s,{maxRounds:3,roundPolicy:'stop-on-stagnation'});
 assert.equal(s.seen.length,4);assert.equal(r.rounds.length,2);assert.equal(r.termination,'STAGNANT_CANDIDATES');
 assert.equal(r.state,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(r.decisionAuthority,'NONE');
 assert.equal(r.reviewPlan.opposingPairs,1);assert.equal(r.reviewPlan.coveredPairs,1);
 assert.equal(r.reviewPlan.steps[0].kind,'BINDING_INCLUSION');assert.match(r.reviewPlan.steps[0].prompt,/ppe25/);
 assert.deepEqual(r.reviewPlan.steps[0].choices.map(x=>x.choice),['NOT_INCLUDED','INCLUDED']);
 const fixed=setup(op=>proposal(op.round===1?alternative:correct),()=>proposal(correct));
 assert.equal((await run(fixed,{maxRounds:3})).rounds.length,3);assert.equal(fixed.seen.length,6);
});
test('comparison and structure review cover divergent formulas with identical binding footprints',async()=>{
 const a=setup(()=>proposal('[ocf26] > [ocf25]'),()=>proposal('[ocf26] <= [ocf25]'));
 const r=await run(a,{maxRounds:1});
 assert.equal(r.reviewPlan.steps.length,1);assert.equal(r.reviewPlan.steps[0].kind,'COMPARISON_OPERATOR');
 const b=setup(()=>proposal('[ocf26] > [ocf25]'),()=>proposal('[ocf25] > [ocf26]'));
 const q=await run(b,{maxRounds:1});
 assert.equal(q.reviewPlan.steps.length,1);assert.equal(q.reviewPlan.steps[0].kind,'EXPRESSION_STRUCTURE');
 assert.equal(q.reviewPlan.coveredPairs,1);
});
test('new compiled proposals and missing team members do not trigger a false stagnation stop',async()=>{
 const newFormula='[ocf26] >= [ocf25]';
 const a=setup(op=>proposal(op.round===1?alternative:op.round===2?newFormula:correct),()=>proposal(correct));
 const r=await run(a,{maxRounds:3,roundPolicy:'stop-on-stagnation'});
 assert.equal(r.rounds.length,3);assert.equal(r.termination,'ROUND_LIMIT');
 const b=setup(()=>JSON.stringify({version:1,kind:'abstain'}),()=>proposal(correct));
 const q=await run(b,{maxRounds:3,roundPolicy:'stop-on-stagnation'});
 assert.equal(q.rounds.length,3);assert.equal(q.agreement,'INCOMPLETE');assert.equal(q.reviewPlan.state,'REVIEW_SINGLE_PROPOSAL');
 await assert.rejects(run(b,{roundPolicy:'model-decides'}),e=>e.code==='CONFIG');
});
