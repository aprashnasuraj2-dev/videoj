import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createReviewStore} from '../src/review-store.js';
import {createReviewActions} from '../src/review-actions.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../src/fixtures/timing-source.json',import.meta.url)));
function setup({exporter=async()=> 'sutra-receipt.json'}={}){
 const values=new Map();let writes=0,id=0;
 const storage={getItem:key=>values.get(key)??null,setItem(key,value){writes++;values.set(key,value);}};
 const store=createReviewStore({storage,sources:[fixture.source],idFactory:()=>`review-${++id}`});
 const actions=createReviewActions({store,sources:[fixture.source],exporter,baseOrigin:'https://sutra.test'});
 return {actions,store,values,get writes(){return writes;}};
}

test('registers save and export as explicit local write actions',()=>{
 const {actions}=setup();const catalog=actions.catalog();
 assert.deepEqual(catalog.map(x=>x.name),['save-review-card','export-receipt']);
 assert.ok(catalog.every(x=>x.effect==='write'&&x.availability==='local-only'));
 assert.ok(catalog.every(x=>x.ref.startsWith('https://sutra.test/learner#')));
});
test('cancelled registry confirmation executes no save',async()=>{
 const f=setup(),plan=f.actions.prepareSave(fixture.receipt);let reviewed;
 const receipts=await f.actions.execute(plan,async summary=>{reviewed=summary;return false;},'invocation-1');
 assert.equal(receipts,null);assert.equal(f.writes,0);assert.equal(f.store.list().length,0);
 assert.equal(reviewed[0].effect,'write');assert.deepEqual(reviewed[0].arguments.receipt,fixture.receipt);
});
test('confirmed save uses the exact frozen reviewed payload once',async()=>{
 const f=setup(),plan=f.actions.prepareSave(fixture.receipt);
 assert.ok(Object.isFrozen(plan)&&Object.isFrozen(plan[0].args)&&Object.isFrozen(plan[0].args.receipt));
 assert.throws(()=>{plan[0].args.receipt.excerpt='changed after review';});
 const receipts=await f.actions.execute(plan,async()=>true,'invocation-2');
 assert.equal(receipts[0].status,'succeeded');assert.equal(receipts[0].result.outcome,'succeeded');
 assert.equal(f.writes,1);assert.deepEqual(f.store.list()[0].receipt,fixture.receipt);
});
test('invalid or source-mismatched receipt cannot reach confirmation',async()=>{
 const f=setup();assert.throws(()=>f.actions.prepareSave({...fixture.receipt,sourceVersion:'wrong'}));
 assert.throws(()=>f.actions.prepareExport({...fixture.receipt,excerpt:'fabricated'}));assert.equal(f.writes,0);
});
test('confirmed export receives exact receipt and deterministic request identity',async()=>{
 let seen;const f=setup({exporter:async(receipt,meta)=>{seen={receipt,meta};return 'sutra-evidence.json';}});
 const plan=f.actions.prepareExport(fixture.receipt);const receipts=await f.actions.execute(plan,async summary=>{
  assert.equal(summary[0].action,'export-receipt');assert.equal(summary[0].effect,'write');return true;
 },'invocation-3');
 assert.equal(receipts[0].status,'succeeded');assert.deepEqual(receipts[0].result,{outcome:'succeeded',filename:'sutra-evidence.json'});
 assert.deepEqual(seen.receipt,fixture.receipt);assert.equal(seen.meta.requestId,'invocation-3:0');
});
test('ambiguous export failure is returned unknown and never retried',async()=>{
 let calls=0;const f=setup({exporter:async()=>{calls++;throw Error('download transport ambiguous');}});
 const plan=f.actions.prepareExport(fixture.receipt);const receipts=await f.actions.execute(plan,async()=>true,'invocation-4');
 assert.equal(calls,1);assert.equal(receipts[0].status,'unknown');assert.equal(receipts.length,1);
});
