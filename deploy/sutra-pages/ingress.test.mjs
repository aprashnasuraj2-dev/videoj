import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {onRequest} from './functions/api/[[path]].js';
import worker from '../../services/sutra-api/worker.js';
const base='https://sutra.aafnaipatro.com', req=(path,init)=>new Request(base+path,init);
test('private Worker config does not expose workers.dev or activate inference',async()=>{
 const cfg=JSON.parse(await readFile(new URL('../../services/sutra-api/wrangler.private.jsonc',import.meta.url)));
 const pages=JSON.parse(await readFile(new URL('./wrangler.jsonc',import.meta.url)));
 assert.equal(cfg.workers_dev,false);assert.equal(cfg.preview_urls,false);assert.equal(cfg.vars.SUTRA_ENABLE_INFERENCE,'false');assert.equal(cfg.assets,undefined);assert.equal(cfg.vars.SUTRA_PEER_ORIGINS,'https://sutra-guide.aafnaipatro.com');
 assert.deepEqual(pages.services,[{binding:'SUTRA_API',service:cfg.name}]);assert.equal(cfg.durable_objects.bindings[0].class_name,'InferenceQuota');
});
test('status and synthetic MCP use real Worker handler with original URL and headers',async()=>{
 let calls=0;const env={SUTRA_API:{fetch:r=>{calls++;return worker.fetch(r,{SUTRA_ENABLE_INFERENCE:'false'});}}};
 const status=await onRequest({request:req('/api/status'),env});assert.equal(status.status,200);assert.equal((await status.json()).inference,'disabled');assert.equal(status.headers.get('cache-control'),'no-store');
 const body={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'ingress-test',version:'1'}}};
 const mcp=await onRequest({request:req('/api/source-tools',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)}),env});
 assert.equal(mcp.status,200);assert.equal((await mcp.json()).result.protocolVersion,'2025-06-18');
 const denied=await onRequest({request:req('/api/source-tools',{method:'POST',headers:{Origin:'https://wrong.example','Content-Type':'application/json'},body:JSON.stringify(body)}),env});assert.equal(denied.status,403);
 assert.equal(calls,3);
});
test('only exact methods and paths reach service; no static fallback or retries',async()=>{
 let calls=0;const env={SUTRA_API:{fetch:()=>{calls++;throw Error('private canary');}}};
 for(const path of ['/','/api/unknown','/api/status?x=1','/api/status/','/api/%73tatus'])assert.equal((await onRequest({request:req(path),env})).status,404);
 assert.equal((await onRequest({request:req('/api/infer'),env})).status,405);
 assert.equal(calls,0);
 const result=await onRequest({request:req('/api/status'),env});assert.equal(result.status,502);assert.equal(calls,1);assert.ok(!(await result.text()).includes('private canary'));
 assert.equal((await onRequest({request:req('/api/status'),env:{}})).status,503);
});

test('media, content and ordinary static routes cannot reach the private API service binding',async()=>{
 const pages=JSON.parse(await readFile(new URL('./wrangler.jsonc',import.meta.url)));
 const workerAssets=JSON.parse(await readFile(new URL('../../services/sutra-api/wrangler.jsonc',import.meta.url))).assets;
 assert.deepEqual(workerAssets.run_worker_first,['/api/*'],'Worker-first execution must stay API-only');
 assert.equal(pages.pages_build_output_dir,'./dist');
 assert.deepEqual(pages.services,[{binding:'SUTRA_API',service:'sutra-api-private'}]);
 let calls=0;
 const env={SUTRA_API:{fetch(){calls++;throw Error('static/media route reached private service');}}};
 for(const path of [
  '/',
  '/index.html',
  '/assets/app-deadbeef.js',
  '/content/source-catalog.json',
  '/agents/agent-manifest.json',
  '/media/timing-fixture.mp4',
  '/media/release/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/lesson.mp4'
 ]){
  const response=await onRequest({request:req(path),env});
  assert.equal(response.status,404,path);
 }
 assert.equal(calls,0,'non-API routes must never invoke the private service binding');
});
test('SSE streaming is passed without buffering, preserved request and no-store',async()=>{
 const original=req('/api/infer',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:'{}'});
 let controller;const stream=new ReadableStream({start:c=>controller=c});const encoder=new TextEncoder();
 const env={SUTRA_API:{fetch:r=>{assert.equal(r,original);return new Response(stream,{headers:{'Content-Type':'text/event-stream'}});}}};
 const result=await onRequest({request:original,env});assert.equal(result.headers.get('content-type'),'text/event-stream');assert.equal(result.headers.get('cache-control'),'no-store');
 const reader=result.body.getReader();controller.enqueue(encoder.encode('data: first\n\n'));assert.equal(new TextDecoder().decode((await reader.read()).value),'data: first\n\n');controller.close();assert.equal((await reader.read()).done,true);
});

