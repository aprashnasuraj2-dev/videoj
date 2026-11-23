import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenRouterByokAdapter,OPENROUTER_CHAT_URL,OPENROUTER_ORIGIN} from '../byok.js';

const stream=parts=>new Response(new ReadableStream({start(controller){for(const part of parts)controller.enqueue(new TextEncoder().encode(part));controller.close();}}),{status:200,headers:{'Content-Type':'text/event-stream'}});
const ok=()=>stream([
 'data: {"choices":[{"index":0,"delta":{"content":"fixture"},"finish_reason":"stop"}]}\n',
 'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n',
 'data: [DONE]\n\n'
]);
test('BYOK sends the key only as Authorization to the fixed router and exposes no secret property',async()=>{
 const key='synthetic-byok-canary-123456',seen=[];const adapter=createOpenRouterByokAdapter({key,model:'openrouter/free',fetchImpl:async(url,options)=>{seen.push({url,options});return ok();}});
 assert.equal(adapter.mode,'provider');assert.equal(adapter.routerOrigin,OPENROUTER_ORIGIN);assert.equal(adapter.model,'openrouter/free');assert.equal(Object.hasOwn(adapter,'key'),false);assert.equal(JSON.stringify(adapter).includes(key),false);
 const result=await adapter.chat({messages:[{role:'user',content:'hello'}],tools:[]});assert.equal(result.content,'fixture');assert.equal(seen.length,1);
 const {url,options}=seen[0];assert.equal(url,OPENROUTER_CHAT_URL);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.headers.Authorization,'Bearer '+key);
 assert.equal(options.headers['HTTP-Referer'],undefined);assert.equal(options.headers['X-Title'],undefined);const body=JSON.parse(options.body);assert.equal(body.model,'openrouter/free');assert.equal(body.stream,true);
});
test('clearing BYOK destroys the in-memory credential and prevents later transport',async()=>{
 let calls=0;const adapter=createOpenRouterByokAdapter({key:'synthetic-key-123',model:'openrouter/free',fetchImpl:async()=>{calls++;return ok();}});
 assert.equal(adapter.configured(),true);adapter.clear();assert.equal(adapter.configured(),false);
 await assert.rejects(adapter.chat({messages:[{role:'user',content:'x'}]}),e=>e.code==='BYOK_KEY_MISSING');assert.equal(calls,0);
});
test('BYOK HTTP and transport failures are sanitized without echoing key or response bodies',async()=>{
 const key='synthetic-secret-canary';
 for(const [status,code] of [[401,'BYOK_AUTH'],[402,'BYOK_CREDIT'],[429,'BYOK_QUOTA'],[500,'BYOK_REQUEST_REJECTED']]){
  const adapter=createOpenRouterByokAdapter({key,model:'openrouter/free',fetchImpl:async()=>new Response('provider-secret-body',{status})});
  await assert.rejects(adapter.chat({messages:[{role:'user',content:'x'}]}),e=>e.code===code&&!e.message.includes(key)&&!e.message.includes('provider-secret-body'));
 }
});
test('BYOK rejects invalid secret/model configuration before transport',()=>{
 for(const args of [{key:'short',model:'openrouter/free'},{key:'valid-key-123',model:''},{key:'valid key 123',model:'openrouter/free'}])assert.throws(()=>createOpenRouterByokAdapter(args),e=>e.code==='BYOK_CONFIG');
});
