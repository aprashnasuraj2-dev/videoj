// Bridge a pinned expression receipt into the existing versioned knowledge graph.
// No candidate is adopted as a semantic answer and no provider is contacted.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {verifyExpressionReviewReceipt} from './expression-review-receipt.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {FACETS} from './semantic-investigation.js';
import {sealInvestigationVersion} from './investigation-revision.js';
const fail=x=>{throw TypeError('EXPRESSION_INVESTIGATION_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const QUAL='A new root version of supplied, computationally admitted expression candidates. All meanings and facets remain unverified; no model-authorship, evidence truth, semantic selection or adoption is implied. The original receipt and its pin remain independently retained.';
export async function sealExpressionInvestigation(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Reflect.ownKeys(input).length!==4||!['contractText','contractPin','receiptText','receiptPin'].every(k=>{const d=Object.getOwnPropertyDescriptor(input,k);return d?.enumerable&&Object.hasOwn(d,'value');}))fail('INPUT');
 const {contractText,contractPin,receiptText,receiptPin}=input;
 const verified=await verifyExpressionReviewReceipt({contractText,contractPin,receiptText,receiptPin});
 const receipt=parseUniqueJson(receiptText,{maxChars:262144,maxDepth:32});
 // The existing semantic investigation requires at least two distinct proposals;
 // duplicate expressions must not manufacture a second candidate.
 if(receipt.uniqueCompiledProposals<2)fail('DISTINCT_CANDIDATES_REQUIRED');
 const unique=new Map();
 for(const expression of receipt.expressions){
  const e=await compileReviewedExpression(contractText,contractPin,expression);
  if(unique.has(e.proposalDigest))continue;
  const meaning='Proposed expression (meaning unverified): '+expression;
  if(meaning.length>2048)fail('MEANING_SIZE');
  unique.set(e.proposalDigest,{expression,meaning,proposalText:e.proposalText,target:e.target});
 }
 if(unique.size!==receipt.uniqueCompiledProposals)fail('REPLAY');
 const proposals=[],annotations=[];
 for(const x of unique.values()){
  const id='candidate_'+(proposals.length+1);
  proposals.push({id,proposalText:x.proposalText});
  // Do not invent source correspondence, entity resolution, method validity,
  // causal interpretation or human approval to make the graph look complete.
  annotations.push({id,meaning:x.meaning,facets:Object.fromEntries(FACETS.map(k=>[k,null]))});
 }
 const batchText=JSON.stringify({version:1,contractDigest:contractPin,proposals});
 const annotationText=JSON.stringify({version:1,contractDigest:contractPin,batchDigest:await casePin(batchText),candidates:annotations});
 const version=await sealInvestigationVersion({previousDigest:null,contractText,contractPin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 if(version.report.investigation.triage.state!==verified.state)fail('TRIAGE_MISMATCH');
 return freeze({version,receiptPin,contractPin,candidateCount:unique.size,semanticReview:'REQUIRED',decisionAuthority:'NONE',qualification:QUAL});
}
