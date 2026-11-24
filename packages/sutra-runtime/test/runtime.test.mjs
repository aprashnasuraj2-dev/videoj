import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {compileNetwork,runNetwork,executionLimits} from '../index.js';import {createScriptedModel} from '../testing.js';
const graph=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const copy=()=>structuredClone(graph);const run=(opts={})=>runNetwork({definition:copy(),request:'Inspect the synthetic cue.',model:createScriptedModel(),...opts});
test('reference loop runs two agents and three scripted model steps',async()=>{const result=await run();assert.equal(result.mode,'scripted-test');assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,3);assert.match(result.text,/No live AI/);assert.ok(result.events.some(e=>e.kind==='agent'&&e.agent==='evidence'));});
test('compile clones source; original caller data not mutated',()=>{const g=copy();const result=compileNetwork(g);g.tools[0].instructions='changed';assert.notEqual(result.network.getAgentSpec('learner').instructions,'changed');});
for(const [label,mutate,code]of[
 ['duplicate agent',g=>g.tools[1].name='learner','AGENT_NAME'],['missing reference',g=>g.tools[0].tools=['missing'],'REFERENCE'],
 ['external peer disabled',g=>g.tools[0].tools=['https://peer.invalid/agents/checklist'],'REFERENCE'],['MCP descriptor disabled',g=>g.tools[0].tools=[{url:'https://peer.invalid/mcp'}],'TOOLS'],
 ['coded tool disabled',g=>g.tools[1].class='DoAnything','UNSUPPORTED_FIELD'],['REST disabled',g=>g.tools[1].toolbox='requests_get','UNSUPPORTED_FIELD'],
 ['cyclic graph',g=>g.tools[1].tools=['learner'],'CYCLE'],['invalid invocation schema',g=>g.tools[1].function.parameters={type:'object'},'SCHEMA'],
 ['loose invocation fields',g=>g.tools[1].function.parameters.additionalProperties=true,'SCHEMA'],['unsupported schema keyword',g=>g.tools[1].function.parameters.oneOf=[],'SCHEMA'],
 ['model steps unbounded',g=>g.max_steps=999,'STEPS'],['missing public instructions',g=>g.tools[1].instructions='','INSTRUCTIONS'],
 ['unsafe data key',g=>g.metadata=JSON.parse('{"description":"x","__proto__":{}}'),'NETWORK_DATA'],['publisher local includes',g=>g.include='private.conf','UNSUPPORTED_FIELD']
])test(label+' rejected before any model call',async()=>{const g=copy();mutate(g);let calls=0;await assert.rejects(run({definition:g,model:{mode:'scripted-test',chat(){calls++;}}}),e=>e.code===code);assert.equal(calls,0);});
test('wrong explicit front fails closed',()=>assert.throws(()=>compileNetwork(copy(),{frontMan:'evidence'}),e=>e.code==='FRONT'));
test('overdepth fails before execution',()=>assert.throws(()=>compileNetwork(copy(),{limits:{maxDepth:1}}),e=>e.code==='DEPTH'));
test('oversized graph rejected',()=>{const g=copy();g.metadata.description='x'.repeat(70000);assert.throws(()=>compileNetwork(g),e=>e.code==='NETWORK_SIZE');});
test('circular JS data rejected',()=>{const g=copy();g.metadata.self=g;assert.throws(()=>compileNetwork(g),e=>e.code==='NETWORK_DATA');});
test('limits cannot be widened or made nonfinite',()=>{for(const limits of [{timeoutMs:Infinity},{maxAgents:13},{maxDepth:0},{concurrency:3},{unknown:1}])assert.throws(()=>executionLimits(limits),e=>e.code==='LIMIT_CONFIG');});
test('missing adapter never silently falls back to mock',async()=>assert.rejects(run({model:undefined}),e=>e.code==='MODEL_UNAVAILABLE'));
test('pre-aborted run makes no model calls',async()=>{const controller=new AbortController();controller.abort();let calls=0;await assert.rejects(run({signal:controller.signal,model:{mode:'scripted-test',chat(){calls++;}}}));assert.equal(calls,0);});
test('timeout terminates a non-cooperating model',async()=>{const start=Date.now();await assert.rejects(run({limits:{timeoutMs:20},model:{mode:'scripted-test',chat:()=>new Promise(()=>{})}}),e=>e.code==='TIMEOUT');assert.ok(Date.now()-start<1000);});
test('mid-run cancellation terminates a non-cooperating model',async()=>{const controller=new AbortController();const job=run({signal:controller.signal,model:{mode:'scripted-test',chat:()=>new Promise(()=>{})}});setTimeout(()=>controller.abort(),10);await assert.rejects(job);});
test('model-call budget stops delegation, no final success claimed',async()=>assert.rejects(run({limits:{maxModelCalls:1}})));
test('agent budget stop is not treated as completed answer',async()=>assert.rejects(run({limits:{maxAgents:1}}),e=>['AGENT_LIMIT','MODEL_LIMIT'].includes(e.code)));
test('repeated runs may invoke the same agent normally',async()=>{await run();await run();});
for(const [label,response,code]of[
 ['unknown call',{content:'',toolCalls:[{id:'1',type:'function',function:{name:'not_available',arguments:'{}'}}]},'TOOL_UNAVAILABLE'],
 ['malformed arguments',{content:'',toolCalls:[{id:'1',type:'function',function:{name:'evidence',arguments:'not JSON'}}]},'ARGUMENTS'],
 ['invalid argument schema',{content:'',toolCalls:[{id:'1',type:'function',function:{name:'evidence',arguments:'{"request":12}'}}]},'ARGUMENTS'],
 ['extra arguments',{content:'',toolCalls:[{id:'1',type:'function',function:{name:'evidence',arguments:'{"request":"x","secret":"synthetic-canary"}'}}]},'ARGUMENTS'],
 ['malformed response',{toolCalls:[]},'MODEL_RESPONSE']
])test(label+' is rejected',async()=>assert.rejects(run({model:{mode:'scripted-test',chat:async()=>response}}),e=>e.code===code));
test('output ceiling is enforced',async()=>assert.rejects(run({limits:{maxOutputChars:5},model:{mode:'scripted-test',chat:async()=>({content:'too long',toolCalls:[]})}}),e=>e.code==='OUTPUT_LIMIT'));
test('step exhaustion is incomplete, not successful empty answer',async()=>assert.rejects(run({limits:{maxSteps:1},definition:{...copy(),max_steps:1}}),e=>e.code==='INCOMPLETE'));
test('safe events never expose request, tool arguments or model text',async()=>{const seen=[];await run({request:'synthetic-private-canary',onEvent:e=>seen.push(e)});assert.ok(!JSON.stringify(seen).includes('synthetic-private-canary'));for(const event of seen)assert.ok(Object.keys(event).every(k=>['kind','phase','id','parent','status','agent','tool','network','origin'].includes(k)));});
test('executable JS and nonfinite data are not silently serialized away',()=>{for(const value of [()=>1,Symbol('x'),NaN,undefined]){const g=copy();g.metadata.extra=value;assert.throws(()=>compileNetwork(g),e=>e.code==='NETWORK_DATA');}});
test('parallel child model calls never exceed concurrency two',async()=>{
 const g=copy();const helper=structuredClone(g.tools[1]);helper.name='evidence2';g.tools.push(helper);g.tools[0].tools.push('evidence2');let active=0,peak=0;
 const model={mode:'scripted-test',async chat({tools,messages}){
  if(tools.length&&!messages.some(m=>m.role==='tool'))return {content:'',toolCalls:tools.map((t,i)=>({id:String(i),type:'function',function:{name:t.function.name,arguments:'{"request":"x"}'}}))};
  active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,15));active--;return {content:'Fixture completed.',toolCalls:[]};
 }};
 const result=await run({definition:g,model});assert.equal(result.agentCalls,3);assert.equal(peak,2);
});
test('adapter failures are sanitized and viewer errors do not control execution',async()=>{await assert.rejects(run({model:{mode:'scripted-test',chat:async()=>{throw Error('synthetic-secret');}}}),e=>e.code==='RUN_FAILED'&&!e.message.includes('synthetic-secret'));await run({onEvent:()=>{throw Error('viewer failed');}});});
test('data accessors and toJSON callbacks never execute during compilation',()=>{let calls=0;const g=copy();Object.defineProperty(g.metadata,'extra',{enumerable:true,get(){calls++;return 'unsafe';}});assert.throws(()=>compileNetwork(g),e=>e.code==='NETWORK_DATA');assert.equal(calls,0);const h=copy();h.metadata.toJSON=()=>{calls++;return {description:'hidden conversion'};};assert.throws(()=>compileNetwork(h),e=>e.code==='NETWORK_DATA');assert.equal(calls,0);});
test('nonplain and deeply nested publication data is rejected',()=>{const g=copy();g.metadata.extra=new Date();assert.throws(()=>compileNetwork(g),e=>e.code==='NETWORK_DATA');const h=copy();let cursor=h.metadata;for(let i=0;i<25;i++){cursor.more={};cursor=cursor.more;}assert.throws(()=>compileNetwork(h),e=>e.code==='NETWORK_DATA');});

