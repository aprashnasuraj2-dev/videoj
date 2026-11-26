import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {selectedSpan} from '../reviewed-draft.js';
import {prepareEvidenceRevision} from '../evidence-revision-transaction.js';
import {prepareEvidenceRecovery,exportEvidenceRecovery,openEvidenceRecovery} from '../evidence-recovery.js';
import {replayInvestigationVersion,createInvestigationReplaySession,createFreshInvestigationReplaySession} from '../investigation-revision.js';
const contract=v=>JSON.parse(JSON.parse(v.versionText).contractText);
const source=(v,id)=>contract(v).sources.find(s=>s.id===id);
const missing=(v,id)=>({kind:'withdraw',sourceId:id,previousDigest:source(v,id).digest});
function selection(sourceId,text,bindingId,token){const start=text.indexOf(token);return {bindingId,span:selectedSpan(sourceId,text,start,start+token.length)};}
async function replace(parent,id,text,rebindings){return {kind:'replace',sourceId:id,previousDigest:source(parent,id).digest,replacementText:text,replacementDigest:await casePin(text),rebindings};}
async function revision(parent,operations){
 const text=JSON.stringify({version:1,parentDigest:parent.digest,operations}),pin=await casePin(text);
 return {text,pin,result:await prepareEvidenceRevision(parent.versionText,parent.digest,text,pin)};
}
async function restore(id,text,rebindings){return {kind:'restore_source',sourceId:id,sourceText:text,sourceDigest:await casePin(text),rebindings};}
async function args(a,r,restorations){
 const current=r.result.child.digest,plan=JSON.stringify({version:1,parentDigest:current,revisionPlanDigest:r.pin,restorations});
 return [a.versionText,a.digest,r.text,r.pin,current,plan,await casePin(plan)];
}
const states=r=>r.report.investigation.candidates.map(c=>c.computation?.status??'REFUSED');
test('withdrawn source recovered with explicit selections; no old meaning link revives',async()=>{
 const a=await livingFixture(),r=await revision(a,[missing(a,'secondary')]),text='訂正 🧪 Cash before: 30; after: 20';
 const op=await restore('secondary',text,[selection('secondary',text,'second','20'),selection('secondary',text,'other','30')]);
 const x=await prepareEvidenceRecovery(...await args(a,r,[op]));
 assert.deepEqual(x.recoveredBindingIds,['other','second']);assert.deepEqual(x.restoredSourceIds,['secondary']);assert.deepEqual(x.stillMissingBindingIds,[]);
 assert.deepEqual(states(x.child),['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED']);
 assert.deepEqual(x.changes.map(c=>c.classification),['NO_RECOVERY_DEPENDENCY','TARGET_INPUT_RECOVERED']);
 assert.equal(x.child.report.investigation.candidates[1].facets.definition.status,'UNSUPPORTED_DECLARATION');
 assert.equal(source(x.child,'secondary').lineage,source(a,'secondary').lineage);
 assert.equal(x.child.report.previousDigest,r.result.child.digest);
 assert.deepEqual(await replayInvestigationVersion(a.versionText,a.digest),a.report);
 assert.deepEqual(await replayInvestigationVersion(r.result.child.versionText,r.result.child.digest),r.result.child.report);
 const incremental=createInvestigationReplaySession(),fresh=createFreshInvestigationReplaySession();
 for(const v of [a,r.result.child,x.child]){
  const i=await incremental.replay(v.versionText,v.digest),f=await fresh.replay(v.versionText,v.digest);assert.deepEqual(i.report,f.report);
 }
});
test('recover an omitted binding from a current corrected source without changing source bytes',async()=>{
 const a=await livingFixture('engineering'),text='Capacity 60; demand 80';
 const r=await revision(a,[await replace(a,'secondary',text,[selection('secondary',text,'second','60')])]);
 const op={kind:'reselect_missing',sourceId:'secondary',sourceDigest:await casePin(text),rebindings:[selection('secondary',text,'other','80')]};
 const x=await prepareEvidenceRecovery(...await args(a,r,[op]));
 assert.deepEqual(x.recoveredBindingIds,['other']);assert.deepEqual(x.restoredSourceIds,[]);
 assert.deepEqual(source(x.child,'secondary'),source(r.result.child,'secondary'));
 assert.deepEqual(states(x.child),['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED']);
 assert.equal(x.child.report.investigation.candidates[1].facets.definition.status,'UNSUPPORTED_DECLARATION');
});
test('partial recovery leaves a real missing input and two-source order does not change child bytes',async()=>{
 const a=await livingFixture(),r=await revision(a,[missing(a,'primary'),missing(a,'secondary')]);
 const p='Revenue 120; before 100',s='Cash 40; before 30';
 const op1=await restore('primary',p,[selection('primary',p,'first','120')]),op2=await restore('secondary',s,[selection('secondary',s,'second','40'),selection('secondary',s,'other','30')]);
 const x=await prepareEvidenceRecovery(...await args(a,r,[op1,op2])),y=await prepareEvidenceRecovery(...await args(a,r,[op2,op1]));
 assert.deepEqual(x.stillMissingBindingIds,['baseline']);assert.deepEqual(states(x.child),['BLOCKED_MISSING_INPUT','CONDITIONALLY_SATISFIED']);
 assert.equal(x.child.versionText,y.child.versionText);assert.deepEqual(x.impact,y.impact);
});
test('fail closed on wrong parent, stale recovery pin, cross-source binding, forged span and duplicate restoration',async()=>{
 const a=await livingFixture(),r=await revision(a,[missing(a,'secondary')]),text='Cash 40; before 30';
 const op=await restore('secondary',text,[selection('secondary',text,'second','40')]),valid=await args(a,r,[op]);
 await assert.rejects(prepareEvidenceRecovery(...valid.slice(0,6),'sha256:'+'0'.repeat(64)),/EVIDENCE_RECOVERY_PIN/);
 const wrong=structuredClone(valid);wrong[4]=a.digest;const plan=JSON.parse(wrong[5]);plan.parentDigest=a.digest;wrong[5]=JSON.stringify(plan);wrong[6]=await casePin(wrong[5]);
 await assert.rejects(prepareEvidenceRecovery(...wrong),/EVIDENCE_RECOVERY_PARENT/);
 const cross=structuredClone(op);cross.rebindings[0].bindingId='first';
 const forged=structuredClone(op);forged.rebindings[0].span.quote='99';
 const stale={...op,sourceDigest:'sha256:'+'0'.repeat(64)};
 for(const [ops,err] of [[[cross],/REBINDING_SCOPE/],[[forged],/COMPILER_QUOTE_MISMATCH/],[[op,op],/SOURCE_SCOPE/],[[stale],/RESTORE_SOURCE/]]){
  await assert.rejects(prepareEvidenceRecovery(...await args(a,r,ops)),err);
 }
 assert.deepEqual(await replayInvestigationVersion(r.result.child.versionText,r.result.child.digest),r.result.child.report);
});

