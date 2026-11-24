import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import {createGateway} from '../../../tools/sutra-local-gateway/gateway.mjs';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
import {runNetwork} from '../../../packages/sutra-runtime/index.js';
import {handleInference} from '../inference.js';

const graph=JSON.parse(fs.readFileSync(new URL('../../../packages/sutra-runtime/examples/learner.network.json',import.meta.url),'utf8'));
const secret='TEST_GATEWAY_INTERNAL_'+ 'x'.repeat(48),model='self-host-integration-fixture';
const origin='https://sutra.test',publicGateway='https://operator-gateway.example/v1/chat/completions';
const listen=server=>new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));
const event=(delta,finish)=>({choices:[{index:0,delta,finish_reason:finish}]});
const sse=items=>items.map(item=>'data: '+JSON.stringify(item)+'\n\n').join('')+'data: [DONE]\n\n';
test('complete model-free browser-facing adapter -> Worker -> authenticated gateway -> local fake engine -> delegated runtime', {timeout:12000},async()=>{
 let upstreamCalls=0,quotaReserves=0,quotaReleases=0;
 const engine=http.createServer(async(req,res)=>{
  assert.equal(req.url,'/v1/chat/completions');assert.equal(req.method,'POST');
  assert.equal(req.headers.authorization,undefined);
  assert.equal(req.headers.cookie,undefined);
  assert.equal(req.headers.origin,undefined);
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(body.model,model);assert.equal(body.stream,true);assert.equal(body.max_tokens,256);
  assert.equal(body.stream_options.include_usage,true);
  upstreamCalls++;
  const hasToolResult=body.messages.some(message=>message.role==='tool'),names=body.tools.map(t=>t.function.name);
  let choice;
  if(names.includes('evidence')&&!hasToolResult)choice=event({tool_calls:[{index:0,id:'delegate1',type:'function',function:{name:'evidence',arguments:'{"request":"Inspect a synthetic source cue"}'}}]},'tool_calls');
  else if(names.includes('mcp_search_lesson')&&!hasToolResult)choice=event({content:'Simulated local source-tool specialist. No factual claim.'},'stop');
  else choice=event({content:'Simulated self-hosted model response. Source truth remains unverified.'},'stop');
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});
  res.end(sse([choice,{choices:[],usage:{prompt_tokens:15,completion_tokens:6,total_tokens:21}}]));
 });
 const enginePort=await listen(engine);
 const gateway=createGateway({token:secret,model,upstreamPort:enginePort}),gatewayPort=await listen(gateway);
 const env={
  SUTRA_INFERENCE_BACKEND:'self_hosted',SUTRA_ENABLE_INFERENCE:'true',SUTRA_MODELS:model,
  SUTRA_SELF_HOSTED_UPSTREAM_URL:publicGateway,SUTRA_SELF_HOSTED_TOKEN:secret,
  SUTRA_ALLOWED_ORIGIN:origin,SUTRA_CLIENT_HASH_SECRET:'h'.repeat(32),
  SUTRA_MAX_OUTPUT_TOKENS:'256',SUTRA_MAX_DAILY_CALLS:'100',SUTRA_MAX_CLIENT_CALLS:'8',SUTRA_MAX_CONCURRENT:'2',
  SUTRA_QUOTA:{idFromName:()=> 'mock-quota',get:()=>({fetch:async(url)=>{
   const endpoint=new URL(url).pathname;
   if(endpoint==='/release'){quotaReleases++;return Response.json({released:true});}
   assert.equal(endpoint,'/reserve');quotaReserves++;
   return Response.json({allowed:true,lease:'00000000-0000-4000-8000-'+String(quotaReserves).padStart(12,'0')});
  }})}
 };
 try{
  const adapter=createProviderAdapter({origin,model,fetchImpl:async(url,options)=>{
   assert.equal(url,origin+'/api/v1/chat/completions');assert.equal(options.credentials,'omit');
   assert.equal(options.headers.Authorization,undefined);
   return handleInference(new Request(url,{method:'POST',headers:{...options.headers,Origin:origin},body:options.body,signal:options.signal}),env,{
    fetchImpl:async(upstreamUrl,upstreamOptions)=>{
     assert.equal(upstreamUrl,publicGateway);
     assert.equal(upstreamOptions.headers.Authorization,'Bearer '+secret);
     assert.equal(upstreamOptions.redirect,'error');
     return fetch('http://127.0.0.1:'+gatewayPort+'/v1/chat/completions',upstreamOptions);
    }
   });
  }});
  const outcome=await runNetwork({definition:graph,request:'Inspect source evidence under the caller contract.',model:adapter});
  assert.equal(outcome.agentCalls,2);
  assert.equal(outcome.modelCalls,3);
  assert.match(outcome.text,/Source truth remains unverified/);
  assert.equal(upstreamCalls,3);
  assert.equal(quotaReserves,3);
  for(let i=0;i<100&&quotaReleases<3;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(quotaReleases,3);
  assert.doesNotMatch(JSON.stringify(outcome),/TEST_GATEWAY_INTERNAL/);
 }finally{
  await close(gateway);
  await close(engine);
 }
});

