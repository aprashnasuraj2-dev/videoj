import test from 'node:test';
import assert from 'node:assert/strict';
import {makeEvidencePinCard,readEvidencePinCard} from '../evidence-checkpoint-pins.js';
const pins=Array.from({length:6},(_,i)=>'sha256:'+String(i).repeat(64));
test('separate revision and recovery cards round-trip only their named pin profile',()=>{
 for(const [mode,n] of [['revision',4],['recovery',6]]){
  const values=pins.slice(0,n),text=makeEvidencePinCard(mode,values);
  assert.deepEqual(readEvidencePinCard(text),{mode,values});
  assert.equal(Object.isFrozen(readEvidencePinCard(text).values),true);
  assert.deepEqual(readEvidencePinCard(JSON.stringify(JSON.parse(text))),{mode,values});
 }
 assert.throws(()=>makeEvidencePinCard('revision',pins),/FIELDS/);
 assert.throws(()=>makeEvidencePinCard('recovery',Array(6)),/FIELDS/);
});
test('reject duplicate keys, embedded reports, changed profiles, missing and malformed pins, oversized input',()=>{
 const text=makeEvidencePinCard('recovery',pins);
 for(const alter of [
  p=>{p.mode='revision';},p=>{p.profile='other';},p=>{p.report={};},
  p=>{p.pins.recoveredDigest='sha256:'+ 'A'.repeat(64);},p=>{delete p.pins.revisedDigest;},
  p=>{p.pins.extra=pins[0];},p=>{p.pins=null;}
 ]){
  const p=JSON.parse(text);alter(p);assert.throws(()=>readEvidencePinCard(JSON.stringify(p)));
 }
 assert.throws(()=>readEvidencePinCard(text.replace('"mode": "recovery"','"mode":"revision","mode":"recovery"')));
 assert.throws(()=>readEvidencePinCard('🧪'.repeat(600)),/SIZE/);
});
