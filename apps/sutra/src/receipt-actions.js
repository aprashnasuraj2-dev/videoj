import {isNativeCueReached} from './seek-policy.js';
import {snapshotDataRecord,validateReceipt} from '../../../packages/sutra-evidence/index.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
// One scope per result surface: a replaced result or newer action revokes
// the pending seek's authority, not the native position already applied.
export function createReceiptSeekScope(){
 let owner=null;
 const cancel=()=>{const previous=owner;owner=null;previous?.abort();return !!previous;};
 return Object.freeze({
  begin(){cancel();const controller=new AbortController();owner=controller;return controller;},
  current:controller=>owner===controller&&!controller.signal.aborted,
  finish(controller){if(owner===controller)owner=null;},
  cancel
 });
}
/** A validated source receipt enables a local user action, never a model proposal or a write by itself. */
export function createReceiptActionRow({receipt,sources,seekTo,prepareReview,actionStatus,isCurrent,seekLabel,reviewLabel,seekScope=createReceiptSeekScope()}){
 let exact;
 try{
  exact=Object.freeze({...snapshotDataRecord(receipt,32)});
  if(validateReceipt(exact,{sources}).level!=='catalog_matched')return null;
 }catch{return null;}
 const row=el('li'),identity=el('p',exact.sourceId+' / '+exact.sourceVersion+' · '+exact.cueId+' · '+exact.start+'–'+exact.end+' s');
 const excerpt=el('blockquote',exact.excerpt),actions=el('div');actions.className='actions';
 const seek=el('button',seekLabel),review=el('button',reviewLabel);seek.type=review.type='button';
 seek.addEventListener('click',async()=>{
  if(!isCurrent()||seek.disabled)return;const operation=seekScope.begin();seek.disabled=true;
  const current=()=>isCurrent()&&seekScope.current(operation);
  actionStatus.textContent='Checking native media availability…';
  try{
   const actual=await seekTo(exact,{signal:operation.signal});
   if(!isNativeCueReached(actual,exact.start,exact.end))throw Error('Not reached');
   if(current())actionStatus.textContent='Native media reached the matched source cue. No factual verification.';
  }catch{if(current())actionStatus.textContent='Cue seek unavailable. Load the media explicitly; no seek success is claimed.';}
  finally{seekScope.finish(operation);seek.disabled=seek.dataset.sutraRevoked==='true';}
 });
 review.addEventListener('click',()=>{
  if(!isCurrent())return;
  try{actionStatus.textContent=prepareReview(exact)===true?'Exact receipt preview opened; no review saved yet.':'Review unavailable; nothing was saved.';}
  catch{actionStatus.textContent='Review unavailable; nothing was saved.';}
 });
 actions.append(seek,review);row.append(identity,excerpt,actions);return row;
}
