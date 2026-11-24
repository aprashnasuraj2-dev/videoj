import test from 'node:test';import assert from 'node:assert/strict';import {createReceiptCollector} from '../src/provider-run.js';

const receipt=(i,source='source')=>({version:1,sourceId:source,sourceVersion:'v1',sourceHash:'a'.repeat(64),mediaHash:'b'.repeat(64),cueId:'cue-'+i,start:i,end:i+1,excerpt:'cue '+i,retrievedAt:'2026-11-24T00:00:00Z',verification:'unverified'});

test('receipt collector preserves bounded unique evidence and fails closed on the first hidden unique cue',()=>{
 const c=createReceiptCollector(3);
 assert.equal(c.add(receipt(0)),true);assert.equal(c.add(receipt(1)),true);
 assert.equal(c.add({...receipt(1),retrievedAt:'2026-11-24T00:00:01Z'}),true,'same source/cue refresh does not consume another slot');
 assert.equal(c.add(receipt(2)),true);assert.equal(c.add(receipt(3)),false);
 const out=c.snapshot();assert.equal(out.overflow,true);assert.equal(out.receipts.length,3);
 assert.deepEqual(out.receipts.map(x=>x.cueId),['cue-0','cue-1','cue-2']);
 assert.equal(out.receipts[1].retrievedAt,'2026-11-24T00:00:01Z');
 assert.ok(Object.isFrozen(out));assert.ok(Object.isFrozen(out.receipts));assert.ok(Object.isFrozen(out.receipts[0]));
});
test('receipt identity includes source as well as cue id and collector bounds are fixed',()=>{
 const c=createReceiptCollector(2);assert.equal(c.add(receipt(0,'a')),true);assert.equal(c.add(receipt(0,'b')),true);assert.equal(c.snapshot().overflow,false);
 assert.throws(()=>c.add(null),/Invalid receipt/);
 for(const n of [0,21,1.5])assert.throws(()=>createReceiptCollector(n),/Invalid receipt limit/);
});
