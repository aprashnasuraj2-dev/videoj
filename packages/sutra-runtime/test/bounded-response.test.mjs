import test from 'node:test';
import assert from 'node:assert/strict';
import {readBoundedResponse} from '../bounded-response.js';
import {createExternalReadMcp} from '../external-mcp.js';
import {createSourceMcp} from '../source-mcp.js';
import {createConsentInspector} from '../../sutra-consent/index.js';
import {createSourceTools} from '../../sutra-source-tools/index.js';
const origin='https://sutra.example',url=origin+'/api/source-tools';
const later=()=>new Promise(resolve=>setTimeout(resolve,0));
const waitFor=async predicate=>{for(let n=0;n<100&&!predicate();n++)await later();assert.ok(predicate(),'asynchronous fixture did not reach expected boundary');};
const headers={'Content-Type':'application/json'};
test('shared transport cancels late headers, held body and skipped notification bodies',async()=>{
 for(const phase of ['headers','body','skip']){
  let release,started=false,cancelled=0;
  const controller=new AbortController(),response=new Response(new ReadableStream({cancel(){cancelled++;}}),{headers});
  const pending=readBoundedResponse({url,signal:controller.signal,maxBytes:32,init:{method:'GET',credentials:'include',redirect:'follow'},inspect:()=>phase!=='skip',fetchImpl:async(_url,opts)=>{
   started=true;assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');
   if(phase==='headers')return new Promise(resolve=>{release=resolve;});return response;
  }});
  await waitFor(()=>started);
  if(phase==='skip')assert.equal((await pending).bytes,null);
  else{controller.abort();await assert.rejects(pending,e=>e.code==='ABORTED');release?.(response);}
  await waitFor(()=>cancelled===1);assert.equal(response.body.locked,false);
 }
});
test('shared transport rejects cross-resource, over-limit and partial data without retained readers',async()=>{
 const cases=[
  [new Response('x'.repeat(33),{headers}),'SIZE'],
  [Object.defineProperty(new Response('ok',{headers}),'url',{value:origin+'/different'}),'REDIRECT'],
  [new Response('ok',{headers:{...headers,'Content-Length':'1000'}}),'SIZE']
 ];
 for(const [response,code] of cases){await assert.rejects(readBoundedResponse({url,maxBytes:32,inspect:()=>true,fetchImpl:async()=>response}),e=>e.code===code);assert.equal(response.body.locked,false);}
});
const catalog=()=>[{id:'lesson',version:'v1',hash:'a'.repeat(64),mediaHash:'b'.repeat(64),duration:10,cues:[{id:'cue',start:2,end:4,text:'Exact public source.'}]}];
function sourceTransport(sources,requests,{holdInitialize=false}={}){
 const local=createSourceTools(sources);let release;
 return {release:()=>release?.(),fetch:async(_url,opts)=>{
  const rpc=JSON.parse(opts.body);requests.push(rpc);let result;
  if(rpc.method==='initialize'){if(holdInitialize)await new Promise(resolve=>{release=resolve;});result={protocolVersion:'2025-06-18'};}
  else if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
  else if(rpc.method==='tools/list')result={tools:local.list()};
  else if(rpc.method==='tools/call')result={structuredContent:local.call(rpc.params.name,rpc.params.arguments)};
  else throw Error('unexpected method');
  return Response.json({jsonrpc:'2.0',id:rpc.id,result});
 }};
}
test('source handshake is single-flight and receipt comparison uses original indexed catalog',async()=>{
 const sources=catalog(),requests=[],transport=sourceTransport(sources,requests,{holdInitialize:true});
 const client=createSourceMcp({origin,sources,fetchImpl:transport.fetch});
 const a=client.listTools(),b=client.callTool('read_cue',{sourceId:'lesson',cueId:'cue'});
 await waitFor(()=>requests.length===1);sources[0].cues[0].text='Mutated after registration';transport.release();
 const [tools,result]=await Promise.all([a,b]);assert.equal(tools.length,2);assert.equal(JSON.parse(result).receipts[0].excerpt,'Exact public source.');
 assert.equal(requests.filter(r=>r.method==='initialize').length,1);assert.equal(requests.filter(r=>r.method==='notifications/initialized').length,1);
});
test('source RPC abort disposes a noncooperative late response without sending notification',async()=>{
 const controller=new AbortController(),requests=[];let release,cancelled=0;
 const client=createSourceMcp({origin,sources:catalog(),signal:controller.signal,fetchImpl:async(_url,opts)=>{
  requests.push(JSON.parse(opts.body));return new Promise(resolve=>{release=resolve;});
 }});
 const pending=client.listTools();await waitFor(()=>requests.length===1);controller.abort();await assert.rejects(pending,e=>e.code==='SOURCE_CANCELLED');
 release(new Response(new ReadableStream({cancel(){cancelled++;}}),{headers}));await waitFor(()=>cancelled===1);
 assert.deepEqual(requests.map(r=>r.method),['initialize']);
});
const externalUrl='https://read-only.example/mcp',schema={type:'object',properties:{query:{type:'string',minLength:1,maxLength:120}},required:['query'],additionalProperties:false};
const externalResponse=(rpc)=>rpc.method==='notifications/initialized'?new Response(null,{status:202}):Response.json({jsonrpc:'2.0',id:rpc.id,result:rpc.method==='initialize'?{protocolVersion:'2025-06-18',capabilities:{tools:{}}}:rpc.method==='tools/list'?{tools:[{name:'read_public',inputSchema:schema,annotations:{readOnlyHint:true}}]}:{structuredContent:{version:1,truthStatus:'unverified',items:[{id:'example',excerpt:'Public response.'}]}}});
test('external MCP snapshots query before discovery, shares handshake and binds consent endpoint',async()=>{
 const requests=[],intents=[];let release;
 const inspector=createConsentInspector({decide:async intent=>{intents.push(intent);if(intent.kind==='mcp_discovery')await new Promise(resolve=>{release=resolve;});return 'allow';}});
 const client=createExternalReadMcp({url:externalUrl,inspector,fetchImpl:async(_url,opts)=>{const rpc=JSON.parse(opts.body);requests.push(rpc);return externalResponse(rpc);}});
 const args={query:'original public query'},a=client.callTool('read_public',args),b=client.listTools();
 await waitFor(()=>!!release);args.query='mutated query';release();
 const [value,tools]=await Promise.all([a,b]);assert.equal(tools.length,1);assert.match(value,/third_party_unverified/);
 assert.deepEqual(requests.map(r=>r.method),['initialize','notifications/initialized','tools/list','tools/call']);
 assert.equal(requests.at(-1).params.arguments.query,'original public query');
 assert.ok(intents.every(intent=>intent.resource===externalUrl));assert.equal(intents.length,2);
});
test('external MCP revocation before decision or during transport cannot send a subsequent RPC',async()=>{
 for(const phase of ['approval','transport']){
  const controller=new AbortController(),requests=[];let decision,release,cancelled=0;
  const inspector=createConsentInspector({decide:async()=>phase==='approval'?new Promise(resolve=>{decision=resolve;}):'allow'});
  const client=createExternalReadMcp({url:externalUrl,inspector,fetchImpl:async(_url,opts)=>{requests.push(JSON.parse(opts.body));return new Promise(resolve=>{release=resolve;});}},{signal:controller.signal});
  const pending=client.listTools();await waitFor(()=>phase==='approval'?!!decision:requests.length===1);
  inspector.clearSession();await assert.rejects(pending);decision?.({decision:'allow',scope:'session'});
  release?.(new Response(new ReadableStream({cancel(){cancelled++;}}),{headers}));
  if(phase==='transport')await waitFor(()=>cancelled===1);
  assert.equal(requests.length,phase==='approval'?0:1);assert.ok(!inspector.exportEvents().some(x=>x.status==='completed'));
 }
});