test('stopped run reports safe actual model counts and stable limit reason without answer text',async()=>{await assert.rejects(run({request:'PRIVATE_REQUEST_CANARY',limits:{maxModelCalls:1}}),e=>{assert.equal(e.code,'MODEL_LIMIT');assert.deepEqual(e.diagnostics,{agentCalls:2,modelCalls:1,completedModelCalls:1,remoteCalls:0,maxAgents:12,maxModelCalls:1,reason:'MODEL_LIMIT'});assert.doesNotMatch(JSON.stringify(e),/PRIVATE_REQUEST_CANARY/);return true;});});
test('noncooperating provider cancellation reports started but not completed call',async()=>{const c=new AbortController();let begin;const started=new Promise(r=>begin=r);const job=run({signal:c.signal,model:{mode:'scripted-test',chat(){begin();return new Promise(()=>{});}}});await started;c.abort();await assert.rejects(job,e=>e.code==='CANCELLED'&&e.diagnostics.modelCalls===1&&e.diagnostics.completedModelCalls===0);});

test('typed provider quota failure survives vendor child error handling without leaking messages',async()=>{const {InferenceError}=await import('../../sutra-inference/protocol.js');const scripted=createScriptedModel();let calls=0;await assert.rejects(run({model:{mode:'provider',approvedModel:'synthetic-provider',chat(args){if(++calls===2)throw new InferenceError('QUOTA');return scripted.chat(args);}}}),e=>e.code==='PROVIDER_QUOTA'&&e.diagnostics.modelCalls===2&&e.diagnostics.completedModelCalls===1);assert.equal(calls,2);});

