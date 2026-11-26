// Portable computation receipt. No model/provider invocation, transcript trust
// or claim that a model generated the recorded expression. Retain pins separately.
import {casePin} from './pinned-investigation.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {triageReviewedInterpretations} from './semantic-triage.js';
import {planCouncilReview} from './council-review-plan.js';
export const VERSION='sutra-expression-review-receipt/v1';
const HASH=/^sha256:[a-f0-9]{64}$/,ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const fail=x=>{throw TypeError('RECEIPT_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>i).every(i=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');});
const sort=(a,b)=>a<b?-1:a>b?1:0;
const boundedText=(x,n)=>typeof x==='string'&&x.length<=n&&x.trim().length>0&&!/[\ud800-\udfff]/u.test(x);
const QUAL='Recomputes closed expressions over the exact separately pinned reviewed contract. This is not evidence of model authorship, provider contact, call count, disclosure history, semantic correctness, empirical truth or authority. A matching pin authenticates only bytes relative to the retained pin.';
async function compute({contractText,contractPin,bindingIds,expressions}){
 if(!Array.isArray(bindingIds)||bindingIds.length<1||bindingIds.length>16||!dense(bindingIds)||bindingIds.some(x=>typeof x!=='string'||!ID.test(x))||new Set(bindingIds).size!==bindingIds.length)fail('BINDINGS');
 if(!Array.isArray(expressions)||expressions.length<1||expressions.length>8||!dense(expressions)||expressions.some(x=>!boundedText(x,4096))||new Set(expressions).size!==expressions.length)fail('EXPRESSIONS');
 // Snapshot before any await; input order is part of the replay contract.
 const approved=[...bindingIds].sort(sort),proposals=[...expressions];
 await validateReviewedContract(contractText,contractPin);
 const contract=parseUniqueJson(contractText,{maxChars:262144,maxDepth:9}),allowed=new Set(approved);
 if(approved.some(id=>!contract.bindings.some(b=>b.id===id)))fail('BINDINGS');
 const candidates=[];
 for(const expression of proposals){
  const e=await compileReviewedExpression(contractText,contractPin,expression);
  if(e.usedBindings.some(id=>!allowed.has(id)))fail('UNDISCLOSED_BINDING');
  candidates.push({expression,proposalDigest:e.proposalDigest,proposalText:e.proposalText,usedBindings:e.usedBindings,target:e.target});
 }
 const unique=[...new Map(candidates.map(x=>[x.proposalDigest,x])).values()];
 const batchText=unique.length>1?JSON.stringify({version:1,contractDigest:contractPin,proposals:unique.map((x,i)=>({id:'candidate_'+(i+1),proposalText:x.proposalText}))}):null;
 const triage=batchText?await triageReviewedInterpretations(contractText,contractPin,batchText):null;
 const reviewPlan=planCouncilReview(triage,unique);
 const state=triage?triage.state:'SINGLE_ADMITTED_PROPOSAL';
 return freeze({version:VERSION,contractDigest:contractPin,bindingIds:approved,expressions:proposals,candidates:candidates.map(({proposalText,...c})=>c),uniqueCompiledProposals:unique.length,state,reviewPlan,semanticReview:'REQUIRED',decisionAuthority:'NONE',qualification:QUAL});
}
export async function createExpressionReviewReceipt(input){
 if(!closed(input,['contractText','contractPin','bindingIds','expressions']))fail('INPUT');
 const receipt=await compute(input),receiptText=JSON.stringify(receipt);
 return freeze({receiptText,receiptPin:await casePin(receiptText),receipt});
}
export async function verifyExpressionReviewReceipt(input){
 if(!closed(input,['contractText','contractPin','receiptText','receiptPin']))fail('INPUT');
 const {contractText,contractPin,receiptText,receiptPin}=input;
 if(typeof receiptPin!=='string'||!HASH.test(receiptPin)||await casePin(receiptText)!==receiptPin)fail('PIN_MISMATCH');
 const recorded=parseUniqueJson(receiptText,{maxChars:262144,maxDepth:32});
 if(!closed(recorded,['version','contractDigest','bindingIds','expressions','candidates','uniqueCompiledProposals','state','reviewPlan','semanticReview','decisionAuthority','qualification'])||recorded.version!==VERSION||recorded.contractDigest!==contractPin)fail('CONTRACT');
 // Recompute outcomes, compiled identity, divergence and review plan. Canonical
 // byte equality refuses altered statuses, digests, priorities or qualifications.
 const actual=await compute({contractText,contractPin,bindingIds:recorded.bindingIds,expressions:recorded.expressions});
 if(JSON.stringify(actual)!==receiptText)fail('REPLAY_MISMATCH');
 return freeze({status:'REPRODUCED_CONDITIONAL_COMPUTATION',receiptPin,contractDigest:contractPin,state:actual.state,candidateCount:actual.candidates.length,reviewPlan:actual.reviewPlan,semanticReview:'REQUIRED',decisionAuthority:'NONE',qualification:QUAL});
}
