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
 const g=copy();let dag={leaf:'1234567890'};for(let i=0;i<16;i++)dag={left:dag,right:dag};
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

test('adapter result accessors and unbounded extras never execute or enter the runner',async()=>{
 let touched=0;const getter={toolCalls:[]};Object.defineProperty(getter,'content',{enumerable:true,get(){touched++;return 'untrusted';}});
 const sparse={content:'',toolCalls:new Array(1)};const giant={content:'',toolCalls:[],extra:'x'.repeat(131073)};
 for(const response of [getter,sparse,giant])await assert.rejects(run({model:{mode:'scripted-test',chat:async()=>response}}),e=>e.code==='MODEL_RESPONSE'&&e.diagnostics.completedModelCalls===0);
 assert.equal(touched,0);
});

test('viewer cannot mutate canonical trace entries or append unapproved private fields',async()=>{
 const seen=[];
 const result=await run({onEvent:event=>{
  seen.push(event);
  Reflect.set(event,'kind','forged');
  Reflect.set(event,'privateCanary','PRIVATE_TRACE_CANARY');
  Reflect.deleteProperty(event,'phase');
 }});
 assert.ok(seen.length>0);
 assert.ok(seen.every(Object.isFrozen));
 assert.deepEqual(result.events,seen);
 assert.ok(result.events.every(e=>e.kind!=='forged'&&typeof e.phase==='string'));
 assert.doesNotMatch(JSON.stringify(result.events),/PRIVATE_TRACE_CANARY/);
 assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,3);
});
test('settled cancelled run never emits additional viewer trace events after noncooperative model resolution',async()=>{
 const controller=new AbortController(),seen=[];let release,started;
 const begun=new Promise(resolve=>{started=resolve;});
 const pending=run({signal:controller.signal,onEvent:e=>seen.push(e),model:{mode:'scripted-test',chat(){started();return new Promise(resolve=>{release=resolve;});}}});
 await begun;controller.abort();
 await assert.rejects(pending,e=>e.code==='CANCELLED');
 const count=seen.length;
 release({content:'late private result',toolCalls:[]});
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(seen.length,count);assert.doesNotMatch(JSON.stringify(seen),/late private result/);
});
test('host adapter mode, model identity and dispatch function are pinned for one run despite viewer mutation',async()=>{
 const model=createScriptedModel(),original=model.chat;let originalCalls=0,replacementCalls=0;
 model.chat=function(args){assert.equal(this,model);assert.equal(args.model,'mock-1');originalCalls++;return original.call(this,args);};
 const result=await run({model,onEvent:()=>{
  model.mode='provider';model.approvedModel='unapproved-provider';
  model.chat=async()=>{replacementCalls++;return {content:'forged provider result',toolCalls:[]};};
 }});
 assert.equal(result.mode,'scripted-test');assert.equal(result.modelCalls,3);
 assert.equal(originalCalls,3);assert.equal(replacementCalls,0);assert.match(result.text,/No live AI/);
});

test('tool namespace collisions are refused before model, discovery or peer contact',async()=>{
 const cases=[
  {refs:['https://one.example/agents/transit','https://two.example/agents/transit']},
  {refs:['https://one.example/agents/a-b/transit','https://one.example/agents/a_b/transit']},
  {refs:['https://one.example/'+('x'.repeat(61))+'/one','https://one.example/'+('x'.repeat(61))+'/two']},
  {refs:['agents_transit','https://one.example/agents/transit'],local:'agents_transit'},
  {refs:['mcp_read_cue',{url:'/api/source-tools'}],local:'mcp_read_cue',source:true},
  {refs:['mcp_read_public',{url:'https://read-only.example/mcp'}],local:'mcp_read_public',external:true}
 ];
 for(const fixture of cases){
  const g=copy();g.tools[0].tools=fixture.refs;
  if(fixture.local)g.tools[1].name=fixture.local;
  let models=0,contacts=0,decisions=0;
  const inspector={perform(){decisions++;throw Error('must not contact');}};
  await assert.rejects(run({definition:g,model:{mode:'scripted-test',chat(){models++;}},
   peerRuntime:{inspector,fetchImpl(){contacts++;}},
   ...(fixture.source?{sourceTools:{origin:'https://sutra.test',sources:[]}}:{}),
   ...(fixture.external?{thirdPartyMcp:{url:'https://read-only.example/mcp',inspector,fetchImpl(){contacts++;}}}:{})
  }),e=>e.code==='TOOL_NAME_COLLISION');
  assert.equal(models,0);assert.equal(contacts,0);assert.equal(decisions,0);
 }
});
test('adapter cannot weaken canonical tool argument schema by mutating the offered copy',async()=>{
 let calls=0;
 await assert.rejects(run({model:{mode:'scripted-test',async chat({tools}){
  calls++;
  tools[0].function.parameters.properties.request.type='integer';
  return {content:'',toolCalls:[{id:'forged',type:'function',function:{name:'evidence',arguments:'{"request":12}'}}]};
 }}}),e=>e.code==='ARGUMENTS'&&e.diagnostics.completedModelCalls===0);
 assert.equal(calls,1);
});
test('adapter-local history and tool transformations cannot pollute subsequent canonical dispatch',async()=>{
 const base=createScriptedModel();let calls=0;
 const result=await run({model:{mode:'scripted-test',async chat(args){
  calls++;
  assert.doesNotMatch(JSON.stringify(args.messages),/ADAPTER_MUTATION_CANARY/);
  assert.doesNotMatch(JSON.stringify(args.tools),/ADAPTER_MUTATION_CANARY/);
  const response=await base.chat(args);
  args.messages[0].content='ADAPTER_MUTATION_CANARY';
  args.messages.push({role:'tool',content:'ADAPTER_MUTATION_CANARY'});
  if(args.tools.length){args.tools[0].function.name='ADAPTER_MUTATION_CANARY';args.tools.length=0;}
  return response;
 }}});
 assert.equal(calls,3);assert.equal(result.modelCalls,3);assert.match(result.text,/No live AI/);
});

test('empty child result from step exhaustion aborts before parent synthesis',async()=>{
 const g=copy();const leaf=structuredClone(g.tools[1]);leaf.name='leaf';leaf.tools=[];
 g.tools[1].tools=['leaf'];g.tools[1].max_steps=1;g.tools.push(leaf);
 const base=createScriptedModel();let calls=0;
 await assert.rejects(run({definition:g,model:{mode:'scripted-test',chat(args){calls++;return base.chat(args);}}}),e=>e.code==='INCOMPLETE'&&e.diagnostics.modelCalls===3);
 assert.equal(calls,3,'parent must not make a synthesis call after child exhaustion');
});
test('whitespace or presentation-only child text cannot become a completed parent answer',async()=>{
 for(const content of ['   ','```cruse-ui\n{"version":1,"components":[]}\n```']){
  const base=createScriptedModel();let calls=0;
  await assert.rejects(run({model:{mode:'scripted-test',chat(args){
   calls++;return args.tools.length?base.chat(args):{content,toolCalls:[]};
  }}}),e=>e.code==='INCOMPLETE'&&e.diagnostics.modelCalls===2);
  assert.equal(calls,2);
 }
});
test('agent budget exhaustion stops before an extra synthesis call',async()=>{
 let calls=0;const base=createScriptedModel();
 await assert.rejects(run({limits:{maxAgents:1},model:{mode:'scripted-test',chat(args){calls++;return base.chat(args);}}}),e=>e.code==='AGENT_LIMIT'&&e.diagnostics.modelCalls===1);
 assert.equal(calls,1);
});
