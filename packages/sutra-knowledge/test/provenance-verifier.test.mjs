import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvenanceVerifier,createVerifier} from '../index.js';
const input=(id,value,basis)=>({id,kind:'input',value,dimension:[0,0,0],basis});
const op=(id,kind,op,...args)=>({id,kind,op,args});
const graph=(basis='v1',a='2',b='3')=>JSON.stringify({schemaVersion:1,nodes:[input('a',a,basis),input('b',b,basis),op('sum','derive','add','a','b'),op('square','derive','mul','sum','sum'),op('left','constraint','gt','square','a'),op('right','constraint','gt','b','a')]});
const keys=(a='sourceA',b='sourceB')=>new Map([['a',a],['b',b]]);
async function exact(v,g,p){const r=await v.evaluate(g,p),f=await createVerifier().evaluate(g);assert.equal(r.reportText,f.reportText);return r;}
test('reuses only arithmetic on a new contract basis, rebuilds every exact receipt',async()=>{
 const v=createProvenanceVerifier(),a=await exact(v,graph(),keys()),b=await exact(v,graph('v2'),keys());
 assert.equal(a.stats.executed.length,6);assert.equal(b.stats.executed.length,0);assert.equal(b.stats.reusedOutcomes.length,6);
 assert.equal(b.stats.reusedReceipts.length,0);assert.equal(b.stats.rebuiltReceipts.length,6);
 assert.notEqual(a.report.graphDigest,b.report.graphDigest);assert.notEqual(a.report.receipts.find(r=>r.id==='left').receiptDigest,b.report.receipts.find(r=>r.id==='left').receiptDigest);
 const c=await exact(v,graph('v2'),keys());assert.equal(c.stats.reusedReceipts.length,6);assert.equal(c.stats.rebuiltReceipts.length,0);
});
test('same value with changed provenance invalidates shared descendants; numeric data cannot be hidden by a stable key',async()=>{
 const v=createProvenanceVerifier();await exact(v,graph(),keys());
 const b=await exact(v,graph('v2'),keys('changed','sourceB'));assert.deepEqual(b.stats.reusedOutcomes,['b']);assert.deepEqual(b.stats.executed.sort(),['a','left','right','square','sum']);
 const c=await exact(v,graph('v3','2','4'),keys('changed','sourceB'));assert.deepEqual(c.stats.reusedOutcomes,['a']);assert.equal(c.stats.executed.length,5);
});
test('fork isolation, failed admission and removal are transactional',async()=>{
 const v=createProvenanceVerifier();const first=await exact(v,graph(),keys());
 const fork=v.fork();await exact(fork,graph('branch','9'),keys('branch','sourceB'));
 await assert.rejects(v.evaluate(graph('bad'),new Map([['a','only']])),/REVISION_PROVENANCE_KEYS/);
 await assert.rejects(v.evaluate(graph('bad'),keys('x'.repeat(8193),'b')),/REVISION_PROVENANCE_KEY/);
 const again=await exact(v,graph(),keys());assert.equal(again.reportText,first.reportText);assert.equal(again.stats.reusedReceipts.length,6);
 const one=JSON.stringify({schemaVersion:1,nodes:[input('a','2','v1')]});
 const removed=await exact(v,one,new Map([['a','sourceA']]));assert.equal(removed.stats.removed.length,5);
 assert.deepEqual(v.clear().removed,['a']);const restored=await exact(v,graph(),keys());assert.equal(restored.stats.executed.length,6);
});
test('input key snapshot is copied before asynchronous hashing; concurrent work is refused',async()=>{
 const v=createProvenanceVerifier(),p=keys(),running=v.evaluate(graph(),p);p.set('a','mutated');
 await assert.rejects(v.evaluate(graph(),keys()),/VERIFIER_BUSY/);assert.throws(()=>v.fork(),/VERIFIER_BUSY/);await running;
 const next=await exact(v,graph('next'),keys());assert.equal(next.stats.reusedOutcomes.length,6);
});
