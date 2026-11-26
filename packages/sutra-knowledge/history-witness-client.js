// External monotonic witness adapter for the caller-owned history store.
// Wire-compatible with action-protocol AuthorityWitness. The witness key/state
// must live in an independently protected trust domain for rollback resistance.
import {createHash,createPrivateKey,createPublicKey,randomBytes as systemRandom,sign as edSign,verify as edVerify} from 'node:crypto';
const PIN=/^sha256:[a-f0-9]{64}$/;
const MEDIA='application/octet-stream';
const VIEW_SIZE=4+32+32+64,ATTEST_SIZE=32+VIEW_SIZE+64,TRANSITION_SIZE=32+32+64;
const VIEW_DOMAIN=Buffer.from('SUTRA/shared-authority-witness-view/v1\0');
const TRANSITION_DOMAIN=Buffer.from('SUTRA/shared-authority-witness-transition/v1\0');
const ATTEST_DOMAIN=Buffer.from('SUTRA/shared-authority-witness-attestation/v1\0');
export class HistoryWitnessError extends Error{constructor(code){super('History witness refused ('+code+').');this.name='HistoryWitnessError';this.code=code;}}
const fail=c=>{throw new HistoryWitnessError(c);};
const digestBytes=pin=>{if(typeof pin!=='string'||!PIN.test(pin))fail('PIN');return Buffer.from(pin.slice(7),'hex');};
const pinBytes=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const digestPin=bytes=>'sha256:'+Buffer.from(bytes).toString('hex');
const b64=bytes=>Buffer.from(bytes).toString('base64url');
const unb64=text=>{if(typeof text!=='string'||!/^[A-Za-z0-9_-]+$/.test(text))fail('VIEW');const b=Buffer.from(text,'base64url');if(b64(b)!==text)fail('VIEW');return b;};
const rawPublic=key=>{
 const k=createPublicKey(key);if(k.asymmetricKeyType!=='ed25519')fail('KEY');
 const der=k.export({format:'der',type:'spki'});if(der.length<32)fail('KEY');return {key:k,raw:Buffer.from(der).subarray(-32)};
};
const privateKey=key=>{const k=createPrivateKey(key);if(k.asymmetricKeyType!=='ed25519')fail('KEY');return k;};
const viewMessage=(ctx,authority,body)=>Buffer.concat([VIEW_DOMAIN,ctx,authority,body]);
const attestationMessage=(ctx,authority,challenge,view)=>Buffer.concat([ATTEST_DOMAIN,ctx,authority,challenge,view]);
const transitionMessage=(ctx,before,after)=>Buffer.concat([TRANSITION_DOMAIN,ctx,before,after]);
function parseView(bytes,{context,authority,witness,genesis}){
 const b=Buffer.from(bytes);if(b.length!==VIEW_SIZE)fail('VIEW');
 const body=b.subarray(0,68),signature=b.subarray(68),sequence=body.readUInt32BE(0),g=body.subarray(4,36),head=body.subarray(36,68);
 if(!g.equals(genesis)||sequence===0!==head.equals(g)||!edVerify(null,viewMessage(context,authority.raw,body),witness.key,signature))fail('VIEW');
 return Object.freeze({sequence,genesisPin:digestPin(g),headPin:digestPin(head),viewBytes:b64(b),viewPin:pinBytes(b)});
}
function trustedShape(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==5||!Number.isSafeInteger(x.sequence)||x.sequence<0||!PIN.test(x.genesisPin)||!PIN.test(x.headPin)||!PIN.test(x.viewPin)||typeof x.viewBytes!=='string')fail('TRUSTED_VIEW');
}
function sameTrusted(a,b){return a.sequence===b.sequence&&a.genesisPin===b.genesisPin&&a.headPin===b.headPin&&a.viewPin===b.viewPin&&a.viewBytes===b.viewBytes;}
function verifyTrusted(x,keys){
 trustedShape(x);const parsed=parseView(unb64(x.viewBytes),keys);if(!sameTrusted(x,parsed))fail('TRUSTED_VIEW');return parsed;
}
function endpointOrigin(origin){
 let u;try{u=new URL(origin);}catch{fail('ORIGIN');}
 if(u.username||u.password||u.search||u.hash||u.pathname!=='/'&&u.pathname!=='')fail('ORIGIN');
 const loop=['127.0.0.1','localhost','[::1]'].includes(u.hostname);
 if(u.protocol!=='https:'&&!(u.protocol==='http:'&&loop))fail('ORIGIN');
 return u.origin;
}
async function post(fetchImpl,url,body,expected){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const r=await fetchImpl(url,{method:'POST',headers:{'content-type':MEDIA,'accept':MEDIA,'cache-control':'no-store'},body,signal:controller.signal,redirect:'error'});
  if(r.status!==200||r.headers.get('content-type')!==MEDIA)fail(r.status===409?'WITNESS_CONFLICT':'TRANSPORT');
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length!==expected)fail('TRANSPORT');return bytes;
 }catch(e){if(e instanceof HistoryWitnessError)throw e;fail('TRANSPORT');}
 finally{clearTimeout(timer);}
}
export function createHistoryWitnessClient({origin,contextPin,genesisPin,authorityPublicKey,authorityPrivateKey,witnessPublicKey,fetchImpl=globalThis.fetch,randomBytes=systemRandom}={}){
 if(typeof fetchImpl!=='function'||typeof randomBytes!=='function')fail('CONFIG');
 const base=endpointOrigin(origin),context=digestBytes(contextPin),genesis=digestBytes(genesisPin),authority=rawPublic(authorityPublicKey),witness=rawPublic(witnessPublicKey),signer=privateKey(authorityPrivateKey);
 if(!createPublicKey(signer).export({format:'der',type:'spki'}).equals(authority.key.export({format:'der',type:'spki'})))fail('KEY');
 const keys={context,authority,witness,genesis};
 const challenge=()=>{const b=Buffer.from(randomBytes(32));if(b.length!==32||b.equals(Buffer.alloc(32)))fail('RANDOM');return b;};
 const attest=async()=>{
  const nonce=challenge(),raw=await post(fetchImpl,base+'/witness/view',nonce,ATTEST_SIZE),seen=raw.subarray(0,32),view=raw.subarray(32,32+VIEW_SIZE),signature=raw.subarray(32+VIEW_SIZE);
  if(!seen.equals(nonce)||!edVerify(null,attestationMessage(context,authority.raw,nonce,view),witness.key,signature))fail('ATTESTATION');
  return parseView(view,keys);
 };
 const advance=async(beforePin,afterPin)=>{
  const before=digestBytes(beforePin),after=digestBytes(afterPin);if(before.equals(after))fail('TRANSITION');
  const sig=edSign(null,transitionMessage(context,before,after),signer),wire=Buffer.concat([before,after,sig]);if(wire.length!==TRANSITION_SIZE)fail('TRANSITION');
  return parseView(await post(fetchImpl,base+'/witness',wire,VIEW_SIZE),keys);
 };
 return Object.freeze({attest,advance,verifyTrusted:view=>verifyTrusted(view,keys)});
}
export function openExternallyWitnessedHistoryStore({store,witness}={}){
 if(!store||typeof store.read!=='function'||typeof store.append!=='function'||!witness||typeof witness.attest!=='function'||typeof witness.advance!=='function'||typeof witness.verifyTrusted!=='function')fail('CONFIG');
 const fresh=async(expectedHead,trusted)=>{
  const known=witness.verifyTrusted(trusted);if(known.headPin!==expectedHead)fail('TRUSTED_HEAD');
  const live=await witness.attest();if(!sameTrusted(known,live))fail(live.sequence<known.sequence?'WITNESS_ROLLBACK':'WITNESS_ADVANCED');
  if(live.headPin!==expectedHead)fail('WITNESS_HEAD');return {known,live};
 };
 return Object.freeze({
  async readFresh({expectedHead,trustedView}={}){await fresh(expectedHead,trustedView);return Object.freeze({history:await store.read(expectedHead),witness:trustedView});},
  async appendFresh({expectedHead,nextText,nextPin,trustedView}={}){
   const {known}=await fresh(expectedHead,trustedView);
   const history=await store.append({expectedHead,nextText,nextPin});
   let next;
   try{next=await witness.advance(expectedHead,nextPin);}catch(e){const err=new HistoryWitnessError('ADVANCE_AMBIGUOUS');err.cause=e;throw err;}
   if(next.sequence!==known.sequence+1||next.headPin!==nextPin||next.genesisPin!==known.genesisPin)fail('ADVANCE_VIEW');
   return Object.freeze({history,witness:next});
  },
  async recoverAfterAmbiguousAdvance({beforePin,expectedHead,trustedView}={}){
   const known=witness.verifyTrusted(trustedView);if(known.headPin!==beforePin||beforePin===expectedHead)fail('TRUSTED_HEAD');const live=await witness.attest();
   if(live.genesisPin!==known.genesisPin)fail('WITNESS_RESET');
   if(sameTrusted(live,known)){
    const history=await store.read(expectedHead);
    const next=await witness.advance(beforePin,expectedHead);
    if(next.sequence!==known.sequence+1||next.headPin!==expectedHead)fail('ADVANCE_VIEW');
    return Object.freeze({history,witness:next,recovery:'ADVANCED_NOW'});
   }
   if(live.sequence===known.sequence+1&&live.headPin===expectedHead){
    const history=await store.read(expectedHead);return Object.freeze({history,witness:live,recovery:'ADVANCE_ALREADY_OBSERVED'});
   }
   fail(live.sequence<=known.sequence?'WITNESS_ROLLBACK':'WITNESS_DIVERGED');
  }
 });
}
