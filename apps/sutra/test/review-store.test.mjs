import {test}from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import {createReviewStore,ReviewDataStaleError}from'../src/review-store.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../src/fixtures/timing-source.json',import.meta.url)));
function setup(){const values=new Map();let writes=0,id=0;const storage={getItem:k=>values.get(k)??null,setItem(k,v){writes++;values.set(k,v);},removeItem(k){writes++;values.delete(k);}};return {values,storage,get writes(){return writes;},store:createReviewStore({storage,sources:[fixture.source],idFactory:()=>`review-${++id}`})};}
test('preview and cancellation make no writes; cancelled proposal cannot commit',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);assert.equal(f.writes,0);f.store.cancel(p.id);assert.throws(()=>f.store.commit(p.id));assert.equal(f.writes,0);});
test('persisted record exactly matches reviewed receipt; duplicate commit does not repeat write',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);const saved=f.store.commit(p.id);assert.deepEqual(saved.receipt,fixture.receipt);assert.equal(f.writes,1);assert.deepEqual(f.store.commit(p.id),saved);assert.equal(f.writes,1);});
test('caller mutations cannot change pending payload',()=>{const f=setup(),receipt=structuredClone(fixture.receipt);const p=f.store.prepare(receipt);receipt.excerpt='changed';assert.throws(()=>p.receipt.excerpt='changed');assert.equal(f.store.commit(p.id).receipt.excerpt,fixture.receipt.excerpt);});
test('invalid receipt cannot enter a review preview',()=>{const f=setup();assert.throws(()=>f.store.prepare({...fixture.receipt,start:999}));assert.equal(f.writes,0);});
test('failed storage does not report success or automatically retry',()=>{const f=setup();let calls=0;f.storage.setItem=()=>{calls++;throw Error('quota');};const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id));assert.throws(()=>f.store.commit(p.id));assert.equal(calls,1);});
test('records reload and delete by saved id',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);f.store.commit(p.id);const other=createReviewStore({storage:f.storage,sources:[fixture.source]});assert.equal(other.list().length,1);other.remove(p.id);assert.deepEqual(other.list(),[]);});
test('corrupt persisted data is visible and not silently overwritten',()=>{const f=setup();f.values.set('sutra.review-cards.v2','broken JSON');assert.throws(()=>f.store.list());const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id));assert.equal(f.writes,0);});
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
 const raw=JSON.parse(f.values.get('sutra.review-cards.v2'));raw[0].receipt.version=2;f.values.set('sutra.review-cards.v2',JSON.stringify(raw));
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


const key='sutra.review-cards.v2';
test('last-card deletion removes storage key and cached completion cannot return deleted payload',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);f.store.commit(p.id);f.store.remove(p.id);assert.equal(f.values.has(key),false);assert.throws(()=>f.store.commit(p.id),/no longer exists/);assert.deepEqual(f.store.inspect(),[]);});
test('deleting one card preserves the other and does not recreate a removed card',()=>{const f=setup();const a=f.store.prepare(fixture.receipt),b=f.store.prepare(fixture.receipt);f.store.commit(a.id);f.store.commit(b.id);f.store.remove(a.id);assert.deepEqual(f.store.list().map(x=>x.id),[b.id]);assert.throws(()=>f.store.commit(a.id));assert.equal(f.store.commit(b.id).id,b.id);});
test('explicit clear recovers corrupt local data, removes only application key and invalidates pending previews',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);f.values.set(key,'broken private canary');f.values.set('unrelated','keep');f.store.clear();assert.equal(f.values.has(key),false);assert.equal(f.values.get('unrelated'),'keep');assert.throws(()=>f.store.commit(p.id));});
test('clear and deletion never claim success for a storage backend that leaves bytes behind',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);f.store.commit(p.id);f.storage.removeItem=()=>{};assert.throws(()=>f.store.remove(p.id),/not confirmed/);assert.throws(()=>f.store.clear(),/not confirmed/);assert.equal(f.store.list().length,1);});
test('another instance deletion invalidates duplicate completion even in original store',()=>{const f=setup();const p=f.store.prepare(fixture.receipt);f.store.commit(p.id);const other=createReviewStore({storage:f.storage,sources:[fixture.source]});other.remove(p.id);assert.throws(()=>f.store.commit(p.id),/no longer exists/);});

