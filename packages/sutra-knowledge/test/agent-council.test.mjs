import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgentCouncil} from '../agent-council.js';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
import {beamCase} from '../examples/methods.mjs';
import {beamGraph} from '../examples/beam.mjs';
const A='SYNTHETIC_SECRET_CUSTOM_12345',B='SYNTHETIC_SECRET_PRIVATE_67890';
const scope='reviewed-question-and-method-feedback';
const proposal=(methodId,extra={})=>JSON.stringify({version:1,obligationId:'beam_deflection',methodId,...extra});
function setup(sendA,sendB,{calls=8,concurrent=2}={}){
 let seed=1;const seen=[];
 const modelA='company/custom-v17',modelB='private/local-v2';
 const limits={maxCalls:calls,maxInputBytes:100000,maxOutputTokens:8192,maxConcurrent:concurrent};
 const transport=(id,send)=>({providerId:id,send:async input=>{seen.push(input);const value=await send(input.operation,input);return {actualInputBytes:1,actualOutputTokens:1,value:{text:value}};}});
 const workspace=createProviderWorkspace({catalog:[{id:'my-custom-service',label:'User custom service',models:[modelA]},{id:'private-host',label:'Private model host',models:[modelB]}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,transports:[transport('my-custom-service',sendA),transport('private-host',sendB)]});
 const a=workspace.addProfile({providerId:'my-custom-service',label:'Custom profile',credential:A});
 const b=workspace.addProfile({providerId:'private-host',label:'Private profile',credential:B});
 return {workspace,seen,routes:[{id:'planner',role:'propose',handle:a.handle,model:modelA,shareScope:scope},{id:'critic',role:'challenge',handle:b.handle,model:modelB,shareScope:scope}]};
}
const caseText=()=>{const c=JSON.parse(beamCase());c.methods[1].graphText=beamGraph('2500000000');return JSON.stringify(c);};
const invoke=(s,extra={})=>runAgentCouncil({caseText:caseText(),question:'Compare declared stiffness assumptions.',workspace:s.workspace,routes:s.routes,...extra});
test('two arbitrary provider identities collaborate on actual conditional proof outcomes; disagreement history survives convergence',async()=>{
 const s=setup(op=>proposal(op.round===1?'section_declared':'section_derived'),op=>proposal('section_derived'));
 const r=await invoke(s);
 assert.equal(r.rounds.length,2);assert.equal(r.agreement,'SAME_METHOD');assert.equal(r.decisionAuthority,'NONE');
 assert.equal(r.methods.length,2);assert.equal(r.methods.find(x=>x.methodId==='section_derived').outcome.status,'constraint_refuted');assert.equal(r.methods.find(x=>x.methodId==='section_declared').outcome.status,'constraint_satisfied');
 assert.deepEqual(s.seen.map(x=>x.providerId),['my-custom-service','private-host','my-custom-service','private-host']);
 assert.deepEqual(s.seen[2].operation.feedback.map(x=>x.verification),['constraint_satisfied','constraint_refuted']);
 assert.deepEqual(s.seen[2].operation.feedback,s.seen[3].operation.feedback);
 assert.equal(s.seen[0].credential,A);assert.equal(s.seen[1].credential,B);
 assert.equal(JSON.stringify(r).includes(A),false);assert.equal(JSON.stringify(r).includes(B),false);
 assert.equal(JSON.stringify(s.seen.map(x=>x.operation)).includes('graphText'),false);
 assert.equal(s.workspace.budgetSnapshot().global.used.calls,4);
});
test('model-supplied verdict, route or unknown method refused; no fallback or retry of refused agent',async()=>{
 for(const output of [proposal('section_declared',{verified:true}),proposal('section_declared',{provider:'evil'}),proposal('unknown'),'{"version":1,"obligationId":"beam_deflection","methodId":"section_declared","methodId":"section_derived"}']){
  const s=setup(()=>output,()=>proposal('section_derived'));const r=await invoke(s);
  assert.equal(r.rounds[0].agents[0].status,'REFUSED');assert.equal(r.rounds[1].agents.length,1);assert.equal(r.agreement,'INCOMPLETE');assert.equal(s.seen.length,3);
 }
});
test('host scope and unknown model rejected before any dispatch',async()=>{
 const s=setup(()=>proposal('section_declared'),()=>proposal('section_derived'));
 for(const routes of [[{...s.routes[0],shareScope:'all'}],[{...s.routes[0],model:'unapproved'}],[s.routes[0],s.routes[0]]])await assert.rejects(invoke(s,{routes}),e=>e.code==='ROUTE');
 assert.equal(s.seen.length,0);
});
test('budget refusal does not reassign providers or fabricate success',async()=>{
 const s=setup(()=>proposal('section_declared'),()=>proposal('section_derived'),{calls:2});
 const r=await invoke(s);assert.equal(s.seen.length,2);assert.equal(r.termination,'NO_ADMITTED_PROPOSALS');assert.equal(r.agreement,'INCOMPLETE');assert.equal(r.methods.length,2);
 assert.ok(r.rounds[1].agents.every(x=>x.reason==='BUDGET'));
});
test('pre-cancel and noncooperative transport stop publication and later rounds',async()=>{
 const s=setup(()=>new Promise(()=>{}),()=>proposal('section_derived'));const c=new AbortController();c.abort();
 const before=await invoke(s,{signal:c.signal});assert.equal(before.termination,'CANCELLED_OR_TIMEOUT');assert.equal(s.seen.length,0);
 const after=await invoke(s,{timeoutMs:10});assert.equal(after.termination,'CANCELLED_OR_TIMEOUT');assert.equal(after.rounds.length,0);assert.equal(s.seen.length,2);
});
