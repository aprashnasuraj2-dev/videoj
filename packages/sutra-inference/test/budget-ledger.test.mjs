import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviderBudgetLedger,BudgetLedgerError} from '../budget-ledger.js';
import {createEphemeralCredentialVault} from '../credential-vault.js';

const catalog=[
 {id:'provider-a',label:'Provider A',models:['alpha']},
 {id:'provider-b',label:'Provider B',models:['beta']}
];
let seed=1;
const randomBytes=length=>{const out=new Uint8Array(length);out.fill(seed++);return out;};
const profiles=()=>{
 seed=1;
 const vault=createEphemeralCredentialVault({catalog,randomBytes});
 const a=vault.addProfile({providerId:'provider-a',label:'A',credential:'SECRET_ALPHA_123'});
 const b=vault.addProfile({providerId:'provider-b',label:'B',credential:'SECRET_BETA_456'});
 return {vault,a,b};
};
const make=(ids,overrides={})=>createProviderBudgetLedger({
 global:{maxCalls:4,maxInputBytes:1000,maxOutputTokens:400,maxConcurrent:2},
 profiles:ids.map(profileId=>({profileId,limits:{maxCalls:3,maxInputBytes:800,maxOutputTokens:300,maxConcurrent:1}})),
 leaseTicks:10,randomBytes,
 ...overrides
});

test('multiple opaque profiles reserve independently under one global ceiling',()=>{
 const {vault,a,b}=profiles(),ledger=make([a.profile.profileId,b.profile.profileId]);
 const l1=ledger.reserve({profileId:a.profile.profileId,inputBytes:100,maxOutputTokens:100,now:0});
 const l2=ledger.reserve({profileId:b.profile.profileId,inputBytes:100,maxOutputTokens:100,now:0});
 assert.equal(l1.state,'active');assert.equal(l2.state,'active');
 assert.throws(()=>ledger.reserve({profileId:a.profile.profileId,inputBytes:50,maxOutputTokens:50,now:0}),e=>e.code==='QUOTA','per-profile concurrency');
 assert.throws(()=>ledger.reserve({profileId:b.profile.profileId,inputBytes:50,maxOutputTokens:50,now:0}),e=>e.code==='QUOTA','per-profile concurrency');
 const snap=ledger.snapshot();
 assert.equal(snap.global.used.calls,2);assert.equal(snap.global.used.active,2);
 assert.deepEqual(snap.profiles.map(x=>x.used.calls),[1,1]);
 assert.equal(JSON.stringify(snap).includes('SECRET_ALPHA_123'),false);
 assert.equal(JSON.stringify(snap).includes('SECRET_BETA_456'),false);
 assert.equal(JSON.stringify(vault.exportMetadata()).includes('SECRET_'),false);
});

test('completion records actual use but never refunds admitted daily reservation',()=>{
 const {a,b}=profiles(),ledger=make([a.profile.profileId,b.profile.profileId]);
 const l=ledger.reserve({profileId:a.profile.profileId,inputBytes:200,maxOutputTokens:120,now:1});
 const settled=ledger.settle(l.leaseId,{actualInputBytes:150,actualOutputTokens:40,now:2});
 assert.equal(settled.state,'settled');
 let snap=ledger.snapshot();
 assert.deepEqual(snap.global.used,{calls:1,inputBytes:200,outputTokens:120,actualInputBytes:150,actualOutputTokens:40,active:0,unknown:0});
 assert.deepEqual(snap.profiles[0].used,snap.global.used);
 // Same settlement is idempotent; conflicting usage is not.
 assert.equal(ledger.settle(l.leaseId,{actualInputBytes:150,actualOutputTokens:40,now:3}).state,'settled');
 assert.throws(()=>ledger.settle(l.leaseId,{actualInputBytes:151,actualOutputTokens:40,now:3}),e=>e.code==='SETTLEMENT_CONFLICT');
 // Lower actual usage did not restore reserved counters.
 ledger.reserve({profileId:a.profile.profileId,inputBytes:300,maxOutputTokens:100,now:3});
 snap=ledger.snapshot();assert.equal(snap.profiles[0].used.inputBytes,500);assert.equal(snap.profiles[0].used.outputTokens,220);
});

test('unknown and abandoned work retain daily charge while concurrency expires deterministically',()=>{
 const {a,b}=profiles(),ledger=make([a.profile.profileId,b.profile.profileId]);
 const a1=ledger.reserve({profileId:a.profile.profileId,inputBytes:100,maxOutputTokens:100,now:5});
 assert.equal(ledger.markUnknown(a1.leaseId,{now:6}).state,'unknown');
 assert.equal(ledger.snapshot().global.used.unknown,1);
 // Same profile remains concurrency-blocked until logical expiry.
 assert.throws(()=>ledger.reserve({profileId:a.profile.profileId,inputBytes:10,maxOutputTokens:10,now:14}),e=>e.code==='QUOTA');
 assert.equal(ledger.prune(15),1);
 const after=ledger.snapshot();
 assert.equal(after.global.used.active,0);assert.equal(after.global.used.unknown,0);
 assert.equal(after.global.used.calls,1);assert.equal(after.global.used.outputTokens,100);
 const a2=ledger.reserve({profileId:a.profile.profileId,inputBytes:100,maxOutputTokens:100,now:15});
 assert.equal(ledger.abandonKnown(a2.leaseId,{now:16}).state,'closed-unreconciled');
 const snap=ledger.snapshot();assert.equal(snap.global.used.calls,2);assert.equal(snap.global.used.inputBytes,200);assert.equal(snap.global.used.active,0);
});

