import test from 'node:test';
import assert from 'node:assert/strict';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {createExpressionReviewReceipt} from '../expression-review-receipt.js';
import {expressionReviewQuestions,previewExpressionReviewAnswers,VERSION} from '../expression-review-answers.js';
import {casePin} from '../pinned-investigation.js';
const expressions=['[ocf26] > [ocf25]','([ocf26] - [ppe26]) > ([ocf25] - [ppe25])'];
async function fixture(list=expressions){
 const f=await compilerFinanceFixture(),receipt=await createExpressionReviewReceipt({contractText:f.contractText,contractPin:f.pin,bindingIds:['ocf25','ocf26','ppe25','ppe26'],expressions:list});
 const input={contractText:f.contractText,contractPin:f.pin,receiptText:receipt.receiptText,receiptPin:receipt.receiptPin};
 const questions=expressionReviewQuestions(receipt.receipt.reviewPlan);
 async function preview(answers){const answersText=JSON.stringify({version:VERSION,receiptPin:receipt.receiptPin,answers});return previewExpressionReviewAnswers({...input,answersText,answersPin:await casePin(answersText)});}
 return {input,receipt,questions,preview};
}
test('answer lens compares opposed formulas, retains dissent and original bytes; reset restores both',async()=>{
 const f=await fixture(),q=f.questions[0];
 assert.equal(q.kind,'BINDING_INCLUSION');
 const a=await f.preview([{questionId:q.id,choice:'INCLUDED'}]);
 assert.equal(a.status,'REMAINING_SUPPLIED_CANDIDATES_AGREE');assert.equal(a.originalState,'DIVERGENT_CONDITIONAL_OUTCOMES');
 assert.equal(a.candidates.length,2);assert.equal(a.remainingCandidateIds.length,1);assert.equal(a.candidates.find(c=>c.compatibility==='MATCHES_REVIEW_ANSWERS').conditionalState,'CONDITIONALLY_REFUTED');
 assert.equal(a.decisionAuthority,'NONE');assert.equal(a.semanticReview,'REQUIRED');
 const b=await f.preview([{questionId:q.id,choice:'NOT_INCLUDED'}]);assert.equal(b.candidates.find(c=>c.compatibility==='MATCHES_REVIEW_ANSWERS').conditionalState,'CONDITIONALLY_SATISFIED');
 const reset=await f.preview([]);assert.equal(reset.status,'NO_ANSWERS');assert.equal(reset.remainingCandidateIds.length,2);assert.equal(await casePin(f.input.receiptText),f.input.receiptPin);
});
test('exact expression fallback options are candidate identities, not ambiguous repeated labels',async()=>{
 const f=await fixture(['[ocf26] > [ocf25]','[ocf25] > [ocf26]']);const q=f.questions[0];
 assert.equal(q.kind,'EXPRESSION_STRUCTURE');assert.deepEqual(q.options,['candidate_1','candidate_2']);
 const r=await f.preview([{questionId:q.id,choice:'candidate_2'}]);assert.deepEqual(r.remainingCandidateIds,['candidate_2']);
});
test('candidates outside explicit pair comparisons are not silently excluded',async()=>{
 const f=await fixture(['[ocf26] > [ocf25]','[ocf25] > [ocf26]','[ocf26] >= [ocf25]']);
 const q=f.questions.find(q=>q.choices.length<3);
 assert.ok(q);
 const r=await f.preview([{questionId:q.id,choice:q.options[0]}]);
 assert.ok(r.candidates.some(c=>c.compatibility==='NOT_COMPARED_BY_ALL_ANSWERS'));assert.equal(r.status,'REVIEW_UNRESOLVED');
});
test('duplicate, unknown, stale and forged answers or receipts are refused',async()=>{
 const f=await fixture(),q=f.questions[0],item={questionId:q.id,choice:q.options[0]};
 for(const answers of [[item,item],[{questionId:'unknown',choice:q.options[0]}],[{...item,choice:'verified'}]])await assert.rejects(f.preview(answers),/REVIEW_ANSWERS_CHOICE/);
 const answersText=JSON.stringify({version:VERSION,receiptPin:f.input.receiptPin,answers:[item]});
 await assert.rejects(previewExpressionReviewAnswers({...f.input,answersText,answersPin:'sha256:'+'0'.repeat(64)}),/REVIEW_ANSWERS_PIN/);
 const forged=JSON.parse(f.input.receiptText);forged.state='AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES';const receiptText=JSON.stringify(forged),receiptPin=await casePin(receiptText),newAnswers=JSON.stringify({version:VERSION,receiptPin,answers:[item]});
 await assert.rejects(previewExpressionReviewAnswers({...f.input,receiptText,receiptPin,answersText:newAnswers,answersPin:await casePin(newAnswers)}),/RECEIPT_REPLAY_MISMATCH/);
});
