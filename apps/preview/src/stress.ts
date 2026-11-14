import { createDhagoPlayer, type DhagoMetadataTrack } from '@/create-player';
import { chapterVtt, denseChapters, normalizeChapterDrafts, type ChapterDraft } from '@/chapter-fixtures';
import './stress.css';
import { portableStressFixtures } from '@/stress-lab/harness';

type Kind = 'original'|'dhaka'|'pashmina'|'sheep'|'loom'|'broken';
type CueMode = 'four'|'none'|'dense'|'invalid'|'uneven'|'intl'|'late';
type Case = {
  id:string; name:string; category:string; type:'Real playback'|'Controlled fixture'|'Manual verification';
  description:string; source:Kind; cues?:CueMode; captions?:'none'|'multi'|'long'; metadata?:'layered';
  poster?:'missing'|'normal'; width?:string; manual:string;
};
const ORIGINAL='./media/studies-in-thread.mp4';
const BASE_POSTER='./media/dhago-studies-poster.svg';
const layeredMetadata:DhagoMetadataTrack[]=[
  {id:'speaker',label:'Speaker changes (fixture)',kind:'speaker',color:'#9a713c',cues:[
    {start:0,end:20,label:'Speaker A'},{start:20,end:40,label:'Speaker B'},{start:40,end:64,label:'Speaker A'},
  ]},
  {id:'sponsor',label:'Sponsor segment (fixture)',kind:'sponsor',color:'#7c6a89',cues:[
    {start:24,end:32,label:'Sponsor segment'},
  ]},
];
const mediaSources:Record<Kind,{src:string;credit:string;creditUrl?:string;license:string}>={
  original:{src:ORIGINAL,credit:'Studies in Thread — original DHAGO film',license:'Apache-2.0 source / original film'},
  dhaka:{src:'https://upload.wikimedia.org/wikipedia/commons/0/0a/Making_handwoven_DHAKA_fabric_in_Nepal_%E2%80%A2_%E0%A4%A2%E0%A4%BE%E0%A4%95%E0%A4%BE.webm',
    credit:'Oxlaey — Making handwoven Dhaka fabric in Nepal (real Nepalese textile weaving, not pashmina)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:Making_handwoven_DHAKA_fabric_in_Nepal_%E2%80%A2_%E0%A4%A2%E0%A4%BE%E0%A4%95%E0%A4%BE.webm',license:'CC BY-SA 3.0, unmodified'},
  pashmina:{src:'https://upload.wikimedia.org/wikipedia/commons/8/82/Pashmina%2C_The_Gold_of_Kashmir_%26_The_Himalaya.webm',
    credit:'Florenz / Florence Bourgade — The Gold of Kashmir & the Himalaya (Kashmir, not filmed in Nepal)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:Pashmina,_The_Gold_of_Kashmir_%26_The_Himalaya.webm',license:'CC BY 3.0, unmodified'},
  sheep:{src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sheep_grazing_in_the_countryside.webm',
    credit:'François Nguyen — Sheep grazing in the countryside (general sheep footage, not Nepal)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:Sheep_grazing_in_the_countryside.webm',license:'CC BY 2.0, unmodified'},
  loom:{src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/WWS_Loom.ogg',
    credit:'Work With Sounds / Konrad Gutkowski — Loom (industrial loom recording, not Nepal)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:WWS_Loom.ogg',license:'CC BY 4.0, unmodified'},
  broken:{src:'./media/definitely-missing-dhago-source.mp4',credit:'Deliberately missing local source (controlled 404)',license:'Test injection'},
};
const cases:Case[]=[
  {id:'original',name:'Original weave',category:'Baseline',type:'Real playback',description:'The public film, four authored chapters, working media controls and original source.',source:'original',cues:'four',manual:'Play, pause, seek, mute, enable captions, inspect fullscreen and replay.'},
  {id:'wool',name:'Wool / short film',category:'Under ten seconds',type:'Real playback',description:'An eight-second real video of sheep. Its duration is genuinely short; no invented 10-second playback window.',source:'sheep',cues:'none',poster:'missing',manual:'Seek from beginning to end, inspect the clock and replay. This is sheep footage from outside Nepal, not pashmina.'},
  {id:'pashmina',name:'Himalayan pashmina',category:'Long international titles',type:'Controlled fixture',description:'Actual Kashmir pashmina footage with generated Devanagari, Arabic and very long chapter titles. Media is real; cue metadata is test data.',source:'pashmina',cues:'intl',manual:'Inspect title clipping and screen reader direction; verify that 200–400% browser zoom does not lose controls.'},
  {id:'dhaka',name:'Nepal / forty stitches',category:'Dense chapters',type:'Controlled fixture',description:'Real Nepali Dhaka weaving footage with forty evenly spaced generated VTT cues. This tests actual cue density at its real media duration.',source:'dhaka',cues:'dense',manual:'Seek among tiny swatches, use keyboard on the main slider and check readability at 240px. The separate two-hour geometry example is documented; this is not a two-hour movie.'},
  {id:'malformed',name:'Broken chapter file',category:'Out of order / overlaps / gaps',type:'Controlled fixture',description:'A known-bad cue fixture: reversed order, gaps, overlaps and out-of-range ends. The lab validates it, preserving gaps and clamping overlap before attaching the track.',source:'original',cues:'invalid',manual:'Examine the diagnosis below: malformed cue input is normalized, without inventing a chapter for empty gaps.'},
  {id:'uneven',name:'Uneven weave',category:'Extreme chapter ratios',type:'Controlled fixture',description:'A two-second section sits beside a much longer segment. The original 64s film is used, so this does not pretend to contain fifty minutes of footage.',source:'original',cues:'uneven',manual:'Watch the two-second section stay navigable by the timeline slider even when its visual swatch is narrow.'},
  {id:'late',name:'The late arrival',category:'Asynchronous chapter data',type:'Controlled fixture',description:'Playback begins with no chapters. After a four-second controlled delay the VTT chapter track is inserted.',source:'dhaka',cues:'late',manual:'Start playback promptly. Observe the chapter ribbon and title as the metadata arrives. This is a scripted late-load fixture.'},
  {id:'nochapters',name:'Empty loom',category:'No chapter file',type:'Real playback',description:'No chapter track attached; seek and clocks must still work with a linear timeline.',source:'original',cues:'none',manual:'Check the chapter title is absent and keyboard seeking still works.'},
  {id:'captions',name:'Many voices',category:'Caption-language density',type:'Controlled fixture',description:'Two generated caption tracks, including a deliberately long readable caption. The controls must avoid misleading empty selections.',source:'original',cues:'four',captions:'multi',manual:'Open Settings, switch caption language and inspect the long cue against the control shelf.'},
  {id:'layers',name:'Layered weft',category:'Speaker / captions / sponsor metadata',type:'Controlled fixture',description:'The real film is paired with explicitly labeled fixture metadata to prove the ribbon can layer speaker and sponsor intervals without pretending those facts belong to the film.',source:'original',cues:'four',metadata:'layered',manual:'Inspect the separate colored weft lanes. Speaker and sponsor lanes are controlled test metadata; chapters and captions remain real/native tracks.'},
  {id:'nocaptions',name:'Silent labels',category:'Caption absence',type:'Real playback',description:'The film has no caption tracks. Unsupported caption choices must not be offered as available.',source:'pashmina',cues:'none',captions:'none',manual:'Inspect captions availability and the Settings menu; there must be no phantom language.'},
  {id:'audio',name:'Sound of the loom',category:'Audio-only media',type:'Real playback',description:'An actual Ogg audio recording of a historic mechanical loom. Audio is shown in a compact textile panel, not an empty video poster.',source:'loom',cues:'none',manual:'Play/pause, mute, seek and change speed. This recording is from Germany, not Nepal.'},
  {id:'poster',name:'Missing cover',category:'Failed poster request',type:'Controlled fixture',description:'The source is valid, but the poster URL deliberately returns 404. Playback must remain available.',source:'original',cues:'four',poster:'missing',manual:'Inspect the initial screen before playback; verify a broken image icon never blocks controls.'},
  {id:'error',name:'Broken thread',category:'Source 404 / retry',type:'Controlled fixture',description:'The requested media does not exist. The skin must explain the error and let the viewer explicitly retry or open a working backup.',source:'broken',cues:'none',manual:'Open the error dialog and choose the backup; closing the dialog alone is not a recovery.'},
  {id:'narrow',name:'Pinched loom',category:'240px container',type:'Controlled fixture',description:'The genuine player runs inside a 240px container, rather than only a simulated mobile viewport.',source:'original',cues:'four',width:'240px',manual:'Check target reachability, focus, wrap and settings popup clipping.'},
  {id:'manual',name:'Unsimulatable cases',category:'Live DVR / iOS / casting',type:'Manual verification',description:'DVR live-edge, native iOS fullscreen, external AirPlay/casting, sandboxed fullscreen and actual network dropout require their real APIs, media and devices.',source:'original',cues:'four',manual:'This page does not claim a working live stream, iOS fullscreen, native casting or 400% physical browser zoom. Open the real target device and verify these separately.'},
];
const $=<T extends Element=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const portableCases=document.querySelector<HTMLElement>('#portable-cases');
if(portableCases)portableCases.textContent=portableStressFixtures.map(item=>item.label).join(' · ');
const mount=$<HTMLElement>('#lab-player');
let active:Case=cases[0];
let player:HTMLElement|null=null;
let media:HTMLMediaElement|null=null;
let cueUrls:string[]=[];
let specimen=new AbortController();
let metadataTimer:number|undefined;
let stateObserver:MutationObserver|undefined;
const caseList=$<HTMLElement>('#lab-case-list');
const status=$('#state-status');
const position=$('#state-time');
const durationValue=$('#state-duration');
const widthValue=$('#state-width');
const chapterValue=$('#state-chapter');
const seekingValue=$('#state-seeking');
const readyValue=$('#state-ready');
const sourceValue=$('#state-source');
const errorValue=$<HTMLElement>('#state-error');
const diagnostics=$('#lab-diagnostics');
const readyLabels=['No metadata','Metadata loaded','Current frame','Some media ahead','Enough media'];
const mediaErrors:Record<number,string>={
  1:'Playback was canceled.',
  2:'The media connection was interrupted.',
  3:'The media could not be decoded.',
  4:'This source could not be loaded or played.',
};
for(const [i,scenario] of cases.entries()){
  const button=document.createElement('button');
  button.type='button';button.className='lab-case';button.dataset.case=scenario.id;button.setAttribute('aria-pressed',String(i===0));
  button.innerHTML=`<span class="lab-case-num">${String(i+1).padStart(2,'0')}</span><span class="lab-case-title"></span><span class="lab-case-type"></span>`;
  button.querySelector('.lab-case-title')!.textContent=scenario.name;
  button.querySelector('.lab-case-type')!.textContent=scenario.category;
  button.addEventListener('click',()=>render(scenario));
  caseList.append(button);
}
const stamp=(time:number)=>Number.isFinite(time)&&time>=0?Math.floor(time/3600)+':'+String(Math.floor(time/60)%60).padStart(2,'0')+':'+String(Math.floor(time)%60).padStart(2,'0'):'—';
const coreChapters=(duration:number):ChapterDraft[]=>Array.from({length:4},(_,i)=>({start:duration*i/4,end:duration*(i+1)/4,title:['A thread of light','The shape of quiet','Where shadows gather','Coming home'][i]}));
function sampleChapters(mode:CueMode,duration:number):ChapterDraft[] {
  if(mode==='dense'||mode==='late')return denseChapters(duration);
  if(mode==='four')return coreChapters(duration);
  if(mode==='uneven')return [
    {start:0,end:2,title:'The first two seconds'},
    {start:2,end:duration-2,title:'A long, uninterrupted passage of wool and time'},
    {start:duration-2,end:duration,title:'Last two seconds'}];
  if(mode==='intl')return [
    {start:0,end:duration/3,title:'धागो र परम्परागत बुनाइ — a description intentionally much longer than a narrow timeline can display without clipping'},
    {start:duration/3,end:duration*2/3,title:'نسيج من الذاكرة — weaving and memory'},
    {start:duration*2/3,end:duration,title:'The journey of a Himalayan fibre, from the animal to the finished garment'}];
  if(mode==='invalid')return [
    {start:35,end:duration+120,title:'Overruns duration'},
    {start:0,end:12,title:'First'},
    {start:7,end:19,title:'Overlaps first'},
    {start:25,end:31,title:'Gap before this'},
    {start:19,end:19,title:'Zero-length invalid'},
    {start:-3,end:6,title:'Negative start invalid'}];
  return [];
}
function addTrack(target:HTMLMediaElement,kind:'chapters'|'captions',label:string,language:string,data:string) {
  const blob=URL.createObjectURL(new Blob([data],{type:'text/vtt'}));cueUrls.push(blob);
  const track=document.createElement('track');
  track.kind=kind;track.label=label;track.srclang=language;track.src=blob;
  if(kind==='chapters')track.default=true;
  target.append(track);
  // Track cue updates must be available even if the metadata arrived late.
  if(kind==='chapters')track.track.mode='hidden';
}
function attachCues(target:HTMLMediaElement,scenario:Case){
  const duration=target.duration;
  if(scenario.cues&&scenario.cues!=='none'){
    if(Number.isFinite(duration)&&duration>0) {
      const report=normalizeChapterDrafts(sampleChapters(scenario.cues,duration),duration);
      if(report.issues.length)diagnostics.textContent=report.issues.join(' · ');
      addTrack(target,'chapters','Fixture chapter data','en',chapterVtt(report.chapters));
    } else {
      diagnostics.textContent='Chapter fixtures require a finite source duration.';
    }
  }
  const long='A deliberate test caption containing enough ordinary language to stretch across several lines, including the detailed account of a weaver carefully guiding an unusually delicate fibre through the loom.';
  if(scenario.captions==='multi'){
    addTrack(target,'captions','English / long','en',`WEBVTT\n\n00:00:00.000 --> 00:00:08.000\n${long}\n`);
    addTrack(target,'captions','العربية / Arabic','ar','WEBVTT\n\n00:00:00.000 --> 00:00:08.000\nالنسيج يحمل ذاكرة المكان\n');
  }else if(scenario.id==='original'||scenario.id==='narrow'||scenario.id==='poster'){
    // Original short captions come from the actual authored track, not from fixture text.
    const track=document.createElement('track');track.kind='captions';track.label='English descriptions';track.srclang='en';track.src='./media/captions.vtt';target.append(track);
  }
}
function setText(node:Element,value:string){
  if(node.textContent!==value)node.textContent=value;
}
function measureWidth(){setText(widthValue,`${Math.round(mount.getBoundingClientRect().width)}px`);}
function setWidth(value:string){mount.style.width=value;measureWidth();}
function render(scenario:Case){
  active=scenario;
  specimen.abort();specimen=new AbortController();
  window.clearTimeout(metadataTimer);
  stateObserver?.disconnect();
  if(media){media.pause();media.removeAttribute('src');media.load();}
  player?.remove();player=null;media=null;
  cueUrls.forEach(URL.revokeObjectURL);cueUrls=[];
  caseList.querySelectorAll<HTMLButtonElement>('.lab-case').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===scenario.id)));
  $('#case-category').textContent=scenario.category;
  $('#case-title').textContent=scenario.name;
  $('#case-description').textContent=scenario.description;
  $('#case-badge').textContent=scenario.type.toUpperCase();
  $('#lab-manual').innerHTML='<strong>Try this:</strong> ';
  $('#lab-manual').append(document.createTextNode(scenario.manual));
  const credit=mediaSources[scenario.source];
  const creditNode=$('#lab-credit');
  creditNode.replaceChildren(document.createTextNode('Footage / audio: '));
  if(credit.creditUrl){
    const link=document.createElement('a');link.href=credit.creditUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent=credit.credit;
    creditNode.append(link);
  }else{
    creditNode.append(document.createTextNode(credit.credit));
  }
  creditNode.append(document.createTextNode(' · '+credit.license));
  player=createDhagoPlayer({source:credit.src,
    poster:scenario.poster==='missing'?'./media/nonexistent-cover.webp':scenario.source==='original'?BASE_POSTER:undefined,
    fallbackUrl:scenario.source==='broken'?location.origin+location.pathname+'?case=original':undefined,
    mediaKind:scenario.source==='loom'?'audio':'video',
    metadataTracks:scenario.metadata==='layered'?layeredMetadata:undefined,
    surface:$('#lab-surface') instanceof HTMLSelectElement?($<HTMLSelectElement>('#lab-surface').value as 'warm'|'dark'|'minimal'):'warm',
  });
  const container=player.querySelector<HTMLElement>('media-container')!;
  container.setAttribute('data-lab-case',scenario.id);
  if(scenario.source==='broken'){
    const backup=player.querySelector<HTMLAnchorElement>('.dhago-fallback');
    if(backup){backup.href='./?local';backup.hidden=false;}
  }
  mount.replaceChildren(player);
  setWidth(scenario.width??$<HTMLSelectElement>('#lab-width').value);
  const target=player.querySelector<HTMLMediaElement>('video,audio,mux-video')!;
  media=target;
  const chapter=player.querySelector<HTMLElement>('.dhago-chapter-name')!;
  setText(sourceValue,target.tagName==='AUDIO'?'Audio file':target.tagName==='MUX-VIDEO'?'Mux HLS':'Video file');
  diagnostics.textContent='No normalization warnings for this specimen.';
  const update=()=>{
    const state=container.getAttribute('data-playback-state')??'idle';
    setText(status,state.charAt(0).toUpperCase()+state.slice(1));
    setText(position,target.readyState>0?stamp(target.currentTime):'—');
    setText(durationValue,stamp(target.duration));
    setText(chapterValue,chapter.closest('details')?.hidden?'—':chapter.textContent||'—');
    setText(seekingValue,target.seeking?'Yes':'No');
    setText(readyValue,readyLabels[target.readyState]??'Unknown');
    setText(errorValue,target.error?mediaErrors[target.error.code]??'Playback failed.':'');
    errorValue.hidden=!target.error;
  };
  stateObserver=new MutationObserver(update);
  stateObserver.observe(container,{attributes:true,attributeFilter:['data-playback-state']});
  stateObserver.observe(chapter,{childList:true,subtree:true});
  stateObserver.observe(chapter.closest('details')!,{attributes:true,attributeFilter:['hidden']});
  const {signal}=specimen;
  const onMetadata=()=>{
    if(scenario.cues==='late') {
      diagnostics.textContent='Chapter track scheduled four seconds after metadata (controlled late arrival).';
      metadataTimer=window.setTimeout(()=>{
        diagnostics.textContent='Delayed chapter track attached.';
        attachCues(target,scenario);
      },4000);
    } else attachCues(target,scenario);
  };
  if(target.readyState>=1)onMetadata();
  else target.addEventListener('loadedmetadata',onMetadata,{once:true,signal});
  for(const event of ['loadedmetadata','loadeddata','canplay','canplaythrough','durationchange','seeking','seeked','error','emptied','timeupdate'])
    target.addEventListener(event,update,{signal});
  update();
  const url=new URL(location.href);url.searchParams.set('case',scenario.id);history.replaceState(null,'',url);
}
$<HTMLSelectElement>('#lab-width').addEventListener('change',e=>setWidth((e.currentTarget as HTMLSelectElement).value));
$<HTMLSelectElement>('#lab-surface').addEventListener('change',e=>{
  player?.querySelector('media-container')?.setAttribute('data-surface',(e.currentTarget as HTMLSelectElement).value);
});
$('#lab-restart').addEventListener('click',()=>render(active));
$('#lab-motion').addEventListener('click',e=>{
  const b=e.currentTarget as HTMLButtonElement;const on=b.getAttribute('aria-pressed')!=='true';
  b.setAttribute('aria-pressed',String(on));b.textContent=on?'Motion: off':'Motion: on';
  mount.toggleAttribute('data-motion-off',on);
});
window.addEventListener('resize',measureWidth);
render(cases.find(c=>c.id===new URLSearchParams(location.search).get('case'))??cases[0]);
