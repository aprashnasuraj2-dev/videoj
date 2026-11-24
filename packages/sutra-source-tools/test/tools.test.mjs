import test from 'node:test';import assert from 'node:assert/strict';import {createSourceTools} from '../index.js';import {validateReceipt} from '../../sutra-evidence/index.js';import fixture from '../../../apps/sutra/src/fixtures/timing-source.json' with {type:'json'};
const create=()=>createSourceTools([fixture.source],{now:()=>fixture.receipt.retrievedAt});
test('exact scoped retrieval is catalog matched; truth remains unverified',()=>{const tools=create();for(const result of [tools.call('search_lesson',{query:'TIMING'}),tools.call('read_cue',{sourceId:fixture.source.id,cueId:'timing-marker'})]){assert.equal(result.receipts.length,1);assert.equal(validateReceipt(result.receipts[0],{sources:[fixture.source]}).level,'catalog_matched');assert.equal(result.truthStatus,'unverified');if(result.limit===5){assert.equal(result.matchCount,1);assert.equal(result.truncated,false);}assert.deepEqual(result.receipts[0],fixture.receipt);}});
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
 assert.deepEqual(scoped.filters,{sourceId:'second-source'});assert.equal(scoped.matchCount,2);assert.equal(scoped.truncated,false);
 const interval=t.call('search_lesson',{query:'timing marker',sourceId:'second-source',start:0,end:5});
 assert.deepEqual(interval.receipts.map(r=>r.cueId),['early']);
 assert.deepEqual(interval.filters,{sourceId:'second-source',start:0,end:5});assert.equal(interval.matchCount,1);assert.equal(interval.truncated,false);
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

test('catalog registration and tool arguments never invoke ordinary accessors or toJSON',()=>{
 let executed=0;
 const accessor=structuredClone(fixture.source);Object.defineProperty(accessor.cues[0],'text',{enumerable:true,get(){executed++;return fixture.source.cues[0].text;}});
 const jsonHook={...fixture.source,toJSON(){executed++;return fixture.source;}};
 for(const value of [accessor,jsonHook])assert.throws(()=>createSourceTools([value]),/CATALOG/);
 const args={};Object.defineProperty(args,'query',{enumerable:true,get(){executed++;return 'timing';}});
 assert.throws(()=>create().call('search_lesson',args),/ARGUMENTS/);
 const hidden={query:'timing'};Object.defineProperty(hidden,'extra',{value:'private-canary'});
 assert.throws(()=>create().call('search_lesson',hidden),/ARGUMENTS/);
 assert.equal(executed,0);
});
test('maximum 20x500 short-cue catalog preserves order, exact scope, duplicate rejection and five-result cap',()=>{
 const sources=Array.from({length:20},(_,i)=>({...fixture.source,id:'source-'+i,duration:1000,cues:Array.from({length:500},(_,j)=>({id:'cue-'+j,start:j,end:j+0.5,text:'Timing '+i+' '+j}))}));
 const t=createSourceTools(sources,{now:()=>fixture.receipt.retrievedAt});
 const first=t.call('search_lesson',{query:'timing'}).receipts;
 assert.deepEqual(first.map(r=>r.cueId),['cue-0','cue-1','cue-2','cue-3','cue-4']);assert.ok(first.every(r=>r.sourceId==='source-0'));const all=t.call('search_lesson',{query:'timing'});assert.equal(all.matchCount,10000);assert.equal(all.truncated,true);
 const exact=t.call('read_cue',{sourceId:'source-19',cueId:'cue-499'}).receipts[0];
 assert.equal(exact.excerpt,'Timing 19 499');assert.equal(validateReceipt(exact,{sources}).level,'catalog_matched');
 assert.deepEqual(t.call('search_lesson',{query:'timing',sourceId:'source-19',start:498,end:500}).receipts.map(r=>r.cueId),['cue-498','cue-499']);
 const duplicate=structuredClone(sources[0]);duplicate.cues[499].id='cue-0';assert.throws(()=>createSourceTools([duplicate]),/CATALOG/);
});
test('aggregate text budget and empty-source metadata are enforced',()=>{
 const heavy=Array.from({length:5},(_,i)=>({...fixture.source,id:'source-'+i,duration:1000,cues:Array.from({length:500},(_,j)=>({id:'cue-'+j,start:j,end:j+0.5,text:'x'.repeat(2000)}))}));
 assert.throws(()=>createSourceTools(heavy),/CATALOG/);
 assert.throws(()=>createSourceTools([{...fixture.source,hash:'bad',cues:[]}]),/CATALOG/);
});

test('literal search normalizes Unicode compatibility forms before matching without changing source excerpts',()=>{
 const source=structuredClone(fixture.source);source.cues[0].text='क़दम जाँच गर्नुहोस्';
 const t=createSourceTools([source],{now:()=>fixture.receipt.retrievedAt});
 const result=t.call('search_lesson',{query:'क़दम'});
 assert.equal(result.receipts.length,1);assert.equal(result.receipts[0].excerpt,'क़दम जाँच गर्नुहोस्');
 assert.equal(result.matchCount,1);assert.equal(result.truncated,false);
});
