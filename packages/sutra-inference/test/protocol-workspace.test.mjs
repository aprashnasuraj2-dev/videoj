import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtocolWorkspace} from '../protocol-workspace.js';
const A='PROTOCOL_CANARY_ALPHA_123',B='PROTOCOL_CANARY_BETA_456',C='PROTOCOL_CANARY_CUSTOM_789';
const connections=[
 {id:'self-hosted',label:'My model',protocol:'openai-compatible-json',endpoint:'https://models.example.com/v1/chat/completions',transportClass:'hosted',models:['org/custom-1','org/custom-2']},
 {id:'another-api',label:'Other service',protocol:'anthropic-messages-json',endpoint:'https://another.example.com/v1/messages',transportClass:'hosted',models:['private/reasoner']},
 {id:'local-lab',label:'Local lab',protocol:'custom-wire',endpoint:'http://127.0.0.1:12345/infer',transportClass:'local',models:['my-local']}
];
const adapter={id:'custom-wire',encode:({model,operation,maxOutputTokens})=>JSON.stringify({model,operation,limit:maxOutputTokens}),decode:r=>({text:r.answer,outputTokens:r.tokens})};
const limits={maxCalls:10,maxInputBytes:20000,maxOutputTokens:2000,maxConcurrent:3};
const open=(content='ok',tokens=2)=>({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content}}],usage:{prompt_tokens:10,completion_tokens:tokens,total_tokens:10+tokens}});
const anth=()=>({type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:'other'},{type:'text',text:' result'}],usage:{output_tokens:3}});
function setup(exchange,overrides={}){
 let seed=1;
 return createProtocolWorkspace({connections,adapters:[adapter],exchange,globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,...overrides});
}
const profile=(w,i,credential)=>w.addProfile({providerId:connections[i].id,label:'profile '+i,credential});
const call=(w,p,model,operation={kind:'chat',request:'hello'})=>w.execute({handle:p.handle,model,inputBytes:1,maxOutputTokens:32,operation});
test('two built-in wire adapters and a trusted custom adapter share one registry, with actual serialized byte reservations',async()=>{
 const seen=[];const w=setup(async x=>{seen.push(x);return {status:200,bodyText:JSON.stringify(x.connectionId==='self-hosted'?open():x.connectionId==='another-api'?anth():{answer:'local',tokens:1})};});
 const profiles=[profile(w,0,A),profile(w,1,B),profile(w,2,C)];
 const results=await Promise.all([call(w,profiles[0],'org/custom-2'),call(w,profiles[1],'private/reasoner'),call(w,profiles[2],'my-local')]);
 assert.deepEqual(results.map(x=>x.value.text),['ok','other result','local']);
 assert.deepEqual(seen.map(x=>[x.endpoint,x.credential,x.model]),connections.map((c,i)=>[c.endpoint,[A,B,C][i],[connections[0].models[1],connections[1].models[0],connections[2].models[0]][i]]));
 assert.equal(JSON.parse(seen[0].bodyText).model,'org/custom-2');assert.equal(JSON.parse(seen[1].bodyText).messages[0].role,'user');assert.equal(JSON.parse(seen[2].bodyText).limit,32);
 const budget=w.budgetSnapshot().global.used,expected=seen.reduce((n,x)=>n+new TextEncoder().encode(x.bodyText).length,0);
 assert.equal(budget.inputBytes,expected);assert.equal(budget.actualInputBytes,expected);assert.equal(budget.actualOutputTokens,6);
 for(const secret of [A,B,C]){assert.equal(JSON.stringify(results).includes(secret),false);assert.equal(JSON.stringify(seen.map(x=>x.bodyText)).includes(secret),false);}
 assert.equal(JSON.stringify(w.connections).includes('127.0.0.1'),false);
});
test('hosted private and ambiguous endpoints, unknown adapters and model route overrides refuse',async()=>{
 for(const endpoint of ['http://models.example.com/v1/chat','https://127.0.0.1/v1/chat','https://[::1]/v1/chat','https://a.local/v1/chat','https://user@models.example.com/v1/chat','https://models.example.com/v1/chat?key=x','https://models.example.com/v1/%2e%2e/chat','https://models.example.com/v1//chat'])assert.throws(()=>setup(()=>{}, {connections:[{...connections[0],endpoint}]}),/ENDPOINT/);
 assert.throws(()=>setup(()=>{}, {connections:[{...connections[0],protocol:'unknown'}]}),/CONNECTION/);
 let seen=0;const w=setup(async()=>{seen++;return {status:200,bodyText:JSON.stringify(open())};});const p=profile(w,0,A);
 await assert.rejects(call(w,p,'private/reasoner'),/MODEL/);
 const op={kind:'chat'};Object.defineProperty(op,'request',{enumerable:true,get(){throw Error('getter ran');}});
 await assert.rejects(call(w,p,'org/custom-1',op),/OPERATION/);
 await assert.rejects(call(w,p,'org/custom-1',{request:A}),e=>e.code==='SECRET_ECHO');
 assert.equal(seen,0);
});
test('malformed, truncated, tool-bearing or unaccountable provider responses are not published',async()=>{
 const cases=[{status:429,bodyText:'{}'},{status:200,bodyText:'{"choices":[],"choices":[]}'},{status:200,bodyText:JSON.stringify({...open(),usage:{}})},{status:200,bodyText:JSON.stringify(open('too expensive',33))},{status:200,bodyText:JSON.stringify({choices:[{...open().choices[0],finish_reason:'length'}],usage:open().usage})},{status:200,bodyText:JSON.stringify({choices:[{...open().choices[0],message:{role:'assistant',content:'x',tool_calls:[{}]}}],usage:open().usage})},{status:200,bodyText:JSON.stringify(open(A))}];
 for(const response of cases){const w=setup(async()=>response),p=profile(w,0,A);await assert.rejects(call(w,p,'org/custom-1'));assert.equal(w.budgetSnapshot().global.used.calls,1);}
});
test('wire-byte budget prevents understated caller estimate from contacting injected exchange',async()=>{
 let seen=0;const small={maxCalls:2,maxInputBytes:8,maxOutputTokens:100,maxConcurrent:1};
 const w=setup(async()=>{seen++;return {status:200,bodyText:JSON.stringify(open())};},{globalLimits:small,defaultProfileLimits:small});const p=profile(w,0,A);
 await assert.rejects(call(w,p,'org/custom-1'),e=>e.code==='BUDGET');assert.equal(seen,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
});


test('pre-encoding scan refuses another profile secret even when JSON would escape the literal',async()=>{
 const secret='OTHER_"ESCAPED"\\_SECRET_123';let seen=0;
 const w=setup(async()=>{seen++;return {status:200,bodyText:JSON.stringify(open())};});
 const a=profile(w,0,A);profile(w,1,secret);
 await assert.rejects(call(w,a,'org/custom-1',{kind:'chat',request:secret}),e=>e.code==='SECRET_ECHO');
 assert.equal(seen,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
});

test('native Ollama chat has a finite generation limit and refuses nonterminal, tool-bearing or unaccountable output',async()=>{
 const c={id:'native-local',label:'Native local model',protocol:'ollama-chat-json',endpoint:'http://127.0.0.1:11434/api/chat',transportClass:'local',models:['local-model:latest']};
 const valid={done:true,done_reason:'stop',message:{role:'assistant',content:'verified by caller'},eval_count:7,prompt_eval_count:20};
 let wire;const w=setup(async x=>{wire=JSON.parse(x.bodyText);return {status:200,bodyText:JSON.stringify(valid)}},{connections:[c]});
 const p=w.addProfile({providerId:c.id,label:'Local',credential:A});const result=await call(w,p,c.models[0]);
 assert.equal(result.value.text,valid.message.content);assert.deepEqual(wire.options,{num_predict:32});assert.equal(wire.stream,false);assert.equal(wire.model,c.models[0]);assert.equal(wire.messages[0].role,'system');assert.equal(w.budgetSnapshot().global.used.actualOutputTokens,7);
 for(const bad of [{...valid,done:false},{...valid,done_reason:'length'},{...valid,eval_count:undefined},{...valid,eval_count:33},{...valid,prompt_eval_count:-1},{...valid,message:{...valid.message,tool_calls:[{}]}},{...valid,error:'failure'},{...valid,message:{role:'tool',content:'bad'}}]){
  const q=setup(async()=>({status:200,bodyText:JSON.stringify(bad)}),{connections:[c]});const profile=q.addProfile({providerId:c.id,label:'Local',credential:A});await assert.rejects(call(q,profile,c.models[0]));assert.equal(q.budgetSnapshot().global.used.calls,1);
 }
});


test('one generic capability contract spans OpenAI-compatible, local Ollama and a future custom adapter without discovery contact',async()=>{
 const future={id:'future-wire',encode:({model,operation,maxOutputTokens})=>JSON.stringify({model,payload:operation,limit:maxOutputTokens}),decode:r=>({text:r.text,outputTokens:r.tokens})};
 const conns=[
  {id:'hosted-open',label:'Hosted compatible',protocol:'openai-compatible-json',endpoint:'https://hosted.example.com/v1/chat/completions',transportClass:'hosted',models:['hosted/model'],capabilities:{'hosted/model':['text.generate','structured.output']}},
  {id:'local-ollama',label:'Local BYOM',protocol:'ollama-chat-json',endpoint:'http://127.0.0.1:11434/api/chat',transportClass:'local',models:['local/model'],capabilities:{'local/model':['text.generate']}},
  {id:'future-adapter',label:'Future adapter',protocol:'future-wire',endpoint:'https://future.example.com/infer',transportClass:'hosted',models:['future/model'],capabilities:{'future/model':['text.generate']}}
 ];
 let seed=40,contacts=0;
 const w=createProtocolWorkspace({connections:conns,adapters:[future],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,exchange:async x=>{contacts++;throw Error('negotiation must not contact '+x.connectionId);}});
 const profiles=[
  w.addProfile({providerId:'hosted-open',label:'Hosted',credential:'HOSTED_CAPABILITY_SECRET_123'}),
  w.addProfile({providerId:'local-ollama',label:'Local',credential:'LOCAL_CAPABILITY_SECRET_456'}),
  w.addProfile({providerId:'future-adapter',label:'Future',credential:'FUTURE_CAPABILITY_SECRET_789'})
 ];
 for(let i=0;i<profiles.length;i++){
  const model=conns[i].models[0],n=w.negotiateCapabilities({handle:profiles[i].handle,model,required:['text.generate']});
  assert.equal(n.model,model);assert.equal(n.authority,'HOST_DECLARED_UNVERIFIED');assert.ok(n.declared.includes('text.generate'));
 }
 assert.throws(()=>w.negotiateCapabilities({handle:profiles[1].handle,model:'local/model',required:['structured.output']}),e=>e.code==='CAPABILITY_MISSING');
 assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
 assert.ok(w.connections.every(x=>!('endpoint' in x)));assert.equal(JSON.stringify(w.connections).includes('SECRET'),false);
});
