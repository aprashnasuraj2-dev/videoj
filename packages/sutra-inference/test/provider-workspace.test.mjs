import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createProviderWorkspace,ProviderWorkspaceError} from '../provider-workspace.js';

const catalog=[
 {id:'provider-a',label:'Provider A',models:['alpha-small','alpha-large']},
 {id:'provider-b',label:'Provider B',models:['beta-fast']}
];
const limits={maxCalls:3,maxInputBytes:1000,maxOutputTokens:300,maxConcurrent:1};
const globalLimits={maxCalls:5,maxInputBytes:2000,maxOutputTokens:600,maxConcurrent:2};
let seed=1;
const randomBytes=length=>{const out=new Uint8Array(length);out.fill(seed++);return out;};
const alpha='WORKSPACE_SECRET_ALPHA_8f924';
const beta='WORKSPACE_SECRET_BETA_71ca0';

const make=(sendA,sendB)=>{seed=1;return createProviderWorkspace({
 catalog,globalLimits,defaultProfileLimits:limits,leaseTicks:10,randomBytes,
 transports:[
  {providerId:'provider-a',send:sendA??(async()=>({actualInputBytes:10,actualOutputTokens:5,value:{text:'alpha ok'}}))},
  {providerId:'provider-b',send:sendB??(async()=>({actualInputBytes:10,actualOutputTokens:5,value:{text:'beta ok'}}))}
 ]
});};

test('two nontechnical provider profiles keep credentials opaque while trusted transports are fixed by host',async()=>{
 const seen=[];
 const w=make(
  async input=>{seen.push({provider:input.providerId,credential:input.credential,model:input.model,operation:input.operation});return {actualInputBytes:20,actualOutputTokens:7,value:{text:'A complete'}};},
  async input=>{seen.push({provider:input.providerId,credential:input.credential,model:input.model,operation:input.operation});return {actualInputBytes:30,actualOutputTokens:9,value:{text:'B complete'}};}
 );
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 const b=w.addProfile({providerId:'provider-b',label:'Research',credential:beta});
 assert.equal(w.list().length,2);
 const publicBefore=JSON.stringify({profiles:w.list(),budget:w.budgetSnapshot()});
 assert.equal(publicBefore.includes(alpha),false);assert.equal(publicBefore.includes(beta),false);
 const ra=await w.execute({handle:a.handle,model:'alpha-large',inputBytes:100,maxOutputTokens:50,now:0,operation:{kind:'chat',messages:['hello']}});
 const rb=await w.execute({handle:b.handle,model:'beta-fast',inputBytes:120,maxOutputTokens:60,now:0,operation:{kind:'chat',messages:['world']}});
 assert.deepEqual(seen.map(x=>[x.provider,x.credential,x.model]),[
  ['provider-a',alpha,'alpha-large'],['provider-b',beta,'beta-fast']
 ]);
 assert.equal(JSON.stringify(ra).includes(alpha),false);assert.equal(JSON.stringify(rb).includes(beta),false);
 assert.equal(ra.lease.state,'settled');assert.equal(rb.lease.state,'settled');
 const snap=w.budgetSnapshot();assert.equal(snap.global.used.calls,2);assert.equal(snap.global.used.actualOutputTokens,16);
});

test('caller cannot supply provider endpoint, transport, credential field or unapproved model',async()=>{
 let contacts=0;
 const w=make(async()=>{contacts++;return {actualInputBytes:1,actualOutputTokens:1,value:'ok'};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 for(const input of [
  {handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,now:0,operation:{q:'x'},endpoint:'https://evil.example'},
  {handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,now:0,operation:{q:'x'},transport:()=>{}},
  {handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,now:0,operation:{q:'x'},credential:'attacker'},
 ])await assert.rejects(w.execute(input),e=>e instanceof ProviderWorkspaceError&&e.code==='REQUEST');
 await assert.rejects(w.execute({handle:a.handle,model:'model-chosen-by-peer',inputBytes:10,maxOutputTokens:10,now:0,operation:{q:'x'}}),e=>e.code==='MODEL');
 assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
 assert.throws(()=>w.addProfile({providerId:'provider-a',label:'bad',credential:alpha,endpoint:'https://evil.example'}),e=>e.code==='PROFILE');
});

test('operation accessors and unsupported values fail before budget reservation or credential release',async()=>{
 let contacts=0,getterRuns=0;
 const w=make(async()=>{contacts++;return {actualInputBytes:1,actualOutputTokens:1,value:'ok'};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 const operation={kind:'chat'};
 Object.defineProperty(operation,'messages',{enumerable:true,get(){getterRuns++;return ['secret'];}});
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,now:0,operation}),e=>e.code==='PROVIDER_RESULT');
 assert.equal(getterRuns,0);assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
 for(const bad of [()=>{},new Date(),Symbol('x')]){
  await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,now:0,operation:bad}),e=>e.code==='PROVIDER_RESULT');
 }
 assert.equal(contacts,0);
});

