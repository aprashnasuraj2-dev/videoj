import {createExecutionJournal} from '../../sutra-runtime/execution-events.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtocolWorkspace} from '../protocol-workspace.js';
import {createDisclosureConsentInspector} from '../../sutra-consent/index.js';
import {prepareAuthorizedProviderTask,capacitySlots,rankProviderRoutes,runAuthorizedProviderGraph} from '../authorized-routing.js';
const pin='sha256:'+'a'.repeat(64);
const limits={maxCalls:4,maxInputBytes:100000,maxOutputTokens:512,maxConcurrent:2};
const one={maxCalls:1,maxInputBytes:100000,maxOutputTokens:256,maxConcurrent:1};
const response={choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'proposal'}}],usage:{completion_tokens:1}};
function fixture(exchange,localLimits=one){
 let seed=1;const seen=[];
 const w=createProtocolWorkspace({connections:[{id:'local',label:'Local',protocol:'openai-compatible-json',endpoint:'http://127.0.0.1:11434/v1/chat/completions',transportClass:'local',models:['m']},{id:'remote',label:'Remote',protocol:'openai-compatible-json',endpoint:'https://api.example.com/v1/chat/completions',transportClass:'hosted',models:['m']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,exchange:async req=>{seen.push(req.connectionId);return exchange?exchange(req):{status:200,bodyText:JSON.stringify(response)}}});
 const a=w.addProfile({providerId:'local',label:'Local',credential:'synthetic-local-key',limits:localLimits}),b=w.addProfile({providerId:'remote',label:'Remote',credential:'synthetic-remote-key'});
 const routes=[{id:'remote_route',handle:b.handle,model:'m',capabilities:['expression'],priority:0},{id:'local_route',handle:a.handle,model:'m',capabilities:['expression'],priority:1}];
 const config={workspace:w,routes,capability:'expression',operation:{question:'bounded question'},disclosure:['question'],version:pin,localFirst:true,maxOutputTokens:128};
 return {w,a,b,seen,config};
}
test('capability selection and local preference are explicit, no unknown capacity treated as available',()=>{
 assert.equal(capacitySlots(null,128),0);
 assert.equal(capacitySlots({limits,used:{calls:0,inputBytes:100000,outputTokens:0,active:0}},128),0);
 assert.deepEqual(rankProviderRoutes([{id:'a',transportClass:'hosted',priority:0,capabilities:['x']},{id:'b',transportClass:'local',priority:9,capabilities:['x']},{id:'c',transportClass:'local',priority:0,capabilities:['y']}],'x',true).map(x=>x.id),['b','a']);
});
test('local-first plan, exact route approval, opaque handles and no secret disclosure',async()=>{
 const f=fixture(),p=await prepareAuthorizedProviderTask(f.config),intents=[];
 assert.equal(p.plan.routes[0].id,'local_route');assert.equal(JSON.stringify(p.plan).includes('synthetic-'),false);
 assert.equal(JSON.stringify(p.plan).includes('handle'),false);
 const inspector=createDisclosureConsentInspector({decide:i=>{intents.push(i);return 'allow'}});
 await assert.rejects(p.execute({approvedPlanPin:pin,consentInspector:inspector}),e=>e.code==='PIN');assert.deepEqual(f.seen,[]);
 const r=await p.execute({approvedPlanPin:p.planPin,consentInspector:inspector});
 assert.equal(r.routeId,'local_route');assert.deepEqual(f.seen,['local']);assert.equal(intents.length,1);
 await assert.rejects(p.execute({approvedPlanPin:p.planPin,consentInspector:inspector}),e=>e.code==='CONSUMED');
});
test('exhausted local route selects declared fallback only after its own consent',async()=>{
 const f=fixture();await f.w.execute({handle:f.a.handle,model:'m',inputBytes:1,maxOutputTokens:128,operation:{question:'prior'}});
 const p=await prepareAuthorizedProviderTask(f.config),intents=[];
 const r=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:i=>{intents.push(i);return 'allow'}})});
 assert.equal(r.routeId,'remote_route');assert.deepEqual(f.seen,['local','remote']);assert.equal(intents.length,1);assert.match(intents[0].destination,/^remote\//);
 assert.deepEqual(r.decisions.map(x=>x.decision),['BUDGET','DISPATCHED']);assert.equal(f.w.budgetSnapshot().global.used.calls,2);
});
test('denial, unknown dispatch and forged handles never trigger fallback',async()=>{
 const f=fixture(),p=await prepareAuthorizedProviderTask(f.config);
 await assert.rejects(p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'deny'})}),e=>e.code==='CONSENT_DENIED');assert.deepEqual(f.seen,[]);
 const g=fixture(()=>{throw Error('network unknown')});const q=await prepareAuthorizedProviderTask(g.config);
 await assert.rejects(q.execute({approvedPlanPin:q.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'allow'})}));assert.deepEqual(g.seen,['local']);
 await assert.rejects(prepareAuthorizedProviderTask({...f.config,routes:[{...f.config.routes[0],handle:{...f.b.handle}}]}),e=>e.code==='HANDLE');
});
test('credential generation and version changes invalidate plan before dispatch',async()=>{
 const f=fixture(),p=await prepareAuthorizedProviderTask(f.config);f.w.removeProfile(f.a.handle);
 await assert.rejects(p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'allow'})}),e=>e.code==='PROFILE_SET_CHANGED');assert.deepEqual(f.seen,[]);
 const g=fixture();let current=true;const q=await prepareAuthorizedProviderTask({...g.config,assertCurrent:()=>{if(!current)throw Error('stale')}});
 await assert.rejects(q.execute({approvedPlanPin:q.planPin,consentInspector:createDisclosureConsentInspector({decide:()=>{current=false;return 'allow'}})}));assert.deepEqual(g.seen,[]);
});
test('parallel tasks share the same authoritative ledger; only one route dispatch can reserve a one-call cap',async()=>{
 let release;const gate=new Promise(r=>release=r);const f=fixture(async()=>{await gate;return {status:200,bodyText:JSON.stringify(response)}});
 const config={...f.config,routes:[f.config.routes[1]]},p=await prepareAuthorizedProviderTask(config),q=await prepareAuthorizedProviderTask(config),inspector=createDisclosureConsentInspector({decide:()=> 'allow'});
 const a=p.execute({approvedPlanPin:p.planPin,consentInspector:inspector});while(!f.seen.length)await new Promise(r=>setImmediate(r));
 const b=await q.execute({approvedPlanPin:q.planPin,consentInspector:inspector});assert.equal(b.status,'unavailable');release();await a;assert.deepEqual(f.seen,['local']);
});

