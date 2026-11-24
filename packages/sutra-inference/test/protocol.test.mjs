import test from 'node:test';import assert from 'node:assert/strict';
import {createProviderAdapter} from '../client.js';import {makeAccumulator,readSse,sanitizeChunk} from '../protocol.js';
const chunk=(delta={},finish_reason=null)=>({choices:[{index:0,delta,finish_reason}]});
const sse=(items,done=true)=>new Response(items.map(x=>`data: ${JSON.stringify(x)}\n\n`).join('')+(done?'data: [DONE]\n\n':''),{headers:{'Content-Type':'text/event-stream'}});
test('complete content and usage; unknown fields discarded',async()=>{const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',fetchImpl:async(url,options)=>{assert.equal(url,'https://sutra.test/api/v1/chat/completions');assert.equal(options.headers.Authorization,undefined);assert.equal(JSON.parse(options.body).model,'approved');return sse([{...chunk({content:'hello'}),secret:'not public'},chunk({},'stop'),{choices:[],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3}}]);}});assert.deepEqual(await adapter.chat({messages:[]}),{content:'hello',toolCalls:[],finishReason:'stop',usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3}});assert.equal(JSON.stringify(sanitizeChunk({...chunk(),secret:'marker'})).includes('marker'),false);});
test('fragmented tool calls reassemble exact data',()=>{const a=makeAccumulator();a.accept(chunk({tool_calls:[{index:0,id:'call1',type:'function',function:{name:'read_',arguments:'{"cue'}}]}));a.accept(chunk({tool_calls:[{index:0,function:{name:'cue',arguments:'Id":"one"}'}}]},'tool_calls'));assert.equal(a.finish().toolCalls[0].function.arguments,'{"cueId":"one"}');});
for(const reason of ['length','content_filter',null])test(`finish ${reason} cannot establish complete result`,()=>{const a=makeAccumulator();a.accept(chunk({content:'partial'},reason));assert.throws(()=>a.finish(),/INCOMPLETE_RESULT/);});
test('missing DONE and provider errors reject partial content',async()=>{for(const response of [sse([chunk({content:'partial'}),chunk({},'stop')],false),sse([{error:{message:'private'}}])]){const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',fetchImpl:async()=>response});await assert.rejects(adapter.chat({messages:[]}),e=>!e.message.includes('private'));}});
test('fragmented bytes including UTF8 survive',async()=>{const raw=new TextEncoder().encode('data: '+JSON.stringify(chunk({content:'नेपाली'}))+'\r\n\r\ndata: '+JSON.stringify(chunk({},'stop'))+'\n\ndata: [DONE]\n\n');const response=new Response(new ReadableStream({start(c){for(const b of raw)c.enqueue(new Uint8Array([b]));c.close();}}));const a=makeAccumulator();for await(const x of readSse(response)){if(x.done)assert.equal(a.finish().content,'नेपाली');else a.accept(x.data);}});
test('byte ceiling and malformed lines fail',async()=>{for(const [response,options]of [[new Response('x'.repeat(100)),{maxBytes:10}],[new Response('garbage\n'),{}],[new Response('data: invalid\n'),{}]])await assert.rejects(async()=>{for await(const x of readSse(response,options))void x;});});
test('client aborts stalled fetch and stalled stream',async()=>{for(const fetchImpl of [()=>new Promise(()=>{}),async()=>new Response(new ReadableStream({start(){}}),{headers:{'Content-Type':'text/event-stream'}})]){const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',timeoutMs:15,fetchImpl});await assert.rejects(adapter.chat({messages:[]}),/CANCELLED/);}});
test('HTTP errors are sanitized; no insecure remote endpoint',async()=>{for(const status of [429,503,500]){const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',fetchImpl:async()=>new Response('private-key',{status})});await assert.rejects(adapter.chat({messages:[]}),e=>!e.message.includes('private-key'));}for(const origin of ['http://remote.test','https://sutra.test/path','https://user:pass@sutra.test'])assert.throws(()=>createProviderAdapter({origin,model:'approved'}),/CONFIG/);});
test('post-finish mutation, bad tool arguments, duplicate IDs and sparse indices fail',()=>{const a=makeAccumulator();a.accept(chunk({},'stop'));assert.throws(()=>a.accept(chunk({content:'late'})));for(const tool_calls of [[{index:1,id:'x',function:{name:'read',arguments:'{}'}}],[{index:0,id:'x',function:{name:'read',arguments:'{}'}},{index:1,id:'x',function:{name:'read',arguments:'{}'}}],[{index:0,id:'x',function:{name:'read',arguments:'[]'}}]]){const a=makeAccumulator();a.accept(chunk({tool_calls},'tool_calls'));assert.throws(()=>a.finish());}});

test('a terminal reason is immutable, including unsuccessful finishes followed by an empty stop frame',()=>{
 for(const reason of ['length','content_filter','stop','tool_calls']){
  const a=makeAccumulator();a.accept(chunk({content:'partial'},reason));
  assert.throws(()=>a.accept(chunk({},'stop')),/AFTER_FINISH/);
 }
 const a=makeAccumulator();a.accept(chunk({content:'complete'},'stop'));a.finish();
 assert.throws(()=>a.finish(),/AFTER_FINISH/);
 assert.throws(()=>a.accept({choices:[]}),/AFTER_FINISH/);
});
test('token usage is consistent and cannot be emitted early or replaced after completion',()=>{
 const usage={choices:[],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12}};
 const early=makeAccumulator();assert.throws(()=>early.accept(usage),/USAGE_SEQUENCE/);
 const duplicate=makeAccumulator();duplicate.accept(chunk({},'stop'));duplicate.accept(usage);
 assert.throws(()=>duplicate.accept(usage),/USAGE_SEQUENCE/);
 const bad=makeAccumulator();bad.accept(chunk({},'stop'));
 assert.throws(()=>bad.accept({choices:[],usage:{...usage.usage,total_tokens:11}}),/USAGE_INCONSISTENT/);
 const final=makeAccumulator();final.accept({...chunk({content:'complete'},'stop'),usage:usage.usage});
 assert.deepEqual(final.finish().usage,usage.usage);
});

test('exact SSE provider endpoint rejects substituted 200, partial success and fake content type',async()=>{
 const url='https://sutra.test/api/v1/chat/completions',valid='data: '+JSON.stringify(chunk({content:'fake successful model output'},'stop'))+'\n\ndata: [DONE]\n\n';
 for(const response of [
  Object.defineProperty(new Response(valid,{headers:{'Content-Type':'text/event-stream'}}),'url',{value:'https://sutra.test/api/other'}),
  new Response(valid,{status:206,headers:{'Content-Type':'text/event-stream'}}),
  new Response(valid,{headers:{'Content-Type':'text/html; text/event-stream'}}),
  new Response(valid,{headers:{'Content-Type':'text/event-stream','Content-Range':'bytes 0-5/6'}})
 ]){
  let count=0;
  const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',fetchImpl:async(target,opts)=>{
   count++;assert.equal(target,url);assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');return response;
  }});
  await assert.rejects(adapter.chat({messages:[]}),e=>['STREAM_TYPE','TRANSPORT'].includes(e.code));
  assert.equal(count,1);assert.equal(response.body.locked,false);
 }
});
test('noncooperating SSE transport returning after cancellation disposes its unread body',async()=>{
 let started=false,release,cancelled=0;
 const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',timeoutMs:25,fetchImpl:()=>{started=true;return new Promise(resolve=>{release=resolve;});}});
 const pending=adapter.chat({messages:[]});
 for(let i=0;i<100&&!started;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(started,true);
 await assert.rejects(pending,e=>e.code==='CANCELLED');
 const response=new Response(new ReadableStream({cancel(){cancelled++;}}),{headers:{'Content-Type':'text/event-stream'}});
 release(response);
 for(let i=0;i<100&&!cancelled;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(cancelled,1);assert.equal(response.body.locked,false);
});
test('provider error bodies do not remain live and no response content is surfaced in errors',async()=>{
 for(const status of [429,503,500]){
  let cancelled=0;const response=new Response(new ReadableStream({cancel(){cancelled++;}}),{status,headers:{'Content-Type':'text/event-stream'}});
  const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',fetchImpl:async()=>response});
  await assert.rejects(adapter.chat({messages:[]}));
  assert.equal(cancelled,1);assert.equal(response.body.locked,false);
 }
});

test('provider cancellation at response ownership handoff disposes the stream without parsing it',async()=>{
 for(const depth of [1,2,3]){
  const abort=new AbortController();let disposed=0;
  const response=new Response(new ReadableStream({cancel(){disposed++;}}),{headers:{'Content-Type':'text/event-stream'}});
  const later=n=>n===0?abort.abort():queueMicrotask(()=>later(n-1));
  const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',fetchImpl:()=>{later(depth);return response;}});
  await assert.rejects(adapter.chat({messages:[],signal:abort.signal}),e=>e.code==='CANCELLED');
  for(let i=0;i<20&&!disposed;i++)await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(disposed,1,'each rejected response body is disposed exactly once');assert.equal(response.body.locked,false);
 }
});

test('cancellation while SSE generator is suspended between buffered lines prevents late DONE',async()=>{
 const abort=new AbortController(),response=sse([chunk({content:'first'}),chunk({},'stop')]);
 const iterator=readSse(response,{signal:abort.signal});
 assert.deepEqual((await iterator.next()).value,{data:chunk({content:'first'})});
 abort.abort();
 await assert.rejects(iterator.next(),e=>e.code==='CANCELLED');
 assert.equal(response.body.locked,false);
});
test('SSE complete lines obey the same limit as fragmented lines and reject non-byte chunks',async()=>{
 for(const response of [
  new Response('data: '+JSON.stringify({...chunk({content:'ok'},'stop'),ignored:'x'.repeat(33000)})+'\n\ndata: [DONE]\n\n'),
  new Response(new ReadableStream({start(c){c.enqueue('not a Uint8Array');c.close();}}))
 ]){
  await assert.rejects(async()=>{for await(const frame of readSse(response))void frame;},e=>['STREAM_SIZE','STREAM_ENCODING'].includes(e.code));
  assert.equal(response.body.locked,false);
 }
});

test('only a fully delimited SSE event can terminate a successful chat',async()=>{
 const complete='data: '+JSON.stringify(chunk({content:'hello'},'stop'))+'\n\n';
 for(const suffix of ['data: [DONE]','data: [DONE]\n','event: error\ndata: [DONE]\n\n','data: [DONE]\nnot-a-field: ignored\n\n']){
  const response=new Response(complete+suffix,{headers:{'Content-Type':'text/event-stream'}});
  const adapter=createProviderAdapter({origin:'https://sutra.test',model:'approved',fetchImpl:()=>response});
  await assert.rejects(adapter.chat({messages:[]}),e=>['INCOMPLETE_STREAM','STREAM_EVENT','STREAM_FORMAT'].includes(e.code));
  assert.equal(response.body.locked,false);
 }
});
test('SSE uses true event framing with split CRLF, CR-only lines, multiline JSON and ignored resume metadata',async()=>{
 const text=': ping\r\nid: opaque\r\nretry: 1\r\nevent: message\r\ndata: {"choices":[\r\ndata: {"index":0,"delta":{"content":"नेपाली"},"finish_reason":"stop"}]}\r\n\r\ndata: [DONE]\r\r';
 const bytes=new TextEncoder().encode(text);
 const response=new Response(new ReadableStream({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b]));c.close();}}));
 const a=makeAccumulator();let complete;
 for await(const x of readSse(response)){if(x.done)complete=a.finish();else a.accept(x.data);}
 assert.equal(complete.content,'नेपाली');assert.equal(response.body.locked,false);
});
test('SSE event aggregate bound cannot be bypassed by many small data fields',async()=>{
 const text=Array.from({length:120},()=>'data: '+'x'.repeat(300)+'\n').join('')+'\n';
 const response=new Response(text);
 await assert.rejects(async()=>{for await(const x of readSse(response))void x;},e=>e.code==='STREAM_SIZE');
 assert.equal(response.body.locked,false);
});