test('provider credential echo is refused and its already-admitted reservation becomes unknown',async()=>{
 let contacts=0;
 const w=make(async input=>{contacts++;return {actualInputBytes:10,actualOutputTokens:1,value:{nested:{leak:input.credential}}};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:50,now:0,operation:{q:'x'}}),e=>e.code==='SECRET_ECHO'&&!e.message.includes(alpha));
 assert.equal(contacts,1);
 const snap=w.budgetSnapshot();assert.equal(snap.global.used.calls,1);assert.equal(snap.global.used.unknown,1);assert.equal(snap.global.used.active,1);
 assert.equal(JSON.stringify(snap).includes(alpha),false);
});

test('transport failure and impossible usage report remain conservatively charged with no automatic retry',async()=>{
 let contactsA=0,contactsB=0;
 const w=make(
  async()=>{contactsA++;throw new Error('upstream exploded '+alpha);},
  async()=>{contactsB++;return {actualInputBytes:999,actualOutputTokens:999,value:'bad usage'};}
 );
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 const b=w.addProfile({providerId:'provider-b',label:'Research',credential:beta});
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:50,now:0,operation:{q:'x'}}),e=>e.code==='PROVIDER_UNKNOWN'&&!e.message.includes(alpha));
 await assert.rejects(w.execute({handle:b.handle,model:'beta-fast',inputBytes:100,maxOutputTokens:50,now:0,operation:{q:'x'}}),e=>e.code==='USAGE');
 assert.equal(contactsA,1);assert.equal(contactsB,1);
 const snap=w.budgetSnapshot();assert.equal(snap.global.used.calls,2);assert.equal(snap.global.used.unknown,2);
 assert.equal(snap.global.used.actualOutputTokens,0);
});

test('per-profile concurrency admission happens before a second secret release',async()=>{
 let release,contacts=0;
 const pending=new Promise(resolve=>{release=resolve;});
 const w=make(async()=>{contacts++;await pending;return {actualInputBytes:10,actualOutputTokens:2,value:'done'};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 const first=w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,now:0,operation:{q:'one'}});
 await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,now:0,operation:{q:'two'}}),e=>e.code==='BUDGET');
 assert.equal(contacts,1);
 release();assert.equal((await first).lease.state,'settled');
});

test('removing a profile invalidates the credential handle but retains budget audit history',async()=>{
 const w=make();
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 await w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,now:0,operation:{q:'x'}});
 const removed=w.removeProfile(a.handle);
 assert.equal(removed.budget.enabled,false);assert.equal(removed.budget.used.calls,1);
 assert.equal(w.list().length,0);
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:1,maxOutputTokens:1,now:1,operation:{q:'x'}}),e=>e.code==='HANDLE');
 const row=w.budgetSnapshot().profiles.find(x=>x.profileId===a.profile.profileId);
 assert.equal(row.enabled,false);assert.equal(row.used.calls,1);
 assert.equal(JSON.stringify(row).includes(alpha),false);
});

test('provider result parser rejects accessors without executing them and preserves unknown charge',async()=>{
 let getterRuns=0;
 const w=make(async()=>{
  const raw={actualInputBytes:1,actualOutputTokens:1};
  Object.defineProperty(raw,'value',{enumerable:true,get(){getterRuns++;return {text:'x'};}});
  return raw;
 });
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,now:0,operation:{q:'x'}}),e=>e.code==='PROVIDER_RESULT');
 assert.equal(getterRuns,0);assert.equal(w.budgetSnapshot().global.used.unknown,1);
});

test('workspace configuration pins only known provider transports and contains no network primitive',()=>{
 assert.throws(()=>createProviderWorkspace({
  catalog,globalLimits,defaultProfileLimits:limits,randomBytes,
  transports:[{providerId:'unknown',send:async()=>{}}]
 }),e=>e.code==='CONFIG');
 assert.throws(()=>createProviderWorkspace({
  catalog,globalLimits,defaultProfileLimits:limits,randomBytes,
  transports:[{providerId:'provider-a',send:async()=>{}},{providerId:'provider-a',send:async()=>{}}]
 }),e=>e.code==='CONFIG');
 const source=fs.readFileSync(new URL('../provider-workspace.js',import.meta.url),'utf8');
 for(const forbidden of ['fetch(','WebSocket','XMLHttpRequest','localStorage','indexedDB','document.cookie'])assert.equal(source.includes(forbidden),false,forbidden);
});
