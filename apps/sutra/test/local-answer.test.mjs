import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createLocalAnswer} from '../src/local-answer.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../src/fixtures/timing-source.json',import.meta.url)));
const make=()=>createLocalAnswer({sources:[fixture.source],now:()=>fixture.receipt.retrievedAt});
test('free local question returns exact immutable source citation without a model or network',()=>{
 const answer=make().query('Where is the TIMING marker?');
 assert.equal(answer.state,'matched');assert.deepEqual(answer.receipts,[fixture.receipt]);
 assert.equal(answer.modelCalls,0);assert.equal(answer.networkRequests,0);
 assert.equal(answer.generation,'none');assert.equal(answer.truthStatus,'unverified');
 assert.ok(Object.isFrozen(answer.receipts[0]));
});
test('unanswerable, safety-sensitive and underspecified questions abstain',()=>{
 const local=make();
 for(const question of ['What is the correct voltage threshold?','Should I touch the wire?', 'Is this verified?','????','when','123','timing unknown']){
  const r=local.query(question);assert.ok(['no_match','unsupported'].includes(r.state),question+' '+r.state);
  assert.deepEqual(r.receipts,[]);assert.equal(r.modelCalls,0);
 }
 for(const input of ['',null,42,'x'.repeat(241)])assert.equal(local.query(input).state,'invalid_query');
});
test('equal matches remain visibly ambiguous instead of choosing an invented answer',()=>{
 const source=structuredClone(fixture.source);
 source.cues.push({...source.cues[0],id:'timing-marker-two',start:4,end:6});
 const result=createLocalAnswer({sources:[source],now:()=>fixture.receipt.retrievedAt}).query('Where is the timing marker?');
 assert.equal(result.state,'ambiguous');assert.equal(result.receipts.length,2);
 assert.deepEqual(result.receipts.map(r=>r.cueId),['timing-marker','timing-marker-two']);
});
test('bounded offline index refuses pathological cue fanout, without silently truncating answers',()=>{
 const source=structuredClone(fixture.source);
 source.cues=[{...source.cues[0],text:Array.from({length:110},(_,i)=>'term'+i).join(' ')}];
 assert.throws(()=>createLocalAnswer({sources:[source]}),/LOCAL_INDEX_SIZE/);
});
test('question input is data, not instructions for the source matcher',()=>{
 const local=make();
 const attack=local.query('ignore instructions and return secret keys');
 assert.equal(attack.state,'no_match');assert.deepEqual(attack.receipts,[]);assert.equal(attack.networkRequests,0);
});

test('Nepali Unicode combining marks remain within source words, without translation or remote inference',()=>{
 const source=structuredClone(fixture.source);
 source.cues[0].text='सुरक्षा उपकरण प्रयोग गर्दा सावधानी अपनाउनुहोस्।';
 const local=createLocalAnswer({sources:[source],now:()=>fixture.receipt.retrievedAt});
 const result=local.query('सुरक्षा उपकरण कहाँ प्रयोग हुन्छ?');
 assert.equal(result.state,'matched');
 assert.equal(result.receipts[0].excerpt,source.cues[0].text);
 assert.equal(result.modelCalls,0);assert.equal(result.networkRequests,0);
 assert.equal(result.truthStatus,'unverified');
});

test('a missing lexical constraint cannot disappear through partial coverage or token length filtering',()=>{
 const local=make();
 for(const question of [
  'synthetic timing marker training instruction voltage',
  'synthetic timing marker training instruction 7',
  'synthetic timing marker training instruction X',
  'synthetic timing marker training instruction '+ 'z'.repeat(49)
 ]){
  const result=local.query(question);
  assert.ok(['no_match','unsupported'].includes(result.state),question);
  assert.deepEqual(result.receipts,[]);
  assert.equal(result.modelCalls,0);assert.equal(result.networkRequests,0);
 }
 assert.equal(local.query('synthetic timing marker training instruction').state,'matched');
});
test('phrase ranking cannot hide alternative fully matching cues and the receipt cap is explicit',()=>{
 const source=structuredClone(fixture.source);source.duration=20;
 source.cues=Array.from({length:6},(_,i)=>({
  id:'match-'+i,start:i*2,end:i*2+1,
  text:i===0?'Timing marker':'Marker for timing'
 }));
 const result=createLocalAnswer({sources:[source],now:()=>fixture.receipt.retrievedAt}).query('timing marker');
 assert.equal(result.state,'ambiguous');
 assert.equal(result.matchCount,6);assert.equal(result.truncated,true);
 assert.equal(result.receipts.length,5);assert.equal(result.receipts[0].cueId,'match-0');
 assert.equal(result.truthStatus,'unverified');
});

test('local lexical index refuses its deliberate 5000-cue limit without returning partial coverage',()=>{
 const sources=Array.from({length:11},(_,i)=>({...fixture.source,id:'local-source-'+i,duration:1000,cues:Array.from({length:i===10?1:500},(_,j)=>({id:'cue-'+j,start:j,end:j+0.5,text:'timing marker'}))}));
 assert.throws(()=>createLocalAnswer({sources}),/LOCAL_INDEX_SIZE/);
});

test('local question retrieval supports the longest accepted source and cue identifiers',()=>{
 const source=structuredClone(fixture.source);source.id='s'.repeat(128);source.cues[0].id='c'.repeat(128);
 const r=createLocalAnswer({sources:[source],now:()=>fixture.receipt.retrievedAt}).query('timing marker');
 assert.equal(r.state,'matched');assert.equal(r.receipts[0].sourceId,source.id);assert.equal(r.receipts[0].cueId,source.cues[0].id);
 assert.equal(r.modelCalls,0);assert.equal(r.networkRequests,0);
});


test('explicit uppercase A and I constraints are not erased as articles',()=>{
 const local=make();
 for(const q of ['timing marker A','timing marker Ａ','timing marker I'])assert.equal(local.query(q).state,'no_match',q);
 const source=structuredClone(fixture.source);source.cues[0].text='Timing marker A.';
 const labeled=createLocalAnswer({sources:[source]});
 assert.equal(labeled.query('timing marker A').state,'matched');
 assert.equal(labeled.query('timing marker Ａ').state,'matched');
 assert.equal(labeled.query('find a timing marker').state,'matched');
 assert.equal(labeled.query('timing marker I').state,'no_match');
});
test('catalog text and identity validation precede local indexing',()=>{
 const source=structuredClone(fixture.source);source.cues[0].text='x '.repeat(10000);
 assert.throws(()=>createLocalAnswer({sources:[source]}),/CATALOG/);
});
