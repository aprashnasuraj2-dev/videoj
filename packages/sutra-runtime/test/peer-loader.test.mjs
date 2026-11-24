import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadPeerNetwork} from '../index.js';
import {createConsentInspector} from '../../sutra-consent/index.js';
const graph=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const response=body=>Response.json(body);
const manifest=(hocon='./transit.network.json')=>({networks:[{name:'transit',front_man:'learner',hocon}]});
const peerUrl='https://peer.example/agents/transit';
test('peer URL derives site base, exact name and consents before each public artifact fetch',async()=>{
 const order=[];const inspector=createConsentInspector({decide:async intent=>{order.push('decision:'+intent.kind+':'+intent.origin);return {decision:'allow',scope:'once'};}});
 const fetchImpl=async(url,opts)=>{
  const parsed=new URL(url);order.push('fetch:'+parsed.origin+parsed.pathname);
  assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');
  if(parsed.pathname.endsWith('/agent-manifest.json'))return response(manifest());
  if(parsed.pathname.endsWith('/transit.network.json'))return response(graph);
  throw Error('unexpected fetch');
 };
 const loaded=await loadPeerNetwork({peerUrl,inspector,fetchImpl});
 assert.equal(loaded.name,'transit');assert.equal(loaded.frontMan,'learner');assert.equal(loaded.artifacts.manifest,'https://peer.example/agents/agent-manifest.json');
 assert.deepEqual(order,[
  'decision:peer_manifest:https://peer.example','fetch:https://peer.example/agents/agent-manifest.json',
  'decision:peer_graph:https://peer.example','fetch:https://peer.example/agents/transit.network.json'
 ]);
});
test('manifest denial emits no fetch and graph denial emits no graph fetch',async()=>{
 let fetches=0;
 const denyManifest=createConsentInspector({decide:async()=>({decision:'deny',scope:'once'})});
 await assert.rejects(loadPeerNetwork({peerUrl,inspector:denyManifest,fetchImpl:async()=>{fetches++;}}),e=>e.code==='CONSENT_DENIED');assert.equal(fetches,0);
 let decisions=0;fetches=0;
 const denyGraph=createConsentInspector({decide:async()=>({decision:++decisions===1?'allow':'deny',scope:'once'})});
 await assert.rejects(loadPeerNetwork({peerUrl,inspector:denyGraph,fetchImpl:async url=>{fetches++;return response(manifest());}}),e=>e.code==='CONSENT_DENIED');assert.equal(fetches,1);
});
test('missing or duplicate exact network fails after manifest without graph fallback',async()=>{
 for(const networks of [
  [{name:'transit_plus',front_man:'learner',hocon:'./other.json'}],
  [{name:'transit',front_man:'learner',hocon:'./a.json'},{name:'transit',front_man:'learner',hocon:'./b.json'}]
 ]){
  let fetches=0;const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
  await assert.rejects(loadPeerNetwork({peerUrl,inspector,fetchImpl:async url=>{fetches++;return response({networks});}}),e=>e.code==='NETWORK_MATCH');
  assert.equal(fetches,1);
 }
});
test('encoded exact name is deliberate while query fragment and trailing slash are rejected before contact',async()=>{
 let decisions=0,fetches=0;const inspector=createConsentInspector({decide:async()=>{decisions++;return {decision:'allow',scope:'once'};}});
 const fetchImpl=async url=>{fetches++;return response(url.endsWith('agent-manifest.json')?manifest():graph);};
 const loaded=await loadPeerNetwork({peerUrl:'https://peer.example/root/agents/%74ransit',inspector,fetchImpl});assert.equal(loaded.name,'transit');assert.equal(loaded.artifacts.manifest,'https://peer.example/root/agents/agent-manifest.json');
 const prior={decisions,fetches};
 for(const bad of ['https://peer.example/agents/transit/','https://peer.example/agents/transit?q=1','https://peer.example/agents/transit#x','https://peer.example/agents/transit%2Fsecret']){
  await assert.rejects(loadPeerNetwork({peerUrl:bad,inspector,fetchImpl}),e=>['PEER_URL','NETWORK_ID'].includes(e.code));
 }
 assert.deepEqual({decisions,fetches},prior);
});
test('absolute graph origin gets a distinct consent decision and never receives credentials',async()=>{
 const intents=[],calls=[];const inspector=createConsentInspector({decide:async intent=>{intents.push({kind:intent.kind,origin:intent.origin});return {decision:'allow',scope:'once'};}});
 const fetchImpl=async(url,opts)=>{
  calls.push({url,credentials:opts.credentials,authorization:opts.headers.Authorization});
  return response(url.includes('agent-manifest')?manifest('https://cdn.example/public/transit.json'):graph);
 };
 const loaded=await loadPeerNetwork({peerUrl,inspector,fetchImpl});
 assert.equal(loaded.artifacts.definition,'https://cdn.example/public/transit.json');
 assert.deepEqual(intents,[{kind:'peer_manifest',origin:'https://peer.example'},{kind:'peer_graph',origin:'https://cdn.example'}]);
 assert.ok(calls.every(call=>call.credentials==='omit'&&call.authorization===undefined));
});
test('executable peer metadata and malformed graph fail closed',async()=>{
 for(const [manifestBody,code] of [
  [{...manifest(),coded_tools:{url:'./tools.js'}},'UNSUPPORTED_CAPABILITY'],
  [manifest(),'CYCLE']
 ]){
  const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});let call=0;
  await assert.rejects(loadPeerNetwork({peerUrl,inspector,fetchImpl:async url=>{
   call++;if(call===1)return response(manifestBody);
   const bad=structuredClone(graph);bad.tools[1].tools=['learner'];return response(bad);
  }}),e=>e.code===code);
 }
});

