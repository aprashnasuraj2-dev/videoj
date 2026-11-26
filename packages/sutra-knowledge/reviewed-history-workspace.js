// Compose the existing history, workspace and question-mapping contracts.
// Validation candidate: selecting a historical version never restores authority.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {openWorkspaceCheckpoint} from './workspace-checkpoint.js';
import {openInvestigationHistory} from './investigation-history.js';
import {sealReviewedDraft} from './reviewed-draft.js';
import {compileReviewedQuestion} from './reviewed-question.js';
import {replayQuestionMappingReview} from './question-mapping-review.js';
const fail=code=>{throw TypeError('HISTORY_MAPPING_'+code);};
const parse=text=>parseUniqueJson(text,{maxChars:262144,maxDepth:12});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function openReviewedHistoryWorkspace({workspaceText,workspacePin,expectedHistoryPin,selectedVersionPin,mappingReview}={}){
 const workspace=await openWorkspaceCheckpoint(workspaceText,workspacePin);
 if(!workspace.history||workspace.history.pin!==expectedHistoryPin)fail('HISTORY_PIN');
 const history=await openInvestigationHistory(workspace.history.text,expectedHistoryPin);
 const selected=history.restore(selectedVersionPin),version=parse(selected.versionText);
 const draft=await sealReviewedDraft(workspace.draft.draftText);
 if(draft.pin!==version.contractPin||draft.contractText!==version.contractText)fail('DRAFT_VERSION_MISMATCH');
 if(!mappingReview||mappingReview.expectedContractPin!==version.contractPin)fail('REVIEW_CONTRACT_MISMATCH');
 const review=await replayQuestionMappingReview(mappingReview),wire=parse(mappingReview.snapshotText);
 const compiled=await compileReviewedQuestion(version.contractText,version.contractPin,wire.planText,mappingReview.expectedPlanPin);
 if(compiled.batchText!==version.batchText||compiled.annotationText!==version.annotationText||compiled.annotationPin!==version.annotationPin)fail('REVIEW_VERSION_MISMATCH');
 return freeze({version:'sutra-reviewed-history-workspace/v1',workspacePin,historyPin:expectedHistoryPin,selectedVersionPin,contractPin:version.contractPin,review,decisionAuthority:'NONE',qualification:'Exact selected historical version, editable draft, and independently pinned mapping review agree. No external freshness, semantic truth, current execution approval, or automatic adoption.'});
}
