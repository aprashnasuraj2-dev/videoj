// Exact snapshot identity and a distinct caller-held case identity are required.
// The case pin alone cannot distinguish two valid histories of the same case.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {alignedInvestigationExport,ALIGNED_VERSION} from './aligned-investigation.js';
import {casePin} from './pinned-investigation.js';
export const ALIGNED_CAPSULE='sutra-aligned-proof-capsule/v1';
export const MAX_ALIGNED_CAPSULE_BYTES=1048576;
const HASH=/^sha256:[a-f0-9]{64}$/;
const LIMITATIONS=Object.freeze([
 'Finite aligned typed worlds and declared source lineage only.',
 'Retain the case pin and exact snapshot pin independently of untrusted capsule bytes.',
 'Replay establishes neither source truth, model completeness, semantic validity, independence, signer identity nor freshness.',
 'A valid historical snapshot with its own trusted pin remains verifiable; no monotonic witness is included.'
]);
const enc=s=>new TextEncoder().encode(s);
const dec=b=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const reject=reason=>({status:'REFUSED',reason});
function owned(bytes){
 if(!(bytes instanceof Uint8Array)||!bytes.byteLength||bytes.byteLength>MAX_ALIGNED_CAPSULE_BYTES)throw TypeError('ALIGNED_CAPSULE_SIZE');
 return Uint8Array.from(bytes);
}
async function hash(bytes){
 return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
}
export const alignedCapsuleDigest=async bytes=>hash(owned(bytes));
function profile(x){
 if(x===null||typeof x==='boolean')return;
 if(typeof x==='number'){if(!Number.isSafeInteger(x)||Object.is(x,-0))throw TypeError('ALIGNED_CAPSULE_NUMBER');return;}
 if(typeof x==='string'){if(/[\ud800-\udfff]/u.test(x))throw TypeError('ALIGNED_CAPSULE_UNICODE');return;}
 if(typeof x!=='object')throw TypeError('ALIGNED_CAPSULE_PROFILE');
 if(Array.isArray(x)){x.forEach(profile);return;}
 for(const [k,v] of Object.entries(x)){profile(k);profile(v);}
}
function canonical(x){
 if(x===null||typeof x!=='object')return JSON.stringify(x);
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
export async function createAlignedCapsule(caseText,expectedCasePin,eventText='[]'){
 const investigation=await alignedInvestigationExport(caseText,expectedCasePin,eventText);
 const bytes=owned(enc(JSON.stringify({format:ALIGNED_CAPSULE,investigation,limitations:LIMITATIONS})));
 return {bytes,expectedDigest:await hash(bytes),caseDigest:expectedCasePin,eventDigest:investigation.result.eventDigest};
}
export async function verifyAlignedCapsule(input,expectedDigest,expectedCasePin){
 if(typeof expectedDigest!=='string'||!HASH.test(expectedDigest))return reject('PIN_REQUIRED');
 if(typeof expectedCasePin!=='string'||!HASH.test(expectedCasePin))return reject('CASE_PIN_REQUIRED');
 let bytes;
 try{bytes=owned(input);}catch{return reject('SIZE_OR_TYPE');}
 let digest;
 try{digest=await hash(bytes);}catch{return reject('HASH_FAILED');}
 if(digest!==expectedDigest)return reject('PIN_MISMATCH');
 let b;
 try{b=parseUniqueJson(dec(bytes),{maxChars:MAX_ALIGNED_CAPSULE_BYTES,maxDepth:32});profile(b);}
 catch{return reject('WIRE_REFUSED');}
 if(!keys(b,['format','investigation','limitations'])||b.format!==ALIGNED_CAPSULE||canonical(b.limitations)!==canonical(LIMITATIONS)||
    !keys(b.investigation,['version','caseText','eventText','result','alignment'])||b.investigation.version!==ALIGNED_VERSION||
    typeof b.investigation.caseText!=='string'||typeof b.investigation.eventText!=='string')return reject('CAPSULE_SCHEMA');
 const i=b.investigation;
 try{if(await casePin(i.caseText)!==expectedCasePin)return reject('CASE_PIN_MISMATCH');}
 catch{return reject('REPLAY_REFUSED');}
 try{
  const replayed=await alignedInvestigationExport(i.caseText,expectedCasePin,i.eventText);
  if(canonical(replayed)!==canonical(i))return reject('REPLAY_MISMATCH');
  return {status:'VERIFIED',capsuleDigest:digest,caseDigest:expectedCasePin,eventDigest:replayed.result.eventDigest,
   schemaDigest:replayed.alignment.schemaDigest,conclusion:replayed.result.state,
   qualification:'Exact aligned snapshot replay against caller-retained case and snapshot pins; not truth or freshness.'};
 }catch{return reject('REPLAY_REFUSED');}
}
