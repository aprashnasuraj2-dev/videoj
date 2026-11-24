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
 typeof cue.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(cue.id)&&
 typeof cue.text==='string'&&cue.text.trim()&&cue.text.length<=4000&&
 Number.isFinite(cue.start)&&Number.isFinite(cue.end)&&
 cue.start>=0&&cue.end>cue.start&&cue.end<=duration&&
 (cue.translation===undefined||typeof cue.translation==='boolean')&&
 (cue.language===undefined||typeof cue.language==='string'&&cue.language.length<=40);
const formatTime=n=>{
 const mm=Math.floor(n/60),ss=Math.floor(n%60);
 return String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
};

export function mountTranscriptPanel(host,{source,onSeek,media,contentMode='synthetic'}={}){
 if(!host||typeof host.replaceChildren!=='function')throw Error('Transcript host missing.');
 host.replaceChildren();
 let disposed=false;
 let currentCues=[];
 let lastText='';
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
  for(const [id,button] of buttonMap){
   const cue=currentCues.find(c=>c.id===id);
   const active=!!cue&&actual!==null&&actual>=cue.start&&actual<cue.end;
   button.setAttribute('aria-current',active?'true':'false');
  }
 }
 function onCueKey(event){
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  const controls=[...list.querySelectorAll('button')];
  const pos=controls.indexOf(event.currentTarget);
  if(pos<0)return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?controls.length-1:
   Math.max(0,Math.min(controls.length-1,pos+(event.key==='ArrowDown'?1:-1)));
  controls[next]?.focus();
 }
 function render(){
  if(disposed)return;
  const query=input.value.normalize('NFKC').trim().slice(0,160).toLocaleLowerCase('en');
  lastText=query;
  currentCues=items.filter(cue=>cue.text.normalize('NFKC').toLocaleLowerCase('en').includes(query));
  buttonMap.clear();list.replaceChildren();
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
    if(button.dataset.busy==='true')return;
    if(typeof onSeek!=='function'){
     status('Seek unavailable: no native media adapter is connected.');
     return;
    }
    button.dataset.busy='true';button.setAttribute('aria-busy','true');
    try{
     const actual=await onSeek(cue.start);
     if(!Number.isFinite(actual)||Math.abs(actual-cue.start)>1)throw Error('Native seek did not reach the cue.');
     status('Native media reached '+formatTime(actual)+'. Source cue '+cue.id+' selected; no factual verification.');
     updateActive();
    }catch{
     status('The cue could not be reached in the current media. No seek success is claimed.');
    }finally{delete button.dataset.busy;button.removeAttribute('aria-busy');}
   });
   item.append(button);list.append(item);buttonMap.set(cue.id,button);
  }
  status(currentCues.length+' of '+items.length+' source cues shown. Use arrow keys within cue controls.');
  updateActive();
 }
 input.addEventListener('input',render);
 media?.addEventListener?.('timeupdate',updateActive);
 media?.addEventListener?.('seeked',updateActive);
 render();
 return Object.freeze({
  dispose(){
   disposed=true;
   media?.removeEventListener?.('timeupdate',updateActive);
   media?.removeEventListener?.('seeked',updateActive);
   host.replaceChildren();
  },
  search(query){
   if(disposed)return;
   input.value=String(query??'').slice(0,160);render();
  },
  state(){return Object.freeze({sourceId,version,query:lastText,visibleCueCount:currentCues.length});}
 });
}