test('candidate service binding does not allow an arbitrary forwarded hostname',async()=>{
 const request=new Request('https://sutra.aafnaipatro.com/api/source-tools',{method:'POST',headers:{Origin:'https://wrong.example','Content-Type':'application/json','X-Forwarded-Host':'sutra.aafnaipatro.com'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize'})});
 const response=await onRequest({request,env:{SUTRA_API:{fetch:r=>worker.fetch(r,{SUTRA_ENABLE_INFERENCE:'false'})}}});
 assert.equal(response.status,403);
});

test('Worker asset response cache policy rejects partial, mutable and ambiguous reviewed media',async()=>{
 const hash='a'.repeat(64),prefix='/media/release/'+hash,immutable='public, max-age=31536000, immutable',mutable='public, max-age=0, must-revalidate';
 for(const [path,status,range,expected] of [
  [prefix+'/lesson.mp4',200,null,immutable],
  [prefix+'/lesson.webm?v='+hash,200,null,immutable],
  [prefix+'/lesson.mp4?v='+hash+'&v='+hash,200,null,mutable],
  [prefix+'/captions.vtt?v='+hash,200,null,mutable],
  [prefix+'/poster.svg?v='+hash,200,null,mutable],
  [prefix+'/lesson.mp4',206,'bytes 0-1/10',mutable],
  [prefix+'/lesson.mp4',200,'bytes 0-1/10',mutable],
  ['/assets/index-hash.js',200,'bytes 0-1/10',mutable],
  [prefix+'/lesson.mp4',404,null,mutable]
 ]){
  const response=await worker.fetch(req(path),{ASSETS:{fetch:()=>new Response('xx',{status,headers:range?{'Content-Range':range}:{}})}});
  assert.equal(response.status,status,path);
  assert.equal(response.headers.get('cache-control'),expected,path);
  assert.equal(await response.text(),'xx',path);
 }
});

test('published router path reaches the exact same disabled inference handler as the legacy alias',async()=>{
 const seen=[];const env={SUTRA_API:{fetch:r=>{seen.push(r);return worker.fetch(r,{SUTRA_ENABLE_INFERENCE:'false'});}}};
 for(const path of ['/api/infer','/api/v1/chat/completions']){
  const original=req(path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Sutra-Inference-Contract':'a'.repeat(64)},body:'{}'});
  const result=await onRequest({request:original,env});
  assert.equal(result.status,503);assert.match(await result.text(),/DISABLED/);assert.equal(seen.at(-1),original);
 }
 assert.equal(seen.length,2);
 for(const path of ['/api/v1/chat/completions?x=1','/api/v1/chat/completions/','/api/v1/chat/%63ompletions'])assert.equal((await onRequest({request:req(path,{method:'POST'}),env})).status,404);
 assert.equal((await onRequest({request:req('/api/v1/chat/completions'),env})).status,405);
 assert.equal(seen.length,2);
});
test('ingress cancellation during binding response wait disposes late body without exposing stale success',async()=>{
 const controller=new AbortController();let enter,resolve,cancelled=0,contacts=0;
 const ready=new Promise(r=>{enter=r;});
 const pending=onRequest({request:req('/api/status',{signal:controller.signal}),env:{SUTRA_API:{fetch(){contacts++;enter();return new Promise(r=>{resolve=r;});}}}});
 await ready;controller.abort();
 assert.equal((await pending).status,499);
 resolve(new Response(new ReadableStream({cancel(){cancelled++;}})));
 for(let i=0;i<30&&!cancelled;i++)await new Promise(r=>setTimeout(r,0));
 assert.equal(cancelled,1);assert.equal(contacts,1);
});
test('ingress never forwards unexpected binding redirects or substituted response identity',async()=>{
 for(const scenario of ['redirect','url','redirected']){
  let cancelled=0,contacts=0;
  const response=new Response(new ReadableStream({cancel(){cancelled++;}}),{status:scenario==='redirect'?307:200,headers:{Location:'https://not-approved.invalid/private'}});
  if(scenario==='url')Object.defineProperty(response,'url',{value:base+'/api/other'});
  if(scenario==='redirected')Object.defineProperty(response,'redirected',{value:true});
  const result=await onRequest({request:req('/api/status'),env:{SUTRA_API:{fetch(){contacts++;return response;}}}});
  assert.equal(result.status,502);assert.equal(result.headers.has('location'),false);assert.equal(cancelled,1);assert.equal(contacts,1);
 }
});

test('direct Worker and Pages both refuse query-bearing API routes',async()=>{
 for(const path of ['/api/status?x=1','/api/infer?x=1','/api/v1/chat/completions?x=1','/api/source-tools?x=1']){
  const original=req(path,{method:path.includes('status')?'GET':'POST'});
  let calls=0;
  const env={SUTRA_QUOTA:{idFromName(){calls++;throw Error('quota must not be contacted');}},ASSETS:{fetch(){calls++;throw Error('asset must not be contacted');}}};
  assert.equal((await worker.fetch(original,env)).status,404);assert.equal(calls,0);
 }
});
