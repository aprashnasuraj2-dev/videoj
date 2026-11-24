import test from 'node:test';import assert from 'node:assert/strict';
import {ConsentError,createConsentInspector,fetchJsonWithConsent,normalizeContact} from '../index.js';
const contact=(kind='peer_manifest',extra={})=>({origin:'https://peer.example/',kind,purpose:'Load a declared public peer artifact',disclosure:['network name','requested capability'],network:'checklist',...extra});
const jsonResponse=(body,url='https://peer.example/agent-manifest.json')=>new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'},url});
test('normalizes only bounded public contact metadata',()=>{
 const value=normalizeContact(contact());assert.equal(value.origin,'https://peer.example');assert.deepEqual(value.disclosure,['network name','requested capability']);
 for(const bad of [
  {...contact(),origin:'https://user:pass@peer.example/'},
  {...contact(),origin:'https://peer.example/path'},
  {...contact(),kind:'write'},
  {...contact(),disclosure:['token:value']},
  {...contact(),privatePrompt:'synthetic-private-canary'}
 ])assert.throws(()=>normalizeContact(bad),ConsentError);
});
test('denial happens before any external operation',async()=>{
 let operations=0;const events=[];const inspector=createConsentInspector({decide:async()=>({decision:'deny',scope:'once'}),onEvent:e=>events.push(e),now:()=> '2026-11-23T15:00:00+05:45'});
 await assert.rejects(inspector.perform(contact(),async()=>{operations++;}),e=>e.code==='CONSENT_DENIED');assert.equal(operations,0);
 assert.deepEqual(events.map(e=>e.type),['intent','decision']);assert.equal(events[1].decision,'deny');
});
test('approval is recorded before manifest and graph fetches',async()=>{
 const order=[];const inspector=createConsentInspector({decide:async intent=>{order.push('decision:'+intent.kind);return {decision:'allow',scope:'once'};}});
 const fetchImpl=async url=>{order.push('fetch:'+new URL(url).pathname);return jsonResponse({ok:true},url);};
 await fetchJsonWithConsent({inspector,contact:contact('peer_manifest'),url:'https://peer.example/agent-manifest.json',fetchImpl});
 await fetchJsonWithConsent({inspector,contact:contact('peer_graph'),url:'https://peer.example/checklist.network.json',fetchImpl});
 assert.deepEqual(order,['decision:peer_manifest','fetch:/agent-manifest.json','decision:peer_graph','fetch:/checklist.network.json']);
});
test('session approval is exact and only remembered after explicit choice',async()=>{
 let decisions=0,operations=0;const inspector=createConsentInspector({decide:async()=>{decisions++;return {decision:'allow',scope:'session'};}});
 await inspector.perform(contact(),async()=>operations++);await inspector.perform(contact(),async()=>operations++);
 await inspector.perform(contact('peer_manifest',{purpose:'Inspect a different public purpose'}),async()=>operations++);
 assert.equal(decisions,2);assert.equal(operations,3);assert.ok(inspector.exportEvents().some(e=>e.source==='remembered'));
});
test('peer and MCP contact kinds use the same default-deny boundary',async()=>{
 const seen=[];const inspector=createConsentInspector({decide:async intent=>{seen.push(intent.kind);return {decision:'allow',scope:'once'};}});
 for(const kind of ['peer_manifest','peer_graph','mcp_discovery','mcp_call'])await inspector.perform(contact(kind),async()=>{});
 assert.deepEqual(seen,['peer_manifest','peer_graph','mcp_discovery','mcp_call']);
});
test('exports never include operation results, failures, credentials or private prompt values',async()=>{
 const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 await assert.rejects(inspector.perform(contact('mcp_call'),async()=>{throw Error('synthetic-private-canary sk-secret-value');}),e=>e.code==='CONTACT_FAILED');
 const exported=JSON.stringify(inspector.exportEvents());assert.ok(!exported.includes('synthetic-private-canary'));assert.ok(!exported.includes('sk-secret-value'));
});
test('approved fetch is credentialless, redirect-error, bounded JSON and same-origin only',async()=>{
 const calls=[];const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 const fetchImpl=async(url,opts)=>{calls.push({url,opts});return jsonResponse({networks:[]},url);};
 const value=await fetchJsonWithConsent({inspector,contact:contact(),url:'https://peer.example/agent-manifest.json',fetchImpl,maxBytes:2048});
 assert.deepEqual(value,{networks:[]});assert.equal(calls[0].opts.credentials,'omit');assert.equal(calls[0].opts.redirect,'error');
 await assert.rejects(fetchJsonWithConsent({inspector,contact:contact(),url:'https://other.example/manifest.json',fetchImpl}),e=>e.code==='CONTACT_URL');
});
test('failed or oversized approved responses fail closed without leaking response data',async()=>{
 const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 await assert.rejects(fetchJsonWithConsent({inspector,contact:contact(),url:'https://peer.example/x',fetchImpl:async()=>new Response('<html>secret</html>',{status:200,headers:{'Content-Type':'text/html'}})}),e=>e.code==='CONTACT_RESPONSE');
 await assert.rejects(fetchJsonWithConsent({inspector,contact:contact(),url:'https://peer.example/x',maxBytes:16,fetchImpl:async()=>new Response(JSON.stringify({secret:'x'.repeat(100)}),{status:200,headers:{'Content-Type':'application/json'}})}),e=>e.code==='CONTACT_SIZE');
});

