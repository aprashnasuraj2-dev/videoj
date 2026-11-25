import test from 'node:test';
import assert from 'node:assert/strict';
import {debuggerBaseline,debuggerCopies,debuggerRead} from '../conclusion-debugger.js';
import {createProofCapsule,verifyProofCapsule,capsuleDigest,mutateCapsuleByte,MAX_CAPSULE_BYTES} from '../proof-capsule.js';
const enc=s=>new TextEncoder().encode(s),dec=b=>new TextDecoder().decode(b);
const make=events=>createProofCapsule(JSON.stringify(events));
async function rebind(envelope,payload){
 envelope.payloadText=JSON.stringify(payload);
 envelope.payloadDigest=await capsuleDigest(enc(envelope.payloadText));
 const bytes=enc(JSON.stringify(envelope));return {bytes,pin:await capsuleDigest(bytes)};
}
const unpack=bytes=>{const envelope=JSON.parse(dec(bytes));return {envelope,payload:JSON.parse(envelope.payloadText)};};
test('exact portable bytes verify, one-byte attack and whitespace reject, exact restoration verifies',async()=>{
 const events=await debuggerBaseline(),cap=await make(events);
 const ok=await verifyProofCapsule(cap.bytes,cap.expectedDigest);
 assert.equal(ok.status,'VERIFIED');assert.equal(ok.result.claims.target.state,'SUPPORTED');
 const tampered=mutateCapsuleByte(cap.bytes);assert.equal(tampered.length,cap.bytes.length);
 assert.equal(tampered.reduce((n,b,i)=>n+Number(b!==cap.bytes[i]),0),1);
 assert.deepEqual(await verifyProofCapsule(tampered,cap.expectedDigest),{status:'REFUSED',reason:'PIN_MISMATCH'});
 assert.equal((await verifyProofCapsule(enc(dec(cap.bytes)+' '),cap.expectedDigest)).reason,'PIN_MISMATCH');
 assert.equal((await verifyProofCapsule(cap.bytes,'')).reason,'PIN_REQUIRED');
 assert.equal((await verifyProofCapsule(cap.bytes,cap.expectedDigest)).status,'VERIFIED');
 assert.deepEqual((await make(events)).bytes,cap.bytes);
});
test('even with a new pin, self-consistently rehashed forged result, source, case and lineage are refused',async()=>{
 const events=[...await debuggerBaseline(),await debuggerCopies(),await debuggerRead('read_b')],cap=await make(events);
 assert.equal((await verifyProofCapsule(cap.bytes,cap.expectedDigest)).result.claims.target.state,'CONFLICTED');
 for(const [mutate,reason] of [
  [p=>{p.state.result.claims.target.state='SUPPORTED';},'REPLAY_MISMATCH'],
  [p=>{p.state.result.declaredRoots=12;},'REPLAY_MISMATCH'],
  [p=>{p.state.events[0].sourceText=p.state.events[0].sourceText.replace('0/1','1/1');},'REPLAY_REFUSED'],
  [p=>{p.state.events[2].artifacts[0].text+=' ';},'REPLAY_REFUSED'],
  [p=>{p.caseText+=' ';},'CASE_ANCHOR_MISMATCH'],
  [p=>{p.computation.quantity='forged';},'PAYLOAD_SCHEMA'],
  [p=>{p.limitations=[];},'PAYLOAD_SCHEMA']
 ]){
  const {envelope,payload}=unpack(cap.bytes);mutate(payload);const bad=await rebind(envelope,payload);
  assert.equal((await verifyProofCapsule(bad.bytes,cap.expectedDigest)).reason,'PIN_MISMATCH');
  assert.deepEqual(await verifyProofCapsule(bad.bytes,bad.pin),{status:'REFUSED',reason});
 }
});
test('strict wire and snapshot safety; valid historical capsule is not proof of freshness',async()=>{
 const baseline=await debuggerBaseline(),old=await make(baseline),now=await make([...baseline,{type:'withdraw_lineage',lineage:'sample_one'}]);
 assert.equal((await verifyProofCapsule(old.bytes,old.expectedDigest)).status,'VERIFIED');
 assert.equal((await verifyProofCapsule(old.bytes,now.expectedDigest)).reason,'PIN_MISMATCH');
 assert.equal((await verifyProofCapsule(now.bytes,now.expectedDigest)).result.claims.target.state,'UNDERDETERMINED');
 const bytes=Uint8Array.from(old.bytes),pending=verifyProofCapsule(bytes,old.expectedDigest);bytes.fill(0);
 assert.equal((await pending).status,'VERIFIED','verifier snapshots mutable input before awaiting');
 assert.equal((await verifyProofCapsule(new Uint8Array(MAX_CAPSULE_BYTES+1),old.expectedDigest)).reason,'SIZE_OR_TYPE');
 assert.equal((await verifyProofCapsule([],old.expectedDigest)).reason,'SIZE_OR_TYPE');
 const malformed=enc('{"format":"sutra-proof-capsule/v1","format":"sutra-proof-capsule/v1"}');
 assert.equal((await verifyProofCapsule(malformed,await capsuleDigest(malformed))).reason,'WIRE_REFUSED');
 const badUtf=Uint8Array.of(255,254);assert.equal((await verifyProofCapsule(badUtf,await capsuleDigest(badUtf))).reason,'WIRE_REFUSED');
 const {envelope,payload}=unpack(old.bytes);envelope.payloadText=JSON.stringify(payload)+' ';
 const altered=enc(JSON.stringify(envelope));assert.equal((await verifyProofCapsule(altered,await capsuleDigest(altered))).reason,'PAYLOAD_MISMATCH');
 const bom=Uint8Array.from([239,187,191,...old.bytes]);assert.equal((await verifyProofCapsule(bom,await capsuleDigest(bom))).reason,'WIRE_REFUSED');
});
test('maximum valid event history remains portable within the declared bound',async()=>{
 let events=await debuggerBaseline();
 for(let i=0;i<5;i++)events.push(await debuggerCopies(),{type:'withdraw_lineage',lineage:'sample_one'},{type:'restore_lineage',lineage:'sample_one'},await debuggerRead('read_a'));
 events.push(await debuggerCopies(),await debuggerRead('read_b'));
 assert.equal(events.length,24);const cap=await make(events);
 assert.ok(cap.bytes.length<MAX_CAPSULE_BYTES);assert.equal((await verifyProofCapsule(cap.bytes,cap.expectedDigest)).status,'VERIFIED');
 await assert.rejects(make([...events,await debuggerRead('read_c')]));
});
