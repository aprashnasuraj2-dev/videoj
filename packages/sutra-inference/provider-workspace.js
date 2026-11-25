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

function sanitizeProviderValue(value,secret,{depth=0,budget={chars:0,nodes:0}}={}){
 if(depth>12||++budget.nodes>512)stop('PROVIDER_RESULT');
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='number'){
  if(!Number.isFinite(value))stop('PROVIDER_RESULT');return value;
 }
 if(typeof value==='string'){
  budget.chars+=value.length;if(budget.chars>65536)stop('PROVIDER_RESULT');
  if(secret&&value.includes(secret))stop('SECRET_ECHO');
  return value;
 }
 if(Array.isArray(value)){
  if(value.length>128)stop('PROVIDER_RESULT');
  return Object.freeze(value.map(item=>sanitizeProviderValue(item,secret,{depth:depth+1,budget})));
 }
 if(!plain(value))stop('PROVIDER_RESULT');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
 if(keys.length>128||keys.some(k=>typeof k!=='string')||Object.values(descriptors).some(d=>typeof d.get==='function'||typeof d.set==='function'))stop('PROVIDER_RESULT');
 const out=Object.create(null);
 for(const key of keys){
  budget.chars+=key.length;if(budget.chars>65536)stop('PROVIDER_RESULT');
  if(secret&&key.includes(secret))stop('SECRET_ECHO');
  out[key]=sanitizeProviderValue(descriptors[key].value,secret,{depth:depth+1,budget});
 }
 return Object.freeze(out);
}

export function createProviderWorkspace({catalog,globalLimits,defaultProfileLimits,leaseTicks=45,randomBytes}={}){
 const vault=createEphemeralCredentialVault({catalog,randomBytes});
 const ledger=createProviderBudgetLedger({global:globalLimits,profiles:[],leaseTicks,randomBytes});
 if(!plain(defaultProfileLimits))stop('CONFIG');

 const profileMeta=handle=>{
  try{return vault.describe(handle);}catch(error){if(error instanceof CredentialVaultError)stop('HANDLE');throw error;}
 };
 const budgetRow=profileId=>ledger.snapshot().profiles.find(row=>row.profileId===profileId);

 return Object.freeze({
  mode:'provider-workspace-laboratory',
  providers:vault.providers,
  addProfile({providerId,label,credential,limits=defaultProfileLimits}={}){
   let added;
   try{
    added=vault.addProfile({providerId,label,credential});
    ledger.registerProfile({profileId:added.profile.profileId,limits});
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
   return Object.freeze({profile,budget});
  },
  list(){
   const snapshot=ledger.snapshot();
   return Object.freeze(vault.list().map(profile=>Object.freeze({
    ...profile,budget:snapshot.profiles.find(row=>row.profileId===profile.profileId)
   })));
  },
  budgetSnapshot(){return ledger.snapshot();},
  async execute({handle,model,inputBytes,maxOutputTokens,now,operation,transport}={}){
   const profile=profileMeta(handle);
   if(typeof model!=='string'||!modelPattern.test(model)||!profile.models.includes(model))stop('MODEL');
   if(typeof transport!=='function')stop('TRANSPORT');
   // Snapshot operation data before budget reservation or secret release. This
   // rejects accessors/functions/cycles and prevents transport-side mutation of
   // caller-owned data from changing the admitted operation after the fact.
   const safeOperation=sanitizeProviderValue(operation,'');
   let lease;
   try{lease=ledger.reserve({profileId:profile.profileId,inputBytes,maxOutputTokens,now});}
   catch(error){if(error instanceof BudgetLedgerError)stop(error.code==='PROFILE_DISABLED'?'PROFILE_DISABLED':'BUDGET');throw error;}
   try{
    const raw=await vault.use(handle,profile.providerId,(secret,meta)=>transport(Object.freeze({
     providerId:meta.providerId,model,credential:secret,leaseId:lease.leaseId,operation:safeOperation
    })));
    let report,secret;
    // Re-enter the vault only for bounded secret-echo detection; do not retain
    // the credential in workspace metadata or returned values.
    await vault.use(handle,profile.providerId,value=>{secret=value;});
    if(!closed(raw,['actualInputBytes','actualOutputTokens','value']))stop('PROVIDER_RESULT');
    const value=sanitizeProviderValue(raw.value,secret);
    try{ledger.settle(lease.leaseId,{actualInputBytes:raw.actualInputBytes,actualOutputTokens:raw.actualOutputTokens,now});}
    catch(error){if(error instanceof BudgetLedgerError)stop('USAGE');throw error;}
    report=Object.freeze({profile,model,lease:ledger.inspectLease(lease.leaseId),value});
    return report;
   }catch(error){
    // Provider contact or trusted transport may already have happened. Preserve
    // the full admission and an active unknown lease rather than retry/refund.
    try{ledger.markUnknown(lease.leaseId,{now});}catch{}
    if(error instanceof ProviderWorkspaceError)throw error;
    stop('PROVIDER_UNKNOWN');
   }
  }
 });
}
