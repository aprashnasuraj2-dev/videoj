// Authenticated external observation receipt. Authentication binds a signer
// identity, challenge and exact source bytes; it does not certify measurement
// accuracy, independence, causal relevance or applicability.
import {createHash,createPublicKey,randomBytes as systemRandom,verify as edVerify} from 'node:crypto';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replaySourceBoundAcquisitionPath} from './acquisition-path.js';
const VERSION='sutra-authenticated-observation/v1',BODY='sutra-authenticated-observation-body/v1',ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/,PIN=/^sha256:[a-f0-9]{64}$/;
const fail=c=>{throw TypeError('AUTH_ACQUISITION_'+c);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const b64=b=>Buffer.from(b).toString('base64url');
const message=(bodyPin,keyId)=>Buffer.from('SUTRA/authenticated-observation/v1\0'+keyId+'\0'+bodyPin,'utf8');
function endpoint(value){let u;try{u=new URL(value);}catch{fail('ENDPOINT');}const local=['127.0.0.1','localhost','[::1]'].includes(u.hostname);if(u.username||u.password||u.hash||u.search||u.protocol!=='https:'&&!(u.protocol==='http:'&&local))fail('ENDPOINT');return u;}
function keyMap(trustedKeys){if(!Array.isArray(trustedKeys)||!trustedKeys.length||trustedKeys.length>16)fail('KEYS');const m=new Map();for(const x of trustedKeys){if(!keys(x,['keyId','publicKey'])||!ID.test(x.keyId)||m.has(x.keyId)||typeof x.publicKey!=='string')fail('KEYS');const k=createPublicKey(x.publicKey);if(k.asymmetricKeyType!=='ed25519')fail('KEYS');m.set(x.keyId,k);}return m;}
export async function verifyAuthenticatedObservation({receiptText,receiptPin,trustedKeys,expectedChallenge=null,expectedActionId=null,expectedSourceId=null}={}){
 if(typeof receiptText!=='string'||!PIN.test(receiptPin)||await casePin(receiptText)!==receiptPin)fail('PIN');
 const r=parseUniqueJson(receiptText,{maxChars:131072,maxDepth:6}),km=keyMap(trustedKeys);
 if(!keys(r,['version','keyId','bodyText','bodyPin','signature'])||r.version!==VERSION||!ID.test(r.keyId)||!km.has(r.keyId)||typeof r.bodyText!=='string'||!PIN.test(r.bodyPin)||await casePin(r.bodyText)!==r.bodyPin||typeof r.signature!=='string')fail('RECEIPT');
 let sig;try{sig=Buffer.from(r.signature,'base64url');}catch{fail('SIGNATURE');}if(sig.length!==64||b64(sig)!==r.signature||!edVerify(null,message(r.bodyPin,r.keyId),km.get(r.keyId),sig))fail('SIGNATURE');
 const b=parseUniqueJson(r.bodyText,{maxChars:65536,maxDepth:4});
 if(!keys(b,['version','challenge','actionId','outcome','sourceId','sourceText','sourcePin','start','end'])||b.version!==BODY||typeof b.challenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(b.challenge)||!ID.test(b.actionId)||!ID.test(b.sourceId)||typeof b.outcome!=='string'||typeof b.sourceText!=='string'||b.sourceText.length>16384||!PIN.test(b.sourcePin)||await casePin(b.sourceText)!==b.sourcePin||!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<0||b.end<=b.start||b.end>b.sourceText.length||b.sourceText.slice(b.start,b.end)!==b.outcome)fail('BODY');
 if(expectedChallenge!==null&&b.challenge!==expectedChallenge)fail('CHALLENGE');
 if(expectedActionId!==null&&b.actionId!==expectedActionId)fail('ACTION');
 if(expectedSourceId!==null&&b.sourceId!==expectedSourceId)fail('SOURCE');
 return Object.freeze({keyId:r.keyId,body:b,receiptText,receiptPin,authentication:'ED25519_SIGNER_AND_CHALLENGE_VERIFIED',decisionAuthority:'NONE',qualification:'Signer identity and exact challenged bytes verified under caller-pinned public key. Measurement accuracy, independence, calibration, applicability and truth are not established.'});
}
export function createAuthenticatedObservationClient({trustedKeys,fetchImpl=globalThis.fetch,randomBytes=systemRandom}={}){
 const km=keyMap(trustedKeys);if(typeof fetchImpl!=='function'||typeof randomBytes!=='function')fail('CONFIG');
 return Object.freeze({async collect({endpointUrl,actionId,sourceId}={}){
  if(!ID.test(actionId)||!ID.test(sourceId))fail('REQUEST');const u=endpoint(endpointUrl),nonce=Buffer.from(randomBytes(32));if(nonce.length!==32||nonce.equals(Buffer.alloc(32)))fail('RANDOM');const challenge=b64(nonce);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);let response;
  try{response=await fetchImpl(u,{method:'POST',redirect:'error',signal:controller.signal,headers:{'content-type':'application/json','accept':'application/json','cache-control':'no-store'},body:JSON.stringify({version:1,challenge,actionId,sourceId})});}
  catch{fail('TRANSPORT');}finally{clearTimeout(timer);}
  if(response.status!==200||response.headers.get('content-type')?.split(';')[0]!=='application/json')fail('TRANSPORT');const raw=Buffer.from(await response.arrayBuffer());if(raw.length<1||raw.length>131072)fail('TRANSPORT');
  const receiptText=new TextDecoder('utf-8',{fatal:true}).decode(raw),receiptPin=await casePin(receiptText);
  return verifyAuthenticatedObservation({receiptText,receiptPin,trustedKeys:[...km].map(([keyId,key])=>({keyId,publicKey:key.export({format:'pem',type:'spki'}).toString()})),expectedChallenge:challenge,expectedActionId:actionId,expectedSourceId:sourceId});
 }});
}
export async function replayAuthenticatedAcquisitionPath(input={}){
 const {authenticatedReceiptsText,authenticatedReceiptsPin,trustedKeys}=input;
 if(typeof authenticatedReceiptsText!=='string'||await casePin(authenticatedReceiptsText)!==authenticatedReceiptsPin)fail('BUNDLE_PIN');
 const x=parseUniqueJson(authenticatedReceiptsText,{maxChars:262144,maxDepth:8});
 if(!keys(x,['version','tracePin','receipts'])||x.version!==1||x.tracePin!==input.tracePin||!Array.isArray(x.receipts)||x.receipts.length>6)fail('BUNDLE');
 const verified=[];for(const row of x.receipts){if(!keys(row,['receiptText','receiptPin']))fail('BUNDLE');verified.push(await verifyAuthenticatedObservation({receiptText:row.receiptText,receiptPin:row.receiptPin,trustedKeys}));}
 const sourceEnvelope={version:1,tracePin:x.tracePin,receipts:verified.map(v=>({actionId:v.body.actionId,outcome:v.body.outcome,sourceId:v.body.sourceId,sourceText:v.body.sourceText,sourcePin:v.body.sourcePin,start:v.body.start,end:v.body.end}))};
 const receiptsText=JSON.stringify(sourceEnvelope),receiptsPin=await casePin(receiptsText),path=await replaySourceBoundAcquisitionPath({...input,receiptsText,receiptsPin});
 return Object.freeze({version:1,authenticatedReceiptsPin,path,signers:[...new Set(verified.map(v=>v.keyId))].sort(),observationAuthentication:'ED25519_SIGNER_VERIFIED',decisionAuthority:'NONE',qualification:'Every declared path observation has a valid signer-bound receipt over exact challenged source bytes. This authenticates the configured signer, not the real-world correctness, independence or applicability of the measurement.'});
}
