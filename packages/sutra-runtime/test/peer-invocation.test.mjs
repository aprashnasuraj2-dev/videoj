import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNetwork} from '../index.js';
import {createScriptedModel} from '../testing.js';
import {createConsentInspector} from '../../sutra-consent/index.js';

const sourceGraph=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const peerUrl='https://peer.example/agents/transit';
const definition=()=>{
 const graph=structuredClone(sourceGraph);
 graph.tools[0].tools=[peerUrl];
 return graph;
};
const manifest=({name='transit',front_man='learner',hocon='./transit.network.json'}={})=>({networks:[{name,front_man,hocon}]});
const approved=decide=>createConsentInspector({decide:decide??(async()=>({decision:'allow',scope:'once'}))});
const drive=(options={})=>runNetwork({definition:definition(),request:'Inspect a synthetic cue.',model:createScriptedModel(),...options});

test('peer graph runs in the caller runtime under the caller model and one shared trace',async()=>{
 const calls=[],intents=[];
 const inspector=approved(async contact=>{intents.push(contact.kind);return {decision:'allow',scope:'once'};});
 const fetchImpl=async(url,opts)=>{
  calls.push(url);
  assert.equal(opts.credentials,'omit');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.Accept,'application/json');
  return Response.json(url.endsWith('agent-manifest.json')?manifest():sourceGraph);
 };
 const result=await drive({peerRuntime:{inspector,fetchImpl}});
 assert.equal(result.mode,'scripted-test');
 assert.equal(result.agentCalls,3);
 assert.equal(result.modelCalls,5);
 assert.match(result.text,/Scripted orchestration test complete/);
 assert.deepEqual(intents,['peer_manifest','peer_graph']);
 assert.deepEqual(calls,['https://peer.example/agents/agent-manifest.json','https://peer.example/agents/transit.network.json']);
 assert.ok(result.events.some(event=>event.kind==='agent'&&event.agent==='evidence'));
 assert.ok(!JSON.stringify(result.events).includes('Inspect a synthetic cue.'));
});

test('exact missing peer name is an invocation error, not a model-generated success',async()=>{
 let contacts=0,modelSteps=0;
 const model=createScriptedModel();
 const inspector=approved();
 const fetchImpl=async()=>{contacts++;return Response.json(manifest({name:'almost_transit'}));};
 const result=drive({peerRuntime:{inspector,fetchImpl},model:{...model,async chat(args){modelSteps++;return model.chat(args);}}});
 await assert.rejects(result,error=>error.code==='PEER_NETWORK_MATCH'&&error.message.includes('NETWORK_MATCH')&&!error.message.includes('almost_transit'));
 assert.equal(contacts,1);
 assert.equal(modelSteps,1);
});

test('peer consent denial stops before contact with explicit failure and no fabricated completion',async()=>{
 let fetches=0;
 const inspector=approved(async()=>({decision:'deny',scope:'once'}));
 await assert.rejects(drive({peerRuntime:{inspector,fetchImpl:async()=>{fetches++;return Response.json(manifest());}}}),error=>error.code==='PEER_CONSENT_DENIED');
 assert.equal(fetches,0);
});

test('malformed peer graph is not silently converted to a normal tool response',async()=>{
 const broken=structuredClone(sourceGraph);
 broken.tools[1].tools=['learner'];
 let fetched=0;
 await assert.rejects(drive({peerRuntime:{inspector:approved(),fetchImpl:async url=>{
  fetched++;
  return Response.json(url.endsWith('agent-manifest.json')?manifest():broken);
 }}}),error=>error.code==='PEER_CYCLE');
 assert.equal(fetched,2);
});

test('remote graph cannot bypass explicit peer runtime configuration',async()=>{
 await assert.rejects(drive(),error=>error.code==='REFERENCE');
 await assert.rejects(drive({peerRuntime:{fetchImpl:async()=>Response.json(manifest())}}),error=>error.code==='PEER_CONFIG');
});

test('peer execution shares the model budget with the invoking agent',async()=>{
 await assert.rejects(drive({limits:{maxModelCalls:4},peerRuntime:{
  inspector:approved(),
  fetchImpl:async url=>Response.json(url.endsWith('agent-manifest.json')?manifest():sourceGraph)
 }}),error=>error.code==='MODEL_LIMIT');
});

test('manifest failure and declared graph failure retain separate caller-visible codes',async()=>{
 const missing=new Response('Not found',{status:404,headers:{'content-type':'text/plain'}});
 let calls=0;
 await assert.rejects(drive({peerRuntime:{inspector:approved(),fetchImpl:async()=>{calls++;return missing;}}}),e=>e.code==='PEER_MANIFEST_UNAVAILABLE');
 assert.equal(calls,1);
 calls=0;
 await assert.rejects(drive({peerRuntime:{inspector:approved(),fetchImpl:async url=>{
  calls++;
  return url.endsWith('agent-manifest.json')?Response.json(manifest()):missing;
 }}}),e=>e.code==='PEER_GRAPH_UNAVAILABLE');
 assert.equal(calls,2);
});

test('peer and caller share actual admitted model counts and bounded failure diagnostics',async()=>{let calls=0;const adapter=createScriptedModel();await assert.rejects(drive({limits:{maxModelCalls:4},model:{...adapter,chat(a){calls++;return adapter.chat(a);}},peerRuntime:{inspector:approved(),fetchImpl:async url=>Response.json(url.endsWith('agent-manifest.json')?manifest():sourceGraph)}}),e=>{assert.equal(e.code,'MODEL_LIMIT');assert.equal(e.diagnostics.modelCalls,4);assert.equal(e.diagnostics.completedModelCalls,4);assert.equal(e.diagnostics.remoteCalls,1);assert.equal(e.diagnostics.agentCalls,3);return true;});assert.equal(calls,4);});
