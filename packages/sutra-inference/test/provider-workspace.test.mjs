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
 catalog,globalLimits,defaultProfileLimits:limits,leaseTicks:10,randomBytes,clock:()=>0,
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
 const ra=await w.execute({handle:a.handle,model:'alpha-large',inputBytes:100,maxOutputTokens:50,operation:{kind:'chat',messages:['hello']}});
 const rb=await w.execute({handle:b.handle,model:'beta-fast',inputBytes:120,maxOutputTokens:60,operation:{kind:'chat',messages:['world']}});
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
  {handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation:{q:'x'},endpoint:'https://evil.example'},
  {handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation:{q:'x'},transport:()=>{}},
  {handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation:{q:'x'},credential:'attacker'},
  {handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation:{q:'x'},now:Number.MAX_SAFE_INTEGER},
 ])await assert.rejects(w.execute(input),e=>e instanceof ProviderWorkspaceError&&e.code==='REQUEST');
 await assert.rejects(w.execute({handle:a.handle,model:'model-chosen-by-peer',inputBytes:10,maxOutputTokens:10,operation:{q:'x'}}),e=>e.code==='MODEL');
 assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
 assert.throws(()=>w.addProfile({providerId:'provider-a',label:'bad',credential:alpha,endpoint:'https://evil.example'}),e=>e.code==='PROFILE');
});

test('operation accessors and unsupported values fail before budget reservation or credential release',async()=>{
 let contacts=0,getterRuns=0;
 const w=make(async()=>{contacts++;return {actualInputBytes:1,actualOutputTokens:1,value:'ok'};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 const operation={kind:'chat'};
 Object.defineProperty(operation,'messages',{enumerable:true,get(){getterRuns++;return ['secret'];}});
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation}),e=>e.code==='PROVIDER_RESULT');
 assert.equal(getterRuns,0);assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
 for(const bad of [()=>{},new Date(),Symbol('x')]){
  await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation:bad}),e=>e.code==='PROVIDER_RESULT');
 }
 assert.equal(contacts,0);
});

test('credential accidentally placed in operation is blocked before budget reservation or transport',async()=>{
 let contacts=0;
 const w=make(async()=>{contacts++;return {actualInputBytes:1,actualOutputTokens:1,value:'ok'};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 await assert.rejects(w.execute({
  handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,
  operation:{messages:[{role:'user',content:'do not send '+alpha}]}
 }),e=>e.code==='SECRET_ECHO'&&!e.message.includes(alpha));
 const keyed=Object.create(null);keyed['prefix-'+alpha]='x';
 await assert.rejects(w.execute({
  handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation:keyed
 }),e=>e.code==='SECRET_ECHO');
 assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
});

test('provider credential echo is refused and its already-admitted reservation becomes unknown',async()=>{
 let contacts=0;
 const w=make(async input=>{contacts++;return {actualInputBytes:10,actualOutputTokens:1,value:{nested:{leak:input.credential}}};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:50,operation:{q:'x'}}),e=>e.code==='SECRET_ECHO'&&!e.message.includes(alpha));
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
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:50,operation:{q:'x'}}),e=>e.code==='PROVIDER_UNKNOWN'&&!e.message.includes(alpha));
 await assert.rejects(w.execute({handle:b.handle,model:'beta-fast',inputBytes:100,maxOutputTokens:50,operation:{q:'x'}}),e=>e.code==='USAGE');
 assert.equal(contactsA,1);assert.equal(contactsB,1);
 const snap=w.budgetSnapshot();assert.equal(snap.global.used.calls,2);assert.equal(snap.global.used.unknown,2);
 assert.equal(snap.global.used.actualOutputTokens,0);
});

test('per-profile concurrency admission happens before a second secret release',async()=>{
 let release,contacts=0;
 const pending=new Promise(resolve=>{release=resolve;});
 const w=make(async()=>{contacts++;await pending;return {actualInputBytes:10,actualOutputTokens:2,value:'done'};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 const first=w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation:{q:'one'}});
 await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation:{q:'two'}}),e=>e.code==='BUDGET');
 assert.equal(contacts,1);
 release();assert.equal((await first).lease.state,'settled');
});

test('removing a profile invalidates the credential handle but retains budget audit history',async()=>{
 const w=make();
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 await w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation:{q:'x'}});
 const removed=w.removeProfile(a.handle);
 assert.equal(removed.budget.enabled,false);assert.equal(removed.budget.used.calls,1);
 assert.equal(w.list().length,0);
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:1,maxOutputTokens:1,operation:{q:'x'}}),e=>e.code==='HANDLE');
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
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation:{q:'x'}}),e=>e.code==='PROVIDER_RESULT');
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


