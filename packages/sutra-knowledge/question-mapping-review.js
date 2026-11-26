// Explicit caller review of a bounded, replayed question mapping. A selection
// is a declaration, not a proof of meaning, and alternatives remain visible.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {compileReviewedQuestion} from './reviewed-question.js';
const fail=c=>{throw TypeError('MAPPING_REVIEW_'+c);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function reviewQuestionMapping({contractText,contractPin,planText,planPin,reviewText,reviewPin}={}){
 if(await casePin(reviewText)!==reviewPin)fail('PIN');
 const r=parseUniqueJson(reviewText,{maxChars:4096,maxDepth:4});
 if(!keys(r,['version','contractPin','planPin','choices'])||r.version!==1||r.contractPin!==contractPin||r.planPin!==planPin||!Array.isArray(r.choices)||r.choices.length>8)fail('SHAPE');
 const compiled=await compileReviewedQuestion(contractText,contractPin,planText,planPin);
 const candidates=new Map(compiled.candidates.map(c=>[c.id,c])),choices=new Map();
 for(const row of r.choices){
  if(!keys(row,['id','judgment'])||!candidates.has(row.id)||choices.has(row.id)||!['plausible','excluded','unresolved'].includes(row.judgment))fail('CHOICE');
  choices.set(row.id,row.judgment);
 }
 const rows=compiled.candidates.map(c=>({id:c.id,meaning:c.meaning,expression:c.expression,conditionalState:c.conditionalState,judgment:choices.get(c.id)??'unresolved'}));
 const plausible=rows.filter(x=>x.judgment==='plausible'),unresolved=rows.filter(x=>x.judgment==='unresolved');
 return freeze({version:1,contractPin,planPin,reviewPin,rows,status:unresolved.length?'REVIEW_INCOMPLETE':plausible.length===1?'ONE_DECLARED_PLAUSIBLE':plausible.length?'MULTIPLE_DECLARED_PLAUSIBLE':'NO_DECLARED_PLAUSIBLE',semanticInterpretation:'UNVERIFIED',decisionAuthority:'NONE',qualification:'All supplied alternatives and conditional results retained; missing judgments unresolved. Human declaration neither certifies meaning nor source truth; no automatic adoption.'});
}

const VERSION='sutra-question-mapping-review/v1';
export async function exportQuestionMappingReview(input){
 const result=await reviewQuestionMapping(input);
 const {contractText,contractPin,planText,planPin,reviewText,reviewPin}=input;
 const snapshotText=JSON.stringify({version:VERSION,contractText,contractPin,planText,planPin,reviewText,reviewPin,result});
 // Existing casePin cap applies to the full portable record; oversize is refusal.
 const snapshotPin=await casePin(snapshotText);
 return freeze({snapshotText,snapshotPin,result});
}
export async function replayQuestionMappingReview({snapshotText,snapshotPin,expectedContractPin,expectedPlanPin,expectedReviewPin}={}){
 if(await casePin(snapshotText)!==snapshotPin)fail('SNAPSHOT_PIN');
 const x=parseUniqueJson(snapshotText,{maxChars:262144,maxDepth:12});
 if(!keys(x,['version','contractText','contractPin','planText','planPin','reviewText','reviewPin','result'])||x.version!==VERSION||x.contractPin!==expectedContractPin||x.planPin!==expectedPlanPin||x.reviewPin!==expectedReviewPin)fail('SNAPSHOT_INPUT_PINS');
 const result=await reviewQuestionMapping(x);
 if(JSON.stringify(result)!==JSON.stringify(x.result))fail('REPLAY_DIVERGENCE');
 return result;
}
