import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {runNetwork,compileNetwork} from '../index.js';import {createSourceMcp} from '../source-mcp.js';import {createSourceScriptedModel} from '../testing.js';import {handleSourceTools} from '../../../services/sutra-api/worker.js';import fixture from '../../../apps/sutra/src/fixtures/timing-source.json' with {type:'json'};
const graph=JSON.parse(fs.readFileSync(new URL('../../../apps/sutra/public/agents/source_learner.network.json',import.meta.url)));const transport=async(url,opts)=>handleSourceTools(new Request(url,{...opts,headers:{...opts.headers,Origin:'https://sutra.test'}}));
const sourceTools={origin:'https://sutra.test',sources:[fixture.source],fetchImpl:transport};
test('reference runner delegates and invokes real source MCP twice',async()=>{const methods=[];const result=await runNetwork({definition:graph,request:'find timing',model:createSourceScriptedModel(),sourceTools:{...sourceTools,fetchImpl:async(url,opts)=>{methods.push(JSON.parse(opts.body).method);return transport(url,opts);}}});assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,5);assert.match(result.text,/Synthetic timing marker/);assert.match(result.text,/factual truth remains unverified/);assert.equal(methods.filter(m=>m==='tools/call').length,2);assert.ok(result.events.filter(e=>e.kind==='tool_result').length>=3);});
test('source MCP requires explicit host grant and exact fixed endpoint',()=>{assert.throws(()=>compileNetwork(graph));for(const url of ['https://evil.test/api/source-tools','/api/source-tools?url=evil','/api/arbitrary']){const g=structuredClone(graph);g.tools[1].tools=[{url}];assert.throws(()=>compileNetwork(g,{allowSourceTools:true}));}});
test('MCP response ID mismatch, extra tools and tampered receipts fail closed',async()=>{for(const change of [rpc=>{rpc.id=999;},rpc=>{if(rpc.result?.tools)rpc.result.tools.push({name:'fetch'});},rpc=>{if(rpc.result?.structuredContent)rpc.result.structuredContent.receipts[0].excerpt='invented';}]){const client=createSourceMcp({...sourceTools,fetchImpl:async(url,opts)=>{const response=await transport(url,opts);if(response.status===202)return response;const body=await response.json();change(body);return Response.json(body);}});await assert.rejects(async()=>{await client.listTools();await client.callTool('read_cue',{sourceId:fixture.source.id,cueId:'timing-marker'});});}});
test('MCP redirect/HTML fallback and oversized replies refused',async()=>{for(const response of [new Response('<html>oops</html>',{headers:{'Content-Type':'text/html'}}),new Response('x'.repeat(33000),{headers:{'Content-Type':'application/json'}})]){const client=createSourceMcp({...sourceTools,fetchImpl:async()=>response});await assert.rejects(client.listTools());}});
test('cancellation interrupts noncooperating source transport',async()=>{const abort=new AbortController();const client=createSourceMcp({...sourceTools,signal:abort.signal,fetchImpl:()=>new Promise(()=>{})});const pending=client.listTools();abort.abort();await assert.rejects(pending);});

test('unavailable source discovery and failed source calls terminate the whole composition',async()=>{for(const method of ['initialize','tools/call']){let calls=0;await assert.rejects(runNetwork({definition:graph,request:'find timing',model:createSourceScriptedModel(),sourceTools:{...sourceTools,fetchImpl:async(url,opts)=>{calls++;if(JSON.parse(opts.body).method===method)throw Error('private transport failure');return transport(url,opts);}}}),e=>e.code==='CAPABILITY_UNAVAILABLE'&&!e.message.includes('private'));assert.ok(calls>0);}});

test('transient read transport failure retries once and records sanitized attempt counts',async()=>{
 let injected=false;const methods=[];
 const result=await runNetwork({definition:graph,request:'find timing',model:createSourceScriptedModel(),sourceTools:{...sourceTools,fetchImpl:async(url,opts)=>{
  const method=JSON.parse(opts.body).method;methods.push(method);
  if(method==='tools/call'&&!injected){injected=true;throw Error('synthetic-private-transient');}
  return transport(url,opts);
 }}});
 assert.match(result.text,/Synthetic timing marker/);
 assert.equal(methods.filter(m=>m==='tools/call').length,3,'two logical reads plus one retry');
 const attempts=result.events.filter(e=>e.kind==='source_attempt'&&e.tool==='tools/call');
 assert.ok(attempts.some(e=>e.attempt===2&&e.maxAttempts===2));
 assert.ok(attempts.every(e=>e.attempt>=1&&e.attempt<=2&&e.maxAttempts===2));
 assert.ok(!JSON.stringify(result.events).includes('synthetic-private-transient'));
});
test('5xx source response retries once but malformed successful data does not retry',async()=>{
 let first503=true;const attempts=[];
 const client=createSourceMcp({...sourceTools,onAttempt:e=>attempts.push(e),fetchImpl:async(url,opts)=>{
  const method=JSON.parse(opts.body).method;
  if(method==='initialize'&&first503){first503=false;return new Response('',{status:503});}
  return transport(url,opts);
 }});
 await client.listTools();
 assert.deepEqual(attempts.filter(e=>e.method==='initialize').map(e=>e.attempt),[1,2]);

 const malformedAttempts=[];const malformed=createSourceMcp({...sourceTools,onAttempt:e=>malformedAttempts.push(e),fetchImpl:async()=>new Response('<html>bad</html>',{status:200,headers:{'Content-Type':'text/html'}})});
 await assert.rejects(malformed.listTools());
 assert.deepEqual(malformedAttempts.map(e=>e.attempt),[1],'schema/content failure must not be retried');
});
