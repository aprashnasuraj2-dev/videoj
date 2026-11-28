import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {selectedSpan} from '../reviewed-draft.js';
import {replayInvestigationVersion,sealInvestigationVersion,createInvestigationReplaySession} from '../investigation-revision.js';
import {prepareEvidenceRevision,exportEvidenceRevision,openEvidenceRevision} from '../evidence-revision-transaction.js';
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

test('reopen exact portable transaction using independently retained snapshot, ancestor, plan and child pins',async()=>{
 const v=await livingFixture(),args=await plan(v,[withdraw(v,'secondary')]),e=await exportEvidenceRevision(...args),r=e.revision;
 const pins=[e.snapshotPin,v.digest,args[3],r.child.digest],opened=await openEvidenceRevision(e.bundleText,...pins);
 assert.deepEqual(opened.ancestor,v);assert.deepEqual(opened.exported,e);assert.equal(opened.planText,args[2]);
 for(let i=0;i<pins.length;i++){const bad=pins.slice();bad[i]='sha256:'+'0'.repeat(64);await assert.rejects(openEvidenceRevision(e.bundleText,...bad),/IMPORT_(PIN|SCOPE)/);}
 const obj=JSON.parse(e.bundleText);obj.missingBindingIds=[];const wire=JSON.stringify(obj);
 await assert.rejects(openEvidenceRevision(wire,await casePin(wire),...pins.slice(1)),/IMPORT_REPLAY/);
 const reserialized=JSON.stringify(JSON.parse(e.bundleText),null,2);
 await assert.rejects(openEvidenceRevision(reserialized,await casePin(reserialized),...pins.slice(1)),/IMPORT_REPLAY/);
 await assert.rejects(openEvidenceRevision('x'.repeat(262145),...pins),/IMPORT_SIZE/);
 assert.deepEqual(await replayInvestigationVersion(v.versionText,v.digest),v.report);
});

test('actual cached arithmetic: corrected source reexecutes only affected candidate nodes; unrelated correction reuses all; no-savings control',async()=>{
 const parent=await livingFixture(),base=createInvestigationReplaySession();const first=await base.replay(parent.versionText,parent.digest);
 assert.equal(first.stats.totals.executed,6);assert.equal(first.stats.totals.reusedOutcomes,0);
 async function check(ops){
  const r=await prepareEvidenceRevision(...await plan(parent,ops)),session=base.fork();
  const next=await session.replay(r.child.versionText,r.child.digest);
  assert.deepEqual(next.report,await replayInvestigationVersion(r.child.versionText,r.child.digest));
  assert.deepEqual(next.report,r.child.report);assert.equal(base.head(),parent.digest);
  return {r,next};
 }
 const primary=await replacement(parent,'primary','Revenue before: 100; revenue after: 90',[['first','90'],['baseline','100']]);
 const secondary=await replacement(parent,'secondary','Cash before: 30; cash after: 20',[['second','20'],['other','30']]);
 const single=await check([primary]),rows=single.next.stats.candidates;
 assert.equal(rows.find(x=>x.id==='primary_view').executed.length,3);
 assert.equal(rows.find(x=>x.id==='secondary_view').executed.length,0);
 assert.equal(rows.find(x=>x.id==='secondary_view').reusedOutcomes.length,3);
 assert.equal(single.next.stats.totals.executed,3);
 const irrelevant=await check([await replacement(parent,'context','Context revised; no input binding')]);
 assert.equal(irrelevant.next.stats.totals.executed,0);assert.equal(irrelevant.next.stats.totals.reusedOutcomes,6);
 assert.ok(irrelevant.r.impact.candidates.every(x=>!x.dependencyAffected&&!x.reviewRequired));
 const all=await check([primary,secondary]);
 assert.equal(all.next.stats.totals.executed,6);assert.equal(all.next.stats.totals.reusedOutcomes,0);
 assert.ok(all.r.impact.candidates.every(x=>x.dependencyAffected));
 const removed=await check([withdraw(parent,'secondary')]);
 assert.equal(removed.next.stats.candidates.find(x=>x.id==='primary_view').executed.length,0);
 assert.equal(removed.next.stats.candidates.find(x=>x.id==='primary_view').reusedOutcomes.length,3);
 assert.equal(removed.r.changes.find(x=>x.id==='secondary_view').after,'BLOCKED_MISSING_INPUT');
});
