import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadPeerNetwork} from '../index.js';
import {createConsentInspector} from '../../sutra-consent/index.js';
const graph=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const response=(body,url)=>{
 const value=Response.json(body);Object.defineProperty(value,'url',{value});return value;
};
const manifest=(hocon='./transit.network.json')=>({networks:[{name:'transit',front_man:'learner',hocon}]});
const peerUrl='https://peer.example/agents/transit';
test('peer URL derives site base, exact name and consents before each public artifact fetch',async()=>{
 const order=[];const inspector=createConsentInspector({decide:async intent=>{order.push('decision:'+intent.kind+':'+intent.origin);return {decision:'allow',scope:'once'};}});
 const fetchImpl=async(url,opts)=>{
  const parsed=new URL(url);order.push('fetch:'+parsed.origin+parsed.pathname);
  assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');
  if(parsed.pathname.endsWith('/agent-manifest.json'))return response(manifest(),url);
  if(parsed.pathname.endsWith('/transit.network.json'))return response(graph,url);
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
 await assert.rejects(loadPeerNetwork({peerUrl,inspector:denyGraph,fetchImpl:async url=>{fetches++;return response(manifest(),url);}}),e=>e.code==='CONSENT_DENIED');assert.equal(fetches,1);
});
test('missing or duplicate exact network fails after manifest without graph fallback',async()=>{
 for(const networks of [
  [{name:'transit_plus',front_man:'learner',hocon:'./other.json'}],
  [{name:'transit',front_man:'learner',hocon:'./a.json'},{name:'transit',front_man:'learner',hocon:'./b.json'}]
 ]){
  let fetches=0;const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
  await assert.rejects(loadPeerNetwork({peerUrl,inspector,fetchImpl:async url=>{fetches++;return response({networks},url);}}),e=>e.code==='NETWORK_MATCH');
  assert.equal(fetches,1);
 }
});
test('encoded exact name is deliberate while query fragment and trailing slash are rejected before contact',async()=>{
 let decisions=0,fetches=0;const inspector=createConsentInspector({decide:async()=>{decisions++;return {decision:'allow',scope:'once'};}});
 const fetchImpl=async url=>{fetches++;return response(url.endsWith('agent-manifest.json')?manifest():graph,url);};
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
  return response(url.includes('agent-manifest')?manifest('https://cdn.example/public/transit.json'):graph,url);
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
   call++;if(call===1)return response(manifestBody,url);
   const bad=structuredClone(graph);bad.tools[1].tools=['learner'];return response(bad,url);
  }}),e=>e.code===code);
 }
});
