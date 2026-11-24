import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createSourceMcp} from '../source-mcp.js';import {createSourceTools} from '../../sutra-source-tools/index.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../../../apps/sutra/src/fixtures/timing-source.json',import.meta.url)));
const catalog=[fixture.source],tools=createSourceTools(catalog);
function client(mutate,seen){return createSourceMcp({origin:'https://sutra.test',sources:catalog,onReceipt:r=>seen.push(r),fetchImpl:async(url,opts)=>{
 const rpc=JSON.parse(opts.body);if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
 let result;if(rpc.method==='initialize')result={protocolVersion:'2025-06-18'};else if(rpc.method==='tools/list')result={tools:tools.list()};else {const output=tools.call(rpc.params.name,rpc.params.arguments);mutate?.(output);result={structuredContent:output,isError:false};}
 return Response.json({jsonrpc:'2.0',id:rpc.id,result});
 }});}
test('source observer and model-facing result preserve validated completeness metadata only',async()=>{const seen=[];const c=client(null,seen);const text=await c.callTool('search_lesson',{query:'timing',sourceId:fixture.source.id,start:1,end:5});const parsed=JSON.parse(text);assert.equal(seen.length,1);assert.equal(seen[0].cueId,fixture.receipt.cueId);assert.equal(parsed.returnedCount,1);assert.equal(parsed.truncated,false);assert.deepEqual(parsed.filters,{sourceId:fixture.source.id,start:1,end:5});assert.deepEqual(Object.keys(parsed).sort(),['filters','receipts','returnedCount','truncated','truthStatus','version']);});
test('omitted, duplicated, reordered or inconsistent result is rejected before observer',async()=>{for(const mutation of [o=>o.receipts=[],o=>o.receipts.push(o.receipts[0]),o=>o.receipts[0].excerpt='changed']){const seen=[];await assert.rejects(client(mutation,seen).callTool('search_lesson',{query:'timing'}));assert.equal(seen.length,0);}});

test('tampered search completeness, filters or extra response fields are rejected before reaching the model',async()=>{
 for(const mutation of [
  o=>{o.returnedCount=0;},
  o=>{o.truncated=true;},
  o=>{o.filters={sourceId:'other'};},
  o=>{o.privateCanary='must-not-pass';}
 ]){
  const seen=[];await assert.rejects(client(mutation,seen).callTool('search_lesson',{query:'timing',sourceId:fixture.source.id}));
  assert.equal(seen.length,0);
 }
});

test('source MCP maps bounded HTTP capacity states without exposing response bodies',async()=>{
 for(const [status,code] of [[429,'SOURCE_QUOTA'],[503,'SOURCE_UNAVAILABLE'],[409,'SOURCE_VERSION']]){
  let calls=0;
  const d=createSourceMcp({origin:'https://sutra.test',sources:catalog,fetchImpl:async(_url,opts)=>{
   const rpc=JSON.parse(opts.body);calls++;
   if(rpc.method==='initialize')return Response.json({jsonrpc:'2.0',id:rpc.id,result:{protocolVersion:'2025-06-18'}});
   if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
   if(rpc.method==='tools/list')return Response.json({jsonrpc:'2.0',id:rpc.id,result:{tools:tools.list()}});
   return new Response('private source capacity detail',{status});
  }});
  await assert.rejects(d.callTool('search_lesson',{query:'timing'}),e=>e.code===code&&!e.message.includes('private source capacity detail'));
  assert.equal(calls,3,'direct call initializes, acknowledges, then performs the failing tool call');
 }
});

test('source MCP enforces a run-wide unique receipt ceiling before hidden evidence can reach the model',async()=>{
 const source=structuredClone(fixture.source);
 source.duration=12;
 source.cues.push({id:'second-cue',start:6,end:8,text:'Second bounded source cue.'});
 const local=createSourceTools([source]),seen=[];
 const client=createSourceMcp({origin:'https://sutra.test',sources:[source],maxReceipts:1,onReceipt:r=>seen.push(r),fetchImpl:async(_url,opts)=>{
  const rpc=JSON.parse(opts.body);
  if(rpc.method==='initialize')return Response.json({jsonrpc:'2.0',id:rpc.id,result:{protocolVersion:'2025-06-18'}});
  if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
  if(rpc.method==='tools/list')return Response.json({jsonrpc:'2.0',id:rpc.id,result:{tools:local.list()}});
  if(rpc.method==='tools/call'){const output=local.call(rpc.params.name,rpc.params.arguments);return Response.json({jsonrpc:'2.0',id:rpc.id,result:{content:[{type:'text',text:JSON.stringify(output)}],structuredContent:output,isError:false}});}
  throw Error('unexpected RPC');
 }});
 await client.callTool('read_cue',{sourceId:source.id,cueId:source.cues[0].id});
 assert.equal(seen.length,1);
 await assert.rejects(client.callTool('read_cue',{sourceId:source.id,cueId:'second-cue'}),e=>e.code==='SOURCE_EVIDENCE_LIMIT');
 assert.equal(seen.length,1,'overflow receipt is rejected before the observer or model sees it');
});
test('source receipt ceiling cannot be disabled or raised above the host maximum',()=>{
 for(const value of [0,21,1.5])assert.throws(()=>createSourceMcp({origin:'https://sutra.test',sources:catalog,maxReceipts:value}),e=>e.code==='SOURCE_CONFIG');
});

test('truncated source searches are rejected before any partial excerpt reaches the model or observer',async()=>{
 const source=structuredClone(fixture.source);source.duration=20;
 source.cues=Array.from({length:6},(_,i)=>({id:'broad-'+i,start:i*2,end:i*2+1,text:'Shared broad marker '+i}));
 const local=createSourceTools([source]),seen=[];
 const client=createSourceMcp({origin:'https://sutra.test',sources:[source],onReceipt:r=>seen.push(r),fetchImpl:async(_url,opts)=>{
  const rpc=JSON.parse(opts.body);
  if(rpc.method==='initialize')return Response.json({jsonrpc:'2.0',id:rpc.id,result:{protocolVersion:'2025-06-18'}});
  if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
  if(rpc.method==='tools/list')return Response.json({jsonrpc:'2.0',id:rpc.id,result:{tools:local.list()}});
  if(rpc.method==='tools/call'){const output=local.call(rpc.params.name,rpc.params.arguments);assert.equal(output.truncated,true);assert.equal(output.receipts.length,5);return Response.json({jsonrpc:'2.0',id:rpc.id,result:{content:[{type:'text',text:JSON.stringify(output)}],structuredContent:output,isError:false}});}
  throw Error('unexpected RPC');
 }});
 await assert.rejects(client.callTool('search_lesson',{query:'broad marker'}),e=>e.code==='SOURCE_QUERY_TOO_BROAD');
 assert.deepEqual(seen,[],'first five of a larger result set must not be exposed as if complete');
});
