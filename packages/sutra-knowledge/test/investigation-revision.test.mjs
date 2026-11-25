import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {compareInvestigationVersions,replayInvestigationVersion} from '../investigation-revision.js';
const compare=(a,b)=>compareInvestigationVersions(a.versionText,a.digest,b.versionText,b.digest);
for(const domain of ['finance','engineering']){
 test(domain+': evidence revision reverses only the dependent candidate; old state replays',async()=>{
  const a=await livingFixture(domain),b=await livingFixture(domain,{revised:true,previousDigest:a.digest});
  const r=await compare(a,b),[first,second]=r.candidates;
  assert.equal(a.report.investigation.triage.state,'AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES');
  assert.equal(b.report.investigation.triage.state,'DIVERGENT_CONDITIONAL_OUTCOMES');
  assert.deepEqual(r.sourceChanges,[{id:'secondary',change:'CHANGED'}]);
  assert.equal(first.outcome,'CONDITIONAL_RESULT_SURVIVES');assert.equal(first.dependencyAffected,false);assert.equal(first.reviewRequired,false);
  assert.equal(second.outcome,'CONDITIONAL_RESULT_REVERSED');assert.equal(second.dependencyAffected,true);assert.equal(second.reviewRequired,true);
  assert.equal(r.triage.newDivergence,true);assert.equal(r.recomputation,'FULL_REPLAY_BOTH_VERSIONS');
  assert.deepEqual(await replayInvestigationVersion(a.versionText,a.digest),a.report);assert.equal(r.decisionAuthority,'NONE');
 });
 test(domain+': withdrawal does not become false or silently reuse old values',async()=>{
  const a=await livingFixture(domain),b=await livingFixture(domain,{withdraw:true,previousDigest:a.digest}),r=await compare(a,b);
  assert.deepEqual(r.sourceChanges,[{id:'secondary',change:'WITHDRAWN'}]);assert.equal(r.candidates[1].outcome,'PREVIOUS_CONDITIONAL_RESULT_UNRESOLVED');
  assert.equal(r.candidates[1].after,'BLOCKED_MISSING_INPUT');assert.equal(r.missing[0].id,'secondary_view');
  assert.equal(r.candidates[0].dependencyAffected,false);
 });
}
test('irrelevant revision preserves conditional outcomes and does not claim an affected candidate',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{irrelevant:true,previousDigest:a.digest}),r=await compare(a,b);
 assert.deepEqual(r.sourceChanges,[{id:'context',change:'CHANGED'}]);assert.ok(r.candidates.every(c=>!c.dependencyAffected&&!c.reviewRequired));
 assert.ok(r.affectedDependencyNodes.includes('source:context'));
});
test('stale pin, wrong parent and embedded forged status refused',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{revised:true});
 await assert.rejects(compare(a,b),/REVISION_PARENT/);
 await assert.rejects(replayInvestigationVersion(a.versionText+' ',a.digest),/REVISION_PIN/);
 const obj=JSON.parse(a.versionText);obj.result='VERIFIED';const text=JSON.stringify(obj);
 await assert.rejects(replayInvestigationVersion(text,await casePin(text)),/REVISION_SHAPE/);
});
test('same source shared ancestry is declared, not independent evidence',async()=>{
 const a=await livingFixture(),edges=a.report.graph.edges;
 assert.equal(edges.filter(e=>e.relation==='declared_ancestry'&&e.dependency==='lineage:report').length,2);
 assert.ok(edges.filter(e=>e.relation==='declared_ancestry').every(e=>e.authority==='HOST_DECLARATION'));
 assert.ok(edges.some(e=>e.dependent==='candidate:secondary_view'&&e.dependency==='binding:second'&&e.relation==='target_depends_on'));
});
