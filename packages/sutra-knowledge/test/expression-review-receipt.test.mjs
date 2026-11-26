import test from 'node:test';
import assert from 'node:assert/strict';
import {createExpressionReviewReceipt,verifyExpressionReviewReceipt} from '../expression-review-receipt.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {casePin} from '../pinned-investigation.js';
const bindings=['ocf25','ppe25','ocf26','ppe26'],expressions=['[ocf26] > [ocf25]','([ocf26] - [ppe26]) > ([ocf25] - [ppe25])'];
async function setup(){
 const f=await compilerFinanceFixture();
 const input={contractText:f.contractText,contractPin:f.pin,bindingIds:bindings,expressions};
 const built=await createExpressionReviewReceipt(input);
 const verify=(overrides={})=>verifyExpressionReviewReceipt({contractText:f.contractText,contractPin:f.pin,receiptText:built.receiptText,receiptPin:built.receiptPin,...overrides});
 return {f,input,built,verify};
}
test('portable receipt reproduces conditional divergence and review prompts without agent transcript or provider',async()=>{
 const {built,verify}=await setup(),replayed=await verify();
 assert.equal(replayed.status,'REPRODUCED_CONDITIONAL_COMPUTATION');
 assert.equal(replayed.state,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(replayed.candidateCount,2);
 assert.equal(replayed.reviewPlan.coveredPairs,1);assert.equal(replayed.semanticReview,'REQUIRED');assert.equal(replayed.decisionAuthority,'NONE');
 assert.deepEqual(built.receipt.candidates.map(x=>x.target.status),['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED']);
 for(const forbidden of ['136162','182935','115948','64551','modelId','providerId','profileId','contractText','credential'])assert.equal(built.receiptText.includes(forbidden),false,forbidden);
});
test('external pin and contract bytes are required; a self-repinned forged outcome or review plan still fails replay',async()=>{
 const {built,verify,f}=await setup();
 await assert.rejects(verify({receiptText:built.receiptText+' '}),/RECEIPT_PIN_MISMATCH/);
 await assert.rejects(verify({contractText:f.contractText+' '}),/COMPILER_CONTRACT_PIN_MISMATCH/);
 for(const mutate of [x=>x.candidates[1].target.status='CONDITIONALLY_SATISFIED',x=>x.reviewPlan.steps[0].prompt='Trust the majority',x=>x.decisionAuthority='APPROVED',x=>x.uniqueCompiledProposals=1]){
  const x=JSON.parse(built.receiptText);mutate(x);const receiptText=JSON.stringify(x);
  await assert.rejects(verify({receiptText,receiptPin:await casePin(receiptText)}),/RECEIPT_REPLAY_MISMATCH/);
 }
 const duplicate=built.receiptText.replace('"version":','"version":"fake","version":');
 await assert.rejects(verify({receiptText:duplicate,receiptPin:await casePin(duplicate)}),SyntaxError);
});
test('scope is checked on replay and whitespace variants deduplicate by compiled identity',async()=>{
 const {input}=await setup();
 await assert.rejects(createExpressionReviewReceipt({...input,bindingIds:['ocf25','ocf26']}),/RECEIPT_UNDISCLOSED_BINDING/);
 const r=await createExpressionReviewReceipt({...input,expressions:['[ocf26]>[ocf25]','[ocf26] > [ocf25]']});
 assert.equal(r.receipt.uniqueCompiledProposals,1);assert.equal(r.receipt.candidates.length,2);
 await assert.rejects(createExpressionReviewReceipt({...input,expressions:Array(9).fill(expressions[0])}),/RECEIPT_EXPRESSIONS/);
});