test('exact GET resource is displayed and remembered independently without logging path or query values',async()=>{
 const prompts=[],requests=[];
 const inspector=createConsentInspector({decide:async intent=>{prompts.push(intent.resource);return {decision:'allow',scope:'session'};}});
 const fetchImpl=async url=>{requests.push(url);return jsonResponse({ok:true});};
 const first='https://peer.example/a.json?version=public-query-canary',second='https://peer.example/b.json';
 for(const url of [first,first,second])await fetchJsonWithConsent({inspector,contact:contact(),url,fetchImpl});
 assert.deepEqual(prompts,[first,second]);assert.deepEqual(requests,[first,first,second]);
 assert.doesNotMatch(JSON.stringify(inspector.exportEvents()),/public-query-canary|a\.json|b\.json/);
 await assert.rejects(fetchJsonWithConsent({inspector,contact:contact('peer_manifest',{resource:first}),url:second,fetchImpl}),e=>e.code==='CONTACT_URL');
 assert.equal(requests.length,3);
});
test('pre-abort and cancellation during approval do not contact or remember late session permission',async()=>{
 const controller=new AbortController();let release,decisions=0,contacts=0;
 const inspector=createConsentInspector({decide:async()=>{decisions++;if(decisions===1)return new Promise(resolve=>{release=resolve;});return 'deny';}});
 const fetchImpl=async()=>{contacts++;return jsonResponse({ok:true});};
 const pre=new AbortController();pre.abort();
 const opts={inspector,contact:contact(),url:'https://peer.example/a.json',fetchImpl};
 await assert.rejects(fetchJsonWithConsent({...opts,signal:pre.signal}),e=>e.code==='CANCELLED');assert.equal(decisions,0);
 const pending=fetchJsonWithConsent({...opts,signal:controller.signal});
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(decisions,1);
 controller.abort();await assert.rejects(pending,e=>e.code==='CANCELLED');
 release({decision:'allow',scope:'session'});await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(fetchJsonWithConsent(opts),e=>e.code==='CONSENT_DENIED');
 assert.equal(contacts,0);assert.equal(decisions,2);assert.ok(!inspector.exportEvents().some(e=>e.decision==='allow'));
});
test('clearing session revokes a pending decision and an already started operation without false success',async()=>{
 let release,phase='pending',effects=0,signals=[];
 const inspector=createConsentInspector({decide:async()=>phase==='pending'?new Promise(resolve=>{release=resolve;}):{decision:'allow',scope:'session'}});
 const pending=inspector.perform(contact(),async()=>{effects++;});
 await new Promise(resolve=>setTimeout(resolve,0));inspector.clearSession();
 await assert.rejects(pending,e=>e.code==='CANCELLED');release({decision:'allow',scope:'session'});
 phase='active';let resolveEffect;
 const running=inspector.perform(contact(),async(_contact,signal)=>{effects++;signals.push(signal);return new Promise(resolve=>{resolveEffect=resolve;});});
 await new Promise(resolve=>setTimeout(resolve,0));inspector.clearSession();
 await assert.rejects(running,e=>e.code==='CANCELLED');assert.equal(signals[0].aborted,true);resolveEffect('late');
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(effects,1);
 assert.deepEqual(inspector.exportEvents().filter(e=>e.type==='outcome').map(e=>e.status),['failed']);
});
test('cancelled approved GET disposes late transport response and held-open response body',async()=>{
 for(const stage of ['headers','body']){
  const controller=new AbortController();let release,contacts=0,cancellations=0;
  const inspector=createConsentInspector({decide:async()=> 'allow'});
  const response=new Response(new ReadableStream({cancel(){cancellations++;}}),{headers:{'Content-Type':'application/json'}});
  const pending=fetchJsonWithConsent({inspector,contact:contact(),url:'https://peer.example/a.json',signal:controller.signal,fetchImpl:async()=>{
   contacts++;if(stage==='headers')return new Promise(resolve=>{release=resolve;});return response;
  }});
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(contacts,1);controller.abort();
  await assert.rejects(pending,e=>e.code==='CANCELLED');release?.(response);
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(cancellations,1);
  assert.equal(response.body.locked,false);
 }
});
test('contact and decision ordinary accessors are rejected without execution',async()=>{
 let touched=0;
 const bad=contact();Object.defineProperty(bad,'origin',{enumerable:true,get(){touched++;return 'https://peer.example/';}});
 assert.throws(()=>normalizeContact(bad),ConsentError);
 const labels=['network name'];Object.defineProperty(labels,'0',{get(){touched++;return 'network name';}});
 assert.throws(()=>normalizeContact(contact('peer_manifest',{disclosure:labels})),ConsentError);
 const answer={scope:'session'};Object.defineProperty(answer,'decision',{get(){touched++;return 'allow';}});
 const inspector=createConsentInspector({decide:async()=>answer});
 await assert.rejects(inspector.perform(contact(),async()=>{touched++;}),e=>e.code==='DECISION_INVALID');assert.equal(touched,0);
});

test('operation-local event observer remains complete after the bounded session history fills',async()=>{
 const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'session'})});
 for(let i=0;i<180;i++)await inspector.perform(contact(),async()=>{});
 assert.equal(inspector.exportEvents().length,512);
 const events=[];
 await inspector.perform(contact(),async()=>{}, {onEvent:e=>events.push(e)});
 assert.deepEqual(events.map(e=>e.type),['intent','decision','outcome']);
 assert.equal(events[1].source,'remembered');assert.equal(events[2].status,'completed');
});