test('encoded wire capacity rather than payload length determines pre-dispatch fallback',async()=>{
 const f=fixture(undefined,{...one,maxInputBytes:64}),p=await prepareAuthorizedProviderTask(f.config),intents=[];
 assert.ok(p.plan.routes[0].inputBytes>64);assert.equal(f.w.budgetSnapshot().global.used.calls,0);
 const result=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:i=>{intents.push(i);return 'allow'}})});
 assert.equal(result.routeId,'remote_route');assert.deepEqual(f.seen,['remote']);assert.equal(intents.length,1);assert.match(intents[0].destination,/^remote\//);assert.equal(f.w.budgetSnapshot().global.used.inputBytes,p.plan.routes[1].inputBytes);
});

test('approved provider DAG admits typed artifacts and never appends predecessor output to the pinned request',async()=>{
 const wire=[],f=fixture(req=>{wire.push(req.bodyText);return {status:200,bodyText:JSON.stringify(response)}}),p=await prepareAuthorizedProviderTask(f.config),q=await prepareAuthorizedProviderTask({...f.config,operation:{question:'independent fixed question'}}),inspector=createDisclosureConsentInspector({decide:()=> 'allow'});
 const tasks=[{id:'first',agentId:'researcher',kind:'provider_task',dependsOn:[]},{id:'second',agentId:'analyst',kind:'provider_task',dependsOn:['first']}],events=[];
 const approvals=[{taskId:'first',prepared:p,approvedPlanPin:p.planPin,consentInspector:inspector,admit:raw=>({kind:'local-proposal',privateLocal:'not-in-provider-request',text:raw.text})},{taskId:'second',prepared:q,approvedPlanPin:q.planPin,consentInspector:inspector,admit:(raw,{inputs})=>({kind:'local-contrast',previous:inputs[0].value.kind,text:raw.text})}];
 const result=await runAuthorizedProviderGraph({tasks,approvals,runId:'route_graph',version:pin,onEvent:e=>events.push(e)});
 assert.equal(result.status,'completed');assert.deepEqual(f.seen,['local','remote']);assert.equal(result.artifacts[1].value.previous,'local-proposal');assert.equal(wire[1].includes('not-in-provider-request'),false);assert.equal(events.some(e=>JSON.stringify(e).includes('proposal')),false);
});
test('provider graph prevalidates every exact approval and blocks dependent work after host admission refusal',async()=>{
 const f=fixture(),p=await prepareAuthorizedProviderTask(f.config),q=await prepareAuthorizedProviderTask(f.config),inspector=createDisclosureConsentInspector({decide:()=> 'allow'});
 const tasks=[{id:'first',agentId:'researcher',kind:'provider_task',dependsOn:[]},{id:'second',agentId:'analyst',kind:'provider_task',dependsOn:['first']}];
 const approvals=[{taskId:'first',prepared:p,approvedPlanPin:p.planPin,consentInspector:inspector,admit:()=>{throw Error('not a valid proposal')}},{taskId:'second',prepared:q,approvedPlanPin:q.planPin,consentInspector:inspector,admit:raw=>raw}];
 await assert.rejects(runAuthorizedProviderGraph({tasks,approvals:[approvals[0],{...approvals[1],approvedPlanPin:pin}],runId:'route_graph',version:pin}),e=>e.code==='GRAPH_APPROVAL');assert.deepEqual(f.seen,[]);
 const result=await runAuthorizedProviderGraph({tasks,approvals,runId:'route_graph',version:pin});assert.equal(result.status,'partial');assert.deepEqual(result.tasks.map(t=>t.status),['failed','blocked']);assert.equal(result.artifacts.length,0);assert.deepEqual(f.seen,['local']);
});

