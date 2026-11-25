import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin,pinnedInvestigationExport} from '../pinned-investigation.js';
import {createAlignedCapsule,verifyAlignedCapsule,alignedCapsuleDigest,MAX_ALIGNED_CAPSULE_BYTES} from '../aligned-capsule.js';
const enc=s=>new TextEncoder().encode(s),dec=b=>new TextDecoder().decode(b),wire=JSON.stringify;
test('same model, different valid histories: two pins have distinct meanings',async()=>{
 const f=await capacityExample(),old=await createAlignedCapsule(f.caseText,f.pin,'[]'),now=await createAlignedCapsule(f.caseText,f.pin,wire([f.reads.read_meter,f.reads.read_capacity]));
 assert.equal((await verifyAlignedCapsule(old.bytes,old.expectedDigest,f.pin)).conclusion,'UNDERDETERMINED');
 assert.equal((await verifyAlignedCapsule(now.bytes,now.expectedDigest,f.pin)).conclusion,'REFUTED');
 assert.notEqual(old.expectedDigest,now.expectedDigest);assert.equal(old.caseDigest,now.caseDigest);
 assert.equal((await verifyAlignedCapsule(old.bytes,now.expectedDigest,f.pin)).reason,'PIN_MISMATCH');
 assert.equal((await verifyAlignedCapsule(now.bytes,now.expectedDigest,'sha256:'+'0'.repeat(64))).reason,'CASE_PIN_MISMATCH');
 assert.equal((await verifyAlignedCapsule(now.bytes,now.expectedDigest,'')).reason,'CASE_PIN_REQUIRED');
 assert.equal((await verifyAlignedCapsule(now.bytes,'',f.pin)).reason,'PIN_REQUIRED');
 assert.deepEqual((await createAlignedCapsule(f.caseText,f.pin,wire([f.reads.read_meter,f.reads.read_capacity]))).bytes,now.bytes);
 const copy=Uint8Array.from(now.bytes);const pending=verifyAlignedCapsule(copy,now.expectedDigest,f.pin);copy.fill(0);assert.equal((await pending).status,'VERIFIED');
});
test('rehashed semantic forgery, downgrade, case substitution and invalid event refuse',async()=>{
 const f=await capacityExample(),cap=await createAlignedCapsule(f.caseText,f.pin,wire([f.reads.read_meter,f.reads.read_capacity]));
 for(const [mutate,reason] of [
  [b=>{b.investigation.result.state='SUPPORTED';},'REPLAY_MISMATCH'],
  [b=>{b.investigation.alignment.schemaDigest='sha256:'+'0'.repeat(64);},'REPLAY_MISMATCH'],
  [b=>{b.investigation.result.eventDigest='sha256:'+'0'.repeat(64);},'REPLAY_MISMATCH'],
  [b=>{b.investigation.eventText='[]';},'REPLAY_MISMATCH'],
  [b=>{b.investigation.eventText=b.investigation.eventText.replace('30/1','10/1');},'REPLAY_REFUSED'],
  [b=>{b.investigation.caseText+=' ';},'CASE_PIN_MISMATCH'],
  [b=>{b.investigation.version='sutra-pinned-investigation/v1';},'CAPSULE_SCHEMA'],
  [b=>{b.limitations=[];},'CAPSULE_SCHEMA']
 ]){
  const b=JSON.parse(dec(cap.bytes));mutate(b);const bytes=enc(wire(b)),pin=await alignedCapsuleDigest(bytes);
  assert.equal((await verifyAlignedCapsule(bytes,cap.expectedDigest,f.pin)).reason,'PIN_MISMATCH');
  assert.deepEqual(await verifyAlignedCapsule(bytes,pin,f.pin),{status:'REFUSED',reason});
 }
 const b=JSON.parse(dec(cap.bytes)),c=JSON.parse(f.caseText),g=JSON.parse(c.worlds[0].graphText);
 g.nodes.find(n=>n.id==='target').op='ge';c.worlds[0].graphText=wire(g);
 const newCase=wire(c),newPin=await casePin(newCase);
 const legacy=await pinnedInvestigationExport(newCase,newPin,b.investigation.eventText);
 b.investigation={...legacy,version:'sutra-aligned-investigation/v1',alignment:b.investigation.alignment};
 const bytes=enc(wire(b)),pin=await alignedCapsuleDigest(bytes);
 assert.equal((await verifyAlignedCapsule(bytes,pin,f.pin)).reason,'CASE_PIN_MISMATCH');
 assert.equal((await verifyAlignedCapsule(bytes,pin,newPin)).reason,'REPLAY_REFUSED');
});
test('strict bounded wire and one-byte restoration',async()=>{
 const f=await capacityExample(),cap=await createAlignedCapsule(f.caseText,f.pin,'[]');
 const altered=Uint8Array.from(cap.bytes),i=dec(altered).indexOf('synthetic_capacity');assert.ok(i>=0);altered[i]^=1;
 assert.equal((await verifyAlignedCapsule(altered,cap.expectedDigest,f.pin)).reason,'PIN_MISMATCH');
 assert.equal((await verifyAlignedCapsule(cap.bytes,cap.expectedDigest,f.pin)).status,'VERIFIED');
 for(const bytes of [enc('{"format":1,"format":2}'),Uint8Array.of(255),Uint8Array.from([239,187,191,...cap.bytes]),enc('{"x":"\\ud800"}'),enc('{"x":-0}')]){
  assert.equal((await verifyAlignedCapsule(bytes,await alignedCapsuleDigest(bytes),f.pin)).reason,'WIRE_REFUSED');
 }
 assert.equal((await verifyAlignedCapsule(new Uint8Array(MAX_ALIGNED_CAPSULE_BYTES+1),cap.expectedDigest,f.pin)).reason,'SIZE_OR_TYPE');
});

test('a new valid case and history with both new trusted pins is not a detected attack',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText),g=JSON.parse(c.worlds[0].graphText);
 g.nodes.find(n=>n.id==='load').value='11';c.worlds[0].graphText=wire(g);
 const caseText=wire(c),pin=await casePin(caseText),cap=await createAlignedCapsule(caseText,pin,'[]');
 assert.equal((await verifyAlignedCapsule(cap.bytes,cap.expectedDigest,f.pin)).reason,'CASE_PIN_MISMATCH');
 const ok=await verifyAlignedCapsule(cap.bytes,cap.expectedDigest,pin);
 assert.equal(ok.status,'VERIFIED');assert.equal(ok.conclusion,'UNDERDETERMINED');
 assert.match(ok.qualification,/not truth or freshness/);
});