test('removing a profile during an in-flight provider call fails the result closed and preserves the charge',async()=>{
 let release,contacts=0;
 const pending=new Promise(resolve=>{release=resolve;});
 const w=make(async input=>{contacts++;await pending;return {actualInputBytes:10,actualOutputTokens:2,value:{text:'done'}};});
 const a=w.addProfile({providerId:'provider-a',label:'Work',credential:alpha});
 const run=w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation:{q:'one'}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(contacts,1);
 const removed=w.removeProfile(a.handle);assert.equal(removed.budget.enabled,false);
 release();
 await assert.rejects(run,e=>e.code==='PROVIDER_UNKNOWN');
 const row=w.budgetSnapshot().profiles.find(x=>x.profileId===a.profile.profileId);
 assert.equal(row.enabled,false);assert.equal(row.used.calls,1);assert.equal(row.used.unknown,1);assert.equal(row.used.active,1);
 assert.equal(JSON.stringify(row).includes(alpha),false);
});


test('parallel requests settle against completion ticks, including earlier reservation finishing after later dispatch',async()=>{
 for(const reverse of [false,true]){
  let tick=100,releaseA,releaseB;
  const gateA=new Promise(r=>{releaseA=r;}),gateB=new Promise(r=>{releaseB=r;});
  const w=createProviderWorkspace({catalog,globalLimits,defaultProfileLimits:limits,leaseTicks:100,randomBytes,clock:()=>tick,transports:[
   {providerId:'provider-a',send:async()=>{await gateA;return {actualInputBytes:10,actualOutputTokens:2,value:{text:'A'}};}},
   {providerId:'provider-b',send:async()=>{await gateB;return {actualInputBytes:10,actualOutputTokens:3,value:{text:'B'}};}}
  ]});
  const a=w.addProfile({providerId:'provider-a',label:'A',credential:alpha}),b=w.addProfile({providerId:'provider-b',label:'B',credential:beta});
  const first=w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation:{q:'a'}});
  tick=101;const second=w.execute({handle:b.handle,model:'beta-fast',inputBytes:100,maxOutputTokens:20,operation:{q:'b'}});
  assert.equal(w.budgetSnapshot().global.used.active,2);
  tick=102;if(reverse){releaseB();assert.equal((await second).lease.state,'settled');}else{releaseA();assert.equal((await first).lease.state,'settled');}
  tick=103;if(reverse){releaseA();assert.equal((await first).lease.state,'settled');}else{releaseB();assert.equal((await second).lease.state,'settled');}
  const used=w.budgetSnapshot().global.used;assert.equal(used.calls,2);assert.equal(used.active,0);assert.equal(used.unknown,0);assert.equal(used.actualOutputTokens,5);
 }
});
test('clock rollback during completion refuses publication and retains conservative unknown reservation',async()=>{
 let tick=10,release;const pending=new Promise(r=>{release=r;});
 const w=createProviderWorkspace({catalog,globalLimits,defaultProfileLimits:limits,leaseTicks:100,randomBytes,clock:()=>tick,transports:[{providerId:'provider-a',send:async()=>{await pending;return {actualInputBytes:1,actualOutputTokens:1,value:'ok'};}}]});
 const a=w.addProfile({providerId:'provider-a',label:'A',credential:alpha});
 const p=w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:10,operation:{q:'a'}});
 tick=9;release();await assert.rejects(p,e=>e.code==='CLOCK');
 const used=w.budgetSnapshot().global.used;assert.equal(used.calls,1);assert.equal(used.unknown,1);assert.equal(used.actualOutputTokens,0);
});
test('cross-profile exact credential canaries and array accessors refuse before transmission or publication',async()=>{
 let contacts=0,ran=0;
 const w=make(async()=>{contacts++;return {actualInputBytes:1,actualOutputTokens:1,value:{text:beta}};});
 const a=w.addProfile({providerId:'provider-a',label:'A',credential:alpha});w.addProfile({providerId:'provider-b',label:'B',credential:beta});
 const send=operation=>w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation});
 await assert.rejects(send({q:beta}),e=>e.code==='SECRET_ECHO');assert.equal(contacts,0);
 const bad=['x'];Object.defineProperty(bad,'0',{enumerable:true,get(){ran++;return beta;}});
 await assert.rejects(send({q:bad}),e=>e.code==='PROVIDER_RESULT');assert.equal(ran,0);assert.equal(contacts,0);
 await assert.rejects(send({q:'safe'}),e=>e.code==='SECRET_ECHO');assert.equal(contacts,1);assert.equal(w.budgetSnapshot().global.used.unknown,1);
});


