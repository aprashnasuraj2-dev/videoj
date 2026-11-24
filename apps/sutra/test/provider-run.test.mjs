import test from 'node:test';import assert from 'node:assert/strict';import {createReceiptCollector,snapshotApprovedContract,discoverProvider,createBoundProviderTransport} from '../src/provider-run.js';

const receipt=(i,source='source')=>({version:1,sourceId:source,sourceVersion:'v1',sourceHash:'a'.repeat(64),mediaHash:'b'.repeat(64),cueId:'cue-'+i,start:i,end:i+1,excerpt:'cue '+i,retrievedAt:'2026-11-24T00:00:00Z',verification:'unverified'});

const sourcesFor=(...ids)=>ids.map(id=>({id,version:'v1',hash:'a'.repeat(64),mediaHash:'b'.repeat(64),duration:20,cues:Array.from({length:6},(_,i)=>({id:'cue-'+i,start:i,end:i+1,text:'cue '+i}))}));
test('receipt collector preserves bounded unique evidence and fails closed on the first hidden unique cue',()=>{
 const c=createReceiptCollector({sources:sourcesFor('source'),limit:3});
 assert.equal(c.add(receipt(0)),true);assert.equal(c.add(receipt(1)),true);
 assert.equal(c.add({...receipt(1),retrievedAt:'2026-11-24T00:00:01Z'}),true,'same source/cue refresh does not consume another slot');
 assert.equal(c.add(receipt(2)),true);assert.equal(c.add(receipt(3)),false);
 const out=c.snapshot();assert.equal(out.overflow,true);assert.equal(out.receipts.length,3);
 assert.deepEqual(out.receipts.map(x=>x.cueId),['cue-0','cue-1','cue-2']);
 assert.equal(out.receipts[1].retrievedAt,'2026-11-24T00:00:01Z');
 assert.ok(Object.isFrozen(out));assert.ok(Object.isFrozen(out.receipts));assert.ok(Object.isFrozen(out.receipts[0]));
});
test('receipt identity includes source as well as cue id and collector bounds are fixed',()=>{
 const c=createReceiptCollector({sources:sourcesFor('a','b'),limit:2});assert.equal(c.add(receipt(0,'a')),true);assert.equal(c.add(receipt(0,'b')),true);assert.equal(c.snapshot().overflow,false);
 assert.throws(()=>c.add(null),/Invalid receipt/);
 for(const n of [0,21,1.5])assert.throws(()=>createReceiptCollector({sources:sourcesFor('source'),limit:n}),/Invalid receipt limit/);
});

test('receipt collector independently refuses missing catalog, malformed, stale, tampered and self-verified records',()=>{
 assert.throws(()=>createReceiptCollector(),/data array/);
 assert.throws(()=>createReceiptCollector({sources:[]}),/catalog required/);
 for(const patch of [{sourceVersion:'v2'},{sourceHash:'c'.repeat(64)},{excerpt:'invented'},{sourceId:'another'},{verification:'verified'},{cueId:'absent'}]){
  const c=createReceiptCollector({sources:sourcesFor('source')});
  c.add(receipt(0));assert.throws(()=>c.add({...receipt(1),...patch}),/Invalid receipt/);
  const out=c.snapshot();assert.equal(out.invalid,true);assert.deepEqual(out.receipts,[receipt(0)]);
 }
});
test('receipt collector never invokes getters and owns its primitive receipt snapshot',()=>{
 let read=0;const bad={...receipt(1)};Object.defineProperty(bad,'excerpt',{enumerable:true,get(){read++;return 'cue 1';}});
 const c=createReceiptCollector({sources:sourcesFor('source')});assert.throws(()=>c.add(bad),/Invalid receipt/);assert.equal(read,0);
 const original=receipt(0);c.add(original);original.excerpt='private changed value';assert.deepEqual(c.snapshot().receipts,[receipt(0)]);assert.equal(c.snapshot().invalid,true);
});
test('receipt collector revalidates earlier receipts when mounted source identity drifts',()=>{
 const sources=sourcesFor('source');const c=createReceiptCollector({sources});c.add(receipt(0));
 sources[0].version='v2';const out=c.snapshot();assert.equal(out.invalid,true);assert.deepEqual(out.receipts,[]);
 sources[0].version='v1';assert.equal(c.snapshot().invalid,true,'invalid evidence state remains sticky even if caller restores catalog');
});

