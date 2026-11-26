// Optional browser-to-host durable history capability.
// The standalone browser has no filesystem authority. A trusted embedding host may
// inject a versioned call capability; every snapshot is independently replayed
// in the browser before/after a host operation. Writes are never auto-retried.
import {openInvestigationHistory} from '../../../packages/sutra-knowledge/investigation-history.js';

const PIN=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{throw TypeError('HISTORY_HOST_'+code);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const pin=x=>typeof x==='string'&&PIN.test(x);
async function replaySnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object'||typeof snapshot.historyText!=='string'||!pin(snapshot.digest))fail('SNAPSHOT');
 const history=await openInvestigationHistory(snapshot.historyText,snapshot.digest);
 const exact=history.snapshot();
 if(snapshot.view!==undefined&&JSON.stringify(snapshot.view)!==JSON.stringify(exact.view))fail('VIEW_DIVERGENCE');
 return exact;
}
function responseError(value){
 if(typeof value!=='string'||!/^(?:HISTORY|HISTORY_STORE|DURABLE_INVESTIGATION)_[A-Z0-9_]{1,96}$/.test(value))return 'HISTORY_HOST_FAILURE';
 return value;
}
export function createHistoryHostClient(capability=globalThis.sutraHistoryHost){
 if(!capability||capability.version!==1||typeof capability.call!=='function')return null;
 const call=async(operation,payload,expectedDigest)=>{
  let response;
  try{response=await capability.call(operation,payload);}
  catch{fail('TRANSPORT');}
  if(!response||typeof response!=='object'||typeof response.ok!=='boolean')fail('RESPONSE');
  if(!response.ok)throw TypeError(responseError(response.error));
  const snapshot=await replaySnapshot(response.snapshot);
  if(expectedDigest&&snapshot.digest!==expectedDigest)fail('UNEXPECTED_HEAD');
  return snapshot;
 };
 return Object.freeze({
  async initialize(snapshot){
   const exact=await replaySnapshot(snapshot);
   return call('initialize_snapshot',{historyText:exact.historyText,historyPin:exact.digest},exact.digest);
  },
  async append(expectedHistoryPin,snapshot){
   if(!pin(expectedHistoryPin))fail('EXPECTED_PIN');
   const exact=await replaySnapshot(snapshot);
   return call('append_snapshot',{expectedHistoryPin,historyText:exact.historyText,historyPin:exact.digest},exact.digest);
  },
  async read(expectedHistoryPin){
   if(!pin(expectedHistoryPin))fail('EXPECTED_PIN');
   return call('read_snapshot',{expectedHistoryPin},expectedHistoryPin);
  }
 });
}
