import {isNativeCueReached} from './seek-policy.js';
import {createReceiptActionRow,createReceiptSeekScope} from './receipt-actions.js';
import {applyLocale,translate} from './localization.js';
// Evidence-linked transcript navigation. Source identity and native media time
// remain authoritative. No synthetic clock, guessed captions, or auto-follow scroll.
const el=(name,className,text)=>{
 const node=document.createElement(name);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const validCue=(cue,duration)=>
 cue&&typeof cue==='object'&&!Array.isArray(cue)&&
 typeof cue.id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(cue.id)&&
 typeof cue.text==='string'&&cue.text.trim()&&cue.text.length<=4000&&
 Number.isFinite(cue.start)&&Number.isFinite(cue.end)&&
 cue.start>=0&&cue.end>cue.start&&cue.end<=duration&&
 (cue.translation===undefined||typeof cue.translation==='boolean')&&
 (cue.language===undefined||typeof cue.language==='string'&&cue.language.length<=40);
const formatTime=n=>{
 const mm=Math.floor(n/60),ss=Math.floor(n%60);
 return String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
};

export function mountTranscriptPanel(host,{source,onSeek,media,readReceipt,prepareReview,seekReceipt,contentMode='synthetic'}={}){
 if(!host||typeof host.replaceChildren!=='function')throw Error('Transcript host missing.');
 host.replaceChildren();
 let disposed=false;
 let currentCues=[];
 const cueScope=createReceiptSeekScope(),inspectionScope=createReceiptSeekScope();
 let lastText='',renderEpoch=0,seekEpoch=0,inspectEpoch=0,selectedCueId=null;
 const inspectable=typeof readReceipt==='function'&&typeof prepareReview==='function'&&typeof seekReceipt==='function';
 const section=el('section','transcript-browser');
 const heading=el('h3',null,'Follow the source cue');heading.dataset.i18n='transcript.follow';
 heading.id='timing-transcript-title';
 section.setAttribute('aria-labelledby',heading.id);
 section.append(heading);
 const meta=el('p','transcript-meta');
 const searchLabel=el('label',null,'Search source transcript');searchLabel.dataset.i18n='transcript.search';
 const input=el('input','transcript-search');
 input.type='search';input.maxLength=160;input.placeholder='Search cue wording';input.dataset.i18nPlaceholder='transcript.placeholder';
 input.autocomplete='off';input.id='timing-transcript-search';
 searchLabel.htmlFor=input.id;
 const state=el('p','transcript-status');
 state.setAttribute('role','status');state.setAttribute('aria-live','polite');
 const list=el('ul','transcript-cues');
 list.setAttribute('aria-label','Transcript search results');
 section.append(meta,searchLabel,input,state,list);
 host.append(section);
 const duration=source?.duration;
 const cues=Array.isArray(source?.cues)&&source.cues.length<=500&&
  Number.isFinite(duration)&&duration>0?source.cues:[];
 const valid=cues.length>0&&cues.every(cue=>validCue(cue,duration))&&
  new Set(cues.map(c=>c.id)).size===cues.length;
 const items=valid?[...cues].sort((a,b)=>a.start-b.start):[];
 const sourceId=typeof source?.id==='string'?source.id:'unknown';
 const version=typeof source?.version==='string'?source.version:'unknown';
 let captionTrackConfirmed=false;
 try{captionTrackConfirmed=Array.from(media?.textTracks??[]).some(track=>
  track.kind==='captions'||track.kind==='subtitles');}catch{}
 meta.textContent=(contentMode==='reviewed'?'Reviewed':'Synthetic')+' source '+sourceId+' · '+version+
  ' · '+(valid?items.length:0)+' cue'+(items.length===1?'':'s')+
  '. Source consistency only; factual truth remains a separate review question. '+
  (captionTrackConfirmed?'A native caption track is present but its accuracy is unverified.':
   'No native caption track is confirmed; the catalog transcript is independent.');
 const buttonMap=new Map();
 const status=text=>{state.textContent=text;};
 function updateActive(){
  if(disposed)return;
  const t=media?.currentTime;
  const actual=typeof t==='number'&&Number.isFinite(t)&&t>=0?t:null;
  for(const {cue,button} of buttonMap.values()){
   const active=!!cue&&actual!==null&&actual>=cue.start&&actual<cue.end;
   button.setAttribute('aria-current',active?'true':'false');
  }
 }
 function onCueKey(event){
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  const controls=[...list.querySelectorAll('.transcript-cue')];
  const pos=controls.indexOf(event.currentTarget);
  if(pos<0)return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?controls.length-1:
   Math.max(0,Math.min(controls.length-1,pos+(event.key==='ArrowDown'?1:-1)));
  controls[next]?.focus();
 }
 function clearInspection(){
  inspectionScope.cancel();inspectEpoch++;selectedCueId=null;
  for(const {inspect,details} of buttonMap.values())if(inspect){inspect.setAttribute('aria-expanded','false');details.replaceChildren();details.hidden=true;}
 }
 function inspectCue(id){
  const entry=buttonMap.get(id);
  if(disposed||!entry?.inspect||!list.contains(entry.inspect))return false;
  if(selectedCueId===id){clearInspection();return false;}
  clearInspection();const epoch=inspectEpoch,render=renderEpoch,locale=document.documentElement.lang||'en';
  const current=()=>!disposed&&render===renderEpoch&&epoch===inspectEpoch&&selectedCueId===id&&list.contains(entry.inspect);
  selectedCueId=id;entry.inspect.setAttribute('aria-expanded','true');entry.details.hidden=false;
  const status=el('p','transcript-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const results=el('ul','transcript-receipt-results');
  try{
   const receipt=readReceipt(id);
   const row=createReceiptActionRow({receipt,sources:[source],seekTo:seekReceipt,prepareReview,actionStatus:status,seekScope:inspectionScope,isCurrent:current,seekLabel:translate('transcript.receipt.seek',locale),reviewLabel:translate('transcript.receipt.review',locale)});
   if(!row||receipt.cueId!==id)throw Error('Receipt identity mismatch.');
   const buttons=row.querySelectorAll('button');buttons[0].dataset.i18n='transcript.receipt.seek';buttons[1].dataset.i18n='transcript.receipt.review';
   results.append(row);const intro=el('p','muted');intro.dataset.i18n='transcript.receipt.matched';entry.details.append(intro,results,status);
  }catch{const error=el('p','transcript-status');error.dataset.i18n='transcript.receipt.unavailable';entry.details.append(error);}
  applyLocale(entry.details,locale);return true;
 }
 function render(){
  if(disposed)return;
  clearInspection();cueScope.cancel();const epoch=++renderEpoch;seekEpoch++;
  const raw=input.value;
  const query=raw.normalize('NFKC').trim().toLocaleLowerCase('en');
  lastText=query;
  buttonMap.clear();list.replaceChildren();
  if(raw.length>160||query.length>640){currentCues=[];status('Transcript query is too long. Shorten it; no partial match is claimed.');return;}
  currentCues=items.filter(cue=>cue.text.normalize('NFKC').toLocaleLowerCase('en').includes(query));
  if(!valid){
   status('No usable transcript cues are available for this media. The local player remains usable.');
   return;
  }
  if(!currentCues.length){
   status('No transcript cues match this search. Clear the query to see all available cues.');
   return;
  }
  for(const cue of currentCues){
   const item=el('li','transcript-item');
   const button=el('button','transcript-cue');
   button.type='button';
   const label=el('span','transcript-range',formatTime(cue.start)+'–'+formatTime(cue.end));
   const text=el('span','transcript-words',cue.text);
   const wordType=el('span','transcript-word-type',cue.translation===true?
    'Translated wording'+(cue.language?' · '+cue.language:'')+' · not an original quotation':
    'Source wording · unverified');
   const wording=el('span','transcript-wording');wording.append(text,wordType);
   button.append(label,wording);
   button.setAttribute('aria-label','Seek to '+formatTime(cue.start)+': '+cue.text);
   button.addEventListener('keydown',onCueKey);
   button.addEventListener('click',async()=>{
    if(disposed||epoch!==renderEpoch||!list.contains(button)||button.dataset.busy==='true')return;
    const operation=++seekEpoch;
    if(typeof onSeek!=='function'){
     status('Seek unavailable: no native media adapter is connected.');
     return;
    }
    const owner=cueScope.begin();
    const current=()=>!disposed&&epoch===renderEpoch&&operation===seekEpoch&&cueScope.current(owner)&&list.contains(button);
    button.dataset.busy='true';button.setAttribute('aria-busy','true');
    try{
     const actual=await onSeek(cue.start,{signal:owner.signal});
     if(!isNativeCueReached(actual,cue.start,cue.end))throw Error('Native seek did not reach the cue.');
     if(current()){status('Native media reached '+formatTime(actual)+'. Source cue '+cue.id+' selected; no factual verification.');updateActive();}
    }catch{
     if(current())status('The cue could not be reached in the current media. No seek success is claimed.');
    }finally{cueScope.finish(owner);delete button.dataset.busy;button.removeAttribute('aria-busy');}
   });
   item.append(button);
   let inspect,details;
   if(inspectable){
    inspect=el('button','transcript-inspect');inspect.type='button';inspect.dataset.i18n='transcript.inspect';
    // Keep the localized visible label in the accessible name; a separate
    // cue ID disambiguates identical words and overlapping cue intervals.
    const detailId='transcript-receipt-'+renderEpoch+'-'+buttonMap.size;
    details=el('div','transcript-receipt');details.id=detailId;details.hidden=true;
    inspect.setAttribute('aria-controls',detailId);inspect.setAttribute('aria-expanded','false');
    inspect.setAttribute('aria-describedby',button.id=detailId+'-cue');
    inspect.dataset.cueId=cue.id;
    inspect.addEventListener('click',()=>{if(!disposed&&epoch===renderEpoch&&list.contains(inspect))inspectCue(cue.id);});
    item.append(inspect,details);
   }
   list.append(item);buttonMap.set(cue.id,{cue,button,inspect,details});
  }
  status(currentCues.length+' of '+items.length+' source cues shown. Use arrow keys within cue controls.');
  updateActive();applyLocale(section,document.documentElement.lang||'en');
 }
 const cancelPending=()=>{const pending=cueScope.cancel();inspectionScope.cancel();if(pending)status('Cue seek cancelled on navigation; no seek success is claimed.');};
 input.addEventListener('input',render);
 media?.addEventListener?.('timeupdate',updateActive);
 media?.addEventListener?.('seeked',updateActive);
 render();
 return Object.freeze({
  cancelPending,
  dispose(){
   cancelPending();disposed=true;renderEpoch++;seekEpoch++;inspectEpoch++;selectedCueId=null;
   media?.removeEventListener?.('timeupdate',updateActive);
   media?.removeEventListener?.('seeked',updateActive);
   host.replaceChildren();
  },
  search(query){
   if(disposed)return;
   input.value=typeof query==='string'?query:'';render();
  },
  inspect:inspectCue,
  state(){return Object.freeze({sourceId,version,query:lastText,queryText:input.value,visibleCueCount:currentCues.length,selectedCueId});}
 });
}
