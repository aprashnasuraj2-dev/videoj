import test from 'node:test';import assert from 'node:assert/strict';
import {inferenceBackend,inferenceStatus,inferenceContractId,handleInference,UPSTREAM} from '../inference.js';
import worker from '../worker.js';
import fs from 'node:fs';
import {runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
const url='https://operator-gateway.example/v1/chat/completions';
const gatewayToken='PRIVATE_GATEWAY_TEST_SECRET_'+ 'x'.repeat(20);
const env={
 SUTRA_ENABLE_INFERENCE:'true',SUTRA_INFERENCE_BACKEND:'self_hosted',SUTRA_SELF_HOSTED_UPSTREAM_URL:url,SUTRA_SELF_HOSTED_TOKEN:gatewayToken,
 SUTRA_ALLOWED_ORIGIN:'https://sutra.test',SUTRA_MODELS:'local-tool-model',SUTRA_CLIENT_HASH_SECRET:'x'.repeat(32),
 SUTRA_MAX_OUTPUT_TOKENS:'256',SUTRA_MAX_DAILY_CALLS:'10',SUTRA_MAX_CLIENT_CALLS:'2',SUTRA_MAX_CONCURRENT:'2',
 SUTRA_CONTENT_VERSION:'synthetic-timing-v1',SUTRA_CONTENT_MODE:'synthetic',
 SUTRA_CATALOG_SHA256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',
 SUTRA_TRANSCRIPT_SHA256:'a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d',
 SUTRA_QUOTA:{idFromName:()=> 'global',get:()=>({fetch:async req=>new URL(req).pathname==='/release'?Response.json({released:true}):Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000001'})})}
};
const req=(body={model:'local-tool-model',messages:[{role:'user',content:'Where is the source cue?'}],stream:true,tools:[]})=>new Request('https://sutra.test/api/v1/chat/completions',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify(body)});
const sse=()=>new Response('data: {"choices":[{"index":0,"delta":{"content":"Unverified local inference, cite the source."},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":8,"total_tokens":20}}\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
test('self-hosted endpoint is opt-in; hosted never falls back implicitly',()=>{
 assert.equal(inferenceStatus({...env,SUTRA_INFERENCE_BACKEND:undefined}),false);
 assert.equal(inferenceStatus({...env,SUTRA_INFERENCE_BACKEND:'hosted'}),false);
 assert.equal(inferenceStatus({...env,SUTRA_INFERENCE_BACKEND:'hosted',SUTRA_PROVIDER_KEY:'SERVER_ONLY_HOSTED_TEST'}),false,'stale gateway URL in hosted mode fails closed');
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
 assert.equal(data.model,'local-tool-model');assert.equal(data.byok,false);assert.match(data.inferenceContractId,/^[a-f0-9]{64}$/);assert.equal(data.inferenceContractId,await inferenceContractId(env));
 assert.ok(!JSON.stringify(data).includes(gatewayToken));
 assert.ok(!JSON.stringify(data).includes('operator-gateway.example'));
});
test('self-hosted streaming uses only approved TLS gateway and server-owned bearer token with bounded usage',async()=>{
 let upstream=0,body=null,auth='',requestedUrl='';
 const response=await handleInference(req(),env,{fetchImpl:async(u,opts)=>{upstream++;requestedUrl=u;auth=opts.headers.Authorization;body=JSON.parse(opts.body);return sse();}});
 assert.equal(response.status,200);assert.equal(upstream,1);assert.equal(requestedUrl,url);
 assert.equal(auth,'Bearer '+gatewayToken);assert.equal(body.model,'local-tool-model');assert.equal(body.max_tokens,256);
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

test('self-hosted provider drives real restricted multi-agent orchestration under caller ownership',async()=>{
 const graph=JSON.parse(fs.readFileSync(new URL('../../../packages/sutra-runtime/examples/learner.network.json',import.meta.url)));
 const providerBodies=[];
 const encode=chunks=>new Response(chunks.map(c=>'data: '+JSON.stringify(c)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
 const chunk=(delta,reason)=>({choices:[{index:0,delta,finish_reason:reason}]});
 const adapter=createProviderAdapter({origin:'https://sutra.test',model:'local-tool-model',fetchImpl:async(requestUrl,opts)=>{
  assert.equal(requestUrl,'https://sutra.test/api/v1/chat/completions');assert.equal(opts.headers.Authorization,undefined);
  return handleInference(new Request(requestUrl,{method:'POST',headers:{...opts.headers,Origin:'https://sutra.test'},body:opts.body,signal:opts.signal}),env,{
   fetchImpl:async(gatewayUrl,upstream)=>{
    assert.equal(gatewayUrl,url);assert.equal(upstream.headers.Authorization,'Bearer '+gatewayToken);
    const body=JSON.parse(upstream.body);providerBodies.push(body);
    const toolResult=body.messages.some(m=>m.role==='tool'),hasTools=body.tools.length>0;
    if(hasTools&&!toolResult)return encode([chunk({tool_calls:[{index:0,id:'delegate-evidence',type:'function',function:{name:'evidence',arguments:'{"request":"Check catalog source cue."}'}}]},'tool_calls')]);
    if(!hasTools)return encode([chunk({content:'Local source helper; unverified.'},'stop')]);
    return encode([chunk({content:'Self-hosted tool-backed interpretation. Exact sources require independent receipts; factual truth unverified.'},'stop')]);
   }
  });
 }});
 const result=await runNetwork({definition:graph,request:'Find the source cue; no unsupported factual claims.',model:adapter});
 assert.equal(result.mode,'provider');assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,3);
 assert.equal(providerBodies.length,3);
 assert.ok(providerBodies.every(b=>b.model==='local-tool-model'&&b.max_tokens===256&&b.max_completion_tokens===undefined));
 assert.match(result.text,/factual truth unverified/);
 assert.ok(!JSON.stringify(result).includes(gatewayToken));
});

test('checked-in Worker candidates remain off regardless of externally installed inference tools',async()=>{
 const fs=await import('node:fs');
 for(const name of ['wrangler.jsonc','wrangler.private.jsonc']){
  const config=JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
  assert.equal(config.vars.SUTRA_ENABLE_INFERENCE,'false',name);
  assert.equal(config.vars.SUTRA_MODELS,'',name);
  assert.equal(config.workers_dev,false,name);
  assert.equal(config.vars.SUTRA_INFERENCE_BACKEND,undefined,name);
  for(const key of ['SUTRA_SELF_HOSTED_TOKEN','SUTRA_SELF_HOSTED_UPSTREAM_URL','SUTRA_PROVIDER_KEY','SUTRA_CLIENT_HASH_SECRET'])assert.equal(config.vars[key],undefined,name+':'+key);
  assert.equal(inferenceStatus(config.vars),false,name);
 }
});

test('snapshot-aware model POSTs pin the exact backend before quota or upstream, including mid-run changes',async()=>{
 const approved=await inferenceContractId(env);
 assert.equal(approved,await inferenceContractId({...env}));
 const changed=[{...env,SUTRA_SELF_HOSTED_UPSTREAM_URL:'https://replacement-gateway.example/v1/chat/completions'},{...env,SUTRA_SELF_HOSTED_TOKEN:'rotated-secret-'+ 'r'.repeat(32)},{...env,SUTRA_INFERENCE_BACKEND:'hosted',SUTRA_SELF_HOSTED_UPSTREAM_URL:undefined,SUTRA_PROVIDER_KEY:'HOSTED_TEST_ONLY_KEY'},{...env,SUTRA_MODELS:'local-tool-model,other-model'},{...env,SUTRA_MAX_OUTPUT_TOKENS:'512'},{...env,SUTRA_CLIENT_HASH_SECRET:'y'.repeat(32)}];
 let upstream=0,quota=0;
 const snapshotRequest=(id=approved)=>{const r=req();r.headers.set('X-Sutra-Catalog-Sha256',env.SUTRA_CATALOG_SHA256);if(id!==null)r.headers.set('X-Sutra-Inference-Contract',id);return r;};
 const ok=await handleInference(snapshotRequest(),env,{fetchImpl:async(u,opts)=>{upstream++;assert.equal(u,url);assert.equal(opts.headers['X-Sutra-Inference-Contract'],undefined);return sse();}});
 assert.equal(ok.status,200);await ok.text();assert.equal(upstream,1);
 for(const config of changed){
  assert.equal(inferenceStatus(config),true);assert.notEqual(await inferenceContractId(config),approved);
  const guarded={...config,SUTRA_QUOTA:{idFromName(){quota++;throw Error('must not reserve');}}};
  const rejected=await handleInference(snapshotRequest(),guarded,{fetchImpl:async()=>{upstream++;return sse();}});
  assert.equal(rejected.status,409);assert.equal(rejected.headers.get('X-Sutra-Precondition'),'inference');assert.deepEqual(await rejected.json(),{error:{code:'INFERENCE_CONTRACT_MISMATCH'}});
 }
 for(const malformed of [null,'','wrong','f'.repeat(64)]){
  const rejected=await handleInference(snapshotRequest(malformed),{...env,SUTRA_QUOTA:{idFromName(){quota++;throw Error('must not reserve');}}},{fetchImpl:async()=>{upstream++;return sse();}});
  assert.equal(rejected.status,409);
 }
 assert.equal(quota,0);assert.equal(upstream,1);
});
