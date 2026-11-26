// Compact, data-only handoff. It intentionally omits unverified model traces,
// provider/contact claims, usage and credentials. No transport is imported.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {verifyExpressionReviewReceipt} from './expression-review-receipt.js';
import {sealExpressionInvestigation} from './expression-investigation.js';
export const LOCAL_TRANSFER_VERSION='sutra-local-council-transfer/v1';
const MAX=262144,PIN=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{const e=new Error('Local transfer refused ('+code+').');e.code=code;throw e;};
const pin=x=>typeof x==='string'&&PIN.test(x);
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
async function admitReceipt(r){
 if(!closed(r,['receiptText','receiptPin'])||!pin(r.receiptPin)||typeof r.receiptText!=='string'||await casePin(r.receiptText)!==r.receiptPin)fail('RECEIPT_PIN');
}
async function admitVersion(v){
 if(!closed(v,['versionText','versionPin'])||!pin(v.versionPin)||typeof v.versionText!=='string'||await casePin(v.versionText)!==v.versionPin)fail('VERSION_PIN');
}
export async function createLocalCouncilTransfer(input){
 if(!closed(input,['planPin','contractPin','receipt','investigation'])||!pin(input.planPin)||!pin(input.contractPin))fail('TRANSFER');
 const {planPin,contractPin,receipt,investigation}=input;
 // Snapshot the exact nested fields before awaiting hashing.
 if(!closed(receipt,['receiptText','receiptPin'])||investigation!==null&&!closed(investigation,['versionText','versionPin']))fail('TRANSFER');
 const value={version:LOCAL_TRANSFER_VERSION,planPin,contractPin,receipt:{receiptText:receipt.receiptText,receiptPin:receipt.receiptPin},investigation:investigation===null?null:{versionText:investigation.versionText,versionPin:investigation.versionPin}};
 await admitReceipt(value.receipt);if(value.investigation!==null)await admitVersion(value.investigation);
 const transferText=JSON.stringify(value);
 if(new TextEncoder().encode(transferText).length>MAX)fail('TRANSFER_SIZE');
 return freeze({transferText,transferPin:await casePin(transferText)});
}
export async function verifyLocalCouncilTransfer(input){
 if(!closed(input,['transferText','contractText','contractPin','expectedPlanPin','expectedReceiptPin','expectedVersionPin'])||![input.contractPin,input.expectedPlanPin,input.expectedReceiptPin].every(pin)||input.expectedVersionPin!==null&&!pin(input.expectedVersionPin))fail('EXPECTED_PINS');
 const {transferText,contractText,contractPin,expectedPlanPin,expectedReceiptPin,expectedVersionPin}=input;
 if(typeof transferText!=='string'||new TextEncoder().encode(transferText).length>MAX)fail('TRANSFER_SIZE');
 const t=parseUniqueJson(transferText,{maxChars:MAX,maxDepth:12});
 if(!closed(t,['version','planPin','contractPin','receipt','investigation'])||t.version!==LOCAL_TRANSFER_VERSION||t.planPin!==expectedPlanPin||t.contractPin!==contractPin)fail('PLAN_OR_CONTRACT');
 await admitReceipt(t.receipt);if(t.receipt.receiptPin!==expectedReceiptPin)fail('RECEIPT_PIN');
 const receipt=await verifyExpressionReviewReceipt({contractText,contractPin,...t.receipt});
 let version=null;
 if(t.investigation===null){if(expectedVersionPin!==null)fail('VERSION_REQUIRED');}
 else{
  if(expectedVersionPin===null)fail('VERSION_PIN_REQUIRED');
  await admitVersion(t.investigation);if(t.investigation.versionPin!==expectedVersionPin)fail('VERSION_PIN');
  // A self-repinned but unrelated version must not enter the living workspace.
  // Reconstruct the exact expected root from the independently verified receipt.
  const expected=await sealExpressionInvestigation({contractText,contractPin,...t.receipt});
  if(expected.version.versionText!==t.investigation.versionText||expected.version.digest!==expectedVersionPin)fail('VERSION_RECEIPT_MISMATCH');
  version={versionText:expected.version.versionText,versionPin:expected.version.digest,candidateCount:expected.candidateCount};
 }
 return freeze({profile:LOCAL_TRANSFER_VERSION,status:'REPRODUCED_CONDITIONAL_COMPUTATION',planPin:expectedPlanPin,contractPin,receiptPin:expectedReceiptPin,transferPin:await casePin(transferText),state:receipt.state,candidateCount:receipt.candidateCount,version,semanticReview:'REQUIRED',decisionAuthority:'NONE',qualification:'Recomputed receipt and optional exact root version only. The plan pin matches the retained label; it is not proof that the plan ran, that any model authored a proposal or that disclosure/usage claims occurred. No semantic or empirical truth established.'});
}
