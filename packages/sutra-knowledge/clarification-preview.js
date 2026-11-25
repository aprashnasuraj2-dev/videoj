// Caller-authored answers are a comparison lens, not approval or evidence.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {planInvestigationClarifications} from './clarification-plan.js';
import {replayInvestigationVersion} from './investigation-revision.js';
export const VERSION='sutra-clarification-preview/v1';
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const parse=(s,d=8)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const fail=x=>{throw TypeError('CLARIFICATION_'+x);};
export async function previewClarificationAnswers(versionText,versionPin,responseText,responsePin){
 if(typeof responsePin!=='string'||await casePin(responseText)!==responsePin)fail('RESPONSE_PIN');
 const r=parse(responseText,6);
 if(!keys(r,['version','versionDigest','planDigest','budget','answers'])||r.version!==1||r.versionDigest!==versionPin||!keys(r.budget,['maxQuestions','maxScenarios'])||!Array.isArray(r.answers)||r.answers.length>13)fail('RESPONSE_SHAPE');
 const plan=await planInvestigationClarifications(versionText,versionPin,r.budget);
 if(await casePin(JSON.stringify(plan))!==r.planDigest)fail('PLAN_PIN');
 const questions=new Map(plan.questions.map(q=>[q.facet,q])),answers=new Map();
 for(const a of r.answers){
  if(!keys(a,['facet','statement'])||!questions.has(a.facet)||answers.has(a.facet)||!questions.get(a.facet).answers.some(x=>x.statement===a.statement))fail('ANSWER');
  answers.set(a.facet,a.statement);
 }
 const replay=await replayInvestigationVersion(versionText,versionPin);
 const candidates=replay.investigation.candidates.map(c=>{
  const matching=[],contradictory=[],unspecified=[];
  for(const [facet,answer] of answers){
   const statement=c.facets[facet].statement;
   (statement===null?unspecified:statement===answer?matching:contradictory).push(facet);
  }
  const compatibility=!answers.size?'NO_ANSWERS':contradictory.length?'DIFFERS_FROM_DECLARED_ANSWER':unspecified.length?'UNSPECIFIED_DECLARATION_REMAINS':'MATCHES_DECLARED_ANSWERS';
  return {id:c.id,meaning:c.meaning,conditionalState:c.computation?.status??'REFUSED',compatibility,matching,contradictory,unspecified,admission:c.admission};
 });
 const remaining=candidates.filter(c=>c.compatibility!=='DIFFERS_FROM_DECLARED_ANSWER');
 const decisive=c=>['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'].includes(c.conditionalState);
 const status=!answers.size?'NO_ANSWERS':!remaining.length?'NO_SUPPLIED_DECLARATION_MATCHES':remaining.some(c=>!decisive(c)||c.compatibility==='UNSPECIFIED_DECLARATION_REMAINS')?'UNRESOLVED_BRANCHES_REMAIN':new Set(remaining.map(c=>c.conditionalState)).size>1?'DIVERGENCE_REMAINS':'MATCHING_DECLARATIONS_SHARE_CONDITIONAL_STATE';
 return freeze({version:VERSION,versionDigest:versionPin,planDigest:r.planDigest,responseDigest:responsePin,status,answers:r.answers,candidates,
  remainingCandidateIds:remaining.map(c=>c.id),unansweredQuestions:plan.questions.filter(q=>!answers.has(q.facet)).map(q=>q.facet),
  originalTriage:replay.investigation.triage.state,decisionAuthority:'NONE',qualification:'Compatibility is exact matching of supplied declarations, not semantic or source validity. All candidates, including conflicting and refused branches, remain in the original version. Unknown declarations do not become contradictions. No adoption or change to the investigation.'});
}
