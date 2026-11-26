// An answer lens over independently replayed conditional computations.
// Never changes, adopts, deletes or approves any original candidate.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {verifyExpressionReviewReceipt} from './expression-review-receipt.js';
export const VERSION='sutra-expression-review-answers/v1';
const fail=x=>{throw TypeError('REVIEW_ANSWERS_'+x);};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const decisive=x=>['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'].includes(x);
// Presentation helper; only replayed receipts are authoritative for computation.
export function expressionReviewQuestions(plan){
 return freeze((plan?.steps??[]).map((step,i)=>{
  const structure=step.kind==='EXPRESSION_STRUCTURE';
  const choices=step.choices.map(c=>({candidateId:c.candidateId,choice:structure?c.candidateId:c.choice}));
  return {id:'review_'+(i+1),kind:step.kind,prompt:step.prompt,choices,options:[...new Set(choices.map(c=>c.choice))]};
 }));
}
export async function previewExpressionReviewAnswers(input){
 if(!closed(input,['contractText','contractPin','receiptText','receiptPin','answersText','answersPin']))fail('INPUT');
 const {contractText,contractPin,receiptText,receiptPin,answersText,answersPin}=input;
 if(typeof answersText!=='string'||answersText.length>32768||typeof answersPin!=='string'||await casePin(answersText)!==answersPin)fail('PIN');
 const a=parseUniqueJson(answersText,{maxChars:32768,maxDepth:5});
 if(!closed(a,['version','receiptPin','answers'])||a.version!==VERSION||a.receiptPin!==receiptPin||!Array.isArray(a.answers)||a.answers.length>28)fail('SHAPE');
 await verifyExpressionReviewReceipt({contractText,contractPin,receiptText,receiptPin});
 const receipt=parseUniqueJson(receiptText,{maxChars:262144,maxDepth:32}),questions=expressionReviewQuestions(receipt.reviewPlan);
 const answers=new Map(),byId=new Map(questions.map(q=>[q.id,q]));
 for(const item of a.answers){
  if(!closed(item,['questionId','choice'])||!byId.has(item.questionId)||answers.has(item.questionId)||!byId.get(item.questionId).options.includes(item.choice))fail('CHOICE');
  answers.set(item.questionId,item.choice);
 }
 const unique=[...new Map(receipt.candidates.map(c=>[c.proposalDigest,c])).values()];
 const candidates=unique.map((c,i)=>{
  const id='candidate_'+(i+1),matching=[],different=[],notCompared=[];
  for(const [qid,answer] of answers){
   const row=byId.get(qid).choices.find(x=>x.candidateId===id);
   (row===undefined?notCompared:row.choice===answer?matching:different).push(qid);
  }
  const compatibility=!answers.size?'NO_ANSWERS':different.length?'DIFFERS_FROM_REVIEW_ANSWER':notCompared.length?'NOT_COMPARED_BY_ALL_ANSWERS':'MATCHES_REVIEW_ANSWERS';
  return {id,expression:c.expression,proposalDigest:c.proposalDigest,conditionalState:c.target.status,compatibility,matching,different,notCompared};
 });
 const remaining=candidates.filter(c=>c.compatibility!=='DIFFERS_FROM_REVIEW_ANSWER');
 const status=!answers.size?'NO_ANSWERS':!remaining.length?'NO_SUPPLIED_CANDIDATE_MATCHES':remaining.some(c=>!decisive(c.conditionalState)||c.notCompared.length)?'REVIEW_UNRESOLVED':new Set(remaining.map(c=>c.conditionalState)).size>1?'DIVERGENCE_REMAINS':'REMAINING_SUPPLIED_CANDIDATES_AGREE';
 return freeze({version:VERSION,receiptPin,contractPin,answersPin,status,answers:a.answers,candidates,remainingCandidateIds:remaining.map(c=>c.id),unansweredQuestionIds:questions.filter(q=>!answers.has(q.id)).map(q=>q.id),originalState:receipt.state,decisionAuthority:'NONE',semanticReview:'REQUIRED',qualification:'Reversible comparison of caller answers to explicitly compared supplied expressions. Candidates outside a question remain unknown, not excluded. Original receipt, evidence and all candidate computations are unchanged. No intended meaning, empirical truth or decision authority established.'});
}
