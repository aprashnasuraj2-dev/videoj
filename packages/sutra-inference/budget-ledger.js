// Provider-independent reservation/reconciliation laboratory.
//
// This module tracks opaque profile IDs and resource ceilings only. It never sees
// provider credentials, never contacts a model, and never represents its counters
// as billed currency. Daily reservations are conservative: completion, failure,
// cancellation and unknown outcomes never refund admitted call/input/output
// ceilings. Unknown active leases hold concurrency until their logical expiry.
export class BudgetLedgerError extends Error{
 constructor(code){super('Budget ledger refused ('+code+').');this.name='BudgetLedgerError';this.code=code;}
}
const stop=code=>{throw new BudgetLedgerError(code);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const closed=(x,keys)=>{
 if(!plain(x))return false;
 const d=Object.getOwnPropertyDescriptors(x);
 if(Object.values(d).some(v=>typeof v.get==='function'||typeof v.set==='function'))return false;
 const own=Reflect.ownKeys(x);
 return own.length===keys.length&&own.every(k=>typeof k==='string'&&keys.includes(k));
};
const safe=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const profilePattern=/^[0-9a-f]{32}$/;
const MAX_CALLS=10000,MAX_BYTES=1_000_000_000,MAX_TOKENS=100_000_000,MAX_CONCURRENT=100;
const MAX_REQUEST_BYTES=1_048_576,MAX_REQUEST_OUTPUT=8192,MAX_LEASE_TICKS=100000;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

function limits(value,global=null){
 if(!closed(value,['maxCalls','maxInputBytes','maxOutputTokens','maxConcurrent']))stop('LIMITS');
 const maxCalls=value.maxCalls,maxInputBytes=value.maxInputBytes,maxOutputTokens=value.maxOutputTokens,maxConcurrent=value.maxConcurrent;
 if(!safe(maxCalls,1,MAX_CALLS)||!safe(maxInputBytes,1,MAX_BYTES)||!safe(maxOutputTokens,1,MAX_TOKENS)||
  !safe(maxConcurrent,1,Math.min(MAX_CONCURRENT,maxCalls)))stop('LIMITS');
 if(global&&(maxCalls>global.maxCalls||maxInputBytes>global.maxInputBytes||maxOutputTokens>global.maxOutputTokens||maxConcurrent>global.maxConcurrent))stop('LIMITS');
 return Object.freeze({maxCalls,maxInputBytes,maxOutputTokens,maxConcurrent});
}
const blank=()=>({calls:0,inputBytes:0,outputTokens:0,actualInputBytes:0,actualOutputTokens:0,active:0,unknown:0});

export function createProviderBudgetLedger({global,profiles,leaseTicks=45,randomBytes}={}){
 const globalLimits=limits(global);
 if(!Array.isArray(profiles)||profiles.length>8||!safe(leaseTicks,1,MAX_LEASE_TICKS))stop('CONFIG');
 const profileMap=new Map();
 for(const item of profiles){
  if(!closed(item,['profileId','limits'])||!profilePattern.test(item.profileId)||profileMap.has(item.profileId))stop('CONFIG');
  profileMap.set(item.profileId,{limits:limits(item.limits,globalLimits),used:blank(),enabled:true});
 }
 const fill=randomBytes??(length=>{
  if(!globalThis.crypto?.getRandomValues)stop('RANDOM');
  const bytes=new Uint8Array(length);globalThis.crypto.getRandomValues(bytes);return bytes;
 });
 if(typeof fill!=='function')stop('RANDOM');
 const used=blank(),leases=new Map();let lastNow=-1;

 const leaseId=()=>{
  for(let i=0;i<4;i++){
   const bytes=fill(16);if(!(bytes instanceof Uint8Array)||bytes.length!==16)stop('RANDOM');
   const id=hex(bytes);if(/^0+$/.test(id))stop('RANDOM');
   if(!leases.has(id))return id;
  }
  stop('RANDOM_COLLISION');
 };
 const getLease=id=>{
  if(typeof id!=='string'||!leases.has(id))stop('LEASE');
  return leases.get(id);
 };
 const releaseActive=lease=>{
  if(!lease.active)return;
  lease.active=false;used.active--;const p=profileMap.get(lease.profileId);p.used.active--;
  if(lease.unknown){used.unknown--;p.used.unknown--;}
 };
 const prune=now=>{
  if(!safe(now,0,Number.MAX_SAFE_INTEGER)||now<lastNow)stop('CLOCK');
  lastNow=now;
  let expired=0;
  for(const lease of leases.values()){
   if(lease.active&&lease.expiresAt<=now){
    const wasUnknown=lease.unknown;releaseActive(lease);lease.state=wasUnknown?'unknown-expired':'lease-expired';expired++;
   }
  }
  return expired;
 };
 const publicUsed=x=>Object.freeze({...x});
 const publicLease=lease=>Object.freeze({
  leaseId:lease.id,profileId:lease.profileId,inputBytes:lease.inputBytes,maxOutputTokens:lease.outputTokens,
  reservedAt:lease.reservedAt,expiresAt:lease.expiresAt,state:lease.state
 });
 const canReserve=(bucket,limit,inputBytes,outputTokens)=>bucket.calls<limit.maxCalls&&
  bucket.inputBytes+inputBytes<=limit.maxInputBytes&&bucket.outputTokens+outputTokens<=limit.maxOutputTokens&&bucket.active<limit.maxConcurrent;

 return Object.freeze({
  registerProfile(input){
   if(!closed(input,['profileId','limits'])||!profilePattern.test(input.profileId)||profileMap.has(input.profileId)||profileMap.size>=8)stop('PROFILE');
   const entry={limits:limits(input.limits,globalLimits),used:blank(),enabled:true};
   profileMap.set(input.profileId,entry);
   return Object.freeze({profileId:input.profileId,enabled:true,limits:entry.limits,used:publicUsed(entry.used)});
  },
  disableProfile(profileId){
   const profile=profileMap.get(profileId);if(!profile)stop('PROFILE');
   profile.enabled=false;
   return Object.freeze({profileId,enabled:false,limits:profile.limits,used:publicUsed(profile.used)});
  },
  reserve({profileId,inputBytes,maxOutputTokens,now}={}){
   prune(now);
   const profile=profileMap.get(profileId);
   if(!profile||!safe(inputBytes,1,MAX_REQUEST_BYTES)||!safe(maxOutputTokens,1,MAX_REQUEST_OUTPUT))stop('REQUEST');
   if(!profile.enabled)stop('PROFILE_DISABLED');
   if(now>Number.MAX_SAFE_INTEGER-leaseTicks)stop('CLOCK');
   if(!canReserve(used,globalLimits,inputBytes,maxOutputTokens)||!canReserve(profile.used,profile.limits,inputBytes,maxOutputTokens))stop('QUOTA');
   const id=leaseId(),lease={id,profileId,inputBytes,outputTokens:maxOutputTokens,reservedAt:now,expiresAt:now+leaseTicks,state:'active',active:true,unknown:false,settlement:null};
   leases.set(id,lease);
   for(const bucket of [used,profile.used]){bucket.calls++;bucket.inputBytes+=inputBytes;bucket.outputTokens+=maxOutputTokens;bucket.active++;}
   return publicLease(lease);
  },
  markUnknown(id,{now}={}){
   prune(now);
   const lease=getLease(id);
   if(!lease.active){
    if(lease.state==='unknown-expired'||lease.state==='unknown')return publicLease(lease);
    stop('LEASE_STATE');
   }
   if(!lease.unknown){lease.unknown=true;lease.state='unknown';used.unknown++;profileMap.get(lease.profileId).used.unknown++;}
   return publicLease(lease);
  },
  settle(id,{actualInputBytes,actualOutputTokens,now}={}){
   prune(now);
   const lease=getLease(id);
   if(!safe(actualInputBytes,0,lease.inputBytes)||!safe(actualOutputTokens,0,lease.outputTokens))stop('USAGE');
   const next=Object.freeze({actualInputBytes,actualOutputTokens});
   if(lease.settlement){
    if(lease.settlement.actualInputBytes!==actualInputBytes||lease.settlement.actualOutputTokens!==actualOutputTokens)stop('SETTLEMENT_CONFLICT');
    return publicLease(lease);
   }
   lease.settlement=next;
   const profile=profileMap.get(lease.profileId);
   used.actualInputBytes+=actualInputBytes;used.actualOutputTokens+=actualOutputTokens;
   profile.used.actualInputBytes+=actualInputBytes;profile.used.actualOutputTokens+=actualOutputTokens;
   releaseActive(lease);lease.state='settled';
   return publicLease(lease);
  },
  abandonKnown(id,{now}={}){
   // Even a local cancellation or known provider failure does not refund daily
   // reservation here; this generic ledger lacks provider billing proof.
   prune(now);const lease=getLease(id);
   if(lease.settlement)return publicLease(lease);
   releaseActive(lease);lease.state='closed-unreconciled';return publicLease(lease);
  },
  prune,
  snapshot(){
   return Object.freeze({
    global:Object.freeze({limits:globalLimits,used:publicUsed(used)}),
    profiles:Object.freeze([...profileMap.entries()].map(([profileId,p])=>Object.freeze({profileId,enabled:p.enabled,limits:p.limits,used:publicUsed(p.used)})))
   });
  },
  inspectLease(id){return publicLease(getLease(id));}
 });
}
