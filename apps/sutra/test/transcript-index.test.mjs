import test from 'node:test';
import assert from 'node:assert/strict';
import {createTranscriptIndex,formatTime} from '../src/transcript-index.js';

const meta={version:1,id:'synthetic-timing-transcript',transcriptVersion:'timing-transcript-v1',transcriptHash:'a'.repeat(64),sourceId:'synthetic-timing-fixture',sourceVersion:'v1',mediaHash:'b'.repeat(64),duration:8,language:'en',translated:false};
const cues=[
 {id:'start',start:0,end:2,text:'Synthetic timing fixture begins.'},
 {id:'marker',start:2,end:4,text:'Synthetic timing marker.'},
 {id:'end',start:4,end:8,text:'Synthetic timing fixture ends.'}
];
test('search is bounded case-insensitive and reports empty results',()=>{
 const index=createTranscriptIndex({cues,meta});
 assert.deepEqual(index.search('MARKER').map(x=>x.id),['marker']);
 assert.deepEqual(index.search('missing'),[]);
 assert.equal(index.search('x'.repeat(1000)).length,0);
 assert.equal(index.search('').length,3);
});
test('active cue follows actual time without inventing gap ownership',()=>{
 const index=createTranscriptIndex({cues,meta});
 assert.equal(index.activeAt(0),'start');assert.equal(index.activeAt(2),'marker');assert.equal(index.activeAt(7.99),'end');assert.equal(index.activeAt(8),'end');assert.equal(index.activeAt(-1),null);
 const gap=createTranscriptIndex({cues:[{id:'a',start:0,end:1,text:'a'},{id:'b',start:2,end:3,text:'b'}],meta});
 assert.equal(gap.activeAt(1.5),null);
});
test('keyboard movement is constrained to visible cue ids',()=>{
 const index=createTranscriptIndex({cues,meta}),visible=['start','end'];
 assert.equal(index.move(visible,'start','next'),'end');assert.equal(index.move(visible,'end','next'),'end');assert.equal(index.move(visible,'end','previous'),'start');assert.equal(index.move(visible,'end','first'),'start');assert.equal(index.move(visible,'start','last'),'end');
});
test('metadata and cue bounds fail closed',()=>{
 for(const bad of [
  {...meta,duration:0},{...meta,transcriptHash:'bad'},{...meta,translated:'no'}
 ])assert.throws(()=>createTranscriptIndex({cues,meta:bad}));
 assert.throws(()=>createTranscriptIndex({cues:[{id:'late',start:7,end:9,text:'bad'}],meta}));
 assert.throws(()=>createTranscriptIndex({cues:[{id:'dup',start:0,end:1,text:'a'},{id:'dup',start:1,end:2,text:'b'}],meta}));
});
test('stable labels expose time range and text',()=>{const index=createTranscriptIndex({cues,meta});assert.equal(index.label(index.all()[1]),'00:02–00:04 · Synthetic timing marker.');assert.equal(formatTime(125),'02:05');});
