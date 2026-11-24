import {createSourceTools} from '../../../packages/sutra-source-tools/index.js';
import {validateEvidenceClaim} from '../../../packages/sutra-evidence/index.js';
import {applyScreenState} from './status-state.js';

const result=(state,receipts=[])=>Object.freeze({state,receipts:Object.freeze(receipts.map(r=>Object.freeze({...r}))),modelCalls:0,networkRequests:0,truthStatus:'unverified'});
export function createDirectLookup({sources,now}={}){
 const catalog=structuredClone(sources),tools=createSourceTools(catalog,now?{now}:{});
 return Object.freeze({
  search(query){
   if(typeof query!=='string'||!query.trim()||query.length>120)return result('invalid_query');
   let receipts;
   try{receipts=tools.call('search_lesson',{query}).receipts;}catch{return result('unavailable');}
   if(!Array.isArray(receipts)||receipts.some(receipt=>!validateEvidenceClaim({version:1,kind:'source_excerpt',text:receipt.excerpt,receipt},{sources:catalog}).valid))return result('unavailable');
   return result(receipts.length?'matched':'no_match',receipts);
  }
 });
}
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function mountDirectLookup({root,sources,seekTo,prepareReview}){
 const $=id=>root.querySelector('#'+id),form=$('direct-form'),input=$('direct-query'),status=$('direct-status'),list=$('direct-results'),actionStatus=$('direct-action-status');
 let lookup,epoch=0;
 try{lookup=createDirectLookup({sources});}catch{applyScreenState(status,'error','Source catalog unavailable; no result is claimed.');}
 const clear=()=>{epoch++;list.replaceChildren();actionStatus.textContent='';};
 input.addEventListener('input',()=>{clear();applyScreenState(status,'idle','Search the revised phrase. Previous source actions are no longer available.');});
 form.addEventListener('submit',event=>{
  event.preventDefault();clear();const current=epoch;
  if(!lookup){applyScreenState(status,'error','Source catalog unavailable; no result is claimed.');return;}
  const found=lookup.search(input.value);
  if(found.state==='invalid_query'){applyScreenState(status,'input_error','Enter 1–120 characters of exact source wording.');return;}
  if(found.state==='unavailable'){applyScreenState(status,'error','The source could not be validated. No result is claimed.');return;}
  if(found.state==='no_match'){applyScreenState(status,'empty','No matching source cue. Abstaining rather than inventing an answer. 0 model calls.');return;}
  applyScreenState(status,'completed',found.receipts.length+' catalog-matched source cue(s). 0 model calls, 0 network requests. Factual truth remains unverified.');
  for(const receipt of found.receipts){
   const row=el('li'),identity=el('p',receipt.sourceId+' / '+receipt.sourceVersion+' · '+receipt.cueId+' · '+receipt.start+'–'+receipt.end+' s');
   const excerpt=el('blockquote',receipt.excerpt),actions=el('div');actions.className='actions';
   const seek=el('button','Seek to matched cue'),review=el('button','Preview matched review card');seek.type=review.type='button';
   seek.addEventListener('click',async()=>{
    if(current!==epoch||seek.disabled)return;seek.disabled=true;
    actionStatus.textContent='Checking native media availability…';
    try{const actual=await seekTo(receipt.start);if(!Number.isFinite(actual)||Math.abs(actual-receipt.start)>1)throw Error('Not reached');
     if(current===epoch)actionStatus.textContent='Native media reached the matched source cue. No factual verification.';
    }catch{if(current===epoch)actionStatus.textContent='Cue seek unavailable. Load the media explicitly; no seek success is claimed.';}
    finally{seek.disabled=false;}
   });
   review.addEventListener('click',()=>{
    if(current!==epoch)return;
    try{actionStatus.textContent=prepareReview(receipt)===true?'Exact receipt preview opened; no review saved yet.':'Review unavailable; nothing was saved.';}
    catch{actionStatus.textContent='Review unavailable; nothing was saved.';}
   });
   actions.append(seek,review);row.append(identity,excerpt,actions);list.append(row);
  }
 });
}