test('approved peer that never responds hits bounded artifact timeout without fallback',async()=>{
 const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 const start=Date.now();
 await assert.rejects(loadPeerNetwork({peerUrl,inspector,timeoutMs:25,fetchImpl:async()=>new Promise(()=>{})}),e=>e.code==='ARTIFACT_TIMEOUT');
 assert.ok(Date.now()-start<1000);
});
test('404 peer manifest and invalid JSON are visible artifact failures',async()=>{
 const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 await assert.rejects(loadPeerNetwork({peerUrl,inspector,fetchImpl:async()=>new Response('missing',{status:404})}),e=>e.code==='MANIFEST_UNAVAILABLE');
 await assert.rejects(loadPeerNetwork({peerUrl,inspector,fetchImpl:async()=>new Response('{bad',{headers:{'Content-Type':'application/json'}})}),e=>e.code==='MANIFEST_UNAVAILABLE');
});

test('authority-like site path cannot replace the peer URL origin during manifest resolution',async()=>{
 const target='https://peer.example//other.example/agents/%74ransit';
 const manifestUrl='https://peer.example//other.example/agents/agent-manifest.json';
 const graphUrl='https://peer.example//other.example/agents/transit.network.json';
 const intents=[],calls=[];
 const inspector=createConsentInspector({decide:async intent=>{intents.push([intent.origin,intent.resource]);return {decision:'allow',scope:'once'};}});
 const fetchImpl=async url=>{
  calls.push(url);
  assert.ok([manifestUrl,graphUrl].includes(url),'no implicit authority switch');
  return response(url===manifestUrl?manifest():graph);
 };
 const loaded=await loadPeerNetwork({peerUrl:target,inspector,fetchImpl});
 assert.equal(loaded.name,'transit');assert.equal(loaded.origin,'https://peer.example');
 assert.deepEqual(loaded.artifacts,{manifest:manifestUrl,definition:graphUrl});
 assert.deepEqual(calls,[manifestUrl,graphUrl]);assert.deepEqual(intents,calls.map(url=>['https://peer.example',url]));
});


test('standalone peer loader refuses executable configuration and coercible destination or timeout before contact',async()=>{
 let touched=0,contacts=0,decisions=0;
 const inspector=createConsentInspector({decide:async()=>{decisions++;return 'allow';}});
 const fetchImpl=async()=>{contacts++;throw Error('no contact expected');};
 const valid={peerUrl,inspector,fetchImpl};
 for(const key of ['peerUrl','inspector','fetchImpl','timeoutMs']){
  const bad={...valid};Object.defineProperty(bad,key,{enumerable:true,get(){touched++;return valid[key];}});
  await assert.rejects(loadPeerNetwork(bad),e=>e.code==='PEER_CONFIG');
 }
 const hidden={...valid};Object.defineProperty(hidden,'extra',{value:true});
 await assert.rejects(loadPeerNetwork(hidden),e=>e.code==='PEER_CONFIG');
 for(const url of [{toString(){touched++;return peerUrl;}},'https://peer.example/agents/tra\tnsit','https://peer.example/'+('a'.repeat(2048))+'/transit'])await assert.rejects(loadPeerNetwork({...valid,peerUrl:url}),e=>e.code==='PEER_URL');
 await assert.rejects(loadPeerNetwork({...valid,timeoutMs:{valueOf(){touched++;return 50;}}}),e=>e.code==='LIMIT_CONFIG');
 assert.equal(touched,0);assert.equal(contacts,0);assert.equal(decisions,0);
});

test('ambiguous peer publication fails before model or additional graph consent',async()=>{
 for(const stage of ['manifest','graph']){
  const intents=[],calls=[];
  const inspector=createConsentInspector({decide:async intent=>{intents.push(intent.kind);return {decision:'allow',scope:'once'};}});
  await assert.rejects(loadPeerNetwork({peerUrl,inspector,fetchImpl:async url=>{
   const isManifest=url.endsWith('agent-manifest.json');calls.push(url);
   const body=isManifest?(stage==='manifest'?'{"networks":[],"networks":'+JSON.stringify(manifest().networks)+'}':JSON.stringify(manifest())):
    '{"tools":[],'+JSON.stringify(graph).slice(1);
   return new Response(body,{headers:{'Content-Type':'application/json'}});
  }}),e=>e.code===(stage==='manifest'?'MANIFEST_UNAVAILABLE':'GRAPH_UNAVAILABLE'));
  assert.equal(calls.length,stage==='manifest'?1:2);
  assert.deepEqual(intents,stage==='manifest'?['peer_manifest']:['peer_manifest','peer_graph']);
 }
});
