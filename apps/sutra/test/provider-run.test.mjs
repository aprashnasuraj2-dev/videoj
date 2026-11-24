import test from 'node:test';import assert from 'node:assert/strict';import {createReceiptCollector,snapshotApprovedContract,discoverProvider} from '../src/provider-run.js';

const receipt=(i,source='source')=>({version:1,sourceId:source,sourceVersion:'v1',sourceHash:'a'.repeat(64),mediaHash:'b'.repeat(64),cueId:'cue-'+i,start:i,end:i+1,excerpt:'cue '+i,retrievedAt:'2026-11-24T00:00:00Z',verification:'unverified'});

const sourcesFor=(...ids)=>ids.map(id=>({id,version:'v1',hash:'a'.repeat(64),mediaHash:'b'.repeat(64),duration:20,cues:Array.from({length:6},(_,i)=>({id:'cue-'+i,start:i,end:i+1,text:'cue '+i}))}));
test('receipt collector preserves bounded unique evidence and fails closed on the first hidden unique cue',()=>{
 const c=createReceiptCollector({sources:sourcesFor('source'),limit:3});
 assert.equal(c.add(receipt(0)),true);assert.equal(c.add(receipt(1)),true);
 assert.equal(c.add({...receipt(1),retrievedAt:'2026-11-24T00:00:01Z'}),true,'same source/cue refresh does not consume another slot');
 assert.equal(c.add(receipt(2)),true);assert.equal(c.add(receipt(3)),false);
 const out=c.snapshot();assert.equal(out.overflow,true);assert.equal(out.receipts.length,3);
 assert.deepEqual(out.receipts.map(x=>x.cueId),['cue-0','cue-1','cue-2']);
 assert.equal(out.receipts[1].retrievedAt,'2026-11-24T00:00:01Z');
 assert.ok(Object.isFrozen(out));assert.ok(Object.isFrozen(out.receipts));assert.ok(Object.isFrozen(out.receipts[0]));
});
test('receipt identity includes source as well as cue id and collector bounds are fixed',()=>{
 const c=createReceiptCollector({sources:sourcesFor('a','b'),limit:2});assert.equal(c.add(receipt(0,'a')),true);assert.equal(c.add(receipt(0,'b')),true);assert.equal(c.snapshot().overflow,false);
 assert.throws(()=>c.add(null),/Invalid receipt/);
 for(const n of [0,21,1.5])assert.throws(()=>createReceiptCollector({sources:sourcesFor('source'),limit:n}),/Invalid receipt limit/);
});

test('receipt collector independently refuses missing catalog, malformed, stale, tampered and self-verified records',()=>{
 assert.throws(()=>createReceiptCollector(),/data array/);
 assert.throws(()=>createReceiptCollector({sources:[]}),/catalog required/);
 for(const patch of [{sourceVersion:'v2'},{sourceHash:'c'.repeat(64)},{excerpt:'invented'},{sourceId:'another'},{verification:'verified'},{cueId:'absent'}]){
  const c=createReceiptCollector({sources:sourcesFor('source')});
  c.add(receipt(0));assert.throws(()=>c.add({...receipt(1),...patch}),/Invalid receipt/);
  const out=c.snapshot();assert.equal(out.invalid,true);assert.deepEqual(out.receipts,[receipt(0)]);
 }
});
test('receipt collector never invokes getters and owns its primitive receipt snapshot',()=>{
 let read=0;const bad={...receipt(1)};Object.defineProperty(bad,'excerpt',{enumerable:true,get(){read++;return 'cue 1';}});
 const c=createReceiptCollector({sources:sourcesFor('source')});assert.throws(()=>c.add(bad),/Invalid receipt/);assert.equal(read,0);
 const original=receipt(0);c.add(original);original.excerpt='private changed value';assert.deepEqual(c.snapshot().receipts,[receipt(0)]);assert.equal(c.snapshot().invalid,true);
});
test('receipt collector revalidates earlier receipts when mounted source identity drifts',()=>{
 const sources=sourcesFor('source');const c=createReceiptCollector({sources});c.add(receipt(0));
 sources[0].version='v2';const out=c.snapshot();assert.equal(out.invalid,true);assert.deepEqual(out.receipts,[]);
 sources[0].version='v1';assert.equal(c.snapshot().invalid,true,'invalid evidence state remains sticky even if caller restores catalog');
});

const approval=()=>({backend:'self_hosted',model:'local-model',inferenceContractId:'a'.repeat(64),router:'https://example.test/api/v1',content:{profileSha256:'b'.repeat(64),catalogSha256:'c'.repeat(64),transcriptSha256:'d'.repeat(64),contentVersion:'v1',contentMode:'synthetic',primarySourceId:'source'},graphUrl:'https://example.test/agents/graph.json',frontMan:'learner',graphSha256:'e'.repeat(64)});
test('approved contract snapshot is closed and unaffected by caller changes during discovery or model callbacks',()=>{
 const raw=approval(),expected=structuredClone(raw),snapshot=snapshotApprovedContract(raw);
 raw.inferenceContractId='f'.repeat(64);raw.content.catalogSha256='f'.repeat(64);raw.model='other';
 assert.deepEqual(snapshot,expected);assert.ok(Object.isFrozen(snapshot));assert.ok(Object.isFrozen(snapshot.content));
 for(const invalid of [{...approval(),secret:'private'},{...approval(),content:{...approval().content,secret:'private'}},{...approval(),inferenceContractId:'bad'}])assert.throws(()=>snapshotApprovedContract(invalid),e=>e.code==='CONTRACT_CHANGED');
 let getter=0;const bad=approval();Object.defineProperty(bad.content,'catalogSha256',{enumerable:true,get(){getter++;return 'c'.repeat(64);}});
 assert.throws(()=>snapshotApprovedContract(bad),e=>e.code==='CONTRACT_CHANGED');assert.equal(getter,0);
});
test('pre-aborted provider discovery never contacts status',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 await assert.rejects(discoverProvider({origin:'https://example.test',signal:c.signal,fetchImpl:async()=>{calls++;throw Error('unexpected');}}));
 assert.equal(calls,0);
});
