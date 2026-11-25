import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,draftComparisonProposal} from '../reviewed-draft.js';
import {FACETS} from '../semantic-investigation.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {restoreReviewedSourceDraft,reviseReviewedSourceDraft,withdrawReviewedSourceDraft} from '../source-draft-restore.js';
async function fixture(){
 const text='測定 🧪 A: 12.50; repeat: 12.50;',b='Site B: 10.25;';
 const start=text.lastIndexOf('12.50'),type={kind:'stress',unit:'MPa',scope:'same_condition',dimension:[-1,1,-2]};
 const draft={version:1,question:'Is A higher than B?',sources:[{id:'a',lineage:'root_a',text},{id:'b',lineage:'root_b',text:b}],bindings:[{id:'a',sourceId:'a',start,end:start+5,type},{id:'b',sourceId:'b',start:8,end:13,type}]};
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify(draft));
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:[{id:'higher',proposalText:await draftComparisonProposal(contractText,pin,'a','b','gt')},{id:'lower',proposalText:await draftComparisonProposal(contractText,pin,'a','b','lt')}]});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates:['higher','lower'].map(id=>({id,meaning:id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}))});
 return {draft,v:await sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)})};
}
test('restores original UTF-16 selection, exact source bytes and candidate identities',async()=>{
 const {draft,v}=await fixture(),r=await restoreReviewedSourceDraft(v.versionText,v.digest);
 assert.deepEqual(r.draft,draft);assert.equal(r.exactContractBytes,true);
 assert.equal(r.originalContractDigest,r.reconstructedContractDigest);
 assert.deepEqual(r.historicalCandidates.map(x=>x.id),['higher','lower']);
 await assert.rejects(restoreReviewedSourceDraft(v.versionText,'sha256:'+'0'.repeat(64)),/REVISION_PIN/);
});
test('source correction invalidates all changed-source bindings and retains unaffected exact offsets',async()=>{
 const {draft,v}=await fixture(),restored=await restoreReviewedSourceDraft(v.versionText,v.digest);
 const r=await reviseReviewedSourceDraft(JSON.stringify(restored.draft),'b','Site B: 14.25;');
 assert.deepEqual(r.invalidatedBindingIds,['b']);assert.deepEqual(r.retainedBindingIds,['a']);assert.deepEqual(r.draft.bindings,[draft.bindings[0]]);
 assert.equal(r.draft.sources[1].lineage,'root_b');assert.deepEqual(restored.draft,draft);
 await assert.rejects(reviseReviewedSourceDraft(JSON.stringify(draft),'b',draft.sources[1].text),/SOURCE_CHANGE_REQUIRED/);
 await assert.rejects(reviseReviewedSourceDraft(JSON.stringify(draft),'b','new\r\ntext'),/TEXTAREA_PROFILE/);
});

test('pinned withdrawal removes only selected source and its exact bindings; preserves historical version and same-lineage evidence',async()=>{
 const {draft,v}=await fixture();
 draft.sources[1].lineage=draft.sources[0].lineage;
 const wire=JSON.stringify(draft),oldPin=await casePin(draft.sources[0].text),before=await sealReviewedDraft(wire);
 const r=await withdrawReviewedSourceDraft(wire,'a',oldPin);
 assert.equal(r.previousContractDigest,before.pin);assert.notEqual(r.contractPin,before.pin);
 assert.deepEqual(r.invalidatedBindingIds,['a']);assert.deepEqual(r.retainedBindingIds,['b']);assert.deepEqual(r.retainedSourceIds,['b']);
 assert.deepEqual(r.draft.sources,[draft.sources[1]]);assert.deepEqual(r.draft.bindings,[draft.bindings[1]]);
 assert.equal(r.decisionAuthority,'NONE');assert.ok(Object.isFrozen(r.draft.sources));
 assert.deepEqual(JSON.parse(wire),draft);assert.equal((await sealReviewedDraft(JSON.stringify(r.draft))).pin,r.contractPin);
 const historical=await restoreReviewedSourceDraft(v.versionText,v.digest);
 assert.deepEqual(historical.historicalCandidates.map(x=>x.id),['higher','lower']);
 assert.equal(historical.draft.sources.length,2);
 await assert.rejects(withdrawReviewedSourceDraft(wire,'a',await casePin('wrong')),/RESTORE_WITHDRAW_SOURCE_PIN/);
 await assert.rejects(withdrawReviewedSourceDraft(wire,'missing',oldPin),/RESTORE_WITHDRAW_SOURCE_PIN/);
 await assert.rejects(withdrawReviewedSourceDraft(wire,'question',await casePin(draft.question)),/RESTORE_WITHDRAW_SOURCE_PIN/);
 await assert.rejects(withdrawReviewedSourceDraft(JSON.stringify(r.draft),'a',oldPin),/RESTORE_WITHDRAW_SOURCE_PIN/);
 const last=await withdrawReviewedSourceDraft(JSON.stringify(r.draft),'b',await casePin(draft.sources[1].text));
 assert.deepEqual(last.draft.sources,[]);assert.deepEqual(last.draft.bindings,[]);assert.equal(last.draft.question,draft.question);
});
