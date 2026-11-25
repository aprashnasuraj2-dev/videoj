import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {compareSiblingInvestigations} from '../sibling-branch-contrast.js';
const compare=(a,b,c)=>compareSiblingInvestigations(a.versionText,a.digest,b.versionText,b.digest,c.versionText,c.digest);
async function editAnnotation(v,fn){
 const raw=JSON.parse(v.versionText),a=JSON.parse(raw.annotationText);fn(a);
 raw.annotationText=JSON.stringify(a);raw.annotationPin=await casePin(raw.annotationText);
 return sealInvestigationVersion({previousDigest:raw.previousDigest,contractText:raw.contractText,contractPin:raw.contractPin,batchText:raw.batchText,annotationText:raw.annotationText,annotationPin:raw.annotationPin});
}
test('source correction versus withdrawal preserves conflicting branch objects and outcomes',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,revised:true}),c=await livingFixture('finance',{previousDigest:a.digest,withdraw:true});
 const r=await compare(a,b,c),source=r.conflicts.find(x=>x.kind==='sources'&&x.id==='secondary');
 assert.equal(r.status,'EXPLICIT_CONFLICTS_REQUIRE_REVIEW');assert.equal(source.leftOperation,'CHANGED');assert.equal(source.rightOperation,'WITHDRAWN');assert.equal(source.rightIdentity,null);
 assert.deepEqual(r.outcomes.find(x=>x.id==='secondary_view'),{id:'secondary_view',base:'CONDITIONALLY_SATISFIED',left:'CONDITIONALLY_REFUTED',right:'BLOCKED_MISSING_INPUT',branchesDiffer:true});
 assert.equal(r.decisionAuthority,'NONE');assert.equal(r.branchImpacts.left.beforeDigest,a.digest);assert.equal(r.branchImpacts.right.beforeDigest,a.digest);
});
test('nonoverlapping changes are reported without declaring a safe merge',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,revised:true}),c=await livingFixture('finance',{previousDigest:a.digest,irrelevant:true});
 const r=await compare(a,b,c);
 assert.equal(r.status,'NO_CONFLICTS_IN_COMPARED_OBJECTS');
 assert.deepEqual(r.changes.filter(x=>x.kind==='sources').map(x=>[x.id,x.classification]),[['context','RIGHT_ONLY'],['secondary','LEFT_ONLY']]);
 assert.equal(r.conflicts.length,0);assert.ok(r.qualification.includes('does not establish a safe merge'));
});
test('identical changes on distinct branches remain exact identity, not logical equivalence',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,revised:true}),c=await editAnnotation(b,x=>{x.candidates[0].meaning='Alternative declaration';});
 const r=await compare(a,b,c);
 assert.equal(r.changes.find(x=>x.kind==='sources'&&x.id==='secondary').classification,'SAME_CHANGE');
 assert.equal(r.changes.find(x=>x.kind==='candidates'&&x.id==='primary_view').classification,'RIGHT_ONLY');
 await assert.rejects(compare(a,b,b),/BRANCH_SIBLING_PARENT/);
 const unrelated=await livingFixture('engineering');
 await assert.rejects(compare(a,b,unrelated),/BRANCH_SIBLING_PARENT/);
});
