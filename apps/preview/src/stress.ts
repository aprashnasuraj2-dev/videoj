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
  {id:'speaker',label:'Speaker passages (illustration)',kind:'speaker',color:'#9a713c',cues:[
    {start:0,end:20,label:'Speaker A'},{start:20,end:40,label:'Speaker B'},{start:40,end:64,label:'Speaker A'},
  ]},
  {id:'sponsor',label:'Sponsor passage (illustration)',kind:'sponsor',color:'#7c6a89',cues:[
    {start:24,end:32,label:'Sponsor segment'},
  ]},
];
// Commons media is credited at its source. Prefer stable, browser-playable upload URLs
// over wiki redirects, and retain the original downloads as independent backups.
const mediaSources:Record<Kind,{src:string;credit:string;creditUrl?:string;license:string;fallbacks?:readonly string[]}>={
  original:{src:ORIGINAL,credit:'Studies in Thread — original DHAGO film',license:'Original production'},
  dhaka:{src:'https://upload.wikimedia.org/wikipedia/commons/0/0a/Making_handwoven_DHAKA_fabric_in_Nepal_%E2%80%A2_%E0%A4%A2%E0%A4%BE%E0%A4%95%E0%A4%BE.webm',
    credit:'Oxlaey — Making handwoven Dhaka fabric in Nepal (real Nepalese textile weaving, not pashmina)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:Making_handwoven_DHAKA_fabric_in_Nepal_%E2%80%A2_%E0%A4%A2%E0%A4%BE%E0%A4%95%E0%A4%BE.webm',license:'CC BY-SA 3.0, unmodified'},
  pashmina:{src:'https://upload.wikimedia.org/wikipedia/commons/8/82/Pashmina%2C_The_Gold_of_Kashmir_%26_The_Himalaya.webm',
    credit:'Florenz / Florence Bourgade — The Gold of Kashmir & the Himalaya (Kashmir, not filmed in Nepal)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:Pashmina,_The_Gold_of_Kashmir_%26_The_Himalaya.webm',license:'CC BY 3.0, unmodified'},
  sheep:{src:'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/27/Sheep_grazing_in_the_countryside.webm/Sheep_grazing_in_the_countryside.webm.480p.vp9.webm',
    fallbacks:['https://upload.wikimedia.org/wikipedia/commons/2/27/Sheep_grazing_in_the_countryside.webm'],
    credit:'François Nguyen — Sheep grazing in the countryside (general sheep footage, not Nepal)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:Sheep_grazing_in_the_countryside.webm',license:'CC BY 2.0, unmodified'},
  loom:{src:'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e8/WWS_Loom.ogg/WWS_Loom.ogg.mp3',
    fallbacks:['https://upload.wikimedia.org/wikipedia/commons/e/e8/WWS_Loom.ogg'],
    credit:'Work With Sounds / Konrad Gutkowski — Loom (industrial loom recording, not Nepal)',
    creditUrl:'https://commons.wikimedia.org/wiki/File:WWS_Loom.ogg',license:'CC BY 4.0, unmodified'},
  broken:{src:'./media/definitely-missing-dhago-source.mp4',credit:'Intentionally unavailable media for the recovery demonstration',license:'Demonstration only'},
};
const cases:Case[]=[
  {id:'original',name:'Original weave',category:'The signature film',type:'Real playback',description:'Begin with Studies in Thread: the original 64-second motion study, with four chapters, descriptive captions and familiar controls.',source:'original',cues:'four',manual:'Watch the film, move between chapters, turn captions on and off, then try fullscreen and replay.'},
  {id:'wool',name:'A fleeting moment',category:'An eight-second film',type:'Real playback',description:'A real eight-second glimpse of sheep grazing. Even a very short story deserves a readable timeline and a graceful ending.',source:'sheep',cues:'none',poster:'missing',manual:'Play the full clip, move near the end and replay. The footage was filmed outside Nepal.'},
  {id:'pashmina',name:'The pashmina journey',category:'Long titles, many languages',type:'Controlled fixture',description:'Explore Kashmir pashmina footage alongside long chapter titles in multiple writing systems. The chapter labels are created for this study; the footage is authentic.',source:'pashmina',cues:'intl',manual:'Read the long chapter names, try the keyboard, then enlarge the page to see whether controls remain within reach.'},
  {id:'dhaka',name:'Forty stitches',category:'A densely woven timeline',type:'Controlled fixture',description:'Real footage of Nepali Dhaka weaving meets forty closely spaced chapter markers. Notice how the ribbon changes without losing the ability to seek.',source:'dhaka',cues:'dense',manual:'Move through the smallest chapter segments, use the arrow keys and try the narrowest player width. The forty markers are study data, not original film chapters.'},
  {id:'malformed',name:'When chapters disagree',category:'Overlapping chapter timings',type:'Controlled fixture',description:'A chapter list arrives with gaps, overlaps and inconsistent timing. The same original film lets you see how the timeline treats those irregularities.',source:'original',cues:'invalid',manual:'Explore the chapter boundaries and timing notes. Empty gaps stay empty rather than being disguised as new chapters.'},
  {id:'uneven',name:'Uneven weave',category:'Contrasting chapter lengths',type:'Controlled fixture',description:'A two-second chapter sits beside a much longer passage of the original film. Both remain part of the same continuous timeline.',source:'original',cues:'uneven',manual:'Try to find and select the smallest segment. The film itself remains the original 64-second recording.'},
  {id:'late',name:'The late arrival',category:'Chapters that arrive later',type:'Controlled fixture',description:'The Nepali weaving footage begins before its chapter information is available. Four seconds later, the ribbon gains its chapter markers.',source:'dhaka',cues:'late',manual:'Start the film and watch the chapter ribbon appear after the brief intentional delay.'},
  {id:'nochapters',name:'An open thread',category:'A film without chapters',type:'Real playback',description:'The original film plays without chapter markers. Its timeline, clock and seeking controls still have a clear purpose.',source:'original',cues:'none',manual:'Use the timeline and arrow keys even though no chapter names are shown.'},
  {id:'captions',name:'Many voices',category:'Captions across languages',type:'Controlled fixture',description:'Two sample caption tracks, including an unusually long line, reveal how the player handles crowded text and language selection.',source:'original',cues:'four',captions:'multi',manual:'Open the caption choices, change languages and check that long captions stay legible.'},
  {id:'layers',name:'Layers of the weave',category:'Additional story markers',type:'Controlled fixture',description:'The original film is paired with illustrative speaker and sponsor intervals to show how different kinds of information share the ribbon.',source:'original',cues:'four',metadata:'layered',manual:'Look for separate marker lanes. Speaker and sponsor labels are illustrative, not claims about the film.'},
  {id:'nocaptions',name:'Nothing to translate',category:'A film without captions',type:'Real playback',description:'Authentic Kashmir pashmina footage is presented without caption tracks. The player should never promise a language that is not available.',source:'pashmina',cues:'none',captions:'none',manual:'Open the settings and confirm that unavailable captions are not offered.'},
  {id:'audio',name:'The sound of weaving',category:'Sound without a picture',type:'Real playback',description:'Listen to an authentic recording of a historic mechanical loom. DHAGO keeps the controls useful without pretending the sound has a video image.',source:'loom',cues:'none',manual:'Play, pause, seek, mute and change speed. This loom was recorded in Germany, not Nepal.'},
  {id:'poster',name:'When the cover is missing',category:'Missing image, working film',type:'Controlled fixture',description:'The original film remains playable even when its cover image is deliberately unavailable.',source:'original',cues:'four',poster:'missing',manual:'Before playback, look for a clear playable surface rather than a broken-image obstruction.'},
  {id:'error',name:'When the thread breaks',category:'Playback interruption and recovery',type:'Controlled fixture',description:'A deliberately unavailable media address shows what happens when a film cannot load. The recovery link leads back to the working original.',source:'broken',cues:'none',manual:'Read the explanation, try again and use the working-film link. This interruption is intentional, not a broken gallery video.'},
  {id:'narrow',name:'A narrow frame',category:'A 240-pixel player',type:'Controlled fixture',description:'The real film and its controls settle into just 240 pixels of width. A smaller space should not mean smaller clarity.',source:'original',cues:'four',width:'240px',manual:'Check whether buttons remain reachable, keyboard focus is visible and menus fit inside the narrow frame.'},
  {id:'manual',name:'Beyond the browser',category:'Real devices and live playback',type:'Manual verification',description:'Some experiences need a genuine live source, a physical device or assistive technology. The original film remains available while you review what cannot be recreated here.',source:'original',cues:'four',manual:'Use the guide below with an iPhone, a real live stream, a screen reader or a browser at high zoom. A simulation is never evidence of those device capabilities.'},
];
const $=<T extends Element=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const portableCases=document.querySelector<HTMLElement>('#portable-cases');
if(portableCases)portableCases.textContent=`${portableStressFixtures.length} playback conditions to explore — from tight spaces and dense chapters to missing covers, sound-only recordings and viewing preferences.`;
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
      if(report.issues.length)diagnostics.textContent='Timing notes: '+report.issues.join(' · ');
      addTrack(target,'chapters','Chapter markers','en',chapterVtt(report.chapters));
    } else {
      diagnostics.textContent='Chapter markers will appear once the film length is known.';
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
  $('#case-badge').textContent=scenario.id==='original'?'ORIGINAL FILM':scenario.type==='Real playback'?'REAL MEDIA':scenario.type==='Manual verification'?'DEVICE REVIEW':'GUIDED STUDY';
  const manualSpotlight=$<HTMLElement>('#manual-spotlight');manualSpotlight.hidden=scenario.id!=='manual';
  $('#lab-manual').innerHTML='<strong>Look closer:</strong> ';
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
  // The Commons link is a usable escape hatch if neither media rendition loads.
  if(scenario.source!=='broken' && credit.creditUrl){
    const backup=player.querySelector<HTMLAnchorElement>('.dhago-fallback');
    if(backup){backup.href=credit.creditUrl;backup.target='_blank';backup.rel='noopener noreferrer';backup.textContent=scenario.source==='loom'?'Listen at Wikimedia Commons':'Watch at Wikimedia Commons';backup.hidden=false;}
  }
  container.setAttribute('data-lab-case',scenario.id);
  if(scenario.source==='broken'){
    const backup=player.querySelector<HTMLAnchorElement>('.dhago-fallback');
    if(backup){backup.href='./stress.html?case=original';backup.hidden=false;}
  }
  mount.replaceChildren(player);
  setWidth(scenario.width??$<HTMLSelectElement>('#lab-width').value);
  const target=player.querySelector<HTMLMediaElement>('video,audio,mux-video')!;
  media=target;
  // Sound-only playback is an intentional audible experience, not a silent visual specimen.
  if(scenario.source==='loom'){target.muted=false;target.volume=1;}
  const chapter=player.querySelector<HTMLElement>('.dhago-chapter-name')!;
  setText(sourceValue,target.tagName==='AUDIO'?'Recording':target.tagName==='MUX-VIDEO'?'Stream':'Film');
  diagnostics.textContent=scenario.source==='loom'
    ? 'Press Play to hear the loom. Sound starts unmuted; your device volume still matters.'
    : 'The chapter timing for this study is ready to explore.';
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
      diagnostics.textContent='Chapter markers will appear four seconds after the film becomes ready.';
      metadataTimer=window.setTimeout(()=>{
        diagnostics.textContent='Chapter markers are now available.';
        attachCues(target,scenario);
      },4000);
    } else attachCues(target,scenario);
  };
  if(target.readyState>=1)onMetadata();
  else target.addEventListener('loadedmetadata',onMetadata,{once:true,signal});
  // If Wikimedia serves an unavailable rendition, move once to its original file.
  // This avoids a redirect loop and never labels a failed external source as working.
  const backups=[...(credit.fallbacks??[])];
  let attempted=0;
  let askedToPlay=false;
  target.addEventListener('play',()=>{askedToPlay=true;},{signal});
  target.addEventListener('pause',()=>{if(!target.error)askedToPlay=false;},{signal});
  target.addEventListener('error',()=>{
    if(!target.error)return;
    const next=backups[attempted++];
    if(!next){
      if(credit.creditUrl)diagnostics.textContent='This recording could not play here. Try its credited Wikimedia Commons page below, or choose another study.';
      return;
    }
    diagnostics.textContent='That version did not load. Trying the original recording instead…';
    const resume=askedToPlay;
    target.src=next;
    target.load();
    player?.querySelector<HTMLElement>('media-dialog-close')?.click();
    if(resume)target.addEventListener('canplay',()=>{void target.play().catch(()=>{});},{once:true,signal});
  },{signal});
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
