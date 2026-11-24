import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {loadLocalNetwork}from '../index.js';
const graph=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const manifest={networks:[{name:'learner',front_man:'learner',hocon:'./learner.network.json'}]};
function fixture(change={}){const calls=[];const fetchImpl=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('agent-manifest.json')?(change.manifest??manifest):(change.graph??graph)),{headers:{'Content-Type':change.contentType??'application/json'}});};return {calls,fetchImpl};}
const base={baseUrl:'https://site.invalid/agents/',expectedOrigin:'https://site.invalid'};
test('exact local network loads with credential-free bounded fetches',async()=>{const f=fixture();const r=await loadLocalNetwork({...base,fetchImpl:f.fetchImpl});assert.equal(r.frontMan,'learner');assert.equal(f.calls.length,2);assert.ok(f.calls.every(c=>c.options.credentials==='omit'&&c.options.redirect==='error'));});
test('wrong name never silently selects first network',async()=>{const f=fixture();await assert.rejects(loadLocalNetwork({...base,networkName:'wrong',fetchImpl:f.fetchImpl}),e=>e.code==='NETWORK_MATCH');assert.equal(f.calls.length,1);});
test('cross-origin base is rejected before contact',async()=>{const f=fixture();await assert.rejects(loadLocalNetwork({...base,baseUrl:'https://other.invalid/agents/',fetchImpl:f.fetchImpl}),e=>e.code==='ARTIFACT_ORIGIN');assert.equal(f.calls.length,0);});
test('external graph is rejected before graph fetch',async()=>{const f=fixture({manifest:{networks:[{...manifest.networks[0],hocon:'https://other.invalid/graph.json'}]}});await assert.rejects(loadLocalNetwork({...base,fetchImpl:f.fetchImpl}),e=>e.code==='ARTIFACT_ORIGIN');assert.equal(f.calls.length,1);});
test('duplicate exact match rejected',async()=>{const f=fixture({manifest:{networks:[...manifest.networks,...manifest.networks]}});await assert.rejects(loadLocalNetwork({...base,fetchImpl:f.fetchImpl}),e=>e.code==='NETWORK_MATCH');});
test('HTML fallback is not accepted as public JSON',async()=>{const f=fixture({contentType:'text/html'});await assert.rejects(loadLocalNetwork({...base,fetchImpl:f.fetchImpl}),e=>e.code==='ARTIFACT_RESPONSE');});
test('oversized manifest stopped',async()=>{const f=fixture({manifest:{...manifest,padding:'x'.repeat(17000)}});await assert.rejects(loadLocalNetwork({...base,fetchImpl:f.fetchImpl}),e=>e.code==='ARTIFACT_SIZE');});
test('bad JSON and failed HTTP are visible errors',async()=>{await assert.rejects(loadLocalNetwork({...base,fetchImpl:async()=>new Response('{',{headers:{'Content-Type':'application/json'}})}),e=>e.code==='ARTIFACT_JSON');await assert.rejects(loadLocalNetwork({...base,fetchImpl:async()=>new Response('',{status:404})}),e=>e.code==='ARTIFACT_RESPONSE');});
test('publisher executable metadata rejected without loading code',async()=>{const f=fixture({manifest:{...manifest,actions:{module:'./unsafe.js'}}});await assert.rejects(loadLocalNetwork({...base,fetchImpl:f.fetchImpl}),e=>e.code==='UNSUPPORTED_CAPABILITY');assert.equal(f.calls.length,1);});
test('noncooperating fetch has an elapsed timeout',async()=>assert.rejects(loadLocalNetwork({...base,timeoutMs:20,fetchImpl:()=>new Promise(()=>{})}),e=>e.code==='ARTIFACT_TIMEOUT'));
test('pre-cancelled artifact loading makes no request',async()=>{const controller=new AbortController();controller.abort();let calls=0;await assert.rejects(loadLocalNetwork({...base,signal:controller.signal,fetchImpl:()=>{calls++;}}),e=>e.code==='CANCELLED');assert.equal(calls,0);});
test('artifact cancellation interrupts a stalled fetch',async()=>{const controller=new AbortController();const job=loadLocalNetwork({...base,signal:controller.signal,fetchImpl:()=>new Promise(()=>{})});setTimeout(()=>controller.abort(),10);await assert.rejects(job,e=>e.code==='CANCELLED');});

test('ambiguous manifest or graph JSON cannot select a last-wins publication',async()=>{
 for(const stage of ['manifest','graph']){
  const calls=[];
  await assert.rejects(loadLocalNetwork({...base,fetchImpl:async url=>{
   const isManifest=url.endsWith('agent-manifest.json');calls.push(url);
   const body=isManifest?(stage==='manifest'?'{"networks":[],"networks":'+JSON.stringify(manifest.networks)+'}':JSON.stringify(manifest)):
    '{"tools":[],'+JSON.stringify(graph).slice(1);
   return new Response(body,{headers:{'Content-Type':'application/json'}});
  }}),e=>e.code==='ARTIFACT_JSON');
  assert.equal(calls.length,stage==='manifest'?1:2);
 }
});
