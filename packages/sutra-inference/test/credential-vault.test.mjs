import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEphemeralCredentialVault,CredentialVaultError} from '../credential-vault.js';

const canaryA='BYOK_CANARY_ALPHA_9c2f6b4a';
const canaryB='BYOK_CANARY_BETA_64f013d2';
const catalog=[
 {id:'provider-a',label:'Provider A',models:['alpha-small','alpha-large']},
 {id:'provider-b',label:'Provider B',models:['beta-fast','beta-reasoning']}
];
let next=1;
const randomBytes=length=>{const out=new Uint8Array(length);out.fill(next++);return out;};
const vault=()=>createEphemeralCredentialVault({catalog,randomBytes});

test('multiple provider profiles expose only metadata and identity-bound opaque handles',()=>{
 const v=vault();
 const a=v.addProfile({providerId:'provider-a',label:'Work key',credential:canaryA});
 const b=v.addProfile({providerId:'provider-b',label:'Research key',credential:canaryB});
 assert.equal(v.list().length,2);
 assert.deepEqual(v.list().map(x=>x.providerId),['provider-a','provider-b']);
 assert.equal(a.handle.kind,'sutra-credential-handle-v1');
 assert.match(a.handle.profileId,/^[0-9a-f]{32}$/);
 assert.notEqual(a.handle.profileId,b.handle.profileId);
 const publicText=JSON.stringify({vault:v,handles:[a.handle,b.handle],list:v.list(),exported:v.exportMetadata()});
 assert.equal(publicText.includes(canaryA),false);
 assert.equal(publicText.includes(canaryB),false);
 assert.deepEqual(v.describe(a.handle),a.profile);
 assert.strictEqual(v.getHandle(a.profile.profileId),a.handle);
 let observed;
 v.use(a.handle,'provider-a',(secret,meta)=>{observed={secret,meta};});
 assert.equal(observed.secret,canaryA);
 assert.deepEqual(observed.meta,a.profile);
 assert.equal(JSON.stringify(observed.meta).includes(canaryA),false);
});

test('forged, cloned, stale and cross-provider handles cannot resolve a credential',()=>{
 const v=vault(),{handle,profile}=v.addProfile({providerId:'provider-a',label:'Primary',credential:canaryA});
 const forged=Object.assign(Object.create(null),{kind:handle.kind,profileId:handle.profileId});
 assert.throws(()=>v.use(forged,'provider-a',()=>{}),e=>e instanceof CredentialVaultError&&e.code==='HANDLE');
 const cloned=structuredClone({kind:handle.kind,profileId:handle.profileId});
 assert.throws(()=>v.use(cloned,'provider-a',()=>{}),e=>e.code==='HANDLE');
 assert.throws(()=>v.use(handle,'provider-b',()=>{}),e=>e.code==='PROVIDER_MISMATCH');
 assert.equal(v.remove(handle),true);
 assert.equal(v.list().length,0);
 assert.throws(()=>v.getHandle(profile.profileId),e=>e.code==='MISSING');
 assert.throws(()=>v.use(handle,'provider-a',()=>{}),e=>e.code==='HANDLE');
 assert.equal(JSON.stringify(v).includes(canaryA),false);
});

test('catalog and profile parsing are closed and do not execute accessor values',()=>{
 let getterRuns=0;
 const badCatalog={id:'provider-a',label:'Provider A',models:['alpha']};
 Object.defineProperty(badCatalog,'hidden',{enumerable:false,value:'x'});
 assert.throws(()=>createEphemeralCredentialVault({catalog:[badCatalog],randomBytes}),e=>e.code==='CATALOG');
 const getterCatalog={id:'provider-a',label:'Provider A'};
 Object.defineProperty(getterCatalog,'models',{enumerable:true,get(){getterRuns++;return ['alpha'];}});
 assert.throws(()=>createEphemeralCredentialVault({catalog:[getterCatalog],randomBytes}),e=>e.code==='CATALOG');
 assert.equal(getterRuns,0);
 const v=vault();
 const profile={providerId:'provider-a',label:'Work'};
 Object.defineProperty(profile,'credential',{enumerable:true,get(){getterRuns++;return canaryA;}});
 assert.throws(()=>v.addProfile(profile),e=>e.code==='PROFILE');
 assert.equal(getterRuns,0);
 for(const bad of [
  {providerId:'provider-a',label:'Work',credential:' short '},
  {providerId:'provider-a',label:'Work',credential:'abc\n123456'},
  {providerId:'unknown',label:'Work',credential:canaryA},
  {providerId:'provider-a',label:'',credential:canaryA},
  {providerId:'provider-a',label:'Work',credential:canaryA,endpoint:'https://evil.example'}
 ])assert.throws(()=>v.addProfile(bad),CredentialVaultError);
});

