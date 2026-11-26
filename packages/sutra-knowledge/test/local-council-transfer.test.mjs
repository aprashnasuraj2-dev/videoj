import test from 'node:test';
import assert from 'node:assert/strict';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {createExpressionReviewReceipt} from '../expression-review-receipt.js';
import {sealExpressionInvestigation} from '../expression-investigation.js';
import {createLocalCouncilTransfer,verifyLocalCouncilTransfer} from '../local-council-transfer.js';
import {casePin} from '../pinned-investigation.js';
async function fixture(){
 const f=await compilerFinanceFixture(),planPin=await casePin('separately retained test plan');
 const r=await createExpressionReviewReceipt({contractText:f.contractText,contractPin:f.pin,bindingIds:['ocf25','ppe25','ocf26','ppe26'],expressions:['[ocf26] > [ocf25]','([ocf26] - [ppe26]) > ([ocf25] - [ppe25])']});
 const receipt={receiptText:r.receiptText,receiptPin:r.receiptPin},v=await sealExpressionInvestigation({contractText:f.contractText,contractPin:f.pin,...receipt});
 const value={planPin,contractPin:f.pin,receipt,investigation:{versionText:v.version.versionText,versionPin:v.version.digest}};
 const transfer=await createLocalCouncilTransfer(value),input={transferText:transfer.transferText,contractText:f.contractText,contractPin:f.pin,expectedPlanPin:planPin,expectedReceiptPin:receipt.receiptPin,expectedVersionPin:value.investigation.versionPin};
 return {value,input,transfer};
}
test('portable transfer replays exact computation and root with retained pins, receipt-only supported',async()=>{
 const {value,input,transfer}=await fixture(),r=await verifyLocalCouncilTransfer(input);assert.equal(r.state,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(r.version.versionText,value.investigation.versionText);assert.equal(r.transferPin,transfer.transferPin);assert.equal(r.semanticReview,'REQUIRED');
 const only=await createLocalCouncilTransfer({...value,investigation:null});assert.equal((await verifyLocalCouncilTransfer({...input,transferText:only.transferText,expectedVersionPin:null})).version,null);
 await assert.rejects(verifyLocalCouncilTransfer({...input,transferText:only.transferText}),/VERSION_REQUIRED/);
});
test('wrong plan, receipt, version, missing version pin and ambiguous JSON refuse',async()=>{
 const {input}=await fixture(),wrong='sha256:'+'0'.repeat(64);
 for(const changed of [{expectedPlanPin:wrong},{expectedReceiptPin:wrong},{expectedVersionPin:wrong},{expectedVersionPin:null},{transferText:input.transferText.replace('"planPin":','"planPin":"x","planPin":')}])await assert.rejects(verifyLocalCouncilTransfer({...input,...changed}));
});
test('self-repinned forged receipt or unrelated root cannot be adopted',async()=>{
 const {value,input}=await fixture();
 const forged=JSON.parse(value.receipt.receiptText);forged.state='AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES';const receiptText=JSON.stringify(forged),receiptPin=await casePin(receiptText);
 const f=await createLocalCouncilTransfer({...value,receipt:{receiptText,receiptPin}});
 await assert.rejects(verifyLocalCouncilTransfer({...input,transferText:f.transferText,expectedReceiptPin:receiptPin}),/REPLAY_MISMATCH/);
 const changed=JSON.parse(value.investigation.versionText);changed.previousDigest='sha256:'+'a'.repeat(64);const versionText=JSON.stringify(changed),versionPin=await casePin(versionText);
 const v=await createLocalCouncilTransfer({...value,investigation:{versionText,versionPin}});
 await assert.rejects(verifyLocalCouncilTransfer({...input,transferText:v.transferText,expectedVersionPin:versionPin}),/VERSION_RECEIPT_MISMATCH/);
});
