import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {auditStructuralExposure} from '../structural-exposure.js';
const audit=v=>auditStructuralExposure(v.versionText,v.digest);
test('same issuer root is one declared dependency cut across two finance targets',async()=>{
 const v=await livingFixture('finance'),r=await audit(v);
 assert.equal(r.counts.distinctDecisiveTargets,2);assert.equal(r.cut.minimumCohorts,1);
 assert.deepEqual(r.cut.sets,[['cohort_primary']]);
 assert.equal(r.cohorts.find(x=>x.id==='cohort_primary').affectedTargetClasses.length,2);
 assert.ok(r.cohorts.every(g=>g.independence==='NOT_ESTABLISHED'));
 assert.equal(r.decisionAuthority,'NONE');
});
test('different declared routes require two cohorts in scoped engineering fixture',async()=>{
 const v=await livingFixture('engineering'),r=await audit(v);
 assert.equal(r.cut.minimumCohorts,2);assert.deepEqual(r.cut.sets,[['cohort_primary','cohort_secondary']]);
 assert.equal(r.cohorts.find(x=>x.id==='cohort_context').affectedTargetClasses.length,0);
 const w=await livingFixture('engineering',{withdraw:true}),s=await audit(w);
 assert.equal(s.counts.distinctDecisiveTargets,1);
 assert.equal(s.candidates.find(x=>x.id==='secondary_view').state,'BLOCKED_MISSING_INPUT');
});
test('exact duplicated bytes bridge different declared lineages conservatively',async()=>{
 const v=await livingFixture('engineering'),raw=JSON.parse(v.versionText),c=JSON.parse(raw.contractText),b=JSON.parse(raw.batchText),a=JSON.parse(raw.annotationText);
 // A duplicate of primary claims the secondary lineage, making a conservative
 // connected cohort; this does not assert that the documents are independent.
 c.sources.push({...c.sources.find(s=>s.id==='primary'),id:'duplicate',lineage:'route_audit'});
 const contractText=JSON.stringify(c),contractPin=await casePin(contractText);
 b.contractDigest=contractPin;for(const item of b.proposals){const p=JSON.parse(item.proposalText);p.contractDigest=contractPin;item.proposalText=JSON.stringify(p);}
 const batchText=JSON.stringify(b);a.contractDigest=contractPin;a.batchDigest=await casePin(batchText);
 const annotationText=JSON.stringify(a);
 const w=await sealInvestigationVersion({contractText,contractPin,batchText,annotationText,annotationPin:await casePin(annotationText)}),r=await audit(w);
 assert.equal(r.cut.minimumCohorts,1);assert.deepEqual(r.cut.sets,[['cohort_duplicate']]);
 assert.ok(r.joins.some(j=>j.reasons.includes('EXACT_DUPLICATE_BYTES')));
 assert.ok(r.joins.some(j=>j.reasons.includes('SAME_DECLARED_LINEAGE')));
 assert.deepEqual(r.cohorts.find(g=>g.id==='cohort_duplicate').sourceIds,['duplicate','primary','secondary']);
 await assert.rejects(auditStructuralExposure(w.versionText,'sha256:'+'0'.repeat(64)),/REVISION_PIN/);
});
