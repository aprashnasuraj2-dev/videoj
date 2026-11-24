import test from 'node:test';import assert from 'node:assert/strict';
import {inferenceBackend,inferenceStatus,handleInference,UPSTREAM} from '../inference.js';
import worker from '../worker.js';
const url='https://operator-gateway.example/v1/chat/completions';
const env={
 SUTRA_ENABLE_INFERENCE:'true',SUTRA_INFERENCE_BACKEND:'self_hosted',SUTRA_SELF_HOSTED_UPSTREAM_URL:url,SUTRA_SELF_HOSTED_TOKEN:'PRIVATE_GATEWAY_TEST_SECRET',
 SUTRA_ALLOWED_ORIGIN:'https://sutra.test',SUTRA_MODELS:'local-tool-model',SUTRA_CLIENT_HASH_SECRET:'x'.repeat(32),
 SUTRA_MAX_OUTPUT_TOKENS:'256',SUTRA_MAX_DAILY_CALLS:'10',SUTRA_MAX_CLIENT_CALLS:'2',SUTRA_MAX_CONCURRENT:'2',
 SUTRA_QUOTA:{idFromName:()=> 'global',get:()=>({fetch:async req=>new URL(req).pathname==='/release'?Response.json({released:true}):Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000001'})})}
};
const req=(body={model:'local-tool-model',messages:[{role:'user',content:'Where is the source cue?'}],stream:true,tools:[]})=>new Request('https://sutra.test/api/v1/chat/completions',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify(body)});
const sse=()=>new Response('data: {"choices":[{"index":0,"delta":{"content":"Unverified local inference, cite the source."},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":8,"total_tokens":20}}\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
test('self-hosted endpoint is opt-in; hosted never falls back implicitly',()=>{
 assert.equal(inferenceStatus({...env,SUTRA_INFERENCE_BACKEND:undefined}),false);
 assert.equal(inferenceStatus({...env,SUTRA_INFERENCE_BACKEND:'hosted'}),false);
 assert.equal(inferenceStatus({...env,SUTRA_SELF_HOSTED_TOKEN:undefined}),false);
 assert.equal(inferenceStatus(env),true);
 assert.equal(inferenceBackend(env).url,url);
 for(const bad of ['http://operator-gateway.example/v1/chat/completions','https://127.0.0.1/v1/chat/completions','https://localhost/v1/chat/completions','https://internal.local/v1/chat/completions','https://operator-gateway.example@internal.local/v1/chat/completions','https://operator-gateway.example/v1/chat/completions?x=1','https://operator-gateway.example/v1/chat/completions/','https://operator-gateway.example:8443/v1/chat/completions']){
  assert.equal(inferenceBackend({...env,SUTRA_SELF_HOSTED_UPSTREAM_URL:bad}),null,bad);
 }
});
test('self-hosted status reveals backend but never the gateway, token or internal route',async()=>{
 const response=await worker.fetch(new Request('https://sutra.test/api/status'),env);
 const data=await response.json();assert.equal(data.inference,'configured');assert.equal(data.backend,'self_hosted');
 assert.equal(data.model,'local-tool-model');assert.equal(data.byok,false);
 assert.ok(!JSON.stringify(data).includes('PRIVATE_GATEWAY_TEST_SECRET'));
 assert.ok(!JSON.stringify(data).includes('operator-gateway.example'));
});
test('self-hosted streaming uses only approved TLS gateway and server-owned bearer token with bounded usage',async()=>{
 let upstream=0,body=null,auth='',requestedUrl='';
 const response=await handleInference(req(),env,{fetchImpl:async(u,opts)=>{upstream++;requestedUrl=u;auth=opts.headers.Authorization;body=JSON.parse(opts.body);return sse();}});
 assert.equal(response.status,200);assert.equal(upstream,1);assert.equal(requestedUrl,url);
 assert.equal(auth,'Bearer PRIVATE_GATEWAY_TEST_SECRET');assert.equal(body.model,'local-tool-model');assert.equal(body.max_tokens,256);
 assert.equal(body.max_completion_tokens,undefined);assert.equal(body.stream_options.include_usage,true);
 assert.equal(body.tool_choice,undefined);
 const output=await response.text();assert.match(output,/Unverified local inference/);assert.match(output,/prompt_tokens/);assert.doesNotMatch(output,/PRIVATE_GATEWAY_TEST_SECRET/);
});
test('malformed client payload or disabled backend causes zero self-hosted requests and zero quota touches',async()=>{
 let upstream=0,quota=0;
 const controlled={...env,SUTRA_QUOTA:{idFromName(){quota++;throw Error('touched');}}};
 for(const e of [{...controlled,SUTRA_INFERENCE_BACKEND:'disabled'},{...controlled,SUTRA_SELF_HOSTED_TOKEN:'too-short'},{...controlled,SUTRA_SELF_HOSTED_UPSTREAM_URL:'http://localhost:11434/v1/chat/completions'}]){
  const result=await handleInference(req(),e,{fetchImpl:async()=>{upstream++;return sse();}});
  assert.equal(result.status,503);
 }
 for(const p of [{...JSON.parse(await req().text()),model:'other'}, {...JSON.parse(await req().text()),upstream:'https://attacker.example'}]){
  const result=await handleInference(req(p),controlled,{fetchImpl:async()=>{upstream++;return sse();}});
  assert.equal(result.status,400);
 }
 assert.equal(upstream,0);assert.equal(quota,0);
});
test('upstream redirects and incompatible streams never produce completed output',async()=>{
 const redirect=await handleInference(req(),env,{fetchImpl:async()=>new Response('',{status:302,headers:{Location:'https://elsewhere.example'}})});
 assert.equal(redirect.status,502);
 const malformed=await handleInference(req(),env,{fetchImpl:async()=>new Response('not-a-stream',{headers:{'Content-Type':'application/json'}})});
 assert.equal(malformed.status,502);
});
