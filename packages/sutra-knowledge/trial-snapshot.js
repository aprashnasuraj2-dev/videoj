// Exact snapshot and separate normalized source identities. Not clinical or source authority.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {VERSION,exportTrialPartition,compareTrialVersions} from './trial-partition.js';
export const MAX_TRIAL_SNAPSHOT_BYTES=262144;
const HASH=/^sha256:[a-f0-9]{64}$/;
const pin=x=>typeof x==='string'&&HASH.test(x);
const reject=reason=>({status:'REFUSED',reason});
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
function owned(b){if(!(b instanceof Uint8Array)||!b.byteLength||b.byteLength>MAX_TRIAL_SNAPSHOT_BYTES)throw TypeError('TRIAL_SNAPSHOT_SIZE');return Uint8Array.from(b);}
async function digest(b){return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');}
export const trialSnapshotDigest=b=>digest(owned(b));
function profile(x){
 if(x===null||typeof x==='boolean')return;
 if(typeof x==='number'){if(!Number.isSafeInteger(x)||Object.is(x,-0))throw TypeError('NUMBER');return;}
 if(typeof x==='string'){if(/[\ud800-\udfff]/u.test(x))throw TypeError('UNICODE');return;}
 if(!x||typeof x!=='object')throw TypeError('PROFILE');
 if(Array.isArray(x)){x.forEach(profile);return;}
 for(const [k,v] of Object.entries(x)){profile(k);profile(v);}
}
function canonical(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
export async function verifyTrialSnapshot(input,expectedDigest,expectedSourcePin,expectedAfterPin){
 if(!pin(expectedDigest))return reject('PIN_REQUIRED');
 if(!pin(expectedSourcePin))return reject('SOURCE_PIN_REQUIRED');
 if(expectedAfterPin!==undefined&&!pin(expectedAfterPin))return reject('AFTER_SOURCE_PIN_REQUIRED');
 let bytes;try{bytes=owned(input);}catch{return reject('SIZE_OR_TYPE');}
 let actual;try{actual=await digest(bytes);}catch{return reject('HASH_FAILED');}
 if(actual!==expectedDigest)return reject('PIN_MISMATCH');
 let b;try{b=parseUniqueJson(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),{maxChars:MAX_TRIAL_SNAPSHOT_BYTES,maxDepth:32});profile(b);}catch{return reject('WIRE_REFUSED');}
 if(b?.version!==VERSION||!['partition','comparison'].includes(b?.kind))return reject('TRIAL_SCHEMA');
 if(b.kind==='partition'){
  if(expectedAfterPin!==undefined)return reject('SOURCE_PIN_PROFILE');
  if(!keys(b,['version','kind','sourceText','result'])||typeof b.sourceText!=='string'||!['aggregate','partition'].includes(b.result?.mode))return reject('TRIAL_SCHEMA');
 }else{
  if(!pin(expectedAfterPin))return reject('AFTER_SOURCE_PIN_REQUIRED');
  if(!keys(b,['version','kind','beforeText','afterText','result'])||typeof b.beforeText!=='string'||typeof b.afterText!=='string')return reject('TRIAL_SCHEMA');
 }
 try{
  if(await casePin(b.kind==='partition'?b.sourceText:b.beforeText)!==expectedSourcePin)return reject('SOURCE_PIN_MISMATCH');
  if(b.kind==='comparison'&&await casePin(b.afterText)!==expectedAfterPin)return reject('AFTER_SOURCE_PIN_MISMATCH');
  const replayed=b.kind==='partition'?await exportTrialPartition(b.sourceText,expectedSourcePin,b.result.mode):await compareTrialVersions(b.beforeText,expectedSourcePin,b.afterText,expectedAfterPin);
  if(canonical(replayed)!==canonical(b))return reject('REPLAY_MISMATCH');
  return {status:'VERIFIED',snapshotDigest:actual,sourceDigest:expectedSourcePin,afterSourceDigest:expectedAfterPin??null,kind:b.kind,conclusion:b.kind==='partition'?replayed.result.universalObservedLower:replayed.result.independentReplication,qualification:'Exact trial snapshot and normalized-source replay; not clinical, empirical, identity or freshness verification.'};
 }catch{return reject('REPLAY_REFUSED');}
}
