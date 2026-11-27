import {createSourceTools} from '../../../packages/sutra-source-tools/index.js';
import {validateEvidenceClaim,snapshotDataArray,snapshotDataRecord} from '../../../packages/sutra-evidence/index.js';
import {applyScreenState} from './status-state.js';
import {createReceiptActionRow,createReceiptSeekScope} from './receipt-actions.js';

const result=(state,receipts=[],extra={})=>Object.freeze({state,receipts:Object.freeze(receipts.map(r=>Object.freeze({...r}))),modelCalls:0,networkRequests:0,truthStatus:'unverified',...extra});
export function createDirectLookup({sources,now}={}){
 const catalog=snapshotDataArray(sources,20).map(raw=>{
  const source=snapshotDataRecord(raw);
  return {id:source.id,version:source.version,hash:source.hash,mediaHash:source.mediaHash,duration:source.duration,
   cues:snapshotDataArray(source.cues,500).map(c=>{const cue=snapshotDataRecord(c);return {id:cue.id,start:cue.start,end:cue.end,text:cue.text};})};
 });
 const tools=createSourceTools(catalog,now?{now}:{});
 return Object.freeze({
  search(query){
   if(typeof query!=='string'||!query.trim()||query.length>120)return result('invalid_query');
   let found;
   try{found=tools.call('search_lesson',{query});}catch{return result('unavailable');}
   const receipts=found.receipts;
   if(!Array.isArray(receipts)||!Number.isInteger(found.returnedCount)||found.returnedCount!==receipts.length||!Number.isInteger(found.matchCount)||found.matchCount<found.returnedCount||found.matchCount>10000||found.returnedCount!==Math.min(5,found.matchCount)||typeof found.truncated!=='boolean'||found.truncated!==(found.matchCount>found.returnedCount)||receipts.some(receipt=>!validateEvidenceClaim({version:1,kind:'source_excerpt',text:receipt.excerpt,receipt},{sources:catalog}).valid))return result('unavailable');
   return result(found.matchCount>1?'ambiguous':receipts.length?'matched':'no_match',receipts,{returnedCount:found.returnedCount,matchCount:found.matchCount,truncated:found.truncated});
  }
 });
}
export function mountDirectLookup({root,sources,seekTo,prepareReview}){
 const $=id=>root.querySelector('#'+id),form=$('direct-form'),input=$('direct-query'),status=$('direct-status'),list=$('direct-results'),actionStatus=$('direct-action-status');
 let lookup,epoch=0;
 try{lookup=createDirectLookup({sources});}catch{applyScreenState(status,'error','Source catalog unavailable; no result is claimed.');}
 const seekScope=createReceiptSeekScope();
 const clear=()=>{seekScope.cancel();epoch++;list.replaceChildren();actionStatus.textContent='';};
 window.addEventListener('pagehide',()=>{if(seekScope.cancel())actionStatus.textContent='Cue seek cancelled on navigation; no seek success is claimed.';});
 input.addEventListener('input',()=>{clear();applyScreenState(status,'idle','Search the revised phrase. Previous source actions are no longer available.');});
 form.addEventListener('submit',event=>{
  event.preventDefault();clear();const current=epoch;
  if(!lookup){applyScreenState(status,'error','Source catalog unavailable; no result is claimed.');return;}
  const found=lookup.search(input.value);
  if(found.state==='invalid_query'){applyScreenState(status,'input_error','Enter 1–120 characters of exact source wording.');return;}
  if(found.state==='unavailable'){applyScreenState(status,'error','The source could not be validated. No result is claimed.');return;}
  if(found.state==='no_match'){applyScreenState(status,'empty','No matching source cue. Abstaining rather than inventing an answer. 0 model calls.');return;}
  applyScreenState(status,'completed',found.truncated?
   found.returnedCount+' of '+found.matchCount+' matching source cues shown (truncated). No single answer selected. Narrow the exact wording for complete coverage. 0 model calls, 0 network requests. Factual truth remains unverified.':
   found.returnedCount+' catalog-matched source cue(s). Search coverage is complete for this literal phrase. '+(found.state==='ambiguous'?'Multiple matches; no single answer selected. ':'')+'0 model calls, 0 network requests. Factual truth remains unverified.');
  for(const receipt of found.receipts){
   const row=createReceiptActionRow({receipt,sources,seekTo,prepareReview,actionStatus,seekScope,isCurrent:()=>current===epoch,seekLabel:'Seek to matched cue',reviewLabel:'Preview matched review card'});
   if(row)list.append(row);
  }
  if(!list.children.length)applyScreenState(status,'error','No current catalog-matched source receipt is available.');
 });
}
