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
 for(const kind of ['peer_manifest','peer_graph','peer_evidence','mcp_discovery','mcp_call'])await inspector.perform(contact(kind),async()=>{});
 assert.deepEqual(seen,['peer_manifest','peer_graph','peer_evidence','mcp_discovery','mcp_call']);
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
