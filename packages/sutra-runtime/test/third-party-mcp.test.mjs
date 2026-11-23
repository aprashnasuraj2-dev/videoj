import test from 'node:test';import assert from 'node:assert/strict';
import {createThirdPartyMcp} from '../third-party-mcp.js';
const schema={type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false};
function transport({calls=[],mutate}={}){
 return async(url,options)=>{
  const body=JSON.parse(options.body);calls.push({url,options,body});
  if(body.method==='notifications/initialized')return new Response(null,{status:202});
  let result;
  if(body.method==='initialize')result={protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}};
  else if(body.method==='tools/list')result={tools:[{name:'lookup',description:'Synthetic read.',inputSchema:schema}]};
  else if(body.method==='tools/call')result={structuredContent:{version:1,truthStatus:'unverified',echo:body.params.arguments}};
  else throw Error('unexpected method');
  let payload={jsonrpc:'2.0',id:body.id,result};if(mutate)payload=mutate(payload,body)??payload;
  return Response.json(payload);
 };
}
test('credentialless bounded MCP transport initializes, discovers and calls one read tool',async()=>{
 const calls=[];const client=createThirdPartyMcp({url:'https://mcp.example/mcp',fetchImpl:transport({calls})});
 assert.deepEqual((await client.listTools()).map(t=>t.name),['lookup']);
 assert.deepEqual(await client.callTool('lookup',{request:'hello'}),{version:1,truthStatus:'unverified',echo:{request:'hello'}});
 assert.deepEqual(calls.map(x=>x.body.method),['initialize','notifications/initialized','tools/list','tools/call']);
 for(const call of calls){assert.equal(call.url,'https://mcp.example/mcp');assert.equal(call.options.method,'POST');assert.equal(call.options.credentials,'omit');assert.equal(call.options.redirect,'error');assert.equal(call.options.headers.Authorization,undefined);assert.equal(call.options.headers['MCP-Protocol-Version'],'2025-06-18');}
});
test('protocol mismatch and JSON-RPC id mismatch fail closed',async()=>{
 const badProtocol=createThirdPartyMcp({url:'https://mcp.example/mcp',fetchImpl:transport({mutate:(payload,body)=>body.method==='initialize'?{...payload,result:{...payload.result,protocolVersion:'old'}}:payload})});
 await assert.rejects(badProtocol.listTools(),/Third-party MCP capability unavailable/);
 const badId=createThirdPartyMcp({url:'https://mcp.example/mcp',fetchImpl:transport({mutate:payload=>({...payload,id:999})})});
 await assert.rejects(badId.listTools(),/Third-party MCP capability unavailable/);
});
test('HTML, oversized and provider errors never become tool data',async()=>{
 for(const fetchImpl of [
  async()=>new Response('<html>secret</html>',{status:200,headers:{'Content-Type':'text/html'}}),
  async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{padding:'x'.repeat(40000)}}),{status:200,headers:{'Content-Type':'application/json'}}),
  async(url,opts)=>{const b=JSON.parse(opts.body);return Response.json({jsonrpc:'2.0',id:b.id,error:{code:-1,message:'synthetic-secret'}});}
 ]){
  const client=createThirdPartyMcp({url:'https://mcp.example/mcp',fetchImpl});await assert.rejects(client.listTools(),e=>!String(e.message).includes('synthetic-secret'));
 }
});
test('stalled transport is bounded by timeout and abort',async()=>{
 const client=createThirdPartyMcp({url:'https://mcp.example/mcp',timeoutMs:20,fetchImpl:()=>new Promise(()=>{})});const start=Date.now();await assert.rejects(client.listTools());assert.ok(Date.now()-start<1000);
 const controller=new AbortController();const client2=createThirdPartyMcp({url:'https://mcp.example/mcp',signal:controller.signal,fetchImpl:()=>new Promise(()=>{})});const job=client2.listTools();setTimeout(()=>controller.abort(),10);await assert.rejects(job);
});
test('unsafe endpoint forms and overlarge call bodies are rejected before contact',async()=>{
 for(const url of ['http://mcp.example/mcp','https://user:pass@mcp.example/mcp','https://mcp.example/mcp?q=x','ftp://mcp.example/mcp'])assert.throws(()=>createThirdPartyMcp({url}));
 let contacted=0;const client=createThirdPartyMcp({url:'https://mcp.example/mcp',fetchImpl:async()=>{contacted++;return Response.json({});}});
 await assert.rejects(client.callTool('lookup',{request:'x'.repeat(20000)}));assert.equal(contacted,0);
});
