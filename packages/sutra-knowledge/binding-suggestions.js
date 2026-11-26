// Model-authored quantity suggestions are not reviewed evidence. The host finds
// exact, unique source anchors, checks the existing compiler and requires a
// separately pinned explicit selection before producing a new draft.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {sealReviewedDraft,selectedSpan} from './reviewed-draft.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/,HASH=/^sha256:[a-f0-9]{64}$/;
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const fail=c=>{throw TypeError(c);};
const text=(x,n)=>typeof x==='string'&&x.length<=n&&!/[\ud800-\udfff]/u.test(x);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const safeError=e=>/^(?:COMPILER|DRAFT|BINDING_SUGGESTION)_[A-Z_]{1,64}$/.test(e?.message??'')?e.message:'BINDING_SUGGESTION_REFUSED';
async function admit(draftText,draftPin,proposalText,proposalPin){
 if(typeof draftText!=='string'||draftText.length>262144||typeof proposalText!=='string'||proposalText.length>32768||!HASH.test(draftPin??'')||!HASH.test(proposalPin??'')||await casePin(draftText)!==draftPin||await casePin(proposalText)!==proposalPin)fail('BINDING_SUGGESTION_PIN');
 await sealReviewedDraft(draftText);
 const draft=parseUniqueJson(draftText,{maxChars:262144,maxDepth:8}),proposal=parseUniqueJson(proposalText,{maxChars:32768,maxDepth:8});
 if(!keys(proposal,['version','suggestions'])||proposal.version!==1||!Array.isArray(proposal.suggestions)||proposal.suggestions.length>16)fail('BINDING_SUGGESTION_SHAPE');
 const ids=new Set();
 for(const s of proposal.suggestions){
  if(!keys(s,['id','sourceId','quote','before','after','type'])||typeof s.id!=='string'||!ID.test(s.id)||ids.has(s.id)||typeof s.sourceId!=='string'||!ID.test(s.sourceId)||!text(s.quote,64)||!s.quote.length||!text(s.before,128)||!text(s.after,128))fail('BINDING_SUGGESTION_SHAPE');
  ids.add(s.id);
 }
 return {draft,proposal};
}
export async function previewBindingSuggestions({draftText,draftPin,proposalText,proposalPin}={}){
 const {draft,proposal}=await admit(draftText,draftPin,proposalText,proposalPin);
 const sources=new Map(draft.sources.map(s=>[s.id,s])),rows=[];
 for(const s of proposal.suggestions){
  try{
   const source=sources.get(s.sourceId);if(!source)fail('BINDING_SUGGESTION_SOURCE');
   const anchor=s.before+s.quote+s.after,pos=source.text.indexOf(anchor);
   if(pos<0)fail('BINDING_SUGGESTION_MISSING');
   if(source.text.indexOf(anchor,pos+1)>=0)fail('BINDING_SUGGESTION_AMBIGUOUS');
   const start=pos+s.before.length,end=start+s.quote.length;
   const span=selectedSpan(s.sourceId,source.text,start,end),binding={id:s.id,sourceId:s.sourceId,start,end,type:s.type};
   // Independently check each suggestion against the existing admitted draft.
   // The full chosen set is checked again atomically before applying.
   await sealReviewedDraft(JSON.stringify({...draft,bindings:[...draft.bindings,binding]}));
   rows.push({id:s.id,state:'REVIEW_REQUIRED',binding,span,context:source.text.slice(Math.max(0,start-100),Math.min(source.text.length,end+100)),qualification:'Source quote and numeric syntax checked. Proposed unit, scope, dimension and relevance are not established.'});
  }catch(e){rows.push({id:s.id,state:'REFUSED',reason:safeError(e)});}
 }
 return freeze({version:1,draftPin,proposalPin,rows,decisionAuthority:'NONE',qualification:'No suggestion is admitted to the draft until explicit human selection; source truth and semantic type remain declarations.'});
}
export async function applyReviewedBindingSuggestions({draftText,draftPin,proposalText,proposalPin,selectionText,selectionPin}={}){
 if(typeof selectionText!=='string'||selectionText.length>4096||!HASH.test(selectionPin??'')||await casePin(selectionText)!==selectionPin)fail('BINDING_SUGGESTION_SELECTION_PIN');
 const selection=parseUniqueJson(selectionText,{maxChars:4096,maxDepth:3});
 if(!keys(selection,['version','draftPin','proposalPin','reviewedIds'])||selection.version!==1||selection.draftPin!==draftPin||selection.proposalPin!==proposalPin||!Array.isArray(selection.reviewedIds)||!selection.reviewedIds.length||selection.reviewedIds.length>16||selection.reviewedIds.some(id=>typeof id!=='string'||!ID.test(id))||new Set(selection.reviewedIds).size!==selection.reviewedIds.length)fail('BINDING_SUGGESTION_SELECTION');
 const preview=await previewBindingSuggestions({draftText,draftPin,proposalText,proposalPin});
 const selected=new Set(selection.reviewedIds),rows=preview.rows.filter(r=>selected.has(r.id));
 if(rows.length!==selected.size||rows.some(r=>r.state!=='REVIEW_REQUIRED'))fail('BINDING_SUGGESTION_SELECTION');
 const draft=parseUniqueJson(draftText,{maxChars:262144,maxDepth:8});
 const next={...draft,bindings:[...draft.bindings,...rows.map(r=>r.binding)]};
 const sealed=await sealReviewedDraft(JSON.stringify(next));
 return freeze({version:1,previousDraftPin:draftPin,proposalPin,selectionPin,draft:next,contractPin:sealed.pin,selectedIds:rows.map(r=>r.id),decisionAuthority:'NONE'});
}
