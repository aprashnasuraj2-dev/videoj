import {test}from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import {createReviewStore,ReviewDataStaleError}from'../src/review-store.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../src/fixtures/timing-source.json',import.meta.url)));
function setup(){const values=new Map();let writes=0,id=0;const storage={getItem:k=>values.get(k)??null,setItem(k,v){writes++;values.set(k,v);}};return {values,storage,get writes(){return writes;},store:createReviewStore({storage,sources:[fixture.source],idFactory:()=>`review-${++id}`})};}
test('preview and cancellation make no writes; cancelled proposal cannot commit',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);assert.equal(f.writes,0);f.store.cancel(p.id);assert.throws(()=>f.store.commit(p.id));assert.equal(f.writes,0);});
test('persisted record exactly matches reviewed receipt; duplicate commit does not repeat write',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);const saved=f.store.commit(p.id);assert.deepEqual(saved.receipt,fixture.receipt);assert.equal(f.writes,1);assert.deepEqual(f.store.commit(p.id),saved);assert.equal(f.writes,1);});
test('caller mutations cannot change pending payload',()=>{const f=setup(),receipt=structuredClone(fixture.receipt);const p=f.store.prepare(receipt);receipt.excerpt='changed';assert.throws(()=>p.receipt.excerpt='changed');assert.equal(f.store.commit(p.id).receipt.excerpt,fixture.receipt.excerpt);});
test('invalid receipt cannot enter a review preview',()=>{const f=setup();assert.throws(()=>f.store.prepare({...fixture.receipt,start:999}));assert.equal(f.writes,0);});
test('failed storage does not report success or automatically retry',()=>{const f=setup();let calls=0;f.storage.setItem=()=>{calls++;throw Error('quota');};const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id));assert.throws(()=>f.store.commit(p.id));assert.equal(calls,1);});
test('records reload and delete by saved id',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);f.store.commit(p.id);const other=createReviewStore({storage:f.storage,sources:[fixture.source]});assert.equal(other.list().length,1);other.remove(p.id);assert.deepEqual(other.list(),[]);});
test('corrupt persisted data is visible and not silently overwritten',()=>{const f=setup();f.values.set('sutra.synthetic-review-cards.v1','broken JSON');assert.throws(()=>f.store.list());const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id));assert.equal(f.writes,0);});
test('local collection is bounded to ten records',()=>{const f=setup();for(let i=0;i<10;i++){const p=f.store.prepare(fixture.receipt);f.store.commit(p.id);}const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id));assert.equal(f.writes,10);});
test('uncertain write outcomes remain unknown and consumed',()=>{const f=setup();let calls=0;f.storage.setItem=(key,value)=>{calls++;f.values.set(key,value);throw Error('disconnect after storage side effect');};const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id),e=>e.outcome==='unknown');assert.equal(f.store.list().length,1);assert.throws(()=>f.store.commit(p.id));assert.equal(calls,1);});
test('known storage rejection is distinguishable from unknown outcome',()=>{const f=setup();f.storage.setItem=()=>{throw new DOMException('quota','QuotaExceededError');};const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id),e=>e.outcome==='rejected');assert.deepEqual(f.store.list(),[]);});

test('stored review becomes explicit stale provenance after source version drift and remains deletable',()=>{
 const f=setup(),proposal=f.store.prepare(fixture.receipt);f.store.commit(proposal.id);
 const changed=structuredClone(fixture.source);changed.version='v2';
 const reopened=createReviewStore({storage:f.storage,sources:[changed]});
 const inspected=reopened.inspect();
 assert.equal(inspected.length,1);assert.equal(inspected[0].status,'stale');
 assert.equal(inspected[0].provenance.sourceId,fixture.receipt.sourceId);
 assert.equal(inspected[0].provenance.sourceVersion,fixture.receipt.sourceVersion,'previous provenance is preserved');
 assert.ok(inspected[0].errors.some(error=>error.code==='VERSION_MISMATCH'));
 assert.throws(()=>reopened.list(),error=>error instanceof ReviewDataStaleError&&error.staleCount===1);
 reopened.remove(proposal.id);assert.deepEqual(reopened.inspect(),[]);
});

test('media, transcript/hash, duration and receipt-schema drift are detected without migration',()=>{
 const cases=[
  ['media',source=>{source.mediaHash='a'.repeat(64);},'MEDIA_MISMATCH'],
  ['transcript',source=>{source.hash='b'.repeat(64);source.cues[0].text='Changed transcript wording.';},'HASH_MISMATCH'],
  ['duration',source=>{source.duration=3;source.cues[0].end=3;},'OUTSIDE_MEDIA']
 ];
 for(const [name,mutate,code] of cases){
  const f=setup(),proposal=f.store.prepare(fixture.receipt);f.store.commit(proposal.id);
  const source=structuredClone(fixture.source);mutate(source);
  const reopened=createReviewStore({storage:f.storage,sources:[source]});
  const stale=reopened.inspect()[0];
  assert.equal(stale.status,'stale',name);assert.ok(stale.errors.some(error=>error.code===code),name);
  assert.equal(stale.provenance.sourceHash,fixture.receipt.sourceHash,name);
 }
 const f=setup(),proposal=f.store.prepare(fixture.receipt);f.store.commit(proposal.id);
 const raw=JSON.parse(f.values.get('sutra.synthetic-review-cards.v1'));raw[0].receipt.version=2;f.values.set('sutra.synthetic-review-cards.v1',JSON.stringify(raw));
 const stale=f.store.inspect()[0];assert.equal(stale.status,'stale');assert.ok(stale.errors.some(error=>error.code==='VERSION'));
});

test('stale records cannot be mixed into a new confirmed save until explicitly removed',()=>{
 const f=setup(),proposal=f.store.prepare(fixture.receipt);f.store.commit(proposal.id);
 const changed=structuredClone(fixture.source);changed.version='v2';
 const reopened=createReviewStore({storage:f.storage,sources:[changed],idFactory:()=> 'new-review'});
 const currentReceipt={...fixture.receipt,sourceVersion:'v2'};
 const pending=reopened.prepare(currentReceipt);
 assert.throws(()=>reopened.commit(pending.id),error=>error instanceof ReviewDataStaleError);
 assert.equal(reopened.inspect()[0].provenance.sourceVersion,'v1');
});

