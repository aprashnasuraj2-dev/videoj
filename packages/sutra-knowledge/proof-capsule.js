// Narrow offline capsule: exact bytes + independently retained digest + replay.
// No signer, timestamp, physical-truth, independence, or freshness claim.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {KERNEL} from './index.js';
import {DEBUGGER_VERSION,debuggerFixture,evaluateConclusionDebugger} from './conclusion-debugger.js';
export const CAPSULE_FORMAT='sutra-proof-capsule/v1';
export const MAX_CAPSULE_BYTES=262144;
export const CAPSULE_LIMITATIONS=Object.freeze([
 'Synthetic finite-world model and declared source lineage only.',
 'A digest must be retained independently of the capsule; a digest supplied only by an untrusted sender is not an authenticity guarantee.',
 'Replay does not establish external truth, observation independence, signer identity, or freshness.',
 'Older valid state with its older trusted digest remains verifiable; no monotonic witness is included.'
]);
const PAYLOAD_FORMAT='sutra-proof-payload/v1';
const computation=Object.freeze({debugger:DEBUGGER_VERSION,quantity:KERNEL,observationPolicy:'finite-minimax/v1'});
const HASH=/^sha256:[a-f0-9]{64}$/;
const encode=s=>new TextEncoder().encode(s);
const decode=b=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const reject=reason=>({status:'REFUSED',reason});
function snapshot(input){
 if(!(input instanceof Uint8Array)||input.byteLength<1||input.byteLength>MAX_CAPSULE_BYTES)throw TypeError('CAPSULE_SIZE');
 return Uint8Array.from(input);
}
async function hashOwned(bytes){
 if(bytes.byteLength<1||bytes.byteLength>MAX_CAPSULE_BYTES)throw TypeError('CAPSULE_SIZE');
 return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function capsuleDigest(bytes){return hashOwned(snapshot(bytes));}
// The closed fixture profile uses finite safe integers, well-formed strings,
// arrays, and ordinary JSON objects. Reject values that stringify ambiguously.
function validateProfile(x){
 if(x===null||typeof x==='boolean')return;
 if(typeof x==='number'){if(!Number.isSafeInteger(x)||Object.is(x,-0))throw TypeError('CAPSULE_NUMBER');return;}
 if(typeof x==='string'){if(/[\ud800-\udfff]/u.test(x))throw TypeError('CAPSULE_UNICODE');return;}
 if(typeof x!=='object')throw TypeError('CAPSULE_PROFILE');
 if(Array.isArray(x)){x.forEach(validateProfile);return;}
 for(const [k,v] of Object.entries(x)){validateProfile(k);validateProfile(v);}
}
function canonical(x){
 if(x===null||typeof x!=='object')return JSON.stringify(x);
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
function parse(text,depth=32){const x=parseUniqueJson(text,{maxChars:MAX_CAPSULE_BYTES,maxDepth:depth});validateProfile(x);return x;}
export async function createProofCapsule(eventText){
 // Capture immutable wire input before the first await. Never return a caller's
 // mutable event object paired with a result derived from an earlier version.
 const events=parse(eventText,8);
 const result=await evaluateConclusionDebugger(eventText);
 const f=await debuggerFixture();
 const payloadText=JSON.stringify({format:PAYLOAD_FORMAT,computation,caseText:f.caseText,caseDigest:f.caseDigest,
  state:{version:DEBUGGER_VERSION,events,result},limitations:CAPSULE_LIMITATIONS});
 const payloadDigest=await hashOwned(encode(payloadText));
 const bytes=encode(JSON.stringify({format:CAPSULE_FORMAT,payloadDigest,payloadText}));
 const expectedDigest=await hashOwned(bytes);
 return {bytes,expectedDigest,payloadDigest,historyDigest:result.historyDigest};
}
export async function verifyProofCapsule(input,expectedDigest){
 // An external pin is mandatory. Never read it from the untrusted envelope.
 if(typeof expectedDigest!=='string'||!HASH.test(expectedDigest))return reject('PIN_REQUIRED');
 let bytes;
 try{bytes=snapshot(input);}catch{return reject('SIZE_OR_TYPE');}
 let actualDigest;
 try{actualDigest=await hashOwned(bytes);}catch{return reject('HASH_FAILED');}
 if(actualDigest!==expectedDigest)return reject('PIN_MISMATCH');
 let envelope,payload;
 try{
  envelope=parse(decode(bytes),4);
  if(!keys(envelope,['format','payloadDigest','payloadText'])||envelope.format!==CAPSULE_FORMAT||typeof envelope.payloadDigest!=='string'||!HASH.test(envelope.payloadDigest)||typeof envelope.payloadText!=='string')return reject('ENVELOPE_SCHEMA');
  if(await hashOwned(encode(envelope.payloadText))!==envelope.payloadDigest)return reject('PAYLOAD_MISMATCH');
  payload=parse(envelope.payloadText);
  if(!keys(payload,['format','computation','caseText','caseDigest','state','limitations'])||payload.format!==PAYLOAD_FORMAT||canonical(payload.computation)!==canonical(computation)||canonical(payload.limitations)!==canonical(CAPSULE_LIMITATIONS)||!keys(payload.state,['version','events','result'])||payload.state.version!==DEBUGGER_VERSION||!Array.isArray(payload.state.events))return reject('PAYLOAD_SCHEMA');
 }catch{return reject('WIRE_REFUSED');}
 try{
  const f=await debuggerFixture();
  if(payload.caseText!==f.caseText||payload.caseDigest!==f.caseDigest)return reject('CASE_ANCHOR_MISMATCH');
  const result=await evaluateConclusionDebugger(JSON.stringify(payload.state.events));
  if(canonical(result)!==canonical(payload.state.result))return reject('REPLAY_MISMATCH');
  return {status:'VERIFIED',capsuleDigest:actualDigest,payloadDigest:envelope.payloadDigest,caseDigest:f.caseDigest,historyDigest:result.historyDigest,result,
   qualification:'Verified exact snapshot and deterministic replay against the installed synthetic fixture; freshness and external truth are not established.'};
 }catch{return reject('REPLAY_REFUSED');}
}
export function mutateCapsuleByte(input){
 const bytes=snapshot(input),text=decode(bytes),match=/[01]\/1/.exec(text);
 if(match){const position=encode(text.slice(0,match.index)).byteLength;bytes[position]=bytes[position]===48?49:48;}
 else bytes[bytes.length-1]^=1;
 return bytes;
}
