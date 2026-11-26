import test from 'node:test';
import assert from 'node:assert/strict';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {createExpressionReviewReceipt} from '../expression-review-receipt.js';
import {sealExpressionInvestigation} from '../expression-investigation.js';
import {prepareWithdrawalRevision} from '../withdrawal-revision.js';
import {replayInvestigationVersion} from '../investigation-revision.js';
import {casePin} from '../pinned-investigation.js';
const expressions=['[ocf26] > [ocf25]','([ocf26] - [ppe26]) > ([ocf25] - [ppe25])'];
async function fixture(es=expressions){
 const f=await compilerFinanceFixture();
 const r=await createExpressionReviewReceipt({contractText:f.contractText,contractPin:f.pin,bindingIds:['ocf25','ppe25','ocf26','ppe26'],expressions:es});
 return {f,r,input:{contractText:f.contractText,contractPin:f.pin,receiptText:r.receiptText,receiptPin:r.receiptPin}};
}
test('pinned receipt seals existing version graph without inventing semantic approvals and survives source withdrawal as history',async()=>{
 const {f,input}=await fixture(),x=await sealExpressionInvestigation(input),v=x.version;
 assert.equal(v.report.previousDigest,null);assert.equal(x.candidateCount,2);assert.equal(x.semanticReview,'REQUIRED');assert.equal(x.decisionAuthority,'NONE');
 const original=v.report.investigation;assert.equal(original.triage.state,'DIVERGENT_CONDITIONAL_OUTCOMES');
 assert.deepEqual(original.candidates.map(c=>c.computation.status),['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED']);
 assert.ok(original.candidates.every(c=>c.meaningStatus==='PROPOSED_UNVERIFIED'&&Object.values(c.facets).every(f=>f.status==='UNSPECIFIED')));
 const dependencies=v.report.graph.edges.filter(e=>e.relation==='target_depends_on');
 assert.equal(dependencies.filter(e=>e.dependent==='candidate:candidate_1').length,2);
 assert.equal(dependencies.filter(e=>e.dependent==='candidate:candidate_2').length,4);
 const source=JSON.parse(f.contractText).sources[0],revision=await prepareWithdrawalRevision(v.versionText,v.digest,source.id,source.digest);
 assert.equal(revision.child.report.previousDigest,v.digest);
 assert.ok(revision.changes.every(c=>c.classification==='TARGET_EVIDENCE_WITHDRAWN'&&c.after==='BLOCKED_MISSING_INPUT'));
 assert.equal(revision.impact.candidates.filter(c=>c.outcome==='PREVIOUS_CONDITIONAL_RESULT_UNRESOLVED').length,2);
 const replay=await replayInvestigationVersion(v.versionText,v.digest);assert.equal(replay.investigation.triage.state,'DIVERGENT_CONDITIONAL_OUTCOMES');
});
test('duplicate compiled proposals cannot manufacture semantic alternatives; wrong receipt pin and forged status refuse',async()=>{
 const one=await fixture(['[ocf26]>[ocf25]','[ocf26] > [ocf25]']);
 await assert.rejects(sealExpressionInvestigation(one.input),/DISTINCT_CANDIDATES_REQUIRED/);
 const {input}=await fixture();await assert.rejects(sealExpressionInvestigation({...input,receiptPin:'sha256:'+'0'.repeat(64)}),/RECEIPT_PIN_MISMATCH/);
 const forged=JSON.parse(input.receiptText);forged.decisionAuthority='APPROVED';const receiptText=JSON.stringify(forged);
 await assert.rejects(sealExpressionInvestigation({...input,receiptText,receiptPin:await casePin(receiptText)}),/RECEIPT_REPLAY_MISMATCH/);
});
