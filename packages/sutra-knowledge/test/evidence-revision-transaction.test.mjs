import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {selectedSpan} from '../reviewed-draft.js';
import {replayInvestigationVersion,sealInvestigationVersion,createInvestigationReplaySession} from '../investigation-revision.js';
import {prepareEvidenceRevision,exportEvidenceRevision} from '../evidence-revision-transaction.js';
const contract=v=>JSON.parse(JSON.parse(v.versionText).contractText);
const source=(v,id)=>contract(v).sources.find(s=>s.id===id);
const withdraw=(v,id)=>({kind:'withdraw',sourceId:id,previousDigest:source(v,id).digest});
async function replacement(v,id,text,selections=[]){
 return {kind:'replace',sourceId:id,previousDigest:source(v,id).digest,replacementText:text,replacementDigest:await casePin(text),rebindings:selections.map(([bindingId,token])=>{const start=text.indexOf(token);return {bindingId,span:selectedSpan(id,text,start,start+token.length)};})};
}
async function plan(v,operations){const text=JSON.stringify({version:1,parentDigest:v.digest,operations});return [v.versionText,v.digest,text,await casePin(text)];}
test('atomic correction plus withdrawal: explicit numeric re-selection reverses one candidate; other stays unresolved',async()=>{
 const v=await livingFixture(),op=await replacement(v,'primary','Revenue before: 100; revenue after: 90',[['first','90'],['baseline','100']]);
 const args=await plan(v,[op,withdraw(v,'secondary')]),r=await exportEvidenceRevision(...args);
 assert.equal(r.portable,true);assert.equal(r.snapshotPin,await casePin(r.bundleText));
 const x=r.revision;
 assert.deepEqual(x.invalidatedBindingIds,['baseline','first','other','second']);assert.deepEqual(x.reselectedBindingIds,['baseline','first']);assert.deepEqual(x.missingBindingIds,['other','second']);
 assert.deepEqual(x.changes.map(c=>[c.id,c.classification,c.after]),[['primary_view','TARGET_INPUT_RESELECTED','CONDITIONALLY_REFUTED'],['secondary_view','TARGET_INPUT_MISSING','BLOCKED_MISSING_INPUT']]);
 assert.equal(x.child.report.investigation.candidates[0].facets.definition.status,'UNSUPPORTED_DECLARATION');
 assert.deepEqual(contract(x.child).sources.map(s=>s.id),['primary','context']);assert.deepEqual(contract(x.child).sources[1],source(v,'context'));
 assert.deepEqual(await replayInvestigationVersion(v.versionText,v.digest),v.report);assert.deepEqual(await replayInvestigationVersion(x.child.versionText,x.child.digest),x.child.report);
 assert.deepEqual(await prepareEvidenceRevision(...args),x);
 const session=createInvestigationReplaySession();await session.replay(v.versionText,v.digest);
 const replay=await session.replay(x.child.versionText,x.child.digest);assert.deepEqual(replay.report,x.child.report);assert.equal(replay.stats.totals.removed,3);
});
test('partial reselection blocks a target, even with unchanged numeric token on corrected source',async()=>{
 const v=await livingFixture(),op=await replacement(v,'primary','Revenue before: 100; revenue after: 120; corrected note',[['first','120']]);
 const r=await prepareEvidenceRevision(...await plan(v,[op]));
 assert.deepEqual(r.missingBindingIds,['baseline']);assert.deepEqual(r.changes[0].targetMissing,['baseline']);assert.deepEqual(r.changes[0].targetReselected,['first']);
 assert.equal(r.changes[0].after,'BLOCKED_MISSING_INPUT');assert.equal(r.changes[1].classification,'NO_SCOPED_SOURCE_DEPENDENCY');
 assert.deepEqual(contract(r.child).bindings.filter(b=>b.span.sourceId==='secondary'),contract(v).bindings.filter(b=>b.span.sourceId==='secondary'));
});
test('all operations fail together on stale pins, duplicate actions, cross-source binding, malformed span or duplicate location',async()=>{
 const v=await livingFixture(),op=await replacement(v,'primary','Revenue before: 100; revenue after: 90',[['first','90']]);
 const w=withdraw(v,'secondary'),badPin={...w,previousDigest:'sha256:'+'0'.repeat(64)};
 const cross={...op,rebindings:[{...op.rebindings[0],bindingId:'second'}]};
 const forged=structuredClone(op);forged.rebindings[0].span.quote='99';
 const duplicate=structuredClone(op);duplicate.rebindings.push({...duplicate.rebindings[0],bindingId:'baseline'});
 for(const [ops,err] of [[[op,badPin],/SOURCE_PIN_OR_DUPLICATE/],[[op,op],/SOURCE_PIN_OR_DUPLICATE/],[[cross,w],/REBINDING_SCOPE/],[[forged,w],/COMPILER_QUOTE_MISMATCH/],[[duplicate,w],/COMPILER_DUPLICATE_BINDING_SPAN/],[[op,{...w,sourceId:'question'}],/SOURCE_PIN_OR_DUPLICATE/],[[{...op,replacementDigest:w.previousDigest}],/REPLACEMENT/]]){
  await assert.rejects(prepareEvidenceRevision(...await plan(v,ops)),err);
 }
 const args=await plan(v,[op,w]);await assert.rejects(prepareEvidenceRevision(...args.slice(0,3),'sha256:'+'0'.repeat(64)),/PLAN_PIN/);
 assert.deepEqual(await replayInvestigationVersion(v.versionText,v.digest),v.report);
});
test('a revised exact quotation is removed rather than silently relocated; refused future-valid proposal stays quarantined',async()=>{
 const v=await livingFixture(),op=await replacement(v,'primary','Revenue before: 100; revenue after: 90',[['first','90'],['baseline','100']]);
 const normal=await prepareEvidenceRevision(...await plan(v,[op])),raw=JSON.parse(v.versionText),b=JSON.parse(raw.batchText),a=JSON.parse(raw.annotationText);
 const p=JSON.parse(b.proposals[1].proposalText),s=source(v,'primary');
 p.claims.push({id:'old_quote',kind:'quoted_assertion',span:selectedSpan(s.id,s.text,0,s.text.length)});b.proposals[1].proposalText=JSON.stringify(p);
 a.candidates[1].facets.method={statement:'Previously linked quote',references:[{kind:'claim',id:'old_quote'}]};
 const future=JSON.parse(b.proposals[0].proposalText);future.contractDigest=JSON.parse(normal.child.versionText).contractPin;b.proposals[0].proposalText=JSON.stringify(future);
 const batchText=JSON.stringify(b),annotationText=JSON.stringify({...a,batchDigest:await casePin(batchText)});
 const parent=await sealInvestigationVersion({...raw,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const r=await prepareEvidenceRevision(...await plan(parent,[op]));
 assert.equal(r.changes[0].classification,'REFUSED_PARENT_QUARANTINED');assert.equal(r.changes[0].after,'REFUSED');
 assert.equal(r.changes[1].classification,'CONTEXT_OR_NONTARGET_REVISED');assert.deepEqual(r.changes[1].removedClaims,['old_quote']);assert.equal(r.changes[1].removedReferences.length,1);
 assert.equal(r.changes[1].before,r.changes[1].after);
});