test('profile IDs are collision bounded and never fall back to predictable or zero handles',()=>{
 const zero=()=>new Uint8Array(16);
 assert.throws(()=>createEphemeralCredentialVault({catalog,randomBytes:zero}).addProfile({providerId:'provider-a',label:'x',credential:canaryA}),e=>e.code==='RANDOM');
 const same=()=>new Uint8Array(16).fill(7);
 const v=createEphemeralCredentialVault({catalog,randomBytes:same});
 v.addProfile({providerId:'provider-a',label:'one',credential:canaryA});
 assert.throws(()=>v.addProfile({providerId:'provider-b',label:'two',credential:canaryB}),e=>e.code==='RANDOM_COLLISION');
});

test('vault caps profile cardinality and clear invalidates every capability',()=>{
 let seed=1;
 const v=createEphemeralCredentialVault({catalog,randomBytes:length=>{const x=new Uint8Array(length);x.fill(seed++);return x;}});
 const handles=[];
 for(let i=0;i<8;i++)handles.push(v.addProfile({providerId:i%2?'provider-b':'provider-a',label:'Profile '+i,credential:'credential-'+String(i).padStart(8,'0')}).handle);
 assert.throws(()=>v.addProfile({providerId:'provider-a',label:'overflow',credential:canaryA}),e=>e.code==='PROFILE_LIMIT');
 v.clear();assert.equal(v.list().length,0);
 for(const handle of handles)assert.throws(()=>v.describe(handle),e=>e.code==='HANDLE');
});

test('source has no persistence or network primitive and errors never echo rejected credentials',()=>{
 const source=fs.readFileSync(new URL('../credential-vault.js',import.meta.url),'utf8');
 for(const forbidden of ['localStorage','sessionStorage','indexedDB','document.cookie','fetch(','XMLHttpRequest','WebSocket'])assert.equal(source.includes(forbidden),false,forbidden);
 const v=vault();
 const bad=' SECRET_VALUE_SHOULD_NOT_ECHO ';
 try{v.addProfile({providerId:'provider-a',label:'Work',credential:bad});assert.fail('expected refusal');}
 catch(error){assert.equal(error.message.includes('SECRET_VALUE_SHOULD_NOT_ECHO'),false);}
});

test('trusted callback is the only secret release boundary and metadata cannot switch provider or model catalog',async()=>{
 const v=vault();
 const {handle}=v.addProfile({providerId:'provider-b',label:'Reasoning',credential:canaryB});
 const result=await v.use(handle,'provider-b',async(secret,meta)=>{
  assert.equal(secret,canaryB);
  assert.deepEqual(meta.models,['beta-fast','beta-reasoning']);
  return {providerId:meta.providerId,model:meta.models[1],credentialLength:secret.length};
 });
 assert.deepEqual(result,{providerId:'provider-b',model:'beta-reasoning',credentialLength:canaryB.length});
 const exported=v.exportMetadata();
 assert.equal(Object.isFrozen(exported),true);
 assert.equal(Object.isFrozen(exported.profiles),true);
 assert.equal(JSON.stringify(exported).includes(canaryB),false);
});


test('credential copied into a public profile label is rejected, including a prior profile secret',()=>{
 const v=vault();
 assert.throws(()=>v.addProfile({providerId:'provider-a',label:'label '+canaryA,credential:canaryA}),e=>e.code==='SECRET_LABEL');
 const first=v.addProfile({providerId:'provider-a',label:'Primary',credential:canaryA});
 assert.equal(v.list().length,1);
 assert.throws(()=>v.addProfile({providerId:'provider-b',label:'oops '+canaryA,credential:canaryB}),e=>e.code==='SECRET_LABEL');
 assert.equal(v.list().length,1);
 assert.equal(JSON.stringify(v.exportMetadata()).includes(canaryA),false);
 assert.strictEqual(v.getHandle(first.profile.profileId),first.handle);
});