import {loadLocalNetwork,loadPeerNetwork} from '../index.js';
const baseUrl=origin+'/agents/';
const manifest=()=>Response.json({networks:[{name:'learner',front_man:'learner',hocon:'graph.json'}]});
const graph=()=>Response.json({metadata:{description:'Bounded fixture'},tools:[{name:'learner',function:{description:'Fixture',parameters:{type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false}},instructions:'Answer.',tools:[]}]});
test('local loader cancels late headers and held bodies, retains timeout reason and sends no graph GET',async()=>{
 for(const phase of ['headers','body']){
  let release,started=false,cancelled=0,calls=0;
  const response=new Response(new ReadableStream({cancel(){cancelled++;}}),{headers});
  const pending=loadLocalNetwork({baseUrl,expectedOrigin:origin,timeoutMs:35,fetchImpl:async()=>{calls++;started=true;if(phase==='headers')return new Promise(resolve=>{release=resolve;});return response;}});
  await waitFor(()=>started);await assert.rejects(pending,e=>e.code==='ARTIFACT_TIMEOUT'&&e.readAttempts[0].status==='cancelled');
  release?.(response);await waitFor(()=>cancelled===1);assert.equal(calls,1);assert.equal(response.body.locked,false);
 }
});
test('local loader rejects partial JSON and same-origin resource substitution; only explicit 503 retries',async()=>{
 for(const response of [new Response('{}',{status:206,headers}),Object.defineProperty(manifest(),'url',{value:baseUrl+'other.json'})]){
  let calls=0;
  await assert.rejects(loadLocalNetwork({baseUrl,expectedOrigin:origin,retryUnavailableReads:true,fetchImpl:async()=>{calls++;return response;}}),e=>['ARTIFACT_RESPONSE','ARTIFACT_ORIGIN'].includes(e.code));
  assert.equal(calls,1);assert.equal(response.body.locked,false);
 }
 let calls=0,cancelled=0;
 const result=await loadLocalNetwork({baseUrl,expectedOrigin:origin,retryUnavailableReads:true,fetchImpl:async()=>{calls++;if(calls===1)return new Response(new ReadableStream({cancel(){cancelled++;}}),{status:503});return calls===2?manifest():graph();}});
 assert.equal(calls,3);assert.equal(cancelled,1);assert.deepEqual(result.readAttempts.map(x=>x.status),['unavailable','completed','completed']);
});
test('human peer approval time is separate from each GET deadline within the overall budget',async()=>{
 const approvals=[],calls=[];
 const inspector=createConsentInspector({decide:async intent=>{approvals.push(intent.kind);await new Promise(resolve=>setTimeout(resolve,40));return 'allow';}});
 const result=await loadPeerNetwork({peerUrl:baseUrl+'learner',inspector,timeoutMs:1000,contactTimeoutMs:20,fetchImpl:async url=>{calls.push(url);return calls.length===1?manifest():graph();}});
 assert.equal(result.name,'learner');assert.deepEqual(approvals,['peer_manifest','peer_graph']);assert.equal(calls.length,2);
});
test('approved peer GET times out without waiting for noncooperative transport and disposes late body',async()=>{
 let release,cancelled=0,calls=0;
 const inspector=createConsentInspector({decide:async()=> 'allow'});
 const pending=loadPeerNetwork({peerUrl:baseUrl+'learner',inspector,timeoutMs:1000,contactTimeoutMs:30,fetchImpl:async()=>{calls++;return new Promise(resolve=>{release=resolve;});}});
 await waitFor(()=>calls===1);await assert.rejects(pending,e=>e.code==='MANIFEST_UNAVAILABLE');
 release(new Response(new ReadableStream({cancel(){cancelled++;}}),{headers}));await waitFor(()=>cancelled===1);assert.equal(calls,1);
});

