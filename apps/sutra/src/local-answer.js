import {createSourceTools} from '../../../packages/sutra-source-tools/index.js';
import {snapshotDataArray,snapshotDataRecord,validateReceipt} from '../../../packages/sutra-evidence/index.js';
import {applyScreenState} from './status-state.js';
import {translate,formatLocalAmbiguity} from './localization.js';
import {createReceiptActionRow,createReceiptSeekScope} from './receipt-actions.js';

// This is deliberately lexical retrieval: no embeddings, model or network access.
// Do not synthesize, paraphrase or claim that a matched cue answers the question.
const STOP=new Set(('a an and are as at be by can could did do does for from how i in is it its me of on or our please show source tell that the their there these this those to us video was were what when where which who why will with would you your about explain find give happen happens happened lesson mentioned say says said occur occurs कहाँ कसरी कति के कुन कसलाई मलाई छ छन् हो हुन्छ कहाँनेर पाठमा पाठको यो यी त्यो तथा र वा मा को का कि कृपया देखाउनुहोस् भन्नुहोस्').split(' '));
// Preserve technical qualifiers as one token: sign, decimal, comparator, ratio,
// range, exponent, percent, and compound identifier. Do not infer equivalence
// between units or reorder digits. Keep Indic combining marks in ordinary words.
const WORDS=/(?:(?:[<>]=?|!=|[≤≥≠=±])\s*)?[+\-−]?\s*(?:\p{Nd}+(?:[.,:/–-]\p{Nd}+)*|[.]\p{Nd}+)(?:[eE][+\-−]?\p{Nd}+)?(?:\s*%|\s*°[\p{L}]?|[\p{L}\p{M}]+)?(?![\p{L}\p{M}\p{N}_]|[._:/-][\p{L}\p{M}\p{N}])|[\p{L}\p{M}\p{N}]+(?:[._:/-][\p{L}\p{M}\p{N}]+)*/gu;
// Case-sensitive unit spellings: e.g. mW is not MW, Mbps is not MBps.
// Uppercase A/I may be terminal labels; lowercase articles remain stopwords.
const UNIT_CASE=new Set('a i ma ka μa v mv kv w mw kw gw μw db dbm hz khz mhz ghz bps kbps mbps gbps mb mib kb kib gb gib ms μs ns s mm cm m km pa kpa mpa gpa ω'.split(' '));
const normalizeTerm=word=>{
 const w=word.replace(/−/g,'-').replace(/^≥/,'>=').replace(/^≤/,'<=').replace(/^≠/,'!=').replace(/\s+/g,'');
 const lower=w.toLocaleLowerCase('en');
 const suffix=w.match(/[\p{L}\p{M}]+$/u)?.[0];
 const number=/^(?:[<>]=?|!=|[=±])?[+\-]?(?:\p{Nd}|[.]\p{Nd})/u.test(w);
 // Compound identifiers retain spelling; numeric quantities retain unit case.
 return UNIT_CASE.has(lower)||number&&suffix&&UNIT_CASE.has(suffix.toLocaleLowerCase('en'))||!number&&/[._:/-]/.test(w)?w:lower;
};
const termsOf=text=>[...(text.normalize('NFKC').match(WORDS)??[])].map(normalizeTerm).filter(w=>!STOP.has(w));
const toks=text=>termsOf(text).filter(w=>w.length<=48);
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
 // Validate the projected catalog before tokenizing untrusted text or building the index.
 const tools=createSourceTools(raw,now?{now}:{});
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
 const df=new Map();for(const row of rows)for(const word of row.words)df.set(word,(df.get(word)??0)+1);
 const docCount=rows.length;
 return Object.freeze({query(question){
  if(typeof question!=='string'||!question.trim()||question.length>240)return snapshot('invalid_query');
  // Do not discard unfamiliar constraints (including single digits/letters or
  // long words) and then call the remainder a match. Fail closed instead.
  const queryTokens=[...new Set(termsOf(question))];
  if(!queryTokens.length||queryTokens.length>12||queryTokens.some(w=>w.length>48))return snapshot('unsupported');
  const scored=[];
  for(const row of rows){
   let matched=0,weight=0;
   for(const word of queryTokens)if(row.words.has(word)){
    matched++;weight+=Math.log1p((docCount-(df.get(word)??0)+.5)/((df.get(word)??0)+.5));
   }
   if(!matched)continue;
   const coverage=matched/queryTokens.length;
   if(coverage!==1||matched===1&&queryTokens[0].length<5)continue;
   const phrase=row.folded.includes(queryTokens.join(' '))?1:0;
   const score=coverage*100+weight*8+phrase*6;
   scored.push({row,score});
  }
  if(!scored.length)return snapshot('no_match');
  scored.sort((a,b)=>b.score-a.score||a.row.rank-b.row.rank);
  // Phrase ranking changes display order, not whether alternatives exist.
  // Cap rendered receipts while retaining the complete match count.
  const close=scored.slice(0,5);
  try{
   const receipts=close.map(({row})=>{
    const receipt=tools.call('read_cue',{sourceId:row.sourceId,cueId:row.cueId}).receipts[0];
    if(validateReceipt(receipt,{sources:raw}).level!=='catalog_matched')throw Error('LOCAL_RECEIPT');
    return receipt;
   });
   return snapshot(scored.length===1?'matched':'ambiguous',receipts,{
    matchCount:scored.length,truncated:scored.length>close.length,
    explanation:scored.length===1?'One lexically matching source excerpt; relevance and factual truth are unverified.':'Multiple lexical excerpts; up to five shown; no single answer selected.'
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
 const show=(state,key,found)=>{
  status.dataset.i18n=key;
  delete status.dataset.matchCount;delete status.dataset.returnedCount;delete status.dataset.truncated;
  if(found){status.dataset.matchCount=String(found.matchCount);status.dataset.returnedCount=String(found.receipts.length);status.dataset.truncated=String(found.truncated);}
  const locale=document.documentElement.lang||'en';
  applyScreenState(status,state,found?.state==='ambiguous'?formatLocalAmbiguity(found.matchCount,found.receipts.length,locale):translate(key,locale));
 };
 const seekScope=createReceiptSeekScope();
 const clear=()=>{seekScope.cancel();epoch++;list.replaceChildren();actionStatus.textContent='';};
 window.addEventListener('pagehide',()=>{if(seekScope.cancel())actionStatus.textContent='Cue seek cancelled on navigation; no seek success is claimed.';});
 input.addEventListener('input',()=>{clear();show('idle','local.status.changed');});
 form.addEventListener('submit',event=>{
  event.preventDefault();clear();const current=epoch;
  if(unavailable){show('error','local.status.index');return;}
  if(!lookup){try{lookup=createLocalAnswer({sources});}catch{unavailable=true;show('error','local.status.index');return;}}
  const found=lookup.query(input.value);
  const messages={
   invalid_query:['input_error','local.status.invalid'],
   unsupported:['empty','local.status.unsupported'],
   no_match:['empty','local.status.nomatch'],
   unavailable:['error','local.status.unavailable']
  };
  if(messages[found.state]){const [state,key]=messages[found.state];show(state,key);return;}
  show(found.state==='matched'?'completed':'empty',found.state==='matched'?'local.status.matched':found.truncated?'local.status.truncated':'local.status.ambiguous',found);
  for(const receipt of found.receipts){
   const row=createReceiptActionRow({receipt,sources,seekTo,prepareReview,actionStatus,seekScope,isCurrent:()=>current===epoch,seekLabel:translate('local.action.seek',document.documentElement.lang||'en'),reviewLabel:translate('local.action.review',document.documentElement.lang||'en')});
   if(row){
    const buttons=row.querySelectorAll('button');
    if(buttons[0])buttons[0].dataset.i18n='local.action.seek';
    if(buttons[1])buttons[1].dataset.i18n='local.action.review';
    list.append(row);
   }
  }
  if(!list.children.length)show('error','local.status.unavailable');
 });
}