test('authorized provider graph emits exact-plan capacity, consent and transport phases through unified feed',async()=>{
 const f=fixture();await f.w.execute({handle:f.a.handle,model:'m',inputBytes:1,maxOutputTokens:128,operation:{question:'prior'}});
 const p=await prepareAuthorizedProviderTask(f.config),journal=createExecutionJournal(),events=[];
 const r=await runAuthorizedProviderGraph({tasks:[{id:'research',agentId:'researcher',kind:'provider_task',dependsOn:[]}],approvals:[{taskId:'research',prepared:p,approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'allow'}),admit:raw=>({kind:'proposal',text:raw.text})}],runId:'route_graph',version:pin,onExecutionEvent:e=>{assert.equal(journal.accept(e),true);events.push(e);}});
 assert.equal(r.status,'completed');assert.deepEqual(events.filter(e=>e.type==='provider.phase').map(e=>[e.payload.routeId,e.payload.phase]),[['local_route','skip-budget'],['remote_route','consent-requested'],['remote_route','consent-granted'],['remote_route','dispatched'],['remote_route','response']]);
 assert.ok(events.filter(e=>e.type==='provider.phase').every(e=>e.payload.planPin===p.planPin));assert.equal(journal.snapshot('route_graph').tasks[0].routeAttempts[1].phase,'response');
 assert.doesNotMatch(JSON.stringify(events),/bounded question|synthetic-local-key|synthetic-remote-key|privateLocal/);
});
test('route telemetry cannot request another recipient after a dispatch with unknown outcome',async()=>{
 const f=fixture(()=>{throw Error('unknown provider result')}),p=await prepareAuthorizedProviderTask(f.config),phases=[];
 await assert.rejects(p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'allow'}),onRouteEvent:e=>phases.push(e)}));
 assert.deepEqual(f.seen,['local']);assert.deepEqual(phases.map(e=>e.phase),['consent-requested','consent-granted','dispatched','refused']);
});
