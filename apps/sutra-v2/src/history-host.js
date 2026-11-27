// Optional browser-to-host durable history capability.
// The standalone browser has no filesystem authority. A trusted embedding host may
// inject a versioned call capability; every snapshot is independently replayed
// in the browser before/after a host operation. Writes are never auto-retried.
import {openInvestigationHistory} from '../../../packages/sutra-knowledge/investigation-history.js';

const PIN=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{throw TypeError('HISTORY_HOST_'+code);};
// Host views are data, not an authority. Compare against the bounded replay
// shape without invoking host getters, toJSON, or arbitrary recursive data.
function matchesView(actual,expected){
 if(expected===null||typeof expected!=='object')return actual===expected;
 if(!actual||typeof actual!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
 const proto=Object.getPrototypeOf(actual);
 if(Array.isArray(expected)?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)return false;
 const keys=Reflect.ownKeys(expected),actualKeys=Reflect.ownKeys(actual);
 if(actualKeys.length!==keys.length)return false;
 return keys.every(key=>{
  const d=Object.getOwnPropertyDescriptor(actual,key),e=Object.getOwnPropertyDescriptor(expected,key);
  return d&&Object.hasOwn(d,'value')&&d.enumerable===e.enumerable&&matchesView(d.value,e.value);
 });
}
const pin=x=>typeof x==='string'&&PIN.test(x);
const data=(x,k)=>{const d=x&&typeof x==='object'?Object.getOwnPropertyDescriptor(x,k):null;return d&&Object.hasOwn(d,'value')?d.value:undefined;};
async function replaySnapshot(snapshot){
 const historyText=data(snapshot,'historyText'),digest=data(snapshot,'digest');
 if(typeof historyText!=='string'||!pin(digest))fail('SNAPSHOT');
 const history=await openInvestigationHistory(historyText,digest);
 const exact=history.snapshot();
 const view=Object.getOwnPropertyDescriptor(snapshot,'view');
 if(view&&(!Object.hasOwn(view,'value')||view.value!==undefined&&!matchesView(view.value,exact.view)))fail('VIEW_DIVERGENCE');
 return exact;
}
function responseError(value){
 if(typeof value!=='string'||!/^(?:HISTORY|HISTORY_STORE|DURABLE_INVESTIGATION)_[A-Z0-9_]{1,96}$/.test(value))return 'HISTORY_HOST_FAILURE';
 return value;
}
export function createHistoryHostClient(capability=globalThis.sutraHistoryHost){
 if(!capability||capability.version!==1||typeof capability.call!=='function')return null;
 const call=async(operation,payload,expectedDigest,signal)=>{
  const writing=operation!=='read_snapshot';
  if(signal?.aborted)fail('CANCELLED');
  let response,onAbort;
  try{
   const stopped=new Promise((_,reject)=>{
    onAbort=()=>reject(Error('cancelled'));
    signal?.addEventListener('abort',onAbort,{once:true});
   });
   response=await Promise.race([capability.call(operation,payload),stopped]);
  }catch{fail(writing?'OUTCOME_UNKNOWN':signal?.aborted?'CANCELLED':'TRANSPORT');}
  finally{signal?.removeEventListener('abort',onAbort);}
  let ok,code;
  try{
   ok=data(response,'ok');
   if(ok===false)code=responseError(data(response,'error'));
  }catch{fail(writing?'OUTCOME_UNKNOWN':'RESPONSE');}
  if(typeof ok!=='boolean')fail(writing?'OUTCOME_UNKNOWN':'RESPONSE');
  if(!ok){
   // Only known pre-publication CAS/lock refusals are definitive. I/O may
   // fail after publication, so a lost acknowledgement is never a rejection.
   if(writing&&!/^HISTORY_STORE_(?:STALE_OR_ROLLED_BACK_HEAD|ALREADY_INITIALIZED|BUSY_OR_CRASHED_LOCK)$/.test(code))fail('OUTCOME_UNKNOWN');
   throw TypeError(code);
  }
  try{
   const snapshot=await replaySnapshot(data(response,'snapshot'));
   if(expectedDigest&&snapshot.digest!==expectedDigest)fail('UNEXPECTED_HEAD');
   if(signal?.aborted)fail('CANCELLED');
   return snapshot;
  }catch(error){if(writing)fail('OUTCOME_UNKNOWN');throw error;}
 };
 return Object.freeze({
  async initialize(snapshot,signal){
   if(signal?.aborted)fail('CANCELLED');
   const exact=await replaySnapshot(snapshot);
   return call('initialize_snapshot',{historyText:exact.historyText,historyPin:exact.digest},exact.digest,signal);
  },
  async append(expectedHistoryPin,snapshot,signal){
   if(signal?.aborted)fail('CANCELLED');
   if(!pin(expectedHistoryPin))fail('EXPECTED_PIN');
   const exact=await replaySnapshot(snapshot);
   return call('append_snapshot',{expectedHistoryPin,historyText:exact.historyText,historyPin:exact.digest},exact.digest,signal);
  },
  async read(expectedHistoryPin,signal){
   if(!pin(expectedHistoryPin))fail('EXPECTED_PIN');
   return call('read_snapshot',{expectedHistoryPin},expectedHistoryPin,signal);
  }
 });
}
