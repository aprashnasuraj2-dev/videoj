import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../../../packages/sutra-knowledge/examples/living-investigation.mjs';
import {createInvestigationHistory} from '../../../packages/sutra-knowledge/investigation-history.js';
import {createHistoryHostClient} from '../src/history-host.js';

const root=await livingFixture('finance');
const snapshot=(await createInvestigationHistory(root.versionText,root.digest)).snapshot();
const client=call=>createHistoryHostClient({version:1,call});

test('cancelling before dispatch makes zero calls, stopping after dispatch leaves the write outcome unknown',async()=>{
 let calls=0;
 const started=Promise.withResolvers();
 const store=client(()=>{calls++;started.resolve();return new Promise(()=>{});});
 await assert.rejects(store.initialize(snapshot,AbortSignal.abort()),/CANCELLED/);
 assert.equal(calls,0);
 const controller=new AbortController(),pending=store.initialize(snapshot,controller.signal);
 await started.promise;controller.abort();
 await assert.rejects(pending,/OUTCOME_UNKNOWN/);assert.equal(calls,1);
});

test('a missing acknowledgement, corrupt view or unreadable committed snapshot cannot confirm a write',async()=>{
 const cyclic={};cyclic.extra=cyclic;
 for(const response of [null,{ok:false,error:'HISTORY_HOST_IO'},{ok:true,snapshot:{...snapshot,view:cyclic}},{ok:true,snapshot:{...snapshot,historyText:'{}'}}]){
  await assert.rejects(client(()=>response).initialize(snapshot),/OUTCOME_UNKNOWN/);
 }
});

test('refuse oversize before dispatch, stale and definite lock refusal stay distinct, malformed reads cannot become a verified save',async()=>{
 let calls=0;
 const dummy=client(()=>{calls++;});
 await assert.rejects(dummy.initialize({...snapshot,historyText:'é'.repeat(140000)}),/HISTORY_SIZE/);
 assert.equal(calls,0);
 for(const error of ['HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD','HISTORY_STORE_BUSY_OR_CRASHED_LOCK']){
  await assert.rejects(client(()=>({ok:false,error})).append(snapshot.digest,snapshot),{message:error});
 }
 assert.equal(createHistoryHostClient({}),null);
 await assert.rejects(client(()=>({ok:true,snapshot:{...snapshot,view:{...snapshot.view,providerApproval:true}}})).read(snapshot.digest),/VIEW_DIVERGENCE/);
});

test('unreadable acknowledgement descriptors cannot escape the unknown-write boundary',async()=>{
 let calls=0,accessors=0;
 const poisoned=new Proxy({}, {getOwnPropertyDescriptor(){throw Error('host detail must not escape');}});
 const poisonedError=new Proxy({ok:false},{getOwnPropertyDescriptor(target,key){
  if(key==='error')throw Error('host detail must not escape');
  return Reflect.getOwnPropertyDescriptor(target,key);
 }});
 const accessor={get ok(){accessors++;return true;}};
 for(const response of [poisoned,poisonedError,accessor]){
  const store=client(()=>{calls++;return response;});
  await assert.rejects(store.initialize(snapshot),{message:'HISTORY_HOST_OUTCOME_UNKNOWN'});
  await assert.rejects(store.read(snapshot.digest),{message:'HISTORY_HOST_RESPONSE'});
 }
 assert.equal(calls,6);assert.equal(accessors,0);
});

test('successful acknowledgement is replayed, and stale digest never confirms a different write',async()=>{
 const store=client(()=>({ok:true,snapshot}));
 assert.deepEqual(await store.initialize(snapshot),snapshot);
 assert.deepEqual(await store.read(snapshot.digest),snapshot);
 await assert.rejects(store.read('sha256:'+'0'.repeat(64)),/UNEXPECTED_HEAD/);
});
