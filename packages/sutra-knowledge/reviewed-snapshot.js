// Exact portable report bytes plus independently retained reviewed contract.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {VERSION,exportReviewedProposal} from './reviewed-claim-compiler.js';
export const MAX_REVIEWED_SNAPSHOT_BYTES=262144;
const HASH=/^sha256:[a-f0-9]{64}$/;
const pin=x=>typeof x==='string'&&HASH.test(x);
const reject=reason=>({status:'REFUSED',reason});
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
function owned(b){if(!(b instanceof Uint8Array)||!b.byteLength||b.byteLength>MAX_REVIEWED_SNAPSHOT_BYTES)throw TypeError('REVIEWED_SNAPSHOT_SIZE');return Uint8Array.from(b);}
async function digest(b){return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');}
export const reviewedSnapshotDigest=b=>digest(owned(b));
function profile(x){
 if(x===null||typeof x==='boolean')return;
 if(typeof x==='number'){if(!Number.isSafeInteger(x)||Object.is(x,-0))throw TypeError('NUMBER');return;}
 if(typeof x==='string'){if(/[\ud800-\udfff]/u.test(x))throw TypeError('UNICODE');return;}
 if(!x||typeof x!=='object')throw TypeError('PROFILE');
 if(Array.isArray(x)){x.forEach(profile);return;}
 for(const [k,v] of Object.entries(x)){profile(k);profile(v);}
}
function canonical(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
export async function verifyReviewedSnapshot(input,expectedDigest,expectedContractPin){
 if(!pin(expectedDigest))return reject('PIN_REQUIRED');
 if(!pin(expectedContractPin))return reject('CONTRACT_PIN_REQUIRED');
 let bytes;try{bytes=owned(input);}catch{return reject('SIZE_OR_TYPE');}
 let actual;try{actual=await digest(bytes);}catch{return reject('HASH_FAILED');}
 if(actual!==expectedDigest)return reject('PIN_MISMATCH');
 let b;
 try{b=parseUniqueJson(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),{maxChars:MAX_REVIEWED_SNAPSHOT_BYTES,maxDepth:40});profile(b);}catch{return reject('WIRE_REFUSED');}
 if(!keys(b,['version','contractText','proposalText','result'])||b.version!==VERSION||typeof b.contractText!=='string'||typeof b.proposalText!=='string'||!b.result||typeof b.result!=='object'||Array.isArray(b.result))return reject('REVIEWED_SCHEMA');
 try{
  if(await casePin(b.contractText)!==expectedContractPin)return reject('CONTRACT_PIN_MISMATCH');
  const r=await exportReviewedProposal(b.contractText,expectedContractPin,b.proposalText);
  if(canonical(r)!==canonical(b))return reject('REPLAY_MISMATCH');
  return {status:'VERIFIED',snapshotDigest:actual,contractDigest:expectedContractPin,proposalDigest:r.result.proposalDigest,conclusion:r.result.target.status,questionRelevance:'UNVERIFIED',methodValidity:'UNVERIFIED',qualification:'Exact reviewed contract and proposal computation replay only; no source truth, semantic relevance, method validity, identity, freshness or external authority.'};
 }catch{return reject('REPLAY_REFUSED');}
}
