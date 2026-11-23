import test from 'node:test';
import assert from 'node:assert/strict';
import {runNetwork,compileNetwork} from '../index.js';
import {createConsentInspector} from '../../sutra-consent/index.js';

const target='https://read-only.example/mcp';
const schema={type:'object',properties:{query:{type:'string',minLength:1,maxLength:120}},required:['query'],additionalProperties:false};
const graph=()=>({metadata:{description:'Explicitly scoped external read-only MCP fixture.'},tools:[{
 name:'learner',
 function:{description:'Inspect a public read fixture.',parameters:{type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false}},
 instructions:'Only report actual read results and label outside records unverified.',
 tools:[{url:target}]
}]});
const inspector=decide=>createConsentInspector({decide:decide??(async()=>({decision:'allow',scope:'once'}))});
function mockTransport(requests,modify=()=>{}){
 return async(url,opts)=>{
  requests.push({url,opts,body:JSON.parse(opts.body)});
  const rpc=JSON.parse(opts.body);
  let response;
  switch(rpc.method){
   case 'initialize': response={protocolVersion:'2025-06-18',capabilities:{tools:{}}};break;
   case 'notifications/initialized': return new Response(null,{status:202});
   case 'tools/list': response={tools:[{name:'read_public',description:'Public read-only fixture',inputSchema:schema,annotations:{readOnlyHint:true,destructiveHint:false}}]};break;
   case 'tools/call': response={structuredContent:{version:1,truthStatus:'unverified',items:[{id:'public-record',excerpt:'Bounded externally sourced example text.'}]}};break;
   default:throw Error('Unknown fixture RPC method '+rpc.method);
  }
  const body={jsonrpc:'2.0',id:rpc.id,result:response};
  modify(body,rpc);
  return Response.json(body);
 };
}
function scripted(){
 let steps=0;
 return {mode:'scripted-test',async chat({messages,tools}){
  steps++;
  const previous=messages.find(message=>message.role==='tool');
  if(previous)return {content:'Third-party read completed: '+previous.content,toolCalls:[]};
  if(tools.length!==1)throw Error('Expected one scoped tool');
  return {content:'',toolCalls:[{id:'external-call-'+steps,type:'function',function:{name:'mcp_read_public',arguments:JSON.stringify({query:'public'})}}]};
 }};
}
function run(extra={}){return runNetwork({definition:graph(),request:'Inspect a public record.',model:scripted(),...extra});}

test('external MCP discovery and tool call have separate approval, and only credentialless protocol POSTs',async()=>{
 const requests=[],decisions=[];
 const consent=inspector(async intent=>{decisions.push(intent.kind);return {decision:'allow',scope:'once'};});
 const value=await run({thirdPartyMcp:{url:target,inspector:consent,fetchImpl:mockTransport(requests)}});
 assert.equal(value.agentCalls,1);assert.equal(value.modelCalls,2);
 assert.match(value.text,/third_party_unverified/);
 assert.equal(value.events.some(event=>JSON.stringify(event).includes('private-canary')),false);
 assert.deepEqual(decisions,['mcp_discovery','mcp_call']);
 assert.deepEqual(requests.map(r=>r.body.method),['initialize','notifications/initialized','tools/list','tools/call']);
 for(const request of requests){
  assert.equal(request.url,target);assert.equal(request.opts.method,'POST');assert.equal(request.opts.redirect,'error');
  assert.equal(request.opts.credentials,'omit');
  assert.match(request.opts.headers.Accept,/application\/json, text\/event-stream/);
  assert.equal(request.opts.headers['MCP-Protocol-Version'],'2025-06-18');
  assert.ok(!request.opts.headers.Authorization);
 }
 assert.equal(requests[3].body.params.name,'read_public');
 assert.deepEqual(requests[3].body.params.arguments,{query:'public'});
 assert.deepEqual(consent.exportEvents().filter(e=>e.type==='outcome').map(e=>e.status),['completed','completed']);
});

