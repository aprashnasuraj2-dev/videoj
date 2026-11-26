import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNetwork} from '../index.js';
import {createSourceTools} from '../../sutra-source-tools/index.js';
import fixture from '../../../apps/sutra/src/fixtures/timing-source.json' with {type:'json'};

// These deterministic adversarial regressions exercise runtime control flow;
// they do not establish live model reasoning or factual product acceptance.
const graph=JSON.parse(fs.readFileSync(new URL('../../../apps/sutra/public/agents/source_learner.network.json',import.meta.url)));
const direct={...graph,max_steps:4,tools:[{...graph.tools[0],tools:[{url:'/api/source-tools'}]}]};
const source={...fixture.source,duration:20,cues:Array.from({length:6},(_,i)=>({id:'broad-'+i,start:i*2,end:i*2+1,text:'Shared broad marker '+i}))};
const catalog=[source];
function environment(){
 const local=createSourceTools(catalog),reads=[],receipts=[];
 return {reads,receipts,sourceTools:{origin:'https://sutra.test',sources:catalog,onReceipt:r=>receipts.push(r),fetchImpl:async(_url,opts)=>{
  const rpc=JSON.parse(opts.body);
  if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
  let result;
  if(rpc.method==='initialize')result={protocolVersion:'2025-06-18'};
  else if(rpc.method==='tools/list')result={tools:local.list()};
  else if(rpc.method==='tools/call'){reads.push(rpc.params.arguments);result={structuredContent:local.call(rpc.params.name,rpc.params.arguments),isError:false};}
  else throw Error('unexpected RPC');
  return Response.json({jsonrpc:'2.0',id:rpc.id,result});
 }}};
}
const search=(id,query)=>({id,type:'function',function:{name:'mcp_search_lesson',arguments:JSON.stringify({query})}});
const toolResponse=(...toolCalls)=>({content:'',toolCalls,finishReason:'tool_calls'});
const finalResponse={content:'This is a deterministic regression response, not a factual conclusion.',toolCalls:[],finishReason:'stop'};
function model(steps){
 let calls=0;
 return {mode:'scripted-test',chat({messages}){const step=steps[calls++];assert.ok(step,'unexpected model dispatch');return step(messages);}};
}
function refusal(messages){
 const response=JSON.parse(messages.filter(m=>m.role==='tool').at(-1).content);
 assert.equal(response.status,'refinement_required');
 assert.equal(response.code,'SOURCE_QUERY_TOO_BROAD');
 assert.equal(response.truthStatus,'unverified');
 assert.equal(response.truncated,true);
 assert.deepEqual(response.receipts,[]);
 assert.equal(Object.hasOwn(response,'matchCount'),false);
 return response;
}
test('locally refused broad search can be refined in a subsequent model round without leaking partial evidence',async()=>{
 const e=environment();
 const result=await runNetwork({definition:direct,request:'Find a marker',sourceTools:e.sourceTools,model:model([
  ()=>toolResponse(search('broad','broad marker')),
  m=>{refusal(m);assert.equal(e.reads.length,0);assert.deepEqual(e.receipts,[]);return toolResponse(search('narrow','broad marker 3'));},
  m=>{const evidence=JSON.parse(m.filter(x=>x.role==='tool').at(-1).content);assert.equal(evidence.truncated,false);assert.equal(evidence.receipts[0].cueId,'broad-3');return finalResponse;}
 ])});
 assert.equal(result.modelCalls,3);
 assert.deepEqual(e.reads,[{query:'broad marker 3'}]);
 assert.deepEqual(e.receipts.map(r=>r.cueId),['broad-3']);
 assert.equal(result.events.filter(x=>x.kind==='source_refinement_required').length,1);
});
test('a final answer without a successful refinement is rejected',async()=>{
 const e=environment();
 await assert.rejects(runNetwork({definition:direct,request:'Find a marker',sourceTools:e.sourceTools,model:model([
  ()=>toolResponse(search('broad','broad marker')),
  m=>{refusal(m);return finalResponse;}
 ])}),err=>err.code==='SOURCE_QUERY_TOO_BROAD');
 assert.deepEqual(e.reads,[]);assert.deepEqual(e.receipts,[]);
});
test('an empty later search does not resolve a broad search refusal',async()=>{
 const e=environment();
 await assert.rejects(runNetwork({definition:direct,request:'Find a marker',sourceTools:e.sourceTools,model:model([
  ()=>toolResponse(search('broad','broad marker')),
  m=>{refusal(m);return toolResponse(search('empty','not in catalog'));},
  m=>{assert.deepEqual(JSON.parse(m.filter(x=>x.role==='tool').at(-1).content).receipts,[]);return finalResponse;}
 ])}),err=>err.code==='SOURCE_QUERY_TOO_BROAD');
 assert.equal(e.reads.length,1);assert.deepEqual(e.receipts,[]);
});
test('a successful search from the same model round cannot resolve a broad search refusal',async()=>{
 const e=environment();
 await assert.rejects(runNetwork({definition:direct,request:'Find a marker',sourceTools:e.sourceTools,model:model([
  ()=>toolResponse(search('broad','broad marker'),search('narrow','broad marker 3')),
  ()=>finalResponse
 ])}),err=>err.code==='SOURCE_QUERY_TOO_BROAD');
 assert.deepEqual(e.reads,[{query:'broad marker 3'}]);assert.equal(e.receipts.length,1);
});
test('repeated broad refusals consume the bounded refinement allowance and stop without tool reads',async()=>{
 const e=environment();
 await assert.rejects(runNetwork({definition:direct,request:'Find a marker',sourceTools:e.sourceTools,model:model([
  ()=>toolResponse(search('a','broad marker')),
  m=>{refusal(m);return toolResponse(search('b','broad marker'));},
  m=>{refusal(m);return toolResponse(search('c','broad marker'));}
 ])}),err=>err.code==='SOURCE_QUERY_TOO_BROAD'&&err.diagnostics.modelCalls===3);
 assert.deepEqual(e.reads,[]);assert.deepEqual(e.receipts,[]);
});
