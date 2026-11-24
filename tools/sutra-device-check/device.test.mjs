import test from 'node:test';import assert from 'node:assert/strict';import {validatePhysicalDeviceRecord} from './device.mjs';
const row=(status='pass',detail='')=>({status,detail});
const base=()=>({schema:1,deviceId:'D01',physicalAttested:true,attestation:'This record was observed on a physical touch device, not an emulator or desktop-engine approximation.',
 platform:'ios',osVersion:'iOS fixture version',browser:'Mobile Safari',browserVersion:'fixture version',sourceRevision:'a'.repeat(40),mediaHash:'b'.repeat(64),observedAt:'2026-11-24T00:00:00Z',
 checks:{pageLoad:row(),directLookup:row(),mediaDecode:row(),playPause:row(),nativeSeek:row(),captions:row(),fullscreen:row('unsupported','Fixture browser reports no tested fullscreen path.'),consentDeny:row(),reviewPreviewSave:row(),reviewExport:row(),narrowScroll:row(),touchTargets:row(),errorRecovery:row()},notes:'Synthetic unit record only.'});
test('complete physical record can pass core touch flow while preserving non-core unsupported capability',()=>{
 const r=validatePhysicalDeviceRecord(base());assert.equal(r.coreTouchResult,'pass');assert.deepEqual(r.unsupported,['fullscreen']);assert.deepEqual(r.failures,[]);assert.match(r.recordHash,/^[a-f0-9]{64}$/);
});
test('core failure blocks physical touch result and is never averaged away',()=>{
 const x=base();x.checks.nativeSeek=row('fail','Native seek did not reach the selected cue.');const r=validatePhysicalDeviceRecord(x);
 assert.equal(r.coreTouchResult,'fail');assert.deepEqual(r.coreFailures,['nativeSeek']);assert.deepEqual(r.failures,['nativeSeek']);
});
test('untested core check, emulator-like missing attestation and hidden fields fail or remain non-pass',()=>{
 const x=base();x.checks.touchTargets=row('untested','');assert.equal(validatePhysicalDeviceRecord(x).coreTouchResult,'fail');
 for(const mutate of [r=>r.physicalAttested=false,r=>r.attestation='emulator',r=>r.observedAt='2026-11-24T00:00:00',r=>r.email='private@example.com']){
  const r=base();mutate(r);assert.throws(()=>validatePhysicalDeviceRecord(r));
 }
});
test('failed or unsupported statuses require a visible detail',()=>{
 for(const status of ['fail','unsupported']){const x=base();x.checks.captions=row(status,'');assert.throws(()=>validatePhysicalDeviceRecord(x),/captions/);}
});