test('denying discovery before approval makes no external contact',async()=>{
 const requests=[],consent=inspector(async()=>({decision:'deny',scope:'once'}));
 await assert.rejects(run({thirdPartyMcp:{url:target,inspector:consent,fetchImpl:mockTransport(requests)}}),e=>e.code==='EXTERNAL_CONSENT_DENIED');
 assert.equal(requests.length,0);
});

test('denying the actual call cannot be replaced with a completed model answer',async()=>{
 const requests=[],decisions=[];
 const consent=inspector(async intent=>{decisions.push(intent.kind);return {decision:intent.kind==='mcp_call'?'deny':'allow',scope:'once'};});
 await assert.rejects(run({thirdPartyMcp:{url:target,inspector:consent,fetchImpl:mockTransport(requests)}}),e=>e.code==='EXTERNAL_CONSENT_DENIED');
 assert.deepEqual(decisions,['mcp_discovery','mcp_call']);
 assert.deepEqual(requests.map(x=>x.body.method),['initialize','notifications/initialized','tools/list']);
});

test('external MCP must be opt-in with exact endpoint and fixed read-only tool identity',async()=>{
 assert.throws(()=>compileNetwork(graph()),e=>e.code==='TOOLS');
 for(const bad of [
  {url:'https://read-only.example/mcp',fetchImpl:()=>{}},
  {url:'https://user:pass@read-only.example/mcp',inspector:inspector()},
  {url:'https://read-only.example/mcp?key=value',inspector:inspector()},
  {url:'http://read-only.example/mcp',inspector:inspector()},
  {url:'https://read-only.example/write',inspector:inspector()}
 ])await assert.rejects(run({thirdPartyMcp:bad}),e=>['MCP_CONFIG','MCP_URL'].includes(e.code));
 const altered=graph();altered.tools[0].tools=[{url:'https://other.example/mcp'}];
 await assert.rejects(run({definition:altered,thirdPartyMcp:{url:target,inspector:inspector()}}),e=>e.code==='TOOLS');
});

test('unexpected discovered write tool and unknown protocol version fail closed',async()=>{
 for(const modify of [
  (body,rpc)=>{if(rpc.method==='tools/list')body.result.tools[0].annotations.readOnlyHint=false;},
  (body,rpc)=>{if(rpc.method==='initialize')body.result.protocolVersion='2026-07-28';}
 ]){
  const requests=[];await assert.rejects(run({thirdPartyMcp:{url:target,inspector:inspector(),fetchImpl:mockTransport(requests,modify)}}),e=>e.code==='EXTERNAL_CONTACT_FAILED');
  assert.ok(requests.length<=3);
  assert.ok(!requests.some(req=>req.body.method==='tools/call'));
 }
});

test('RPC ID mismatch, HTML and oversized response never yield a completed read',async()=>{
 for(const transform of [
  (body,rpc)=>{if(rpc.method==='tools/call')body.id=999;},
  (body,rpc)=>{if(rpc.method==='tools/call')body.result.structuredContent.items[0].excerpt='x'.repeat(40000);}
 ]){
  const requests=[];await assert.rejects(run({thirdPartyMcp:{url:target,inspector:inspector(),fetchImpl:mockTransport(requests,transform)}}),e=>e.code==='EXTERNAL_CONTACT_FAILED');
 }
 const requests=[];
 await assert.rejects(run({thirdPartyMcp:{url:target,inspector:inspector(),fetchImpl:async(url,opts)=>{
  requests.push(JSON.parse(opts.body).method);return new Response('<html>untrusted</html>',{headers:{'Content-Type':'text/html'}});
 }}}),e=>e.code==='EXTERNAL_CONTACT_FAILED');
 assert.equal(requests.length,1);
});

test('cancelling a non-cooperating read-only transport settles the invocation',async()=>{
 const controller=new AbortController(),requests=[];
 const promise=run({signal:controller.signal,thirdPartyMcp:{url:target,inspector:inspector(),fetchImpl:async(url,opts)=>{requests.push(opts);return new Promise(()=>{});}}});
 setTimeout(()=>controller.abort(),15);
 await assert.rejects(promise);
 assert.equal(requests.length,1);
});