test('all active leases expire for concurrency even when caller dies before marking unknown',()=>{
 const {a,b}=profiles(),ledger=make([a.profile.profileId,b.profile.profileId]);
 const l=ledger.reserve({profileId:a.profile.profileId,inputBytes:100,maxOutputTokens:100,now:0});
 assert.equal(ledger.snapshot().global.used.active,1);
 assert.equal(ledger.prune(9),0);assert.equal(ledger.prune(10),1);
 assert.equal(ledger.inspectLease(l.leaseId).state,'lease-expired');
 assert.equal(ledger.snapshot().global.used.calls,1,'expiry is not a refund');
 ledger.reserve({profileId:a.profile.profileId,inputBytes:100,maxOutputTokens:100,now:10});
});

test('malicious or inconsistent usage reports cannot widen a reservation',()=>{
 const {a,b}=profiles(),ledger=make([a.profile.profileId,b.profile.profileId]);
 const l=ledger.reserve({profileId:a.profile.profileId,inputBytes:100,maxOutputTokens:80,now:0});
 for(const report of [
  {actualInputBytes:101,actualOutputTokens:1,now:1},
  {actualInputBytes:1,actualOutputTokens:81,now:1},
  {actualInputBytes:-1,actualOutputTokens:1,now:1},
  {actualInputBytes:1.5,actualOutputTokens:1,now:1}
 ])assert.throws(()=>ledger.settle(l.leaseId,report),e=>e.code==='USAGE');
 assert.equal(ledger.inspectLease(l.leaseId).state,'active');
 ledger.settle(l.leaseId,{actualInputBytes:100,actualOutputTokens:80,now:1});
});

test('global resource and call ceilings remain authoritative across profiles',()=>{
 const {a,b}=profiles();
 const ledger=createProviderBudgetLedger({
  global:{maxCalls:2,maxInputBytes:250,maxOutputTokens:150,maxConcurrent:2},
  profiles:[
   {profileId:a.profile.profileId,limits:{maxCalls:2,maxInputBytes:250,maxOutputTokens:150,maxConcurrent:1}},
   {profileId:b.profile.profileId,limits:{maxCalls:2,maxInputBytes:250,maxOutputTokens:150,maxConcurrent:1}}
  ],
  leaseTicks:5,randomBytes
 });
 const x=ledger.reserve({profileId:a.profile.profileId,inputBytes:100,maxOutputTokens:75,now:0});
 const y=ledger.reserve({profileId:b.profile.profileId,inputBytes:100,maxOutputTokens:75,now:0});
 assert.throws(()=>ledger.reserve({profileId:a.profile.profileId,inputBytes:1,maxOutputTokens:1,now:5}),e=>e.code==='QUOTA','daily call cap survives lease expiry');
 // reserve() prunes expired concurrency before evaluating the still-retained
 // daily call/resource charge, so an explicit second prune is idempotent.
 assert.equal(ledger.prune(5),0);assert.equal(ledger.snapshot().global.used.active,0);
 assert.equal(ledger.snapshot().global.used.calls,2);
 assert.equal(ledger.inspectLease(x.leaseId).state,'lease-expired');assert.equal(ledger.inspectLease(y.leaseId).state,'lease-expired');
});

test('configuration is closed, forged leases fail and random collisions are bounded',()=>{
 const {a,b}=profiles();
 assert.throws(()=>createProviderBudgetLedger({
  global:{maxCalls:2,maxInputBytes:10,maxOutputTokens:10,maxConcurrent:1,usd:1},
  profiles:[{profileId:a.profile.profileId,limits:{maxCalls:1,maxInputBytes:10,maxOutputTokens:10,maxConcurrent:1}}]
 }),e=>e.code==='LIMITS');
 const ledger=make([a.profile.profileId,b.profile.profileId]);
 assert.throws(()=>ledger.inspectLease('0'.repeat(32)),e=>e.code==='LEASE');
 assert.throws(()=>ledger.reserve({profileId:'f'.repeat(32),inputBytes:1,maxOutputTokens:1,now:0}),e=>e.code==='REQUEST');
 const fixed=()=>new Uint8Array(16).fill(9);
 const collision=createProviderBudgetLedger({
  global:{maxCalls:3,maxInputBytes:100,maxOutputTokens:100,maxConcurrent:2},
  profiles:[
   {profileId:a.profile.profileId,limits:{maxCalls:3,maxInputBytes:100,maxOutputTokens:100,maxConcurrent:2}},
   {profileId:b.profile.profileId,limits:{maxCalls:3,maxInputBytes:100,maxOutputTokens:100,maxConcurrent:2}}
  ],leaseTicks:10,randomBytes:fixed
 });
 collision.reserve({profileId:a.profile.profileId,inputBytes:1,maxOutputTokens:1,now:0});
 assert.throws(()=>collision.reserve({profileId:b.profile.profileId,inputBytes:1,maxOutputTokens:1,now:0}),e=>e.code==='RANDOM_COLLISION');
});

test('budget errors and snapshots carry no provider credential or billing claim',()=>{
 const {a,b}=profiles(),ledger=make([a.profile.profileId,b.profile.profileId]);
 try{ledger.reserve({profileId:a.profile.profileId,inputBytes:2_000_000,maxOutputTokens:1,now:0});assert.fail();}
 catch(error){assert.equal(error.message.includes('SECRET'),false);}
 const text=JSON.stringify(ledger.snapshot());
 assert.equal(text.includes('credential'),false);
 assert.equal(text.includes('usd'),false);
 assert.equal(text.includes('price'),false);
});