test('external MCP discloses exact query for each one-time decision without persisting it in consent events',async()=>{
 const intents=[],requests=[];
 const inspector=createConsentInspector({decide:async intent=>{
  intents.push(intent);
  if(intent.kind==='mcp_discovery')return {decision:'allow',scope:'session'};
  if(intent.preview['query text']==='private-canary changed')return 'deny';
  if(intent.preview['query text']==='invalid session attempt')return {decision:'allow',scope:'session'};
  return 'allow';
 }});
 const client=createExternalReadMcp({url:externalUrl,inspector,fetchImpl:async(_url,opts)=>{const rpc=JSON.parse(opts.body);requests.push(rpc);return externalResponse(rpc);}});
 await client.callTool('read_public',{query:' public exact  '});
 await client.callTool('read_public',{query:' public exact  '});
 await assert.rejects(client.callTool('read_public',{query:'private-canary changed'}),e=>e.code==='CONSENT_DENIED');
 await assert.rejects(client.callTool('read_public',{query:'invalid session attempt'}),e=>e.code==='DECISION_INVALID');
 const calls=intents.filter(i=>i.kind==='mcp_call');
 assert.equal(calls.length,4);assert.deepEqual(calls[0].scopeOptions,['once']);assert.equal(calls[0].preview['query text'],' public exact  ');
 assert.deepEqual(requests.filter(r=>r.method==='tools/call').map(r=>r.params.arguments.query),[' public exact  ',' public exact  ']);
 const events=JSON.stringify(inspector.exportEvents());assert.ok(!events.includes('public exact')&&!events.includes('private-canary')&&!events.includes('invalid session attempt'));
});
