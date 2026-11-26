import {createEphemeralCredentialVault,CredentialVaultError} from './credential-vault.js';
import {createProviderBudgetLedger,BudgetLedgerError} from './budget-ledger.js';

// Provider-workspace laboratory: composes opaque ephemeral credentials with
// provider-independent reservations and an injected fake/trusted transport.
// There is no endpoint discovery, browser persistence, live provider connector
// or paid inference. A production BYOK relay/vault remains a later gate.
export class ProviderWorkspaceError extends Error{
 constructor(code){super('Provider workspace stopped ('+code+').');this.name='ProviderWorkspaceError';this.code=code;}
}
const stop=code=>{throw new ProviderWorkspaceError(code);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const closed=(x,keys)=>{
 if(!plain(x))return false;
 const d=Object.getOwnPropertyDescriptors(x);
 if(Object.values(d).some(v=>typeof v.get==='function'||typeof v.set==='function'))return false;
 const own=Reflect.ownKeys(x);
 return own.length===keys.length&&own.every(k=>typeof k==='string'&&keys.includes(k));
};
const modelPattern=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;

function sanitizeProviderValue(value,isSecret,{depth=0,budget={chars:0,nodes:0}}={}){
 if(depth>12||++budget.nodes>512)stop('PROVIDER_RESULT');
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='number'){
  if(!Number.isFinite(value))stop('PROVIDER_RESULT');return value;
 }
 if(typeof value==='string'){
  budget.chars+=value.length;if(budget.chars>65536)stop('PROVIDER_RESULT');
  if(isSecret(value))stop('SECRET_ECHO');
  return value;
 }
 if(Array.isArray(value)){
  if(value.length>128||Object.getPrototypeOf(value)!==Array.prototype||Reflect.ownKeys(value).length!==value.length+1)stop('PROVIDER_RESULT');
  const out=[];for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d?.enumerable||!Object.hasOwn(d,'value'))stop('PROVIDER_RESULT');out.push(sanitizeProviderValue(d.value,isSecret,{depth:depth+1,budget}));}
  return Object.freeze(out);
 }
 if(!plain(value))stop('PROVIDER_RESULT');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
 if(keys.length>128||keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype'].includes(k))||Object.values(descriptors).some(d=>!d.enumerable||!Object.hasOwn(d,'value')))stop('PROVIDER_RESULT');
 const out=Object.create(null);
 for(const key of keys){
  budget.chars+=key.length;if(budget.chars>65536)stop('PROVIDER_RESULT');
  if(isSecret(key))stop('SECRET_ECHO');
  out[key]=sanitizeProviderValue(descriptors[key].value,isSecret,{depth:depth+1,budget});
 }
 return Object.freeze(out);
}