test('reopen exact recovery with independent final child pin; reject repinned summaries and nested mutations',async()=>{
 const a=await livingFixture(),r=await revision(a,[missing(a,'secondary')]),text='訂正 🧪 Cash 40; before 30';
 const op=await restore('secondary',text,[selection('secondary',text,'second','40')]);
 const e=await exportEvidenceRecovery(...await args(a,r,[op]));
 assert.equal(e.portable,true);
 const b=JSON.parse(e.bundleText),pins=[e.snapshotPin,a.digest,r.pin,r.result.child.digest,b.recoveryPlanDigest,e.recovery.child.digest];
 const reopened=await openEvidenceRecovery(e.bundleText,...pins);
 assert.deepEqual(reopened.ancestor,a);assert.deepEqual(reopened.prior.revision,r.result);assert.deepEqual(reopened.exported,e);
 assert.equal(Object.isFrozen(reopened.exported.recovery.child),true);
 assert.deepEqual(e.recovery.stillMissingBindingIds,['other']);
 for(let i=0;i<pins.length;i++){
  const wrong=pins.slice();wrong[i]='sha256:'+'0'.repeat(64);
  await assert.rejects(openEvidenceRecovery(e.bundleText,...wrong),/IMPORT_(PIN|SCOPE)/);
 }
 for(const mutate of [
  x=>{x.stillMissingBindingIds=[];},
  x=>{x.decisionAuthority='APPROVED';},
  x=>{x.childVersion=x.priorTransactionText;},
  x=>{x.changes[0].classification='TARGET_INPUT_RECOVERED';}
 ]){
  const x=JSON.parse(e.bundleText);mutate(x);const wire=JSON.stringify(x);
  await assert.rejects(openEvidenceRecovery(wire,await casePin(wire),...pins.slice(1)),/IMPORT_REPLAY/);
 }
 const nested=JSON.parse(e.bundleText),p=JSON.parse(nested.priorTransactionText);
 p.missingBindingIds=[];nested.priorTransactionText=JSON.stringify(p);nested.priorTransactionDigest=await casePin(nested.priorTransactionText);
 const wire=JSON.stringify(nested);
 await assert.rejects(openEvidenceRecovery(wire,await casePin(wire),...pins.slice(1)),/IMPORT_REPLAY/);
 const pretty=JSON.stringify(b,null,2);
 await assert.rejects(openEvidenceRecovery(pretty,await casePin(pretty),...pins.slice(1)),/IMPORT_REPLAY/);
 await assert.rejects(openEvidenceRecovery('🧪'.repeat(70000),...pins),/IMPORT_SIZE/);
 assert.deepEqual(await replayInvestigationVersion(r.result.child.versionText,r.result.child.digest),r.result.child.report);
});
