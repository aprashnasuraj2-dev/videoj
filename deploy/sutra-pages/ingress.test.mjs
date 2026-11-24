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
 const body={jsonrpc:'2.0',id:1,method:'initialize'};
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