export function createProviderWorkspace({catalog,globalLimits,defaultProfileLimits,leaseTicks=45000,randomBytes,transports=[],clock=()=>Math.floor(globalThis.performance?.now()??Date.now())}={}){
 const vault=createEphemeralCredentialVault({catalog,randomBytes});
 const ledger=createProviderBudgetLedger({global:globalLimits,profiles:[],leaseTicks,randomBytes});
 if(!plain(defaultProfileLimits)||!Array.isArray(transports)||transports.length>vault.providers.length||typeof clock!=='function')stop('CONFIG');
 const providerIds=new Set(vault.providers.map(p=>p.id)),transportById=new Map();
 for(const entry of transports){
  if(!closed(entry,['providerId','send'])||!providerIds.has(entry.providerId)||transportById.has(entry.providerId)||typeof entry.send!=='function')stop('CONFIG');
  transportById.set(entry.providerId,entry.send);
 }

 const profileMeta=handle=>{
  try{return vault.describe(handle);}catch(error){if(error instanceof CredentialVaultError)stop('HANDLE');throw error;}
 };
 const budgetRow=profileId=>ledger.snapshot().profiles.find(row=>row.profileId===profileId);
 // Use a completion-time reading, not the reservation timestamp. Parallel
 // dispatch may have advanced the ledger while an earlier request is pending.
 let lastTick=-1;
 const readClock=()=>{const now=clock();if(!Number.isSafeInteger(now)||now<0||now<lastTick)stop('CLOCK');lastTick=now;return now;};
 const admitOperation=operation=>sanitizeProviderValue(operation,vault.containsSecret);
 // All live credentials participate in the canary check. A credential-set
 // change during a dispatch invalidates that request's publication boundary.
 // Do not retain removed credential bytes merely to detect subsequent echoes.
 let profileSetToken=Symbol('credential-set');

 return Object.freeze({
  mode:'provider-workspace-laboratory',
  providers:vault.providers,
  addProfile(input={}){
   if(!plain(input))stop('PROFILE');
   const keys=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
   if(keys.some(k=>typeof k!=='string')||!(keys.length===3||keys.length===4)||
    !['providerId','label','credential'].every(k=>keys.includes(k))||
    keys.some(k=>!['providerId','label','credential','limits'].includes(k))||
    Object.values(descriptors).some(d=>typeof d.get==='function'||typeof d.set==='function'))stop('PROFILE');
   const providerId=descriptors.providerId.value,label=descriptors.label.value,credential=descriptors.credential.value;
   const profileLimits=keys.includes('limits')?descriptors.limits.value:defaultProfileLimits;
   let added;
   try{
    added=vault.addProfile({providerId,label,credential});
    ledger.registerProfile({profileId:added.profile.profileId,limits:profileLimits});
    profileSetToken=Symbol('credential-set');
    return Object.freeze({handle:added.handle,profile:added.profile,budget:budgetRow(added.profile.profileId)});
   }catch(error){
    if(added){try{vault.remove(added.handle);}catch{}}
    if(error instanceof CredentialVaultError||error instanceof BudgetLedgerError)stop('PROFILE');
    throw error;
   }
  },
  removeProfile(handle){
   const profile=profileMeta(handle);
   let budget;try{budget=ledger.disableProfile(profile.profileId);}catch(error){if(error instanceof BudgetLedgerError)stop('PROFILE');throw error;}
   vault.remove(handle);
   profileSetToken=Symbol('credential-set');
   return Object.freeze({profile,budget});
  },
  list(){
   const snapshot=ledger.snapshot();
   return Object.freeze(vault.list().map(profile=>Object.freeze({
    ...profile,budget:snapshot.profiles.find(row=>row.profileId===profile.profileId)
   })));
  },
  budgetSnapshot(){return ledger.snapshot();},
  // Trusted scheduler hint only. Actual reservations remain authoritative.
  dispatchCapacity(){ledger.prune(readClock());return ledger.snapshot();},
  // Trusted adapter pre-encoding check, before escaping or serializing data.
  admitOperation,
  // A host-held fence spans downstream decoding and asynchronous computation.
  // It captures only an opaque generation, never a credential or handle.
  capturePublicationFence(){const observed=profileSetToken;return ()=>{if(observed!==profileSetToken)stop('PROFILE_SET_CHANGED');};},
  async execute(input={}){
   if(!closed(input,['handle','model','inputBytes','maxOutputTokens','operation']))stop('REQUEST');
   const {handle,model,inputBytes,maxOutputTokens,operation}=input;
   const profile=profileMeta(handle);
   if(typeof model!=='string'||!modelPattern.test(model)||!profile.models.includes(model))stop('MODEL');
   const transport=transportById.get(profile.providerId);if(typeof transport!=='function')stop('TRANSPORT');
   const checkedOperation=admitOperation(operation),observedProfileSet=profileSetToken;
   let lease;
   try{lease=ledger.reserve({profileId:profile.profileId,inputBytes,maxOutputTokens,now:readClock()});}
   catch(error){if(error instanceof BudgetLedgerError)stop(error.code==='PROFILE_DISABLED'?'PROFILE_DISABLED':'BUDGET');throw error;}
   try{
    const raw=await vault.use(handle,profile.providerId,(secret,meta)=>transport(Object.freeze({
     providerId:meta.providerId,model,credential:secret,leaseId:lease.leaseId,operation:checkedOperation
    })));
    // A removed profile may not publish a late result. No asynchronous gap
    // between the handle check, all-profile canary scan, settlement and return.
    vault.describe(handle);
    if(observedProfileSet!==profileSetToken)stop('PROFILE_SET_CHANGED');
    if(!closed(raw,['actualInputBytes','actualOutputTokens','value']))stop('PROVIDER_RESULT');
    const value=admitOperation(raw.value);
    try{ledger.settle(lease.leaseId,{actualInputBytes:raw.actualInputBytes,actualOutputTokens:raw.actualOutputTokens,now:readClock()});}
    catch(error){if(error instanceof BudgetLedgerError)stop('USAGE');throw error;}
    return Object.freeze({profile,model,lease:ledger.inspectLease(lease.leaseId),value});
   }catch(error){
    try{let now;try{now=readClock();}catch{now=lastTick;}ledger.markUnknown(lease.leaseId,{now});}catch{}
    if(error instanceof ProviderWorkspaceError)throw error;
    stop('PROVIDER_UNKNOWN');
   }
  }
 });
}
