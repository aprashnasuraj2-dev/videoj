import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createDirectLookup} from '../src/direct-lookup.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../src/fixtures/timing-source.json',import.meta.url)));
test('direct path returns only exact source-backed receipts without model or transport',()=>{
 const catalog=[structuredClone(fixture.source)],lookup=createDirectLookup({sources:catalog,now:()=>fixture.receipt.retrievedAt});
 catalog[0].cues[0].text='tampered';
 const match=lookup.search(' TIMING MARKER ');assert.equal(match.state,'matched');assert.deepEqual(match.receipts,[fixture.receipt]);assert.equal(match.modelCalls,0);assert.equal(match.networkRequests,0);assert.equal(match.truthStatus,'unverified');assert.equal(match.returnedCount,1);assert.equal(match.matchCount,1);assert.equal(match.truncated,false);assert.ok(Object.isFrozen(match.receipts[0]));
});
test('no match and malformed queries have no receipts or fake answer',()=>{
 const lookup=createDirectLookup({sources:[fixture.source]});
 for(const q of ['',' '.repeat(4),'x'.repeat(121),null,42]){const r=lookup.search(q);assert.equal(r.state,'invalid_query');assert.deepEqual(r.receipts,[]);}
 const absent=lookup.search('unknown safety threshold');assert.equal(absent.state,'no_match');assert.equal(absent.matchCount,0);assert.equal(absent.truncated,false);assert.deepEqual(absent.receipts,[]);
});
test('unusable source catalog cannot masquerade as a valid lookup',()=>{
 const bad=structuredClone(fixture.source);bad.cues[0].end=900;assert.throws(()=>createDirectLookup({sources:[bad]}));
});

test('direct search exposes bounded truncation instead of implying five results are exhaustive',()=>{
 const source=structuredClone(fixture.source);source.duration=20;
 source.cues=Array.from({length:6},(_,i)=>({id:'literal-'+i,start:i*2,end:i*2+1,text:'Repeated literal phrase '+i}));
 const found=createDirectLookup({sources:[source],now:()=>fixture.receipt.retrievedAt}).search('repeated literal phrase');
 assert.equal(found.state,'ambiguous');assert.equal(found.receipts.length,5);assert.equal(found.returnedCount,5);assert.equal(found.matchCount,6);assert.equal(found.truncated,true);
 assert.deepEqual(found.receipts.map(x=>x.cueId),['literal-0','literal-1','literal-2','literal-3','literal-4']);
 assert.equal(found.modelCalls,0);assert.equal(found.networkRequests,0);
});