test('removing another credential during a dispatch cannot weaken the result canary boundary',async()=>{
 let release,contacts=0;const wait=new Promise(r=>{release=r;});
 const w=make(undefined,async()=>{contacts++;await wait;return {actualInputBytes:1,actualOutputTokens:1,value:{text:'late '+alpha}};});
 const a=w.addProfile({providerId:'provider-a',label:'A',credential:alpha}),b=w.addProfile({providerId:'provider-b',label:'B',credential:beta});
 const pending=w.execute({handle:b.handle,model:'beta-fast',inputBytes:100,maxOutputTokens:20,operation:{q:'test'}});
 assert.equal(contacts,1);w.removeProfile(a.handle);release();
 await assert.rejects(pending,e=>e.code==='PROFILE_SET_CHANGED'&&!e.message.includes(alpha));
 assert.equal(w.budgetSnapshot().global.used.unknown,1);assert.equal(w.list().length,1);assert.equal(contacts,1);
});
test('enrollment during dispatch invalidates publication even with harmless response',async()=>{
 let release;const wait=new Promise(r=>{release=r;});
 const w=make(async()=>{await wait;return {actualInputBytes:1,actualOutputTokens:1,value:'safe'};});
 const a=w.addProfile({providerId:'provider-a',label:'A',credential:alpha});
 const pending=w.execute({handle:a.handle,model:'alpha-small',inputBytes:100,maxOutputTokens:20,operation:{q:'test'}});
 const added=w.addProfile({providerId:'provider-b',label:'B',credential:beta});release();
 await assert.rejects(pending,e=>e.code==='PROFILE_SET_CHANGED');assert.equal(w.budgetSnapshot().global.used.unknown,1);
 // Unknown reservation retains its concurrency slot; no retry bypass.
 await assert.rejects(w.execute({handle:a.handle,model:'alpha-small',inputBytes:10,maxOutputTokens:5,operation:{q:'new'}}),e=>e.code==='BUDGET');
 const next=await w.execute({handle:added.handle,model:'beta-fast',inputBytes:10,maxOutputTokens:5,operation:{q:'new'}});assert.equal(next.lease.state,'settled');assert.equal(w.budgetSnapshot().global.used.unknown,1);
});


test('host-declared model capabilities negotiate locally before reservation or credential release',async()=>{
 let contacts=0;
 const declared=[
  {id:'provider-a',label:'Provider A',models:['alpha-small','alpha-large'],capabilities:{'alpha-small':['text.generate'],'alpha-large':['text.generate','structured.output']}},
  {id:'provider-b',label:'Provider B',models:['beta-fast'],capabilities:{'beta-fast':['text.generate']}}
 ];
 const w=createProviderWorkspace({catalog:declared,globalLimits,defaultProfileLimits:limits,randomBytes,clock:()=>0,transports:[
  {providerId:'provider-a',send:async()=>{contacts++;return {actualInputBytes:1,actualOutputTokens:1,value:{text:'a'}};}},
  {providerId:'provider-b',send:async()=>{contacts++;return {actualInputBytes:1,actualOutputTokens:1,value:{text:'b'}};}}
 ]});
 const a=w.addProfile({providerId:'provider-a',label:'A',credential:alpha});
 const b=w.addProfile({providerId:'provider-b',label:'B',credential:beta});
 const x=w.negotiateCapabilities({handle:a.handle,model:'alpha-large',required:['text.generate','structured.output']});
 assert.equal(x.authority,'HOST_DECLARED_UNVERIFIED');assert.deepEqual(x.required,['text.generate','structured.output']);assert.deepEqual(x.declared,['text.generate','structured.output']);
 const y=w.negotiateCapabilities({handle:b.handle,model:'beta-fast',required:['text.generate']});assert.equal(y.providerId,'provider-b');
 assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
 assert.throws(()=>w.negotiateCapabilities({handle:a.handle,model:'alpha-small',required:['structured.output']}),e=>e.code==='CAPABILITY_MISSING');
 assert.throws(()=>w.negotiateCapabilities({handle:a.handle,model:'alpha-small',required:['text.generate','text.generate']}),e=>e.code==='CAPABILITY');
 assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
});

test('capability declarations are bounded host metadata and reject malformed or accessor-controlled inputs',()=>{
 const badCatalogs=[
  [{id:'provider-a',label:'A',models:['alpha-small'],capabilities:{'alpha-small':['Text.Generate']}}],
  [{id:'provider-a',label:'A',models:['alpha-small'],capabilities:{'other':['text.generate']}}],
  [{id:'provider-a',label:'A',models:['alpha-small'],capabilities:{'alpha-small':['text.generate','text.generate']}}]
 ];
 for(const catalog of badCatalogs)assert.throws(()=>createProviderWorkspace({catalog,globalLimits,defaultProfileLimits:limits,randomBytes,transports:[]}),e=>e.code==='CAPABILITY');
 const caps=Object.create(null);let ran=0;Object.defineProperty(caps,'alpha-small',{enumerable:true,get(){ran++;return ['text.generate'];}});
 assert.throws(()=>createProviderWorkspace({catalog:[{id:'provider-a',label:'A',models:['alpha-small'],capabilities:caps}],globalLimits,defaultProfileLimits:limits,randomBytes,transports:[]}),e=>e.code==='CAPABILITY');
 assert.equal(ran,0);
});