test('one cancelled client request closes the real gateway and loopback model stream without retry', {timeout:12000},async()=>{
 let started,closed=false,reservations=0,releases=0,calls=0;
 const engineStarted=new Promise(resolve=>started=resolve);
 const engine=http.createServer(async(req,res)=>{
  const parts=[];for await(const part of req)parts.push(part);
  calls++;res.on('close',()=>{closed=true;});
  res.writeHead(200,{'Content-Type':'text/event-stream'});
  res.write(sse([event({content:'Partial unverified text, never a completed response.'},null)]).replace('data: [DONE]\n\n',''));
  started();
  // A deliberately held-open model stream; no [DONE] may be invented.
 });
 const enginePort=await listen(engine);
 const gateway=createGateway({token:secret,model,upstreamPort:enginePort}),gatewayPort=await listen(gateway);
 const env={
  SUTRA_INFERENCE_BACKEND:'self_hosted',SUTRA_ENABLE_INFERENCE:'true',SUTRA_MODELS:model,
  SUTRA_SELF_HOSTED_UPSTREAM_URL:publicGateway,SUTRA_SELF_HOSTED_TOKEN:secret,
  SUTRA_ALLOWED_ORIGIN:origin,SUTRA_CLIENT_HASH_SECRET:'h'.repeat(32),
  SUTRA_MAX_OUTPUT_TOKENS:'256',SUTRA_MAX_DAILY_CALLS:'100',SUTRA_MAX_CLIENT_CALLS:'8',SUTRA_MAX_CONCURRENT:'2',
  SUTRA_QUOTA:{idFromName:()=> 'mock-quota',get:()=>({fetch:async u=>{
   if(new URL(u).pathname==='/release'){releases++;return Response.json({released:true});}
   reservations++;return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000001'});
  }})}
 };
 const abort=new AbortController();
 try{
  const adapter=createProviderAdapter({origin,model,fetchImpl:async(url,options)=>
   handleInference(new Request(url,{method:'POST',headers:{...options.headers,Origin:origin},body:options.body,signal:options.signal}),env,{
    fetchImpl:async(gatewayUrl,opts)=>{
     assert.equal(gatewayUrl,publicGateway);
     return fetch('http://127.0.0.1:'+gatewayPort+'/v1/chat/completions',opts);
    }
   })
  });
  const pending=adapter.chat({messages:[{role:'user',content:'Synthetic cancel test'}],tools:[],signal:abort.signal});
  await engineStarted;
  abort.abort();
  await assert.rejects(pending,error=>['CANCELLED','TRANSPORT'].includes(error?.code),'cancelled stream cannot return completed text');
  for(let i=0;i<150&&(!closed||releases<1);i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(calls,1,'no automatic model retries');
  assert.equal(closed,true,'gateway must disconnect from the local model');
  assert.equal(reservations,1);
  assert.equal(releases,1,'the Worker must eventually release the admission slot');
 }finally{
  gateway.closeAllConnections();
  engine.closeAllConnections();
  await close(gateway);
  await close(engine);
 }
});

test('local model HTTP 200 with truncated SSE is never treated as a completed answer', {timeout:12000},async()=>{
 let localCalls=0,reservations=0,releases=0;
 const engine=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  localCalls++;
  res.writeHead(200,{'Content-Type':'text/event-stream'});
  res.end('data: {"choices":[{"index":0,"delta":{"content":"This sounds like a convincing but incomplete local answer."},"finish_reason":null}]}\n\n');
  // No completed choice, no [DONE], and no real source verification.
 });
 const port=await listen(engine);
 const gateway=createGateway({token:secret,model,upstreamPort:port}),gport=await listen(gateway);
 const env={
  SUTRA_INFERENCE_BACKEND:'self_hosted',SUTRA_ENABLE_INFERENCE:'true',SUTRA_MODELS:model,
  SUTRA_SELF_HOSTED_UPSTREAM_URL:publicGateway,SUTRA_SELF_HOSTED_TOKEN:secret,
  SUTRA_ALLOWED_ORIGIN:origin,SUTRA_CLIENT_HASH_SECRET:'h'.repeat(32),
  SUTRA_MAX_OUTPUT_TOKENS:'256',SUTRA_MAX_DAILY_CALLS:'100',SUTRA_MAX_CLIENT_CALLS:'8',SUTRA_MAX_CONCURRENT:'2',
  SUTRA_QUOTA:{idFromName:()=> 'mock-quota',get:()=>({fetch:async endpoint=>{
   if(new URL(endpoint).pathname==='/release'){releases++;return Response.json({released:true});}
   reservations++;return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000001'});
  }})}
 };
 try{
  const adapter=createProviderAdapter({origin,model,fetchImpl:async(url,opts)=>{
   assert.equal(opts.credentials,'omit');
   return handleInference(new Request(url,{method:'POST',headers:{...opts.headers,Origin:origin},body:opts.body,signal:opts.signal}),env,{
    fetchImpl:async(target,params)=>{
     assert.equal(target,publicGateway);
     return fetch('http://127.0.0.1:'+gport+'/v1/chat/completions',params);
    }
   });
  }});
  await assert.rejects(adapter.chat({messages:[{role:'user',content:'Inspect source.'}],tools:[]}),error=>
   ['UPSTREAM_STREAM','INCOMPLETE_STREAM'].includes(error?.code),'a premature local-model EOF cannot produce an answer');
  for(let i=0;i<100&&releases<1;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(localCalls,1,'no paid/local retry after incomplete stream');
  assert.equal(reservations,1);
  assert.equal(releases,1,'quota lease released after incomplete streaming');
 }finally{
  gateway.closeAllConnections();
  engine.closeAllConnections();
  await close(gateway);
  await close(engine);
 }
});