const approval=()=>({backend:'self_hosted',model:'local-model',inferenceContractId:'a'.repeat(64),router:'https://example.test/api/v1',content:{profileSha256:'b'.repeat(64),catalogSha256:'c'.repeat(64),transcriptSha256:'d'.repeat(64),contentVersion:'v1',contentMode:'synthetic',primarySourceId:'source'},graphUrl:'https://example.test/agents/graph.json',frontMan:'learner',graphSha256:'e'.repeat(64)});
test('approved contract snapshot is closed and unaffected by caller changes during discovery or model callbacks',()=>{
 const raw=approval(),expected=structuredClone(raw),snapshot=snapshotApprovedContract(raw);
 raw.inferenceContractId='f'.repeat(64);raw.content.catalogSha256='f'.repeat(64);raw.model='other';
 assert.deepEqual(snapshot,expected);assert.ok(Object.isFrozen(snapshot));assert.ok(Object.isFrozen(snapshot.content));
 for(const invalid of [{...approval(),secret:'private'},{...approval(),content:{...approval().content,secret:'private'}},{...approval(),inferenceContractId:'bad'}])assert.throws(()=>snapshotApprovedContract(invalid),e=>e.code==='CONTRACT_CHANGED');
 let getter=0;const bad=approval();Object.defineProperty(bad.content,'catalogSha256',{enumerable:true,get(){getter++;return 'c'.repeat(64);}});
 assert.throws(()=>snapshotApprovedContract(bad),e=>e.code==='CONTRACT_CHANGED');assert.equal(getter,0);
});
test('pre-aborted provider discovery never contacts status',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 await assert.rejects(discoverProvider({origin:'https://example.test',signal:c.signal,fetchImpl:async()=>{calls++;throw Error('unexpected');}}));
 assert.equal(calls,0);
});

test('provider status preflight refuses same-origin substituted URL, partial response and dishonest content type before additional GETs',async()=>{
 const valid={inference:'disabled',sourceTools:'catalog',content:{},factualTruth:'unverified'},base='https://example.test';
 for(const response of [
  Object.defineProperty(Response.json(valid),'url',{value:base+'/other-status'}),
  new Response(JSON.stringify(valid),{status:206,headers:{'Content-Type':'application/json'}}),
  new Response(JSON.stringify(valid),{headers:{'Content-Type':'text/html; application/json'}}),
  new Response(JSON.stringify(valid),{headers:{'Content-Type':'application/json','Content-Range':'bytes 0-8/9'}})
 ]){
  let calls=0;
  await assert.rejects(discoverProvider({origin:base,fetchImpl:async(url,opts)=>{
   calls++;assert.equal(url,base+'/api/status');assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');return response;
  }}));
  assert.equal(calls,1,'bad preflight cannot continue to a manifest or model');
  assert.equal(response.body.locked,false);
 }
});
test('provider status noncooperative transport disposes response after cancellation without further contact',async()=>{
 const controller=new AbortController(),base='https://example.test';
 let release,started=false,cancelled=0;
 const pending=discoverProvider({origin:base,signal:controller.signal,fetchImpl:async(url,opts)=>{
  assert.equal(url,base+'/api/status');assert.equal(opts.credentials,'omit');started=true;
  return new Promise(resolve=>{release=resolve;});
 }});
 for(let i=0;i<100&&!started;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(started,true);controller.abort();
 await assert.rejects(pending);
 release(new Response(new ReadableStream({cancel(){cancelled++;}}),{headers:{'Content-Type':'application/json'}}));
 for(let i=0;i<100&&!cancelled;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(cancelled,1);
});
test('provider disabled preflight uses one credentialless exact JSON request and no model call',async()=>{
 let calls=0,options;
 const output=await discoverProvider({origin:'https://example.test',fetchImpl:async(url,opts)=>{
  calls++;options=opts;assert.equal(url,'https://example.test/api/status');
  return Response.json({inference:'disabled',sourceTools:'catalog',content:{},factualTruth:'unverified'});
 }});
 assert.deepEqual(output,{state:'disabled'});assert.equal(calls,1);assert.equal(options.credentials,'omit');assert.equal(options.headers.Accept,'application/json');
});

test('provider POST transport refuses all undeclared cross-origin, non-POST and query-bearing calls before transport',async()=>{
 const origin='https://example.test',calls=[];
 const wrapped=createBoundProviderTransport({origin,approvedContract:approval(),fetchImpl:async(url,opts)=>{calls.push({url,opts});return Response.json({ok:true});}});
 for(const url of ['https://evil.example/api/source-tools',origin+'/api/status',origin+'/api/source-tools?token=canary',origin+'/api/v1/chat/completions#hidden',origin+'/api/source-tools/../status']){
  await assert.rejects(wrapped(url,{method:'POST'}),/PROVIDER_ROUTE/);
 }
 for(const options of [{method:'GET'},{method:'PATCH'},{method:'post'}])await assert.rejects(wrapped(origin+'/api/source-tools',options),/PROVIDER_ROUTE/);
 assert.equal(calls.length,0);
});
test('bounded provider POST adds exact version preconditions but never ambient credentials or extra router identity',async()=>{
 const origin='https://example.test',calls=[],rejections=[];
 const wrapped=createBoundProviderTransport({origin,approvedContract:approval(),onPrecondition:reason=>rejections.push(reason),fetchImpl:async(url,opts)=>{
  calls.push({url,opts});return new Response(null,{status:409,headers:{'X-Sutra-Precondition':url.endsWith('/completions')?'inference':'catalog'}});
 }});
 await wrapped(origin+'/api/source-tools',{method:'POST',headers:{Cookie:'synthetic-private-cookie',Authorization:'Bearer synthetic-secret','X-Sutra-Inference-Contract':'bad','X-Private-Key':'hidden-canary','MCP-Protocol-Version':'malicious','Content-Type':'application/json'},referrer:origin+'/private?secret=canary',referrerPolicy:'unsafe-url',keepalive:true});
 await wrapped(origin+'/api/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer synthetic-secret','Content-Type':'application/json'}});
 assert.deepEqual(rejections,['catalog','inference']);
 assert.equal(calls.length,2);
 for(const call of calls){
  assert.equal(call.opts.credentials,'omit');assert.equal(call.opts.redirect,'error');assert.equal(call.opts.cache,'no-store');
  assert.equal(call.opts.headers.get('Cookie'),null);assert.equal(call.opts.headers.get('Authorization'),null);assert.equal(call.opts.headers.get('X-Private-Key'),null);assert.equal(call.opts.referrer,'');assert.equal(call.opts.referrerPolicy,'no-referrer');assert.equal(call.opts.keepalive,undefined);
  assert.equal(call.opts.headers.get('X-Sutra-Catalog-Sha256'),'c'.repeat(64));
 }
 assert.equal(calls[0].opts.headers.get('X-Sutra-Inference-Contract'),null);assert.equal(calls[0].opts.headers.get('MCP-Protocol-Version'),'2025-06-18');assert.equal(calls[0].opts.headers.get('Accept'),'application/json, text/event-stream');
 assert.equal(calls[1].opts.headers.get('X-Sutra-Inference-Contract'),'a'.repeat(64));
});

