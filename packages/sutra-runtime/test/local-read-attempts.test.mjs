import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadLocalNetwork} from '../index.js';
const origin='https://caller.example',baseUrl=origin+'/agents/';
const graph=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const manifest={networks:[{name:'learner',front_man:'learner',hocon:'./learner.network.json'}]};
const responseFor=url=>Response.json(url.endsWith('agent-manifest.json')?manifest:graph);
const options={baseUrl,expectedOrigin:origin};
test('default local GET does not retry unavailable response',async()=>{
 let calls=0;await assert.rejects(loadLocalNetwork({...options,fetchImpl:async()=>{calls++;return new Response(null,{status:503});}}),e=>e.code==='ARTIFACT_UNAVAILABLE'&&e.readAttempts.length===1&&e.readAttempts[0].status==='unavailable');assert.equal(calls,1);
});
test('one explicitly enabled retry recovers one unavailable local GET and records attempts',async()=>{
 let calls=0;const result=await loadLocalNetwork({...options,retryUnavailableReads:true,fetchImpl:async(url,opts)=>{
  assert.equal(opts.method,'GET');assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');
  return ++calls===1?new Response(null,{status:503}):responseFor(url);
 }});
 assert.equal(calls,3);assert.deepEqual(result.readAttempts,[{artifact:'manifest',attempt:1,status:'unavailable'},{artifact:'manifest',attempt:2,status:'completed'},{artifact:'definition',attempt:1,status:'completed'}]);
 assert.ok(Object.isFrozen(result.readAttempts));
});
test('retry budget is shared across artifacts, not multiplied per artifact',async()=>{
 let calls=0;await assert.rejects(loadLocalNetwork({...options,retryUnavailableReads:true,fetchImpl:async(url)=>++calls===2?responseFor(url):new Response(null,{status:502})}),e=>e.code==='ARTIFACT_UNAVAILABLE'&&e.readAttempts.length===3);assert.equal(calls,3);
});
test('no retry on missing, wrong MIME, malformed JSON, redirect or ambiguous transport',async()=>{
 for(const make of [()=>new Response(null,{status:404}),()=>new Response('<html>',{headers:{'content-type':'text/html'}}),()=>new Response('{',{headers:{'content-type':'application/json'}}),()=>{const r=Response.json(manifest);Object.defineProperty(r,'redirected',{value:true});return r;},()=>{throw Error('private transport detail');}]){
  let calls=0;await assert.rejects(loadLocalNetwork({...options,retryUnavailableReads:true,fetchImpl:async()=>{calls++;return make();}}),e=>e.readAttempts.length===1&&!JSON.stringify(e).includes('private transport detail'));assert.equal(calls,1);
 }
});
test('cancelled load does not start retry even if fetch returns unavailable after cancellation',async()=>{
 const c=new AbortController();let calls=0;await assert.rejects(loadLocalNetwork({...options,signal:c.signal,retryUnavailableReads:true,fetchImpl:async()=>{calls++;c.abort();return new Response(null,{status:503});}}),e=>e.code==='CANCELLED'&&e.readAttempts.length===1);assert.equal(calls,1);
});
