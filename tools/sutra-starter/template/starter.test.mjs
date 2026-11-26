import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
import {createSite} from './serve.mjs';
import {loadLocalNetwork,loadPeerNetwork,runNetwork} from './packages/sutra-runtime/index.js';
import {createScriptedModel} from './packages/sutra-runtime/testing.js';
import {createConsentInspector} from './packages/sutra-consent/index.js';
import {createLocalActionRegistry} from './packages/sutra-actions/index.js';
async function site(t){const s=createSite();s.listen(0,'127.0.0.1');await once(s,'listening');t.after(()=>new Promise(r=>{s.closeAllConnections();s.close(r);}));return 'http://127.0.0.1:'+s.address().port;}
test('standalone HTTP publication and exact local execution',async t=>{
 const origin=await site(t);const loaded=await loadLocalNetwork({baseUrl:origin+'/agents/',expectedOrigin:origin,networkName:'learner'});
 const result=await runNetwork({definition:loaded.definition,request:'Synthetic example',model:createScriptedModel()});
 assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,3);assert.match(result.text,/No live AI/);
 await assert.rejects(loadLocalNetwork({baseUrl:origin+'/agents/',expectedOrigin:origin,networkName:'missing'}),e=>e.code==='NETWORK_MATCH');
 const page=await fetch(origin);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
 assert.equal((await fetch(origin+'/packages/sutra-runtime/index.js')).status,200);
 const generated=await fetch(origin+'/packages/sutra-runtime/vendor/nsdeploy/generated/graph.gen.mjs');assert.equal(generated.status,200);assert.match(generated.headers.get('content-type'),/javascript/);
 for(const path of ['/README.md','/package.json','/.env','/agents/unknown.json'])assert.equal((await fetch(origin+path)).status,404);
 assert.equal((await fetch(origin+'/agents/links.json',{method:'POST'})).status,405);
});
test('second independent loopback origin, exact peer, consent order and zero denied fetches',async t=>{
 const caller=await site(t),peer=await site(t);assert.notEqual(caller,peer);
 let count=0;const decisions=[];
 const fetchImpl=(url,opts)=>{count++;assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');return fetch(url,opts);};
 const deny=createConsentInspector({decide:async()=>({decision:'deny',scope:'once'})});
 await assert.rejects(loadPeerNetwork({peerUrl:peer+'/agents/learner',inspector:deny,fetchImpl}),e=>e.code==='CONSENT_DENIED');assert.equal(count,0);
 const allow=createConsentInspector({decide:async x=>{decisions.push(x.kind);return {decision:'allow',scope:'once'};}});
 const result=await loadPeerNetwork({peerUrl:peer+'/agents/learner',inspector:allow,fetchImpl});
 assert.equal(result.name,'learner');assert.equal(count,2);assert.deepEqual(decisions,['peer_manifest','peer_graph']);
 assert.equal((await fetch(peer+'/agents/agent-manifest.json')).headers.get('access-control-allow-origin'),'*');
 await assert.rejects(loadPeerNetwork({peerUrl:peer+'/agents/learn',inspector:allow,fetchImpl}),e=>e.code==='NETWORK_MATCH');
});
test('safe host action requires a single-use explicit proposal',async()=>{
 let writes=0,sequence=0;const registry=createLocalActionRegistry([{name:'acknowledge',effect:'write_local',destination:'Memory',description:'Synthetic acknowledgement',validate:a=>a.acknowledged===true&&Object.keys(a).length===1,execute:()=>++writes}],{idFactory:()=> 'proposal-example-'+(++sequence)});
 assert.throws(()=>registry.prepare('acknowledge',{acknowledged:false}));const cancelled=registry.prepare('acknowledge',{acknowledged:true});registry.cancel(cancelled.id);assert.equal(writes,0);await assert.rejects(registry.execute(cancelled.id));
 const approved=registry.prepare('acknowledge',{acknowledged:true});assert.notEqual(approved.id,cancelled.id);await assert.rejects(registry.execute(cancelled.id));assert.equal(writes,0);await registry.execute(approved.id);assert.equal(writes,1);await assert.rejects(registry.execute(approved.id));assert.equal(writes,1);
});
