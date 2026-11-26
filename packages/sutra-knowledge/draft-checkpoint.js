// Portable caller-held draft, deliberately not a sealed investigation or approval.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {sealReviewedDraft} from './reviewed-draft.js';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const fail=c=>{throw TypeError('DRAFT_CHECKPOINT_'+c);};
export async function openDraftCheckpoint(draftText,expectedPin){
 if(await casePin(draftText)!==expectedPin)fail('PIN');
 await sealReviewedDraft(draftText);
 const draft=parseUniqueJson(draftText,{maxChars:262144,maxDepth:8});
 // This profile restores the exact editable browser draft representation.
 // Browser textareas normalize CR in both question and source text. Refuse
 // such imports rather than letting selection offsets diverge from stored text.
 if(draft.question.length>1000||draft.question.includes('\r')||draft.sources.some(s=>s.text.includes('\r'))||draft.bindings.some(b=>!draft.sources.some(s=>s.id===b.sourceId)))fail('BROWSER_PROFILE');
 if(JSON.stringify({version:1,question:draft.question,sources:draft.sources,bindings:draft.bindings})!==draftText)fail('CANONICAL_DRAFT');
 return freeze({draft,draftText,draftPin:expectedPin,summary:{question:draft.question,sourceIds:draft.sources.map(s=>s.id),bindingCount:draft.bindings.length},decisionAuthority:'NONE',qualification:'Exact editable draft only. No sealed investigation, model permission, semantic truth or execution approval restored.'});
}
export async function exportDraftCheckpoint(draftText){return openDraftCheckpoint(draftText,await casePin(draftText));}
