import test from 'node:test';import assert from 'node:assert/strict';import {createSourceTools} from '../index.js';import {validateReceipt} from '../../sutra-evidence/index.js';import fixture from '../../../apps/sutra/src/fixtures/timing-source.json' with {type:'json'};
const create=()=>createSourceTools([fixture.source],{now:()=>fixture.receipt.retrievedAt});
test('exact scoped retrieval is catalog matched; truth remains unverified',()=>{const tools=create();for(const result of [tools.call('search_lesson',{query:'TIMING'}),tools.call('read_cue',{sourceId:fixture.source.id,cueId:'timing-marker'})]){assert.equal(result.receipts.length,1);assert.equal(validateReceipt(result.receipts[0],{sources:[fixture.source]}).level,'catalog_matched');assert.equal(result.truthStatus,'unverified');assert.deepEqual(result.receipts[0],fixture.receipt);}});
test('closed schemas reject URL, DOM, code, unknown names and missing fields',()=>{const t=create();for(const [name,args]of [['fetch',{url:'https://evil.test'}],['read_cue',{sourceId:fixture.source.id,cueId:'timing-marker',script:'alert(1)'}],['search_lesson',{query:'x',selector:'body'}],['read_cue',{sourceId:fixture.source.id}],['search_lesson',{query:' '.repeat(3)}],['search_lesson',{query:'x'.repeat(121)}]])assert.throws(()=>t.call(name,args));});
test('catalog is snapshotted and exposed definitions cannot mutate it',()=>{const sources=[structuredClone(fixture.source)];const t=createSourceTools(sources);sources[0].cues[0].text='changed';const list=t.list();list[0].name='fetch';assert.equal(t.list()[0].effect,'read');assert.equal(t.call('search_lesson',{query:'timing'}).receipts[0].excerpt,fixture.source.cues[0].text);});
test('invalid/ambiguous sources, cues, ranges and hashes fail at registration',()=>{for(const sources of [[],[fixture.source,fixture.source],[{...fixture.source,cues:[...fixture.source.cues,...fixture.source.cues]}],[{...fixture.source,duration:1}],[{...fixture.source,mediaHash:'wrong'}],[{...fixture.source,cues:[{...fixture.source.cues[0],text:'x'.repeat(2001)}]}]])assert.throws(()=>createSourceTools(sources));});
test('search is literal, no regex or evaluation; no match is an empty result',()=>{const t=create();assert.equal(t.call('search_lesson',{query:'.*'}).receipts.length,0);assert.throws(()=>t.call('read_cue',{sourceId:'https://evil.test',cueId:'timing-marker'}),/NOT_FOUND/);});

test('search filters bind candidates to one source and a containing time interval',()=>{
 const second=structuredClone(fixture.source);
 second.id='second-source';second.version='v2';second.hash='d'.repeat(64);second.mediaHash='e'.repeat(64);
 second.duration=20;second.cues=[
  {id:'early',start:1,end:3,text:'Synthetic timing marker in another source.'},
  {id:'late',start:10,end:12,text:'Synthetic timing marker later in another source.'}
 ];
 const t=createSourceTools([fixture.source,second],{now:()=>fixture.receipt.retrievedAt});
 const all=t.call('search_lesson',{query:'timing marker'});assert.equal(all.receipts.length,3);
 const scoped=t.call('search_lesson',{query:'timing marker',sourceId:'second-source'});
 assert.deepEqual(scoped.receipts.map(r=>r.cueId),['early','late']);
 assert.deepEqual(scoped.filters,{sourceId:'second-source'});
 const interval=t.call('search_lesson',{query:'timing marker',sourceId:'second-source',start:0,end:5});
 assert.deepEqual(interval.receipts.map(r=>r.cueId),['early']);
 assert.deepEqual(interval.filters,{sourceId:'second-source',start:0,end:5});
 assert.equal(t.call('search_lesson',{query:'timing marker',sourceId:'second-source',start:4,end:9}).receipts.length,0);
});
test('search interval filters require a finite ordered pair and cannot widen past schema bounds',()=>{
 const t=create();
 for(const args of [
  {query:'timing',start:0},{query:'timing',end:5},{query:'timing',start:5,end:5},
  {query:'timing',start:6,end:5},{query:'timing',start:-1,end:5},{query:'timing',start:0,end:90000}
 ])assert.throws(()=>t.call('search_lesson',args),/ARGUMENTS/);
});
test('fixed query and filters are reproducible and preserve exact source excerpts',()=>{
 const t=create(),args={query:'timing',sourceId:fixture.source.id,start:0,end:8};
 const first=t.call('search_lesson',args),second=t.call('search_lesson',args);
 assert.deepEqual(first,second);
 assert.equal(first.receipts[0].excerpt,fixture.source.cues[0].text);
 assert.equal(first.receipts[0].start,fixture.source.cues[0].start);
 assert.equal(first.receipts[0].end,fixture.source.cues[0].end);
 assert.equal(first.truthStatus,'unverified');
});