test('silent no-op or changed write is unknown, consumed, and never reported completed',()=>{for(const mutate of [()=>{},(f,k,v)=>f.values.set(k,v.replace('review-1','other-id'))]){const f=setup();let calls=0;f.storage.setItem=(k,v)=>{calls++;mutate(f,k,v);};const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id),e=>e.outcome==='unknown');assert.throws(()=>f.store.commit(p.id));assert.equal(calls,1);}});
test('readback failure after mutation is unknown and never replayed',()=>{const f=setup(),read=f.storage.getItem;let written=false;f.storage.setItem=(k,v)=>{f.values.set(k,v);written=true;};f.storage.getItem=k=>{if(written)throw Error('readback failed');return read(k);};const p=f.store.prepare(fixture.receipt);assert.throws(()=>f.store.commit(p.id),e=>e.outcome==='unknown');assert.throws(()=>f.store.commit(p.id));});
test('persisted proposal ID cannot be reused by another instance; duplicate IDs are rejected',()=>{const f=setup(),p=f.store.prepare(fixture.receipt);f.store.commit(p.id);const other=createReviewStore({storage:f.storage,sources:[fixture.source],idFactory:()=>p.id});const q=other.prepare(fixture.receipt);assert.throws(()=>other.commit(q.id),/already exists/);assert.equal(f.writes,1);const saved=f.store.list()[0];f.values.set(key,JSON.stringify([saved,saved]));assert.throws(()=>f.store.inspect(),/duplicated/);});
test('partial deletion that drops unrelated records is not confirmed',()=>{const f=setup(),a=f.store.prepare(fixture.receipt),b=f.store.prepare(fixture.receipt);f.store.commit(a.id);f.store.commit(b.id);f.storage.setItem=(k,v)=>f.values.set(k,'[]');assert.throws(()=>f.store.remove(a.id),/not confirmed/);});

test('legacy synthetic review key is never read as an active source review and explicit clear removes only known SUTRA review keys',()=>{
 const f=setup();f.values.set('sutra.synthetic-review-cards.v1',JSON.stringify([{legacy:true}]));f.values.set('unrelated','keep');
 assert.deepEqual(f.store.list(),[],'legacy data is quarantined, not auto-migrated');
 f.store.clear();assert.equal(f.values.has('sutra.synthetic-review-cards.v1'),false);assert.equal(f.values.has('sutra.review-cards.v2'),false);assert.equal(f.values.get('unrelated'),'keep');
});

test('destructive review actions are exact snapshots, not reusable record IDs or collection permissions',()=>{
 const f=setup(),p=f.store.prepare(fixture.receipt);f.store.commit(p.id);
 const stale=f.store.inspect()[0],clear=f.store.captureClear();
 const raw=JSON.parse(f.values.get(key));raw[0].savedAt='2026-01-01T00:00:00.000Z';f.values.set(key,JSON.stringify(raw));
 assert.throws(stale.removeIfUnchanged,/changed/);assert.throws(clear,/changed/);assert.equal(f.store.list().length,1);
 f.store.inspect()[0].removeIfUnchanged();assert.equal(f.values.has(key),false);
});

test('source catalog registration snapshots nested data without calling attacker-defined getters',()=>{
 const f=setup(),source=structuredClone(fixture.source);let calls=0;
 Object.defineProperty(source.cues[0],'text',{enumerable:true,get(){calls++;return fixture.source.cues[0].text;}});
 assert.throws(()=>createReviewStore({storage:f.storage,sources:[source]}),/Unsafe data property/);
 const other=structuredClone(fixture.source);
 Object.defineProperty(other,'toJSON',{enumerable:true,value(){calls++;return fixture.source;}});
 assert.throws(()=>createReviewStore({storage:f.storage,sources:[other]}),/Unexpected source field/);
 assert.equal(calls,0);assert.equal(f.writes,0);
});
test('review catalog snapshot survives caller mutation while exact receipt remains tied to original source',()=>{
 const f=setup(),source=structuredClone(fixture.source);
 const store=createReviewStore({storage:f.storage,sources:[source],idFactory:()=> 'snapshot-1'});
 source.version='changed';source.cues[0].text='changed after mount';
 const proposal=store.prepare(fixture.receipt),saved=store.commit(proposal.id);
 assert.equal(saved.receipt.excerpt,fixture.receipt.excerpt);assert.equal(store.list().length,1);
});
