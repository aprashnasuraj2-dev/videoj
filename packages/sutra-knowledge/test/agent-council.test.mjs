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

test('council works through heterogeneous wire protocol adapters without changing roles or verification',async()=>{
 const {createProtocolWorkspace}=await import('../../sutra-inference/protocol-workspace.js');
 let seed=1;const seen=[];
 const limits={maxCalls:4,maxInputBytes:50000,maxOutputTokens:2048,maxConcurrent:2};
 const workspace=createProtocolWorkspace({connections:[{id:'custom-wire-a',label:'Private A',protocol:'openai-compatible-json',endpoint:'https://private-a.example.com/v1/chat/completions',transportClass:'hosted',models:['custom/a']},{id:'custom-wire-b',label:'Private B',protocol:'anthropic-messages-json',endpoint:'https://private-b.example.com/v1/messages',transportClass:'hosted',models:['custom/b']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,exchange:async x=>{
  const body=JSON.parse(x.bodyText),operation=JSON.parse(body.messages.at(-1).content);seen.push({id:x.connectionId,operation});
  const content=proposal(operation.agentId==='planner'?'section_declared':'section_derived');
  return {status:200,bodyText:JSON.stringify(x.protocol==='openai-compatible-json'?{choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content}}],usage:{completion_tokens:3}}:{type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:content}],usage:{output_tokens:3}})};
 }});
 const a=workspace.addProfile({providerId:'custom-wire-a',label:'A',credential:A}),b=workspace.addProfile({providerId:'custom-wire-b',label:'B',credential:B});
 const routes=[{id:'planner',role:'propose',handle:a.handle,model:'custom/a',shareScope:scope},{id:'critic',role:'challenge',handle:b.handle,model:'custom/b',shareScope:scope}];
 const result=await invoke({workspace,routes});assert.equal(result.methods.length,2);assert.equal(result.agreement,'DISTINCT_METHODS');assert.equal(seen.length,4);assert.equal(seen[2].operation.feedback.length,2);assert.equal(workspace.budgetSnapshot().global.used.actualOutputTokens,12);
});

test('four-agent council respects two concurrent slots without dropping agents or leaking same-round feedback',async()=>{
 let active=0,peak=0;
 const send=async op=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return proposal(op.agentId==='planner'?'section_declared':'section_derived');};
 const s=setup(send,send,{calls:8,concurrent:2}),routes=[s.routes[0],s.routes[1],{...s.routes[0],id:'analyst'},{...s.routes[1],id:'reviewer'}];
 const result=await invoke(s,{routes});
 assert.equal(peak,2);assert.equal(s.seen.length,8);assert.equal(result.rounds.length,2);assert.equal(result.agreement,'DISTINCT_METHODS');
 for(const row of result.rounds){assert.deepEqual(row.agents.map(x=>x.agentId),routes.map(x=>x.id));assert.ok(row.agents.every(x=>x.status==='PROPOSED'));}
 assert.ok(s.seen.slice(0,4).every(x=>x.operation.feedback.length===0));assert.ok(s.seen.slice(4).every(x=>x.operation.feedback.length===4));
 assert.equal(s.workspace.budgetSnapshot().global.used.calls,8);
});
test('single concurrent slot serializes a shared-profile team, preserving original order and no extra calls',async()=>{
 let active=0,peak=0;
 const send=async()=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,3));active--;return proposal('section_declared');};
 const s=setup(send,send,{calls:4,concurrent:1}),routes=[s.routes[0],{...s.routes[0],id:'other'}];
 const r=await invoke(s,{routes});assert.equal(peak,1);assert.equal(s.seen.length,4);assert.equal(r.agreement,'SAME_METHOD');
 assert.deepEqual(r.rounds.map(x=>x.agents.map(y=>y.agentId)),[['planner','other'],['planner','other']]);
});
test('unknown charge holds a slot, other profile can still proceed, no retries or over-admission',async()=>{
 const s=setup(async()=>{throw Error('unknown provider completion');},async()=>proposal('section_derived'),{calls:8,concurrent:1});
 // With one global slot, the unknown first completion blocks remaining routes.
 const r=await invoke(s);
 assert.equal(s.seen.length,1);assert.equal(r.rounds[0].agents[0].reason,'PROVIDER_UNKNOWN');assert.equal(r.rounds[0].agents[1].reason,'BUDGET');assert.equal(r.termination,'NO_ADMITTED_PROPOSALS');
 assert.equal(s.workspace.budgetSnapshot().global.used.active,1);
 // With two slots the independent route completes, while its next same-round
 // wave cannot reuse the failed provider's still-active reservation.
 const t=setup(async()=>{throw Error('unknown');},async()=>proposal('section_derived'),{calls:8,concurrent:2});
 const routes=[t.routes[0],t.routes[1],{...t.routes[1],id:'other'}];
 const x=await invoke(t,{routes,maxRounds:1});assert.equal(t.seen.length,3);assert.equal(x.rounds[0].agents[0].status,'REFUSED');assert.equal(x.rounds[0].agents[2].status,'PROPOSED');assert.equal(x.agreement,'INCOMPLETE');
});
test('cancelled wave never dispatches waiting agents',async()=>{
 const s=setup(()=>new Promise(()=>{}),()=>proposal('section_derived'),{calls:4,concurrent:1});
 const r=await invoke(s,{timeoutMs:15});assert.equal(s.seen.length,1);assert.equal(r.rounds.length,0);assert.equal(r.termination,'CANCELLED_OR_TIMEOUT');
});
