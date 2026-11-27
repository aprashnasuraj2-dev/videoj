// Optional browser-to-host durable history capability.
// The standalone browser has no filesystem authority. A trusted embedding host may
// inject a versioned call capability; every snapshot is independently replayed
// in the browser before/after a host operation. Writes are never auto-retried.
import {openInvestigationHistory} from '../../../packages/sutra-knowledge/investigation-history.js';

const PIN=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{throw TypeError('HISTORY_HOST_'+code);};
// Compare only within the shape and depth of the freshly replayed view.
function matchesView(actual,expected){
 if(expected===null||typeof expected!=='object')return actual===expected;
 if(!actual||typeof actual!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
 if(Array.isArray(expected)&&actual.length!==expected.length)return false;
 let count=0;
 for(const key in actual){
  if(!Object.hasOwn(actual,key))continue;
  if(!Object.hasOwn(expected,key)||!matchesView(actual[key],expected[key]))return false;
  count++;
 }
 return count===Object.keys(expected).length;
}
const pin=x=>typeof x==='string'&&PIN.test(x);
async function replaySnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object'||typeof snapshot.historyText!=='string'||!pin(snapshot.digest))fail('SNAPSHOT');
 const history=await openInvestigationHistory(snapshot.historyText,snapshot.digest);
 const exact=history.snapshot();
 if(snapshot.view!==undefined&&!matchesView(snapshot.view,exact.view))fail('VIEW_DIVERGENCE');
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
  let response;
  if(signal?.aborted)fail('CANCELLED');
  let onAbort;
  try{
   const stopped=new Promise((_,reject)=>{
    onAbort=()=>reject(Error('cancelled'));
    signal?.addEventListener('abort',onAbort,{once:true});
   });
   response=await Promise.race([capability.call(operation,payload),stopped]);
  }catch{fail(writing?'OUTCOME_UNKNOWN':signal?.aborted?'CANCELLED':'TRANSPORT');}
  finally{signal?.removeEventListener('abort',onAbort);}
  if(!response||typeof response.ok!=='boolean')fail(writing?'OUTCOME_UNKNOWN':'RESPONSE');
  if(!response.ok){
   const code=responseError(response.error);
   // Only these refusals are guaranteed to precede publication. An I/O error
   // can occur after HEAD rename, including during final sync or readback.
   if(writing&&!/^(?:HISTORY_STORE_(?:STALE_OR_ROLLED_BACK_HEAD|ALREADY_INITIALIZED|BUSY_OR_CRASHED_LOCK)|HISTORY_EXTENSION_[A-Z_]+)$/.test(code))fail('OUTCOME_UNKNOWN');
   throw TypeError(code);
  }
  let snapshot;
  try{
   snapshot=await replaySnapshot(response.snapshot);
   if(expectedDigest&&snapshot.digest!==expectedDigest)fail('UNEXPECTED_HEAD');
  }catch(error){
   if(writing)fail('OUTCOME_UNKNOWN');
   throw error;
  }
  return snapshot;
 };
 return Object.freeze({
  async initialize(snapshot,signal){
   const exact=await replaySnapshot(snapshot);
   return call('initialize_snapshot',{historyText:exact.historyText,historyPin:exact.digest},exact.digest,signal);
  },
  async append(expectedHistoryPin,snapshot,signal){
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
