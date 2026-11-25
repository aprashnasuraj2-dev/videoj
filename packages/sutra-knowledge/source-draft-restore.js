// Restore editable source selections from an exact pinned investigation.
import {replayInvestigationVersion} from './investigation-revision.js';
import {selectedSpan,sealReviewedDraft} from './reviewed-draft.js';
import {casePin} from './pinned-investigation.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const fail=x=>{throw TypeError('RESTORE_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function restoreReviewedSourceDraft(versionText,versionPin){
 const report=await replayInvestigationVersion(versionText,versionPin),v=parse(versionText,6),contract=parse(v.contractText);
 // Browser textarea normalizes CR and CRLF; this adapter refuses rather than
 // silently editing pinned source bytes. The historical export remains intact.
 if(contract.question.text.length>1000||[contract.question,...contract.sources].some(s=>s.text.includes('\r')))fail('TEXTAREA_PROFILE');
 const sources=contract.sources.map(({id,text,lineage})=>({id,text,lineage}));
 const docs=new Map(sources.map(s=>[s.id,s.text]));
 const bindings=contract.bindings.map(b=>{
  const span=b.span,text=docs.get(span.sourceId);
  if(text===undefined)fail('QUESTION_BINDING_PROFILE');
  const bytes=enc.encode(text);
  const start=dec.decode(bytes.slice(0,span.start)).length,end=dec.decode(bytes.slice(0,span.end)).length;
  const restored=selectedSpan(span.sourceId,text,start,end);
  if(restored.quote!==span.quote||restored.start!==span.start||restored.end!==span.end)fail('SPAN');
  return {id:b.id,sourceId:span.sourceId,start,end,type:b.type};
 });
 const draft={version:1,question:contract.question.text,sources,bindings};
 const reconstructed=await sealReviewedDraft(JSON.stringify(draft));
 return freeze({version:'sutra-restored-source-draft/v1',versionDigest:versionPin,draft,
  reconstructedContractDigest:reconstructed.pin,originalContractDigest:v.contractPin,
  exactContractBytes:reconstructed.contractText===v.contractText,
  historicalCandidates:report.investigation.candidates.map(c=>({id:c.id,meaning:c.meaning,status:c.computation?.status??'REFUSED'})),
  qualification:'Only source text and reviewed numeric selections are restored for editing. Historical candidate programs and annotations remain in the pinned version; none is silently copied, rewritten or adopted. Editing requires a new seal and explicit correspondence.'});
}
export async function reviseReviewedSourceDraft(draftText,sourceId,replacementText){
 const draft=parse(draftText,8);
 // Validate old selection state before permitting a revision.
 await sealReviewedDraft(draftText);
 if(typeof replacementText!=='string'||replacementText.includes('\r'))fail('TEXTAREA_PROFILE');
 const previous=draft.sources.find(s=>s.id===sourceId);
 if(!previous||previous.text===replacementText)fail('SOURCE_CHANGE_REQUIRED');
 const invalidated=draft.bindings.filter(b=>b.sourceId===sourceId).map(b=>b.id);
 const next={...draft,sources:draft.sources.map(s=>s.id===sourceId?{...s,text:replacementText}:s),bindings:draft.bindings.filter(b=>b.sourceId!==sourceId)};
 await sealReviewedDraft(JSON.stringify(next));
 return freeze({draft:next,sourceId,invalidatedBindingIds:invalidated,retainedBindingIds:next.bindings.map(b=>b.id),qualification:'Every binding on the changed source is invalidated, even when its token is unchanged. Reselect exact numeric tokens and types before sealing; no automatic remapping.'});
}

/** Remove one explicitly identified source from a new draft, never from history.
 * Exact old source pin is caller-retained; same-lineage sources remain distinct.
 * No candidate programs or old computation receipts are transplanted. */
export async function withdrawReviewedSourceDraft(draftText,sourceId,previousSourceDigest){
 const draft=parse(draftText,8),before=await sealReviewedDraft(draftText);
 const previous=draft.sources.find(s=>s.id===sourceId);
 if(!previous||await casePin(previous.text)!==previousSourceDigest)fail('WITHDRAW_SOURCE_PIN');
 const invalidatedBindingIds=draft.bindings.filter(b=>b.sourceId===sourceId).map(b=>b.id);
 const next={...draft,sources:draft.sources.filter(s=>s.id!==sourceId),bindings:draft.bindings.filter(b=>b.sourceId!==sourceId)};
 const after=await sealReviewedDraft(JSON.stringify(next));
 return freeze({draft:next,sourceId,previousSourceDigest,previousContractDigest:before.pin,contractPin:after.pin,invalidatedBindingIds,retainedBindingIds:next.bindings.map(b=>b.id),retainedSourceIds:next.sources.map(s=>s.id),decisionAuthority:'NONE',qualification:'Only the selected source and its bindings are withdrawn from the new draft. Other sources, including declared same-lineage sources, remain. Prior sealed versions are unchanged; old results must not be reused as current evidence.'});
}
