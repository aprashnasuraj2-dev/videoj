import {createSourceTools} from '../../../packages/sutra-source-tools/index.js';
import {snapshotDataArray,snapshotDataRecord,validateReceipt} from '../../../packages/sutra-evidence/index.js';
import {applyScreenState} from './status-state.js';
import {createReceiptActionRow} from './receipt-actions.js';

// This is deliberately lexical retrieval: no embeddings, model or network access.
// Do not synthesize, paraphrase or claim that a matched cue answers the question.
const STOP=new Set(('a an and are as at be by can could did do does for from how i in is it its me of on or our please show source tell that the their there these this those to us video was were what when where which who why will with would you your about explain find give happen happens happened lesson mentioned say says said occur occurs कहाँ कसरी कति के कुन कसलाई मलाई छ छन् हो हुन्छ कहाँनेर पाठमा पाठको यो यी त्यो तथा र वा मा को का कि कृपया देखाउनुहोस् भन्नुहोस्').split(' '));
// Combining marks are part of Indic words; dropping \\p{M} breaks Nepali evidence matching.
const WORDS=/[\p{L}\p{M}\p{N}]+/gu;
const toks=text=>[...(text.normalize('NFKC').toLocaleLowerCase('en').match(WORDS)??[])]
  .filter(w=>w.length>=2&&w.length<=48&&!STOP.has(w));
const snapshot=(state,receipts=[],extra={})=>Object.freeze({
 state,receipts:Object.freeze(receipts.map(r=>Object.freeze({...r}))),modelCalls:0,networkRequests:0,
 truthStatus:'unverified',generation:'none',...extra
});
export function createLocalAnswer({sources,now}={}){
 // Own a complete primitive snapshot. Never revalidate against caller-owned cue
 // references; they may mutate after registration without changing the index.
 const raw=snapshotDataArray(sources,20).map(original=>{
  const source=snapshotDataRecord(original,12);
  return {id:source.id,version:source.version,hash:source.hash,mediaHash:source.mediaHash,duration:source.duration,
   cues:snapshotDataArray(source.cues,500).map(c=>{
    const cue=snapshotDataRecord(c,8);
    return {id:cue.id,start:cue.start,end:cue.end,text:cue.text};
   })};
 });
 const rows=[];
 // Reject an oversized index rather than causing a memory freeze on low-end phones.
 // Even a fully valid source catalog can be too large for in-browser ranking.
 let terms=0;
 for(const original of raw){
  const source=snapshotDataRecord(original,12);
  for(const originalCue of snapshotDataArray(source.cues,500)){
   const cue=snapshotDataRecord(originalCue,8);
   const words=toks(cue.text);
   if(words.length>512)throw Error('LOCAL_INDEX_SIZE');
   const unique=new Set(words);
   if(unique.size>96)throw Error('LOCAL_INDEX_SIZE');
   terms+=unique.size;
   if(rows.length>=5000||terms>160000)throw Error('LOCAL_INDEX_SIZE');
   rows.push({sourceId:source.id,cueId:cue.id,start:cue.start,end:cue.end,words:unique,folded:cue.text.normalize('NFKC').toLocaleLowerCase('en'),rank:rows.length});
  }
 }
 // Single source of truth for actual receipts: the existing strict catalog tool.
 const tools=createSourceTools(raw,now?{now}:{});
 const df=new Map();for(const row of rows)for(const word of row.words)df.set(word,(df.get(word)??0)+1);
 const docCount=rows.length;
 return Object.freeze({query(question){
  if(typeof question!=='string'||!question.trim()||question.length>240)return snapshot('invalid_query');
  const queryTokens=[...new Set(toks(question))].slice(0,18);
  if(!queryTokens.length||queryTokens.length>12)return snapshot('unsupported');
  const scored=[];
  for(const row of rows){
   let matched=0,weight=0;
   for(const word of queryTokens)if(row.words.has(word)){
    matched++;weight+=Math.log1p((docCount-(df.get(word)??0)+.5)/((df.get(word)??0)+.5));
   }
   if(!matched)continue;
   const coverage=matched/queryTokens.length;
   if(coverage<.8||matched===1&&(queryTokens.length!==1||queryTokens[0].length<5))continue;
   const phrase=row.folded.includes(queryTokens.join(' '))?1:0;
   const score=coverage*100+weight*8+phrase*6;
   scored.push({row,score});
  }
  if(!scored.length)return snapshot('no_match');
  scored.sort((a,b)=>b.score-a.score||a.row.rank-b.row.rank);
  const best=scored[0].score,close=scored.filter(v=>best-v.score<4).slice(0,5);
  try{
   const receipts=close.map(({row})=>{
    const receipt=tools.call('read_cue',{sourceId:row.sourceId,cueId:row.cueId}).receipts[0];
    if(validateReceipt(receipt,{sources:raw}).level!=='catalog_matched')throw Error('LOCAL_RECEIPT');
    return receipt;
   });
   return snapshot(close.length===1?'matched':'ambiguous',receipts,{
    explanation:close.length===1?'One lexically matching source excerpt; relevance and factual truth are unverified.':'Multiple near-equal lexical excerpts; no single answer selected.'
   });
  }catch{return snapshot('unavailable');}
 }});
}
export function mountLocalAnswer({root,sources,seekTo,prepareReview}){
 const $=id=>root.querySelector('#'+id);
 const form=$('local-answer-form'),input=$('local-answer-query'),status=$('local-answer-status'),list=$('local-answer-results'),actionStatus=$('local-answer-action-status');
 let lookup=null,unavailable=false,epoch=0;
 // Build only on the first explicit question. Text-first viewers do not pay
 // the memory/CPU cost of indexing a large valid catalog at page startup.
 const clear=()=>{epoch++;list.replaceChildren();actionStatus.textContent='';};
 input.addEventListener('input',()=>{clear();applyScreenState(status,'idle','Question changed. Previous source actions are unavailable.');});
 form.addEventListener('submit',event=>{
  event.preventDefault();clear();const current=epoch;
  if(unavailable){applyScreenState(status,'error','Local ranking unavailable; use exact source search.');return;}
  if(!lookup){try{lookup=createLocalAnswer({sources});}catch{unavailable=true;applyScreenState(status,'error','This catalog exceeds the bounded local index or failed validation; use exact source search.');return;}}
  const found=lookup.query(input.value);
  const messages={
   invalid_query:['input_error','Enter a question of 1–240 characters.'],
   unsupported:['empty','The question has no supported specific source terms; no answer is claimed.'],
   no_match:['empty','No supported lexical source match. Abstaining instead of inventing an answer.'],
   unavailable:['error','A source receipt could not be validated. No answer is claimed.']
  };
  if(messages[found.state]){const [s,m]=messages[found.state];applyScreenState(status,s,m+' 0 model calls, 0 network requests.');return;}
  applyScreenState(status,found.state==='matched'?'completed':'empty',found.explanation+' 0 model calls, 0 network requests. Source consistency only.');
  for(const receipt of found.receipts){
   const row=createReceiptActionRow({receipt,sources,seekTo,prepareReview,actionStatus,isCurrent:()=>current===epoch,seekLabel:'Seek to local source cue',reviewLabel:'Preview local review card'});
   if(row)list.append(row);
  }
  if(!list.children.length)applyScreenState(status,'error','No validated source excerpt could be displayed.');
 });
}