test('aggregate graph budget stops shared DAG expansion and oversized primitive strings before serialization',()=>{
 const g=copy();let dag={leaf:'1234567890'};for(let i=0;i<19;i++)dag={left:dag,right:dag};
 g.metadata.extra=dag;assert.throws(()=>compileNetwork(g),e=>e.code==='NETWORK_SIZE');
 const oversized=copy();oversized.metadata.description='🧪'.repeat(30000);assert.throws(()=>compileNetwork(oversized),e=>e.code==='NETWORK_SIZE');
});
test('sparse arrays, inherited conversion hooks and coercible network identities are refused without execution',()=>{
 let touched=0;const g=copy();const array=[];array.length=100;g.metadata.extra=array;
 assert.throws(()=>compileNetwork(g),e=>e.code==='NETWORK_DATA');
 class Hostile extends Array{toJSON(){touched++;return [];}}
 const h=copy();h.metadata.extra=new Hostile();assert.throws(()=>compileNetwork(h),e=>e.code==='NETWORK_DATA');
 const identity={toString(){touched++;return 'learner';}};assert.throws(()=>compileNetwork(copy(),{name:identity}),e=>e.code==='NETWORK_ID');
 const limits={};Object.defineProperty(limits,'maxDepth',{enumerable:true,get(){touched++;return 3;}});assert.throws(()=>executionLimits(limits),e=>e.code==='LIMIT_CONFIG');
 assert.equal(touched,0);
});
