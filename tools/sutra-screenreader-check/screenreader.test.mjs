import test from 'node:test';import assert from 'node:assert/strict';import {validateAssistiveTechRecord} from './screenreader.mjs';
const row=(status='pass',detail='')=>({status,detail});
const base=()=>({schema:1,recordId:'A01',humanAttested:true,attestation:'A human observer completed this record while operating the stated screen reader with SUTRA; automated accessibility output alone was not used as acceptance evidence.',assistiveTech:'voiceover-ios',assistiveTechVersion:'fixture',platform:'iOS fixture',browser:'Mobile Safari',browserVersion:'fixture',sourceRevision:'a'.repeat(40),observedAt:'2026-11-24T00:00:00Z',checks:{landmarksHeadings:row(),controlNames:row(),journeyNavigation:row(),transcriptSearch:row(),cueSeekFeedback:row(),comparisonStateAnnouncement:row(),writtenSourceIntegrityFeedback:row(),consentDialogContext:row(),consentFocusReturn:row(),reviewPreviewContext:row(),reviewSaveFeedback:row(),errorAndDeniedStates:row(),languageSwitchContext:row('not_applicable','Only English acceptance was performed in this fixture.')},notes:'Synthetic unit record only.'});
test('complete human-attested core record passes while preserving non-core not-applicable state',()=>{
 const r=validateAssistiveTechRecord(base());assert.equal(r.acceptanceResult,'pass');assert.deepEqual(r.notApplicable,['languageSwitchContext']);assert.match(r.recordHash,/^[a-f0-9]{64}$/);
});
test('untested or failed core interaction blocks acceptance and remains named',()=>{
 for(const [key,status,detail] of [['comparisonStateAnnouncement','untested',''],['consentFocusReturn','fail','Focus did not return to initiating control.']]){
  const x=base();x.checks[key]=row(status,detail);const r=validateAssistiveTechRecord(x);assert.equal(r.acceptanceResult,'fail');assert.ok(r.blockers.includes(key));
 }
});
test('automated-only/missing human attestation, unsupported AT and timezone-free observations fail closed',()=>{
 for(const mutate of [x=>x.humanAttested=false,x=>x.attestation='axe passed',x=>x.assistiveTech='automated-audit',x=>x.observedAt='2026-11-24T00:00:00',x=>x.email='private@example.com']){
  const x=base();mutate(x);assert.throws(()=>validateAssistiveTechRecord(x));
 }
});
test('fail and not-applicable statuses require a visible explanation',()=>{
 for(const status of ['fail','not_applicable']){const x=base();x.checks.writtenSourceIntegrityFeedback=row(status,'');assert.throws(()=>validateAssistiveTechRecord(x));}
});
