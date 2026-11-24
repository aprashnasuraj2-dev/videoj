import {snapshotDataRecord,validateReceipt} from '../../../packages/sutra-evidence/index.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
/** A validated source receipt enables a local user action, never a model proposal or a write by itself. */
export function createReceiptActionRow({receipt,sources,seekTo,prepareReview,actionStatus,isCurrent,seekLabel,reviewLabel}){
 let exact;
 try{
  exact=Object.freeze({...snapshotDataRecord(receipt,32)});
  if(validateReceipt(exact,{sources}).level!=='catalog_matched')return null;
 }catch{return null;}
 const row=el('li'),identity=el('p',exact.sourceId+' / '+exact.sourceVersion+' · '+exact.cueId+' · '+exact.start+'–'+exact.end+' s');
 const excerpt=el('blockquote',exact.excerpt),actions=el('div');actions.className='actions';
 const seek=el('button',seekLabel),review=el('button',reviewLabel);seek.type=review.type='button';
 seek.addEventListener('click',async()=>{
  if(!isCurrent()||seek.disabled)return;seek.disabled=true;
  actionStatus.textContent='Checking native media availability…';
  try{
   const actual=await seekTo(exact);
   if(!Number.isFinite(actual)||Math.abs(actual-exact.start)>1)throw Error('Not reached');
   if(isCurrent())actionStatus.textContent='Native media reached the matched source cue. No factual verification.';
  }catch{if(isCurrent())actionStatus.textContent='Cue seek unavailable. Load the media explicitly; no seek success is claimed.';}
  finally{seek.disabled=seek.dataset.sutraRevoked==='true';}
 });
 review.addEventListener('click',()=>{
  if(!isCurrent())return;
  try{actionStatus.textContent=prepareReview(exact)===true?'Exact receipt preview opened; no review saved yet.':'Review unavailable; nothing was saved.';}
  catch{actionStatus.textContent='Review unavailable; nothing was saved.';}
 });
 actions.append(seek,review);row.append(identity,excerpt,actions);return row;
}
