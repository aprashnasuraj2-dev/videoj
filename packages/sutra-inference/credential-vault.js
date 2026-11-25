// Ephemeral credential boundary candidate for future SUTRA multi-provider BYOK.
//
// This module deliberately does NOT persist secrets, contact a provider, expose a
// browser form, or enable inference. Secret values live only in a closure and are
// released solely to an explicitly injected trusted callback. Opaque handles are
// identity-bound; cloning/forging the public metadata cannot recover a secret.
// JavaScript cannot guarantee memory zeroization after removal.
export class CredentialVaultError extends Error{
 constructor(code){super('Credential vault refused ('+code+').');this.name='CredentialVaultError';this.code=code;}
}
const stop=code=>{throw new CredentialVaultError(code);};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const closed=(value,keys)=>{
 if(!plain(value))return false;
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Object.values(descriptors).some(d=>typeof d.get==='function'||typeof d.set==='function'))return false;
 const actual=Reflect.ownKeys(value);
 return actual.length===keys.length&&actual.every(k=>typeof k==='string'&&keys.includes(k));
};
const providerPattern=/^[a-z][a-z0-9-]{0,31}$/;
const modelPattern=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const labelPattern=/^[^\u0000-\u001f\u007f]{1,64}$/;
const secretValid=secret=>typeof secret==='string'&&secret.length>=8&&secret.length<=512&&secret.trim()===secret&&!/[\u0000-\u001f\u007f]/.test(secret);
const bytesToHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

function normalizeCatalog(catalog){
 if(!Array.isArray(catalog)||catalog.length<1||catalog.length>8)stop('CATALOG');
 const seen=new Set();
 return Object.freeze(catalog.map(entry=>{
  if(!closed(entry,['id','label','models'])||!providerPattern.test(entry.id)||!labelPattern.test(entry.label)||
   !Array.isArray(entry.models)||entry.models.length<1||entry.models.length>16||
   entry.models.some(model=>typeof model!=='string'||!modelPattern.test(model))||
   new Set(entry.models).size!==entry.models.length||seen.has(entry.id))stop('CATALOG');
  seen.add(entry.id);
  return Object.freeze({id:entry.id,label:entry.label,models:Object.freeze([...entry.models])});
 }));
}

export function createEphemeralCredentialVault({catalog,randomBytes}={}){
 const providers=normalizeCatalog(catalog);
 const providerById=new Map(providers.map(p=>[p.id,p]));
 const fill=randomBytes??(length=>{
  if(!globalThis.crypto?.getRandomValues)stop('RANDOM');
  const bytes=new Uint8Array(length);globalThis.crypto.getRandomValues(bytes);return bytes;
 });
 if(typeof fill!=='function')stop('RANDOM');
 const profiles=new Map();
 const handles=new WeakMap();

 const allocateId=()=>{
  for(let attempt=0;attempt<4;attempt++){
   const bytes=fill(16);
   if(!(bytes instanceof Uint8Array)||bytes.length!==16)stop('RANDOM');
   const id=bytesToHex(bytes);
   if(!/^([0-9a-f]{32})$/.test(id)||/^0+$/.test(id))stop('RANDOM');
   if(!profiles.has(id))return id;
  }
  stop('RANDOM_COLLISION');
 };
 const metadata=profile=>Object.freeze({
  profileId:profile.id,
  providerId:profile.provider.id,
  providerLabel:profile.provider.label,
  label:profile.label,
  models:profile.provider.models
 });
 const profileForHandle=handle=>{
  if(!plain(handle))stop('HANDLE');
  const id=handles.get(handle);
  const profile=id&&profiles.get(id);
  if(!profile||profile.handle!==handle)stop('HANDLE');
  return profile;
 };

 return Object.freeze({
  mode:'ephemeral-credential-vault',
  providers,
  addProfile(input){
   if(!closed(input,['providerId','label','credential'])||!providerById.has(input.providerId)||!labelPattern.test(input.label)||!secretValid(input.credential))stop('PROFILE');
   if(profiles.size>=8)stop('PROFILE_LIMIT');
   const id=allocateId(),provider=providerById.get(input.providerId);
   const handle=Object.freeze(Object.assign(Object.create(null),{kind:'sutra-credential-handle-v1',profileId:id}));
   const profile={id,provider,label:input.label,secret:input.credential,handle};
   profiles.set(id,profile);handles.set(handle,id);
   return Object.freeze({handle,profile:metadata(profile)});
  },
  list(){return Object.freeze([...profiles.values()].map(metadata));},
  getHandle(profileId){
   if(typeof profileId!=='string'||!profiles.has(profileId))stop('MISSING');
   return profiles.get(profileId).handle;
  },
  describe(handle){return metadata(profileForHandle(handle));},
  remove(handle){
   const profile=profileForHandle(handle);
   handles.delete(handle);profiles.delete(profile.id);profile.secret='';
   return true;
  },
  clear(){
   for(const profile of profiles.values()){handles.delete(profile.handle);profile.secret='';}
   profiles.clear();
  },
  use(handle,providerId,callback){
   const profile=profileForHandle(handle);
   if(providerId!==profile.provider.id)stop('PROVIDER_MISMATCH');
   if(typeof callback!=='function')stop('CALLBACK');
   return callback(profile.secret,metadata(profile));
  },
  exportMetadata(){
   return Object.freeze({version:'sutra-provider-profiles-v1',profiles:this.list()});
  }
 });
}
