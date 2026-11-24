import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {runNetwork,compileNetwork} from '../index.js';import {createSourceMcp} from '../source-mcp.js';import {createSourceScriptedModel} from '../testing.js';import {handleSourceTools} from '../../../services/sutra-api/worker.js';import fixture from '../../../apps/sutra/src/fixtures/timing-source.json' with {type:'json'};
const graph=JSON.parse(fs.readFileSync(new URL('../../../apps/sutra/public/agents/source_learner.network.json',import.meta.url)));const transport=async(url,opts)=>handleSourceTools(new Request(url,{...opts,headers:{...opts.headers,Origin:'https://sutra.test'}}));
const sourceTools={origin:'https://sutra.test',sources:[fixture.source],fetchImpl:transport};
test('reference runner delegates and invokes real source MCP twice',async()=>{const methods=[];const result=await runNetwork({definition:graph,request:'find timing',model:createSourceScriptedModel(),sourceTools:{...sourceTools,fetchImpl:async(url,opts)=>{methods.push(JSON.parse(opts.body).method);return transport(url,opts);}}});assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,5);assert.match(result.text,/Synthetic timing marker/);assert.match(result.text,/factual truth remains unverified/);assert.equal(methods.filter(m=>m==='tools/call').length,2);assert.ok(result.events.filter(e=>e.kind==='tool_result').length>=3);});
test('source MCP requires explicit host grant and exact fixed endpoint',()=>{assert.throws(()=>compileNetwork(graph));for(const url of ['https://evil.test/api/source-tools','/api/source-tools?url=evil','/api/arbitrary']){const g=structuredClone(graph);g.tools[1].tools=[{url}];assert.throws(()=>compileNetwork(g,{allowSourceTools:true}));}});
test('MCP response ID mismatch, extra tools and tampered receipts fail closed',async()=>{for(const change of [rpc=>{rpc.id=999;},rpc=>{if(rpc.result?.tools)rpc.result.tools.push({name:'fetch'});},rpc=>{if(rpc.result?.structuredContent)rpc.result.structuredContent.receipts[0].excerpt='invented';}]){const client=createSourceMcp({...sourceTools,fetchImpl:async(url,opts)=>{const response=await transport(url,opts);if(response.status===202)return response;const body=await response.json();change(body);return Response.json(body);}});await assert.rejects(async()=>{await client.listTools();await client.callTool('read_cue',{sourceId:fixture.source.id,cueId:'timing-marker'});});}});
test('MCP redirect/HTML fallback and oversized replies refused',async()=>{for(const response of [new Response('<html>oops</html>',{headers:{'Content-Type':'text/html'}}),new Response('x'.repeat(33000),{headers:{'Content-Type':'application/json'}})]){const client=createSourceMcp({...sourceTools,fetchImpl:async()=>response});await assert.rejects(client.listTools());}});
test('cancellation interrupts noncooperating source transport',async()=>{const abort=new AbortController();const client=createSourceMcp({...sourceTools,signal:abort.signal,fetchImpl:()=>new Promise(()=>{})});const pending=client.listTools();abort.abort();await assert.rejects(pending);});

test('unavailable source discovery and failed source calls terminate the whole composition',async()=>{for(const method of ['initialize','tools/call']){let calls=0;await assert.rejects(runNetwork({definition:graph,request:'find timing',model:createSourceScriptedModel(),sourceTools:{...sourceTools,fetchImpl:async(url,opts)=>{calls++;if(JSON.parse(opts.body).method===method)throw Error('private transport failure');return transport(url,opts);}}}),e=>e.code==='CAPABILITY_UNAVAILABLE'&&!e.message.includes('private'));assert.ok(calls>0);}});

test('source quota and availability failures preserve bounded failure codes through the runtime',async()=>{
 for(const [status,code] of [[429,'SOURCE_QUOTA'],[503,'SOURCE_UNAVAILABLE']]){
  let toolCalls=0;
  await assert.rejects(runNetwork({definition:graph,request:'find timing',model:createSourceScriptedModel(),sourceTools:{...sourceTools,fetchImpl:async(url,opts)=>{
   const method=JSON.parse(opts.body).method;
   if(method==='tools/call'){toolCalls++;return new Response('private source capacity detail',{status});}
   return transport(url,opts);
  }}}),e=>e.code===code&&!e.message.includes('private source capacity detail'));
  assert.equal(toolCalls,1);
 }
});

test('composition timeout while a source call is held does not become a source error or complete later',async()=>{
 let observed=0,deliver,receipts=0,late;
 const pending=runNetwork({definition:graph,request:'find timing',model:createSourceScriptedModel(),limits:{timeoutMs:200},sourceTools:{...sourceTools,onReceipt(){receipts++;},fetchImpl:async(url,opts)=>{
  if(JSON.parse(opts.body).method==='tools/call'){
   observed++;late=await transport(url,opts);return new Promise(r=>deliver=r);
  }
  return transport(url,opts);
 }}});
 await assert.rejects(pending,e=>e.code==='TIMEOUT'&&e.diagnostics.reason==='TIMEOUT');
 assert.equal(observed,1);assert.equal(receipts,0);
 deliver(late);await new Promise(r=>setTimeout(r,0));assert.equal(receipts,0,'late valid response cannot enter stopped composition');assert.equal(observed,1);
});
