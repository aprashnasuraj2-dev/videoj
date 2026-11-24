import test from 'node:test';import assert from 'node:assert/strict';import {handleInference,UPSTREAM,inferenceStatus} from '../inference.js';import {InferenceQuota} from '../quota.js';import worker,{handleSourceTools,securityHeaders,allowedPeerOrigins,withCachePolicy,contentBindingMatches} from '../worker.js';import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
const payload=()=>({model:'operator-approved',stream:true,messages:[{role:'user',content:'hello'}],tools:[]});
const request=(body=payload(),extra={},path='/api/infer')=>new Request('https://sutra.test'+path,{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...extra},body:JSON.stringify(body)});
let leaseSequence=0;
const environment=(reserve=async(url,opts)=>{
 const path=new URL(url).pathname;
 if(path==='/release')return Response.json({released:true});
 return Response.json({allowed:true,lease:'00000000-0000-4000-8000-'+String(++leaseSequence).padStart(12,'0')});
})=>({SUTRA_ENABLE_INFERENCE:'true',SUTRA_INFERENCE_BACKEND:'hosted',SUTRA_PROVIDER_KEY:'SERVER_ONLY_KEY_MARKER',SUTRA_CLIENT_HASH_SECRET:'a'.repeat(32),SUTRA_ALLOWED_ORIGIN:'https://sutra.test',SUTRA_MODELS:'operator-approved',SUTRA_MAX_OUTPUT_TOKENS:'512',SUTRA_MAX_DAILY_CALLS:'100',SUTRA_MAX_CLIENT_CALLS:'8',SUTRA_MAX_CONCURRENT:'2',SUTRA_CONTENT_VERSION:'synthetic-timing-v1',SUTRA_CONTENT_MODE:'synthetic',SUTRA_CATALOG_SHA256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',SUTRA_TRANSCRIPT_SHA256:'a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d',SUTRA_QUOTA:{idFromName:x=>x,get:()=>({fetch:reserve})}});
const sse=(suffix='data: [DONE]\n\n')=>new Response('data: {"choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}],"secret":"PRIVATE_PROVIDER_FIELD"}\n\ndata: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'+suffix,{headers:{'Content-Type':'text/event-stream'}});
test('disabled by default; no upstream before validation',async()=>{let calls=0;const fetchImpl=()=>{calls++;throw Error();};assert.equal((await handleInference(request(),{}, {fetchImpl})).status,503);for(const req of [request(payload(),{Origin:'https://evil.test'}),request({...payload(),url:'http://internal'}),request({...payload(),model:'unapproved'}),request(payload(),{Authorization:'Bearer client-key'})])assert.ok((await handleInference(req,environment(),{fetchImpl})).status>=400);assert.equal(calls,0);assert.equal(inferenceStatus({...environment(),SUTRA_MAX_OUTPUT_TOKENS:'99999'}),false);});
test('fixed upstream, server key and imposed cap; sanitized streaming works end to end',async()=>{let reserved,released=0;const env=environment(async(url,opts)=>{if(new URL(url).pathname==='/release'){released++;return Response.json({released:true});}reserved=JSON.parse(opts.body);return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000111'});});const adapter=createProviderAdapter({origin:'https://sutra.test',model:'operator-approved',fetchImpl:async(url,opts)=>handleInference(new Request(url,{...opts,headers:{...opts.headers,Origin:'https://sutra.test'}}),env,{fetchImpl:async(url,opts)=>{assert.equal(url,UPSTREAM);assert.equal(opts.headers.Authorization,'Bearer SERVER_ONLY_KEY_MARKER');assert.equal(opts.redirect,'error');const body=JSON.parse(opts.body);assert.equal(body.max_completion_tokens,512);return sse();}})});assert.equal((await adapter.chat({messages:payload().messages})).content,'hello');assert.match(reserved.clientKey,/^[a-f0-9]{64}$/);assert.equal(reserved.outputTokens,512);assert.ok(reserved.inputBytes>0);assert.equal(JSON.stringify(reserved).includes('192.0.2.1'),false);assert.equal(JSON.stringify(reserved).includes('sutra-cookie-canary'),false);assert.equal(released,1);});
test('quota denial, malformed quota and storage errors prevent provider contact',async()=>{for(const reserve of [async()=>new Response('',{status:429}),async()=>Response.json({allowed:false}),async()=>{throw Error('private');}]){let calls=0;const response=await handleInference(request(),environment(reserve),{fetchImpl:async()=>{calls++;return sse();}});assert.ok([429,503].includes(response.status));assert.equal(calls,0);assert.equal((await response.text()).includes('private'),false);}});
test('upstream errors and truncated streams never expose raw fields',async()=>{for(const upstream of [new Response('SERVER_ONLY_KEY_MARKER',{status:401}),sse('')]){const response=await handleInference(request(),environment(),{fetchImpl:async()=>upstream});const body=await response.text();assert.equal(body.includes('SERVER_ONLY_KEY_MARKER'),false);assert.equal(body.includes('PRIVATE_PROVIDER_FIELD'),false);if(response.ok){assert.ok(body.includes('INCOMPLETE_STREAM'));assert.equal(body.includes('[DONE]'),false);}}});
test('body and request ceilings fail before quota or provider',async()=>{let reserved=0;const env=environment(async()=>{reserved++;return Response.json({allowed:true});});for(const body of [{...payload(),messages:[{role:'user',content:'x'.repeat(33000)}]},{...payload(),tools:new Array(17).fill({})},{...payload(),max_completion_tokens:9999},{...payload(),messages:[{role:'tool',content:'x',tool_call_id:'unknown'}]}])assert.equal((await handleInference(request(body),env)).status,400);assert.equal(reserved,0);});
test('request cancellation prevents upstream',async()=>{const c=new AbortController();c.abort();const r=new Request(request(),{signal:c.signal});let calls=0;const response=await handleInference(r,environment(),{fetchImpl:async()=>{calls++;return sse();}});assert.ok(response.status>=400);assert.equal(calls,0);});
function storage(){const values=new Map();let queue=Promise.resolve();return {transaction(fn){const run=queue.then(()=>fn({get:async k=>structuredClone(values.get(k)),put:async(k,v)=>{values.set(k,structuredClone(v));}}));queue=run.catch(()=>{});return run;},inspect:(key='quota')=>structuredClone(values.get(key)),keys:()=>[...values.keys()]};}
const quotaRequest=(key,inputBytes=100,outputTokens=64)=>new Request('https://quota.internal/reserve',{method:'POST',body:JSON.stringify({clientKey:key.repeat(64),inputBytes,outputTokens})});
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
test('source-tool read quota protects Worker capacity without charging discovery or malformed calls',async()=>{
 const store=storage(),quota=new InferenceQuota({storage:store},{SUTRA_MAX_DAILY_SOURCE_READS:'2',SUTRA_MAX_CLIENT_SOURCE_READS:'1'});
 const env={SUTRA_MAX_DAILY_SOURCE_READS:'2',SUTRA_MAX_CLIENT_SOURCE_READS:'1',SUTRA_CLIENT_HASH_SECRET:'s'.repeat(32),SUTRA_QUOTA:{idFromName:x=>x,get:()=>({fetch:(url,opts)=>quota.fetch(new Request(url,opts))})}};
 const rpc=(method,params,ip='192.0.2.10')=>handleSourceTools(new Request('https://sutra.test/api/source-tools',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),env);
 assert.equal((await rpc('tools/list')).status,200);assert.equal(store.inspect(),undefined,'discovery does not spend source-read quota');
 const malformed=await rpc('tools/call',{name:'fetch',arguments:{url:'https://evil.test'}});assert.equal(malformed.status,200);assert.equal((await malformed.json()).result.isError,true);assert.equal(store.inspect(),undefined,'rejected tool shape does not spend source-read quota');
 const first=await rpc('tools/call',{name:'search_lesson',arguments:{query:'timing'}});assert.equal(first.status,200);
 const sameClient=await rpc('tools/call',{name:'search_lesson',arguments:{query:'timing'}});assert.equal(sameClient.status,429);
 const secondClient=await rpc('tools/call',{name:'read_cue',arguments:{sourceId:'synthetic-timing-fixture',cueId:'timing-marker'}},'192.0.2.11');assert.equal(secondClient.status,200);
 const global=await rpc('tools/call',{name:'search_lesson',arguments:{query:'timing'}},'192.0.2.12');assert.equal(global.status,429);
 const sourceGlobal=store.inspect('source-quota');assert.deepEqual(Object.keys(sourceGlobal).sort(),['day','total']);assert.equal(sourceGlobal.total,2);
 const bucketKeys=store.keys().filter(k=>k.startsWith('source-quota:'));assert.ok(bucketKeys.length>=1);for(const key of bucketKeys){const bucket=store.inspect(key);assert.deepEqual(Object.keys(bucket).sort(),['counts','day']);assert.ok(Object.keys(bucket.counts).length<=2);}
});
test('source MCP rejects unknown transport metadata and malformed method params before quota',async()=>{
 let quota=0;const env={SUTRA_MAX_DAILY_SOURCE_READS:'10',SUTRA_MAX_CLIENT_SOURCE_READS:'2',SUTRA_CLIENT_HASH_SECRET:'s'.repeat(32),SUTRA_QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>{quota++;return Response.json({allowed:true});}})}};
 const send=body=>handleSourceTools(new Request('https://sutra.test/api/source-tools',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify(body)}),env);
 for(const body of [
  {jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_lesson',arguments:{query:'timing'}},url:'https://evil.test'},
  {jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_lesson',arguments:{query:'timing'},credential:'x'}},
  {jsonrpc:'2.0',id:1,method:'tools/list',params:{cursor:'attacker'}},
  {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{network:{}},clientInfo:{name:'x',version:'1'}}},
  {jsonrpc:'2.0',method:'notifications/initialized',params:{secret:'x'}}
 ])assert.equal((await send(body)).status,400);
 assert.equal(quota,0);
});
test('source MCP initialization accepts bounded standard read-client capabilities without widening server powers',async()=>{
 const body={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{roots:{listChanged:true},sampling:{},elicitation:{}},clientInfo:{name:'portable-read-client',version:'1'}}};
 const response=await handleSourceTools(new Request('https://sutra.test/api/source-tools',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(response.status,200);const result=(await response.json()).result;assert.deepEqual(result.capabilities,{tools:{listChanged:false}});
});
test('MCP source endpoint lists bounded read tools and rejects arbitrary capabilities',async()=>{const rpc=async(method,params)=>{const response=await handleSourceTools(new Request('https://sutra.test/api/source-tools',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));return response.json();};assert.equal((await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test-client',version:'1'}})).result.serverInfo.name,'sutra-source-tools');assert.deepEqual((await rpc('tools/list')).result.tools.map(x=>x.name),['search_lesson','read_cue']);const result=(await rpc('tools/call',{name:'search_lesson',arguments:{query:'timing'}})).result;assert.equal(result.isError,false);assert.equal(result.structuredContent.receipts[0].verification,'unverified');assert.equal((await rpc('tools/call',{name:'fetch',arguments:{url:'https://evil.test'}})).result.isError,true);assert.equal((await rpc('tools/call',{name:'read_cue',arguments:{sourceId:'wrong',cueId:'wrong'}})).result.isError,true);});
test('worker status is honest and unknown APIs never fall through to assets',async()=>{const status=await worker.fetch(new Request('https://sutra.test/api/status'),{});assert.equal((await status.json()).inference,'disabled');let assets=0;assert.equal((await worker.fetch(new Request('https://sutra.test/api/arbitrary'),{ASSETS:{fetch:()=>{assets++;}}})).status,404);assert.equal(assets,0);});
test('cancelling during quota response decoding stops before provider contact',async()=>{const abort=new AbortController();const env=environment(async()=>new Response(new ReadableStream({start(){}})));let upstream=0;const pending=handleInference(new Request(request(),{signal:abort.signal}),env,{fetchImpl:async()=>{upstream++;return sse();}});setTimeout(()=>abort.abort(),15);const response=await pending;assert.equal(response.status,499);assert.equal((await response.json()).error.code,'CANCELLED');assert.equal(upstream,0);});
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

test('direct nonbrowser caller that spoofs allowed Origin still hits client quota before second provider call',async()=>{
 const store=storage(),quota=new InferenceQuota({storage:store},{SUTRA_MAX_DAILY_CALLS:'5',SUTRA_MAX_CLIENT_CALLS:'1',SUTRA_MAX_CONCURRENT:'1'});
 const env={...environment(),SUTRA_QUOTA:{idFromName:x=>x,get:()=>({fetch:(url,opts)=>quota.fetch(new Request(url,opts))})}};
 let upstream=0;
 const fetchImpl=async()=>{upstream++;return sse();};
 const first=await handleInference(request(),env,{fetchImpl});assert.equal(first.status,200);await first.text();
 const second=await handleInference(request(),env,{fetchImpl});assert.equal(second.status,429);
 assert.equal(upstream,1);
 const errorBody=await second.text();assert.match(errorBody,/QUOTA/);assert.ok(!errorBody.includes('192.0.2.1'));
});

test('cache policy separates private APIs, mutable pointers and explicitly versioned public artifacts',()=>{
 const apply=url=>withCachePolicy(new Response('x'),new Request(url)).headers.get('Cache-Control');
 assert.equal(apply('https://sutra.test/api/infer'),'no-store');
 assert.equal(apply('https://sutra.test/api/status'),'no-store');
 assert.equal(apply('https://sutra.test/'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/index.html'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/agents/agent-manifest.json'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/agents/links.json'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/agents/learner.network.json'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/agents/v/abc/learner.network.json'),'public, max-age=31536000, immutable');
 assert.equal(apply('https://sutra.test/agents/learner.network.json?v=abc'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/media/timing-fixture.mp4'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/media/timing-fixture.mp4?v=abc'),'public, max-age=0, must-revalidate');
 const digest='a'.repeat(64);
 assert.equal(apply('https://sutra.test/media/release/'+digest+'/lesson.mp4'),'public, max-age=31536000, immutable');
 assert.equal(apply('https://sutra.test/media/release/'+digest+'/lesson.webm?v='+digest),'public, max-age=31536000, immutable');
 for(const suffix of ['/lesson.mp4?v=wrong','/lesson.mp4?v='+digest+'&x=1','/poster.svg?v='+digest]){
  assert.equal(apply('https://sutra.test/media/release/'+digest+suffix),'public, max-age=0, must-revalidate');
 }
 assert.equal(withCachePolicy(new Response('missing',{status:404}),new Request('https://sutra.test/media/release/'+digest+'/lesson.mp4?v='+digest)).headers.get('Cache-Control'),'public, max-age=0, must-revalidate');
 assert.equal(withCachePolicy(new Response('missing',{status:404}),new Request('https://sutra.test/assets/index-contenthash.js')).headers.get('Cache-Control'),'public, max-age=0, must-revalidate');
 assert.equal(apply('https://sutra.test/assets/index-contenthash.js'),'public, max-age=31536000, immutable');
});

test('resource ceilings charge admitted work without refund, reject before provider, and preserve other counters',async()=>{
 const store=storage(),cfg={SUTRA_MAX_DAILY_CALLS:'10',SUTRA_MAX_CLIENT_CALLS:'10',SUTRA_MAX_CONCURRENT:'2',SUTRA_MAX_DAILY_INPUT_BYTES:'250',SUTRA_MAX_DAILY_OUTPUT_TOKENS:'192'};
 const q=new InferenceQuota({storage:store},cfg);
 const first=await q.fetch(quotaRequest('a',150,128));assert.equal(first.status,200);await q.fetch(quotaRelease((await first.json()).lease));
 assert.equal((await q.fetch(quotaRequest('a',101,64))).status,429);
 assert.equal((await q.fetch(quotaRequest('a',100,65))).status,429);
 const second=await q.fetch(quotaRequest('b',100,64));assert.equal(second.status,200);await q.fetch(quotaRelease((await second.json()).lease));
 assert.equal((await q.fetch(quotaRequest('c',1,64))).status,429);assert.equal(store.inspect().total,2);assert.equal(store.inspect().inputBytes,250);assert.equal(store.inspect().outputTokens,192);
});
test('UTC midnight resets daily counters without dropping active provider leases',async()=>{
 const store=storage();let now=Date.parse('2026-11-24T23:59:59Z');
 const q=new InferenceQuota({storage:store},{SUTRA_MAX_DAILY_CALLS:'10',SUTRA_MAX_CLIENT_CALLS:'2',SUTRA_MAX_CONCURRENT:'1'},{clock:()=>now});
 const first=await q.fetch(quotaRequest('a'));assert.equal(first.status,200);const lease=(await first.json()).lease;now+=2000;
 assert.equal((await q.fetch(quotaRequest('b'))).status,429);assert.equal(store.inspect().day,'2026-11-25');assert.equal(store.inspect().total,0);assert.equal(Object.keys(store.inspect().active).length,1);
 await q.fetch(quotaRelease(lease));assert.equal((await q.fetch(quotaRequest('b'))).status,200);assert.equal(store.inspect().total,1);
});
test('legacy quota counters are conservatively migrated; backwards clock and invalid fields fail closed',async()=>{
 const store=storage(),now=Date.parse('2026-11-24T12:00:00Z');const q=new InferenceQuota({storage:store},{SUTRA_MAX_DAILY_CALLS:'10',SUTRA_MAX_CLIENT_CALLS:'2',SUTRA_MAX_CONCURRENT:'2',SUTRA_MAX_DAILY_INPUT_BYTES:'33792',SUTRA_MAX_DAILY_OUTPUT_TOKENS:'1024'},{clock:()=>now});
 await store.transaction(tx=>tx.put('quota',{day:'2026-11-24',total:1,clients:{},active:{}}));assert.equal((await q.fetch(quotaRequest('a'))).status,429);assert.equal(store.inspect().inputBytes,33792);
 await store.transaction(tx=>tx.put('quota',{day:'2026-11-25',total:0,clients:{},active:{}}));assert.equal((await q.fetch(quotaRequest('a'))).status,503);
 assert.equal((await q.fetch(quotaRequest('a',0,64))).status,400);
});
test('resource rejection occurs at actual inference handler before upstream',async()=>{
 const store=storage(),cfg={SUTRA_MAX_DAILY_CALLS:'5',SUTRA_MAX_CLIENT_CALLS:'5',SUTRA_MAX_CONCURRENT:'1',SUTRA_MAX_DAILY_INPUT_BYTES:'1',SUTRA_MAX_DAILY_OUTPUT_TOKENS:'512'};
 const q=new InferenceQuota({storage:store},cfg);const env={...environment(),...cfg,SUTRA_QUOTA:{idFromName:x=>x,get:()=>({fetch:(url,opts)=>q.fetch(new Request(url,opts))})}};
 let calls=0;const response=await handleInference(request(),env,{fetchImpl:async()=>{calls++;return sse();}});assert.equal(response.status,429);assert.equal(calls,0);assert.equal(store.inspect().total,0);
});

test('publisher-funded OpenAI-compatible facade reuses the same validation, quota and sanitized SSE core',async()=>{
 let upstream=0;
 const env=environment();
 const req=request(payload(),{},'/api/v1/chat/completions');
 const response=await handleInference(req,env,{fetchImpl:async(url,opts)=>{upstream++;assert.equal(url,UPSTREAM);assert.equal(opts.headers.Authorization,'Bearer SERVER_ONLY_KEY_MARKER');return sse();}});
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'text/event-stream');
 const body=await response.text();assert.match(body,/data: \[DONE\]/);assert.equal(body.includes('PRIVATE_PROVIDER_FIELD'),false);assert.equal(upstream,1);
});
test('worker exposes disabled publisher-funded compatibility route without asset fallback, auth header or fake readiness',async()=>{
 let assets=0;
 const disabled=await worker.fetch(new Request('https://sutra.test/api/v1/chat/completions',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify(payload())}),{ASSETS:{fetch:()=>{assets++;}}});
 assert.equal(disabled.status,503);assert.equal(assets,0);assert.match(await disabled.text(),/DISABLED/);
 const badAuth=await handleInference(request(payload(),{Authorization:'Bearer visitor-key'},'/api/v1/chat/completions'),environment(),{fetchImpl:async()=>{throw Error('must not contact');}});
 assert.equal(badAuth.status,403);
});
test('configured status publishes only the same-origin publisher-funded router contract; disabled status publishes none',async()=>{
 const disabled=await worker.fetch(new Request('https://sutra.test/api/status'),{});const d=await disabled.json();
 assert.deepEqual(d,{inference:'disabled',sourceTools:'catalog',content:{mode:'synthetic',contentVersion:'synthetic-timing-v1',catalogSha256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',primarySourceId:'synthetic-timing-fixture'},factualTruth:'unverified'});
 const configured=await worker.fetch(new Request('https://sutra.test/api/status'),environment());const c=await configured.json();
 assert.equal(c.inference,'configured');assert.equal(c.model,'operator-approved');assert.equal(c.routerBase,'/api/v1');assert.equal(c.publisherFunded,true);assert.equal(c.byok,false);
});

test('publisher-funded facade accepts the current upstream reference-runtime request shape without visitor key',async()=>{
 const referenceBody={model:'operator-approved',messages:[{role:'user',content:'Find the source-backed lesson step.'}],stream:true,
  tools:[{type:'function',function:{name:'source_lookup',description:'Read source evidence.',parameters:{type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false}}}],tool_choice:'auto'};
 let seen;
 const response=await handleInference(request(referenceBody,{},'/api/v1/chat/completions'),environment(),{fetchImpl:async(_url,opts)=>{seen=JSON.parse(opts.body);return sse();}});
 assert.equal(response.status,200);assert.equal(seen.model,'operator-approved');assert.equal(seen.stream,true);assert.equal(seen.tool_choice,'auto');
 assert.equal(seen.tools[0].function.name,'source_lookup');assert.equal(seen.max_completion_tokens,512);assert.deepEqual(seen.stream_options,{include_usage:true});
 assert.equal(Object.hasOwn(seen,'max_tokens'),false);assert.equal(Object.hasOwn(seen,'Authorization'),false);
});
test('facade still rejects caller-controlled provider knobs, explicit additionalProperties true and tool_choice without tools',async()=>{
 for(const body of [
  {...payload(),temperature:0.9},
  {model:'operator-approved',messages:[{role:'user',content:'x'}],stream:true,tool_choice:'auto'},
  {model:'operator-approved',messages:[{role:'user',content:'x'}],stream:true,tools:[{type:'function',function:{name:'x',description:'x',parameters:{type:'object',properties:{},additionalProperties:true}}}],tool_choice:'auto'}
 ]){
  let contacted=0;const response=await handleInference(request(body,{},'/api/v1/chat/completions'),environment(),{fetchImpl:async()=>{contacted++;return sse();}});
  assert.equal(response.status,400);assert.equal(contacted,0);
 }
});

test('unknown nested tool-call metadata fails before quota or provider',async()=>{
 let reservations=0,upstream=0;
 const env=environment(async()=>{reservations++;throw Error('Unexpected quota access');});
 const call={id:'call-001',type:'function',function:{name:'source_lookup',arguments:'{}'}};
 const assistant={role:'assistant',content:null,tool_calls:[call]};
 const tool={type:'function',function:{name:'source_lookup',description:'Read source.',parameters:{type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false}}};
 const candidates=[
  {...payload(),messages:[payload().messages[0],{...assistant,tool_calls:[{...call,url:'https://attacker.example'}]}]},
  {...payload(),messages:[payload().messages[0],{...assistant,tool_calls:[{...call,function:{...call.function,upstream:'http://internal'}}]}]},
  {...payload(),tools:[{...tool,network:'https://evil.example'}]},
  {...payload(),messages:[payload().messages[0],{...assistant,tool_calls:[{...call,secret:'leak'}]}]},
  {...payload(),tools:[{...tool,function:{...tool.function,url:'http://internal'}}]}
 ];
 for(const body of candidates){
  const response=await handleInference(request(body),env,{fetchImpl:async()=>{upstream++;return sse();}});
  assert.equal(response.status,400,'unknown nested metadata must fail closed');
 }
 assert.equal(reservations,0);assert.equal(upstream,0);
});

test('historical tool-call messages must form one declared, schema-valid, fully resolved sequence before quota',async()=>{
 const declared={type:'function',function:{name:'source_lookup',description:'Read source evidence.',parameters:{type:'object',properties:{request:{type:'string',minLength:1,maxLength:120}},required:['request'],additionalProperties:false}}};
 const call={id:'call-1',type:'function',function:{name:'source_lookup',arguments:'{"request":"timing"}'}};
 const user={role:'user',content:'Find timing'},assistant={role:'assistant',content:null,tool_calls:[call]},tool={role:'tool',tool_call_id:'call-1',name:'source_lookup',content:'{"ok":true}'};
 let reserve=0,upstream=0;const env=environment(async(url)=>{if(new URL(url).pathname==='/release')return Response.json({released:true});reserve++;return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000551'});});
 const good={model:'operator-approved',stream:true,messages:[user,assistant,tool],tools:[declared],tool_choice:'auto'};
 const ok=await handleInference(request(good),env,{fetchImpl:async()=>{upstream++;return sse();}});assert.equal(ok.status,200);await ok.text();assert.equal(reserve,1);assert.equal(upstream,1);
 const invalid=[
  {...good,messages:[user,assistant]},
  {...good,messages:[user,assistant,{...tool,name:'other'}]},
  {...good,messages:[user,assistant,tool,tool]},
  {...good,messages:[user,assistant,{role:'user',content:'interleave'},tool]},
  {...good,messages:[user,{...assistant,tool_calls:[{...call,function:{name:'undeclared',arguments:'{}'}}]},tool]},
  {...good,messages:[user,{...assistant,tool_calls:[{...call,function:{name:'source_lookup',arguments:'{"request":""}'}}]},tool]},
  {...good,tools:[declared,{...declared}]}
 ];
 reserve=0;upstream=0;
 for(const body of invalid){const response=await handleInference(request(body),env,{fetchImpl:async()=>{upstream++;return sse();}});assert.equal(response.status,400);}
 assert.equal(reserve,0);assert.equal(upstream,0);
});

test('release content identity must match the Worker-compiled catalog before status, source tools or inference are exposed',async()=>{
 assert.equal(contentBindingMatches({}),true,'development mode remains explicit when no release binding is supplied');
 assert.equal(contentBindingMatches({SUTRA_ENABLE_INFERENCE:'true'}),false,'configured inference cannot run without an explicit content binding');
 assert.equal(contentBindingMatches({SUTRA_MAX_DAILY_SOURCE_READS:'100'}),false,'public source quota configuration also requires exact content binding');
 const exact={SUTRA_CONTENT_VERSION:'synthetic-timing-v1',SUTRA_CONTENT_MODE:'synthetic',SUTRA_CATALOG_SHA256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',SUTRA_TRANSCRIPT_SHA256:'a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d'};
 assert.equal(contentBindingMatches(exact),true);
 for(const mutate of [
  x=>x.SUTRA_CONTENT_VERSION='reviewed-v2',
  x=>x.SUTRA_CONTENT_MODE='reviewed',
  x=>x.SUTRA_CATALOG_SHA256='f'.repeat(64),
  x=>x.SUTRA_TRANSCRIPT_SHA256='e'.repeat(64),
  x=>delete x.SUTRA_CONTENT_MODE
 ]){
  const env={...exact};mutate(env);assert.equal(contentBindingMatches(env),false);
  const status=await worker.fetch(new Request('https://sutra.test/api/status'),env);assert.equal(status.status,503);assert.match(await status.text(),/CONTENT_BINDING_MISMATCH/);
  const source=await worker.fetch(new Request('https://sutra.test/api/source-tools',{method:'POST',headers:{Origin:'https://sutra.test','Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}),env);assert.equal(source.status,503);
 }
});

test('source quota sharding prevents a single stored value from accumulating all clients',async()=>{
 const store=storage(),q=new InferenceQuota({storage:store},{SUTRA_MAX_DAILY_SOURCE_READS:'300',SUTRA_MAX_CLIENT_SOURCE_READS:'1'});
 for(let i=0;i<256;i++){
  const key=i.toString(16).padStart(2,'0')+'a'.repeat(62);
  const response=await q.fetch(new Request('https://quota.internal/source-read',{method:'POST',body:JSON.stringify({clientKey:key})}));
  assert.equal(response.status,200);
 }
 assert.equal(store.inspect('source-quota').total,256);
 const buckets=store.keys().filter(k=>k.startsWith('source-quota:'));assert.equal(buckets.length,256);
 assert.ok(buckets.every(key=>Object.keys(store.inspect(key).counts).length===1));
 assert.equal(Object.hasOwn(store.inspect('source-quota'),'clients'),false);
});

test('source quota resets global and sharded client counters on UTC day rollover while rejecting backwards time',async()=>{
 const store=storage();let now=Date.parse('2026-11-24T23:59:59Z');
 const q=new InferenceQuota({storage:store},{SUTRA_MAX_DAILY_SOURCE_READS:'2',SUTRA_MAX_CLIENT_SOURCE_READS:'1'},{clock:()=>now});
 const key='ab'+'c'.repeat(62),req=()=>new Request('https://quota.internal/source-read',{method:'POST',body:JSON.stringify({clientKey:key})});
 assert.equal((await q.fetch(req())).status,200);assert.equal((await q.fetch(req())).status,429);
 assert.equal(store.inspect('source-quota').total,1);assert.equal(store.inspect('source-quota:ab').counts[key],1);
 now+=2000;assert.equal((await q.fetch(req())).status,200,'new UTC day gets fresh global and client allowance');
 assert.equal(store.inspect('source-quota').day,'2026-11-25');assert.equal(store.inspect('source-quota').total,1);
 assert.equal(store.inspect('source-quota:ab').day,'2026-11-25');assert.equal(store.inspect('source-quota:ab').counts[key],1);
 now=Date.parse('2026-11-24T12:00:00Z');assert.equal((await q.fetch(req())).status,503,'backwards clock fails closed rather than reopening quota');
});

test('pre-aborted model and source requests touch neither quota nor upstream',async()=>{
 const c=new AbortController();c.abort();let quota=0,upstream=0;
 const env={...environment(),SUTRA_MAX_DAILY_SOURCE_READS:'10',SUTRA_MAX_CLIENT_SOURCE_READS:'2',SUTRA_QUOTA:{idFromName(){quota++;throw Error('must not touch');}}};
 const model=await handleInference(new Request(request(),{signal:c.signal}),env,{fetchImpl:async()=>{upstream++;return sse();}});
 assert.equal(model.status,499);assert.equal((await model.json()).error.code,'CANCELLED');
 const source=await handleSourceTools(new Request(request({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_lesson',arguments:{query:'timing'}}},{},'/api/source-tools'),{signal:c.signal}),env);
 assert.equal(source.status,499);assert.deepEqual(await source.json(),{error:{code:'SOURCE_CANCELLED'}});
 assert.equal(quota,0);assert.equal(upstream,0);
});
test('cancellation during quota admission produces no upstream or completed source receipt',async()=>{
 for(const source of [false,true]){
  const c=new AbortController(),operations=[];let upstream=0;
  const env={...environment(async(url,opts)=>{operations.push(new URL(url).pathname);c.abort();assert.equal(opts.signal.aborted,true);return Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000111'});}),SUTRA_MAX_DAILY_SOURCE_READS:'10',SUTRA_MAX_CLIENT_SOURCE_READS:'2'};
  const body=source?{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_lesson',arguments:{query:'timing'}}}:payload();
  const r=new Request(request(body,{},source?'/api/source-tools':'/api/infer'),{signal:c.signal});
  const response=source?await handleSourceTools(r,env):await handleInference(r,env,{fetchImpl:async()=>{upstream++;return sse();}});
  assert.equal(response.status,499);assert.ok(!JSON.stringify(await response.json()).includes('receipts'));assert.equal(upstream,0);
  assert.deepEqual(operations,[source?'/source-read':'/reserve'],'no implicit retry; ambiguous reservation remains conservatively charged');
 }
});
test('malformed configured source quota disables optional model execution rather than wasting a model call',async()=>{
 const env={...environment(),SUTRA_MAX_DAILY_SOURCE_READS:'10',SUTRA_MAX_CLIENT_SOURCE_READS:'11'};let calls=0;
 assert.equal(inferenceStatus(env),false);
 assert.equal((await handleInference(request(),env,{fetchImpl:async()=>{calls++;return sse();}})).status,503);assert.equal(calls,0);
});

test('upstream must return a complete exact SSE 200 before streaming or emitting DONE',async()=>{
 const good='data: {"choices":[{"index":0,"delta":{"content":"unexpected"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
 for(const response of [
  Object.defineProperty(new Response(good,{headers:{'Content-Type':'text/event-stream'}}),'url',{value:'https://api.openai.com/v1/other'}),
  new Response(good,{status:206,headers:{'Content-Type':'text/event-stream'}}),
  new Response(good,{headers:{'Content-Type':'text/html; text/event-stream'}}),
  new Response(good,{headers:{'Content-Type':'text/event-stream','Content-Range':'bytes 0-5/6'}})
 ]){
  let release=0,upstream=0;
  const env=environment(async(url)=>new URL(url).pathname==='/release'?(release++,Response.json({released:true})):Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000919'}));
  const publicResponse=await handleInference(request(),env,{fetchImpl:async(url,opts)=>{upstream++;assert.equal(url,UPSTREAM);assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');return response;}});
  assert.equal(publicResponse.status,502);
  assert.doesNotMatch(await publicResponse.text(),/unexpected|\[DONE\]/);
  assert.equal(upstream,1);assert.equal(release,1);assert.equal(response.body.locked,false);
 }
});
test('late upstream response body is disposed and quota lease released once after aborted request',async()=>{
 const abort=new AbortController();let started=false,releaseFetch,released=0,cancelled=0;
 const env=environment(async url=>new URL(url).pathname==='/release'?(released++,Response.json({released:true})):Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000919'}));
 const pending=handleInference(new Request(request(),{signal:abort.signal}),env,{fetchImpl:()=>{started=true;return new Promise(resolve=>{releaseFetch=resolve;});}});
 for(let i=0;i<100&&!started;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(started,true);
 abort.abort();const result=await pending;assert.equal(result.status,502);
 const late=new Response(new ReadableStream({cancel(){cancelled++;}}),{headers:{'Content-Type':'text/event-stream'}});
 releaseFetch(late);
 for(let i=0;i<100&&!cancelled;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(cancelled,1);assert.equal(released,1);assert.equal(late.body.locked,false);
});

test('upstream response received at abort handoff is disposed before returning unavailable',async()=>{
 const abort=new AbortController();let released=0,disposed=0,contacts=0;
 const env=environment(async url=>new URL(url).pathname==='/release'?(released++,Response.json({released:true})):Response.json({allowed:true,lease:'00000000-0000-4000-8000-000000000920'}));
 const response=new Response(new ReadableStream({cancel(){disposed++;}}),{headers:{'Content-Type':'text/event-stream'}});
 const result=await handleInference(new Request(request(),{signal:abort.signal}),env,{fetchImpl:()=>{
  contacts++;queueMicrotask(()=>queueMicrotask(()=>abort.abort()));return response;
 }});
 assert.equal(result.status,502);assert.equal(contacts,1);assert.equal(released,1);
 for(let i=0;i<20&&!disposed;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(disposed,1,'upstream accepted by promise but rejected at signal recheck still belongs to Worker');assert.equal(response.body.locked,false);
});
