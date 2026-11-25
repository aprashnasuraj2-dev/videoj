// Reviewed candidate outcome triage. No interpretation generation or semantic authority.
import {contrastReviewedProposals} from './reviewed-proposal-contrast.js';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export const VERSION='sutra-reviewed-semantic-triage/v1';
export async function triageReviewedInterpretations(contractText,contractPin,batchText){
 const contrast=await contrastReviewedProposals(contractText,contractPin,batchText);
 const groups={satisfied:[],refuted:[],unresolved:[],refused:[]};
 for(const entry of contrast.entries){
  if(entry.admission!=='ADMITTED'){groups.refused.push(entry.id);continue;}
  const status=entry.computation.status;
  if(status==='CONDITIONALLY_SATISFIED')groups.satisfied.push(entry.id);
  else if(status==='CONDITIONALLY_REFUTED')groups.refuted.push(entry.id);
  else groups.unresolved.push(entry.id);
 }
 const divergent=groups.satisfied.length>0&&groups.refuted.length>0;
 const incomplete=groups.unresolved.length>0||groups.refused.length>0;
 const state=divergent?'DIVERGENT_CONDITIONAL_OUTCOMES':incomplete?'INCOMPLETE_CANDIDATE_EVALUATION':'AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES';
 const reviewPairs=contrast.pairs.filter(p=>p.stateRelation==='OPPOSITE_CONDITIONAL_STATES').map(p=>({left:p.left,right:p.right,expressionRelation:p.expressionRelation}));
 return freeze({version:VERSION,contractDigest:contrast.contractDigest,batchDigest:contrast.batchDigest,state,groups,reviewPairs,questionRelevance:'UNVERIFIED',semanticInterpretation:'UNVERIFIED',methodValidity:'UNVERIFIED',empiricalSupport:'UNVERIFIED',candidateCoverage:'SUPPLIED_CANDIDATES_ONLY',decisionAuthority:'NONE',clarificationPriority:divergent?'REVIEW_DIVERGENCE':incomplete?'REVIEW_INCOMPLETE':'REVIEW_MEANING_BEFORE_DECISIVE_ANSWER',qualification:'Agreement is conditional on supplied, admitted executable proposals; neither candidate coverage, intended meaning, method nor empirical truth is established.',contrast});
}
