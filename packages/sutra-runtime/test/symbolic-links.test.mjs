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

test('caller-scoped binding is separate, cannot change network identity, shadow local tools or grant contact',async()=>{
 const published=links(),g=graph(),caller={version:1,networks:{linked_learner:{guide_peer:'https://alternate.example/agents/checklist'}}};
 const old=JSON.stringify(published),original=JSON.stringify(caller);
 const resolved=resolveSymbolicPeerLinks(g,published,'linked_learner',caller);
 assert.deepEqual(resolved.tools[0].tools,['https://alternate.example/agents/checklist']);
 assert.equal(JSON.stringify(published),old);assert.equal(JSON.stringify(caller),original);
 assert.deepEqual(resolveSymbolicPeerLinks(g,published,'linked_learner').tools[0].tools,[target]);
 for(const [mutate,code] of [
  [x=>x.networks.linked_learner.guide_peer='https://alternate.example/agents/wrong','LINKS_TARGET'],
  [x=>x.networks.other={}, 'LINKS_SCHEMA'],
  [x=>x.networks.linked_learner.evidence=target,'LINKS_COLLISION'],
  [x=>x.networks.linked_learner.unused=target,'LINKS_UNUSED'],
  [x=>x.networks.linked_learner.guide_peer='https://user:secret@alternate.example/agents/checklist','PEER_URL']
 ]){const x=structuredClone(caller);mutate(x);assert.throws(()=>resolveSymbolicPeerLinks(g,published,'linked_learner',x),e=>e.code===code);}
 let accessorCalls=0;const hostile=structuredClone(caller);Object.defineProperty(hostile.networks.linked_learner,'guide_peer',{enumerable:true,get(){accessorCalls++;return target;}});
 assert.throws(()=>resolveSymbolicPeerLinks(g,published,'linked_learner',hostile));assert.equal(accessorCalls,0);
 let contacts=0;
 const deny=createConsentInspector({decide:async()=>({decision:'deny',scope:'once'})});
 await assert.rejects(runNetwork({definition:resolved,name:'linked_learner',request:'x',model:createScriptedModel(),peerRuntime:{inspector:deny,fetchImpl:async()=>{contacts++;}}}),e=>e.code==='PEER_CONSENT_DENIED');assert.equal(contacts,0);
});
test('local loader digests exact wire bytes, independently of parsed graph or caller binding',async()=>{
 const {createHash}=await import('node:crypto'),sha=s=>createHash('sha256').update(s).digest('hex');
 const local='https://caller.example',manifest=JSON.stringify({networks:[{name:'linked_learner',front_man:'learner',hocon:'./linked_learner.network.json'}]}),definition=JSON.stringify(graph(),null,2)+'\n',linkText=JSON.stringify(links(),null,4)+'\n';
 const files={'agent-manifest.json':manifest,'linked_learner.network.json':definition,'links.json':linkText};
 const callerLinkOverrides={version:1,networks:{linked_learner:{guide_peer:'https://alternate.example/agents/checklist'}}},calls=[];
 const options={baseUrl:local+'/agents/',networkName:'linked_learner',expectedOrigin:local,resolvePublishedLinks:true,fetchImpl:async url=>{calls.push(url);return new Response(files[url.split('/').at(-1)],{headers:{'Content-Type':'application/json'}});}};
 const result=await loadLocalNetwork({...options,callerLinkOverrides});
 assert.deepEqual(result.artifactDigests,{manifest:sha(manifest),definition:sha(definition),links:sha(linkText)});
 assert.deepEqual(result.definition.tools[0].tools,['https://alternate.example/agents/checklist']);
 assert.equal(calls.length,3);assert.ok(calls.every(url=>url.startsWith(local)));
 files['linked_learner.network.json']=JSON.stringify(graph());
 const compact=await loadLocalNetwork(options);
 assert.notEqual(compact.artifactDigests.definition,result.artifactDigests.definition);
 assert.equal(compact.artifactDigests.links,result.artifactDigests.links);
 assert.deepEqual(compact.definition.tools[0].tools,[target]);
 await assert.rejects(loadLocalNetwork({...options,resolvePublishedLinks:false,callerLinkOverrides}),e=>e.code==='LINKS_SCHEMA');
});
