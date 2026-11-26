import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {resolveSymbolicPeerLinks,loadLocalNetwork,runNetwork} from '../index.js';
import {createScriptedModel} from '../testing.js';
import {createConsentInspector} from '../../sutra-consent/index.js';
const source=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const graph=()=>{const g=structuredClone(source);g.tools[0].tools=['guide_peer'];return g;};
const target='https://peer.example/nested/agents/checklist';
const links=()=>({version:1,networks:{linked_learner:{guide_peer:target}}});
test('exact per-network symbolic binding preserves input and cannot confer authority',async()=>{
 const g=graph(),l=links(),resolved=resolveSymbolicPeerLinks(g,l,'linked_learner');
 assert.deepEqual(g.tools[0].tools,['guide_peer']);assert.deepEqual(resolved.tools[0].tools,[target]);
 await assert.rejects(runNetwork({definition:resolved,name:'linked_learner',request:'x',model:createScriptedModel()}),e=>e.code==='REFERENCE');
});
test('missing wrong network or shadowed binding fails before contact',()=>{
 for(const [mutate,code] of [
  [l=>{l.networks.linked_learner={guide_peer_extra:target};},'LINKS_UNRESOLVED'],
  [l=>{l.networks.other=l.networks.linked_learner;delete l.networks.linked_learner;},'LINKS_UNRESOLVED'],
  [l=>{l.networks.linked_learner.evidence=target;},'LINKS_COLLISION'],
  [l=>{l.networks.linked_learner.unused=target;},'LINKS_UNUSED'],
  [l=>{l.version=2;},'LINKS_SCHEMA'],
  [l=>{l.networks.linked_learner.guide_peer=target+'?secret=x';},'PEER_URL'],
  [l=>{l.networks.linked_learner.guide_peer='http://public.example/agents/checklist';},'PEER_URL'],
  [l=>{l.networks.linked_learner.guide_peer='https://peer.example/mcp/checklist';},'LINKS_TARGET'],
  [l=>{l.networks.linked_learner.guide_peer='https://user:password@peer.example/agents/checklist';},'PEER_URL'],
 ]){const l=links();mutate(l);assert.throws(()=>resolveSymbolicPeerLinks(graph(),l,'linked_learner'),e=>e.code===code);}
 const g=graph();g.tools[0].tools.push(target);assert.throws(()=>resolveSymbolicPeerLinks(g,links(),'linked_learner'),e=>e.code==='LINKS_COLLISION');
});
test('local link resolution fetches only same-origin public data; peer consent is separately required',async()=>{
 const local='https://caller.example',calls=[];
 const fetchImpl=async(url,opts)=>{calls.push(url);assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');
 if(url===local+'/agents/agent-manifest.json')return Response.json({networks:[{name:'linked_learner',front_man:'learner',hocon:'./linked_learner.network.json'}]});
 if(url===local+'/agents/linked_learner.network.json')return Response.json(graph());
 if(url===local+'/agents/links.json')return Response.json(links());
 if(url==='https://peer.example/nested/agents/agent-manifest.json')return Response.json({networks:[{name:'checklist',front_man:'learner',hocon:'./checklist.network.json'}],inference:{model:'peer-must-not-select'}});
 if(url==='https://peer.example/nested/agents/checklist.network.json')return Response.json(source);
 throw Error('Unexpected contact');
 };
 const options={baseUrl:local+'/agents/',networkName:'linked_learner',expectedOrigin:local,fetchImpl};
 await assert.rejects(loadLocalNetwork(options),e=>e.code==='REFERENCE');
 assert.equal(calls.length,2);calls.length=0;
 const loaded=await loadLocalNetwork({...options,resolvePublishedLinks:true});assert.equal(loaded.artifacts.links,local+'/agents/links.json');assert.equal(calls.length,3);
 let decisions=0;const deny=createConsentInspector({decide:async()=>{decisions++;return {decision:'deny',scope:'once'};}});
 await assert.rejects(runNetwork({...loaded,request:'x',model:createScriptedModel(),peerRuntime:{inspector:deny,fetchImpl}}),e=>e.code==='PEER_CONSENT_DENIED');
 assert.equal(calls.length,3);assert.equal(decisions,1);
 const allow=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 const result=await runNetwork({...loaded,request:'x',model:createScriptedModel(),peerRuntime:{inspector:allow,fetchImpl}});
 assert.equal(result.modelCalls,5);assert.equal(result.agentCalls,3);assert.equal(calls.length,5);
});