test('bound POST refuses substituted response identity and disposes rejected bodies before ownership transfer',async()=>{
 const origin='https://example.test';
 for(const defect of ['url','redirect','callback']){
  let cancelled=0,observed=0;
  const response=new Response(new ReadableStream({cancel(){cancelled++;}}),{status:defect==='callback'?409:200});
  if(defect==='url')Object.defineProperty(response,'url',{value:origin+'/other'});
  if(defect==='redirect')Object.defineProperty(response,'redirected',{value:true});
  const wrapped=createBoundProviderTransport({origin,approvedContract:approval(),fetchImpl:async()=>response,onPrecondition:()=>{observed++;throw Error('observer failure');}});
  await assert.rejects(wrapped(origin+'/api/source-tools',{method:'POST'}),defect==='callback'?/observer failure/:/PROVIDER_ROUTE/);
  assert.equal(cancelled,1,defect);assert.equal(response.body.locked,false);assert.equal(observed,defect==='callback'?1:0);
 }
});
test('bound POST stops promptly and disposes late 409 without reporting stale precondition or recontacting',async()=>{
 const origin='https://example.test',controller=new AbortController();let calls=0,observed=0,cancelled=0,release,started;
 const ready=new Promise(resolve=>{started=resolve;});
 const wrapped=createBoundProviderTransport({origin,approvedContract:approval(),onPrecondition:()=>observed++,fetchImpl:async()=>{calls++;started();return new Promise(resolve=>{release=resolve;});}});
 const pending=wrapped(origin+'/api/source-tools',{method:'POST',signal:controller.signal});
 await ready;controller.abort();
 await assert.rejects(pending);
 release(new Response(new ReadableStream({cancel(){cancelled++;}}),{status:409}));
 for(let i=0;i<100&&!cancelled;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(cancelled,1);assert.equal(observed,0);
 await assert.rejects(wrapped(origin+'/api/source-tools',{method:'POST',signal:controller.signal}));
 assert.equal(calls,1);
});

 test('receipt collector cannot mint evidence from a catalog changed after initialization',()=>{
 const sources=sourcesFor('source'),c=createReceiptCollector({sources});
 sources[0].cues[0].text='forged cue';
 assert.throws(()=>c.add({...receipt(0),excerpt:'forged cue'}),/Invalid receipt/);
 sources[0].version='v2';assert.throws(()=>c.add({...receipt(1),sourceVersion:'v2'}),/Invalid receipt/);
 assert.equal(c.snapshot().invalid,true);assert.deepEqual(c.snapshot().receipts,[]);
});
