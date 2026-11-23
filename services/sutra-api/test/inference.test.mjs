import test from 'node:test';import assert from 'node:assert/strict';import {handleInference,UPSTREAM,inferenceStatus} from '../inference.js';import {InferenceQuota} from '../quota.js';import worker,{handleSourceTools,securityHeaders,allowedPeerOrigins} from '../worker.js';import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
const payload=()=>({model:'operator-approved',stream:true,messages:[{role:'user',content:'hello'}],tools:[]});
const request=(body=payload(),extra={})=>new Request('https://sutra.test/api/infer',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...extra},body:JSON.stringify(body)});
let leaseSequence=0;
const environment=(reserve=async(url,opts)=>{
 const path=new URL(url).pathname;
 if(path==='/release')return Response.json({released:true});
 return Response.json({allowed:true,lease:'00000000-0000-4000-8000-'+String(++leaseSequence).padStart(12,'0')});
})=>({SUTRA_ENABLE_INFERENCE:'true',SUTRA_PROVIDER_KEY:'SERVER_ONLY_KEY_MARKER',SUTRA_CLIENT_HASH_SECRET:'a'.repeat(32),SUTRA_ALLOWED_ORIGIN:'https://sutra.test',SUTRA_MODELS:'operator-approved',SUTRA_MAX_OUTPUT_TOKENS:'512',SUTRA_MAX_CONCURRENT:'2',SUTRA_QUOTA:{idFromName:x=>x,get:()=>({fetch:reserve})}});
const sse=(suffix='data: [DONE]\n\n')=>new Response('data: {"choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}],"secret":"PRIVATE_PROVIDER_FIELD"}\n\ndata: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'+suffix,{headers:{'Content-Type':'text/event-stream'}});
test('disabled by default; no upstream before validation',async()=>{let calls=0;const fetchImpl=()=>{calls++;throw Error();};assert.equal((await handleInference(request(),{}, {fetchImpl})).status,503);for(const req of [request(payload(),{Origin:'https://evil.test'}),request({...payload(),url:'http://internal'}),request({...payload(),model:'unapproved'}),request(payload(),{Authorization:'Bearer client-key'})])assert.ok((await handleInference(req,environment(),{fetchImpl})).status>=400);assert.equal(calls,0);assert.equal(inferenceStatus({...environment(),SUTRA_MAX_OUTPUT_TOKENS:'99999'}),false);});
test('fixed upstream, server key and imposed cap; sanitized streaming works end to end',async()=>{let reserved,released=0;const env=environment(async(url,opts)=>{if(new URL(url).pathname==='/release'){released++;return Response.json({released:true});}reserved=JSON.parse(opts.body);return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000111'});});const adapter=createProviderAdapter({origin:'https://sutra.test',model:'operator-approved',fetchImpl:async(url,opts)=>handleInference(new Request(url,{...opts,headers:{...opts.headers,Origin:'https://sutra.test'}}),env,{fetchImpl:async(url,opts)=>{assert.equal(url,UPSTREAM);assert.equal(opts.headers.Authorization,'Bearer SERVER_ONLY_KEY_MARKER');assert.equal(opts.redirect,'error');const body=JSON.parse(opts.body);assert.equal(body.max_completion_tokens,512);return sse();}})});assert.equal((await adapter.chat({messages:payload().messages})).content,'hello');assert.match(reserved.clientKey,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(reserved).includes('192.0.2.1'),false);assert.equal(released,1);});
test('quota denial, malformed quota and storage errors prevent provider contact',async()=>{for(const reserve of [async()=>new Response('',{status:429}),async()=>Response.json({allowed:false}),async()=>{throw Error('private');}]){let calls=0;const response=await handleInference(request(),environment(reserve),{fetchImpl:async()=>{calls++;return sse();}});assert.ok([429,503].includes(response.status));assert.equal(calls,0);assert.equal((await response.text()).includes('private'),false);}});
test('upstream errors and truncated streams never expose raw fields',async()=>{for(const upstream of [new Response('SERVER_ONLY_KEY_MARKER',{status:401}),sse('')]){const response=await handleInference(request(),environment(),{fetchImpl:async()=>upstream});const body=await response.text();assert.equal(body.includes('SERVER_ONLY_KEY_MARKER'),false);assert.equal(body.includes('PRIVATE_PROVIDER_FIELD'),false);if(response.ok){assert.ok(body.includes('INCOMPLETE_STREAM'));assert.equal(body.includes('[DONE]'),false);}}});
test('body and request ceilings fail before quota or provider',async()=>{let reserved=0;const env=environment(async()=>{reserved++;return Response.json({allowed:true});});for(const body of [{...payload(),messages:[{role:'user',content:'x'.repeat(33000)}]},{...payload(),tools:new Array(17).fill({})},{...payload(),max_completion_tokens:9999},{...payload(),messages:[{role:'tool',content:'x',tool_call_id:'unknown'}]}])assert.equal((await handleInference(request(body),env)).status,400);assert.equal(reserved,0);});
test('request cancellation prevents upstream',async()=>{const c=new AbortController();c.abort();const r=new Request(request(),{signal:c.signal});let calls=0;const response=await handleInference(r,environment(),{fetchImpl:async()=>{calls++;return sse();}});assert.ok(response.status>=400);assert.equal(calls,0);});
function storage(){let state;let queue=Promise.resolve();return {transaction(fn){const run=queue.then(()=>fn({get:async()=>structuredClone(state),put:async(k,v)=>{state=structuredClone(v);}}));queue=run.catch(()=>{});return run;},inspect:()=>state};}
const quotaRequest=key=>new Request('https://quota.internal/reserve',{method:'POST',body:JSON.stringify({clientKey:key.repeat(64)})});
const quotaRelease=lease=>new Request('https://quota.internal/release',{method:'POST',body:JSON.stringify({lease})});
test('transactional quota caps active concurrency, daily clients and resets on a new UTC day',async()=>{
 const store=storage(),env={SUTRA_MAX_DAILY_CALLS:'3',SUTRA_MAX_CLIENT_CALLS:'2',SUTRA_MAX_CONCURRENT:'2'};
 const q=new InferenceQuota({storage:store},env);
 const first=await q.fetch(quotaRequest('a')),second=await q.fetch(quotaRequest('a'));
 assert.deepEqual([first.status,second.status],[200,200]);
 const leases=[(await first.json()).lease,(await second.json()).lease];
 assert.equal((await q.fetch(quotaRequest('b'))).status,429,'active concurrency stops another paid call without consuming daily quota');
 assert.equal(store.inspect().total,2);
 assert.equal((await q.fetch(quotaRelease(leases[0]))).status,200);
 const third=await q.fetch(quotaRequest('b'));assert.equal(third.status,200);const thirdLease=(await third.json()).lease;
 assert.equal(store.inspect().total,3);
 assert.equal((await q.fetch(quotaRequest('a'))).status,429,'per-client/daily cap remains conservative after release');
 await q.fetch(quotaRelease(leases[1]));await q.fetch(quotaRelease(thirdLease));
 await store.transaction(tx=>tx.put('quota',{day:'2000-01-01',total:999,clients:{},active:{}}));
 const reset=await q.fetch(quotaRequest('a'));assert.equal(reset.status,200);assert.equal(store.inspect().total,1);
});
test('quota fails closed on invalid config and storage failure',async()=>{for(const [ctx,env]of [[{storage:storage()},{}],[{storage:{transaction:async()=>{throw Error();}}},{SUTRA_MAX_DAILY_CALLS:'10',SUTRA_MAX_CLIENT_CALLS:'2',SUTRA_MAX_CONCURRENT:'2'}]])assert.equal((await new InferenceQuota(ctx,env).fetch(quotaRequest('a'))).status,503);});
test('MCP source endpoint lists bounded read tools and rejects arbitrary capabilities',async()=>{const rpc=async(method,params)=>{const response=await handleSourceTools(new Request('https://sutra.test/api/source-tools',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));return response.json();};assert.equal((await rpc('initialize')).result.serverInfo.name,'sutra-source-tools');assert.deepEqual((await rpc('tools/list')).result.tools.map(x=>x.name),['search_lesson','read_cue']);const result=(await rpc('tools/call',{name:'search_lesson',arguments:{query:'timing'}})).result;assert.equal(result.isError,false);assert.equal(result.structuredContent.receipts[0].verification,'unverified');assert.equal((await rpc('tools/call',{name:'fetch',arguments:{url:'https://evil.test'}})).result.isError,true);assert.equal((await rpc('tools/call',{name:'read_cue',arguments:{sourceId:'wrong',cueId:'wrong'}})).result.isError,true);});
test('worker status is honest and unknown APIs never fall through to assets',async()=>{const status=await worker.fetch(new Request('https://sutra.test/api/status'),{});assert.equal((await status.json()).inference,'disabled');let assets=0;assert.equal((await worker.fetch(new Request('https://sutra.test/api/arbitrary'),{ASSETS:{fetch:()=>{assets++;}}})).status,404);assert.equal(assets,0);});
test('cancelling during quota response decoding stops before provider contact',async()=>{const abort=new AbortController();const env=environment(async()=>new Response(new ReadableStream({start(){}})));let upstream=0;const pending=handleInference(new Request(request(),{signal:abort.signal}),env,{fetchImpl:async()=>{upstream++;return sse();}});setTimeout(()=>abort.abort(),15);assert.equal((await pending).status,503);assert.equal(upstream,0);});
test('cancelling a stalled upstream fetch terminates without leaking transport details',async()=>{const abort=new AbortController();let started;const ready=new Promise(resolve=>{started=resolve;});const pending=handleInference(new Request(request(),{signal:abort.signal}),environment(),{fetchImpl:()=>{started();return new Promise(()=>{});}});await ready;abort.abort();const response=await pending;assert.equal(response.status,502);assert.match(await response.text(),/UPSTREAM_UNAVAILABLE/);});
test('cancelling the public stream aborts provider work',async()=>{let upstreamSignal;const response=await handleInference(request(),environment(),{fetchImpl:async(url,opts)=>{upstreamSignal=opts.signal;return new Response(new ReadableStream({start(){}}),{headers:{'Content-Type':'text/event-stream'}});}});await response.body.cancel();assert.equal(upstreamSignal.aborted,true);});

test('global inference kill switch and invalid concurrency config stop before quota or provider',async()=>{
 for(const env of [
  {...environment(),SUTRA_ENABLE_INFERENCE:'false'},
  {...environment(),SUTRA_MAX_CONCURRENT:'0'},
  {...environment(),SUTRA_MAX_CONCURRENT:'11'}
 ]){
  let provider=0,quota=0;
  env.SUTRA_QUOTA={idFromName:x=>x,get:()=>({fetch:async()=>{quota++;return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000999'});}})};
  const response=await handleInference(request(),env,{fetchImpl:async()=>{provider++;return sse();}});
  assert.equal(response.status,503);assert.equal(quota,0);assert.equal(provider,0);
 }
});
test('provider failure and public stream cancellation release active quota lease exactly once',async()=>{
 for(const scenario of ['reject','cancel']){
  const calls=[];const env=environment(async(url,opts)=>{
   calls.push(new URL(url).pathname);
   if(new URL(url).pathname==='/release')return Response.json({released:true});
   return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000777'});
  });
  const response=await handleInference(request(),env,{fetchImpl:async()=>scenario==='reject'?
   new Response('no',{status:500}):
   new Response(new ReadableStream({start(){}}),{headers:{'Content-Type':'text/event-stream'}})});
  if(scenario==='cancel')await response.body.cancel();else assert.equal(response.status,502);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(calls,['/reserve','/release']);
 }
});

test('worker security policy blocks broad third-party execution and admits only exact HTTPS peer origins',async()=>{
 const none=securityHeaders({});
 assert.match(none['Content-Security-Policy'],/script-src 'self'/);
 assert.match(none['Content-Security-Policy'],/connect-src 'self'(;|$)/);
 assert.match(none['Content-Security-Policy'],/object-src 'none'/);
 assert.equal(none['Referrer-Policy'],'no-referrer');
 assert.equal(none['X-Frame-Options'],'DENY');
 assert.match(none['Permissions-Policy'],/camera=\(\)/);
 assert.deepEqual(allowedPeerOrigins({SUTRA_PEER_ORIGINS:'https://peer-one.example,https://peer-two.example'}),['https://peer-one.example','https://peer-two.example']);
 assert.deepEqual(allowedPeerOrigins({SUTRA_PEER_ORIGINS:'https://peer.example/path'}),[]);
 const peers=securityHeaders({SUTRA_PEER_ORIGINS:'https://peer-one.example'});
 assert.match(peers['Content-Security-Policy'],/connect-src 'self' https:\/\/peer-one\.example/);
 assert.doesNotMatch(peers['Content-Security-Policy'],/connect-src[^;]*\shttps:(?:\s|;|$)/);
});
test('all worker API and asset responses receive browser security headers',async()=>{
 const asset=await worker.fetch(new Request('https://sutra.test/'),{ASSETS:{fetch:async()=>new Response('<!doctype html>',{headers:{'Content-Type':'text/html'}})}});
 for(const response of [asset,await worker.fetch(new Request('https://sutra.test/api/status'),{})]){
  assert.match(response.headers.get('Content-Security-Policy'),/default-src 'self'/);
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 }
});
