export interface WovenRibbonCue {
  start:number;
  end:number;
  label:string;
}
export interface WovenRibbonTrack {
  id:string;
  label:string;
  color:string;
  cues:WovenRibbonCue[];
}
export interface WovenRibbonPlaybackState {
  currentTime:number;
  duration:number;
  buffering?:boolean;
  droppedFrames?:number;
  renditionHeight?:number;
}
export interface WovenRibbonState extends WovenRibbonPlaybackState {
  progress:number;
  activeChapterIndex:number;
}
export interface WovenRibbonOptions {
  chapters:WovenRibbonCue[];
  tracks?:WovenRibbonTrack[];
  label?:string;
  onSeek?:(time:number)=>void;
  onState?:(state:WovenRibbonState)=>void;
}
export interface WovenRibbonHandle {
  element:HTMLElement;
  update:(state:WovenRibbonPlaybackState)=>WovenRibbonState;
  getState:()=>WovenRibbonState;
  destroy:()=>void;
}

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const normalizedCues=(cues:WovenRibbonCue[])=>cues.filter(cue=>
  Number.isFinite(cue?.start)&&Number.isFinite(cue?.end)&&cue.end>cue.start&&typeof cue.label==='string'
).sort((a,b)=>a.start-b.start||a.end-b.end).slice(0,120);
const safeColor=(value:string)=>typeof CSS!=='undefined'&&CSS.supports?.('color',value)?value:'#6f7668';
const timeText=(value:number)=>{
  const seconds=Math.max(0,Math.floor(Number.isFinite(value)?value:0));
  const hours=Math.floor(seconds/3600);
  const minutes=Math.floor(seconds/60)%60;
  const tail=String(seconds%60).padStart(2,'0');
  return hours?hours+':'+String(minutes).padStart(2,'0')+':'+tail:minutes+':'+tail;
};

/**
 * Host-neutral woven timeline.
 *
 * Input: chapter/metadata cue geometry.
 * State in: actual playback time and optional telemetry.
 * State out: normalized progress + active chapter through getState/onState.
 *
 * It does not import Video.js or DHAGO and does not own media truth.
 */
export function createWovenRibbon(options:WovenRibbonOptions):WovenRibbonHandle {
  const chapters=normalizedCues(options.chapters);
  const seen=new Set<string>(['chapters']);
  const extraTracks=(options.tracks??[]).filter(track=>{
    if(!track?.id||seen.has(track.id))return false;
    seen.add(track.id);
    return true;
  }).slice(0,5).map(track=>({...track,color:safeColor(track.color),cues:normalizedCues(track.cues)}));

  const root=document.createElement('div');
  root.className='woven-time-ribbon';
  root.setAttribute('role','group');
  root.setAttribute('aria-label',options.label??'Woven chapter timeline');

  const visual=document.createElement('div');
  visual.className='woven-ribbon-visual';
  visual.setAttribute('aria-hidden','true');
  const warp=document.createElement('div');
  warp.className='woven-ribbon-warp';
  visual.append(warp);

  const tracks=[{id:'chapters',label:'Chapters',color:'#b44332',cues:chapters},...extraTracks];
  // Cue geometry is static for one media duration. Playback updates must not
  // repeatedly query and rewrite every lane, especially with 100+ cues.
  const cueNodes:HTMLElement[]=[];
  tracks.forEach((track,index)=>{
    const lane=document.createElement('div');
    lane.className='woven-ribbon-lane';
    lane.dataset.track=track.id;
    lane.style.setProperty('--woven-lane-color',track.color);
    lane.style.setProperty('--woven-lane-index',String(index));
    track.cues.forEach(cue=>{
      const span=document.createElement('span');
      span.className='woven-ribbon-cue';
      span.dataset.start=String(cue.start);
      span.dataset.end=String(cue.end);
      span.title=track.label+': '+cue.label;
      lane.append(span);
      cueNodes.push(span);
    });
    visual.append(lane);
  });

  const input=document.createElement('input');
  input.type='range';
  input.className='woven-ribbon-slider';
  input.min='0';input.max='1';input.step='0.01';input.value='0';
  input.setAttribute('aria-label','Seek');

  const readout=document.createElement('output');
  readout.className='woven-ribbon-readout';
  root.append(visual,input,readout);

  let state:WovenRibbonState={currentTime:0,duration:0,progress:0,activeChapterIndex:-1};
  let layoutDuration=NaN;
  const layout=()=>{
    const duration=state.duration;
    if(!(duration>0)){
      cueNodes.forEach(cue=>{cue.style.left='0%';cue.style.width='0%'});
      return;
    }
    cueNodes.forEach(cue=>{
      const start=clamp(Number(cue.dataset.start),0,duration);
      const end=clamp(Number(cue.dataset.end),0,duration);
      cue.style.left=(100*start/duration).toFixed(3)+'%';
      cue.style.width=(100*Math.max(0,end-start)/duration).toFixed(3)+'%';
    });
  };
  const update=(next:WovenRibbonPlaybackState)=>{
    const duration=Number.isFinite(next.duration)&&next.duration>0?next.duration:0;
    const currentTime=duration?clamp(Number.isFinite(next.currentTime)?next.currentTime:0,0,duration):0;
    const progress=duration?currentTime/duration:0;
    const activeChapterIndex=duration?chapters.findIndex((cue,index)=>{
      const start=clamp(cue.start,0,duration),end=clamp(cue.end,0,duration);
      const finalInclusive=index===chapters.length-1&&Math.abs(currentTime-duration)<.01&&Math.abs(end-duration)<.01;
      return end>start&&currentTime>=start&&(currentTime<end||finalInclusive);
    }):-1;
    state={...next,currentTime,duration,progress,activeChapterIndex};
    input.max=String(duration||1);
    input.disabled=duration===0;
    input.value=String(currentTime);
    root.style.setProperty('--woven-progress',(progress*100).toFixed(3)+'%');
    root.toggleAttribute('data-buffering',Boolean(next.buffering));
    if(Number.isFinite(next.renditionHeight)&&Number(next.renditionHeight)>0)
      root.style.setProperty('--woven-quality-thread',clamp(2+(Number(next.renditionHeight)-240)/240,2,7).toFixed(2)+'px');
    else root.style.removeProperty('--woven-quality-thread');
    root.dataset.droppedFrames=String(Number.isFinite(next.droppedFrames)
      ?Math.max(0,Math.floor(next.droppedFrames!)):0);
    root.querySelectorAll<HTMLElement>('.woven-ribbon-lane[data-track="chapters"] .woven-ribbon-cue')
      .forEach((cue,index)=>cue.toggleAttribute('data-active',index===activeChapterIndex));
    const chapter=activeChapterIndex>=0?chapters[activeChapterIndex]?.label:'Unmarked passage';
    readout.value=Math.round(progress*100)+'% · '+chapter;
    input.setAttribute('aria-valuetext',duration?timeText(currentTime)+' of '+timeText(duration)+'; '+chapter:'Media duration unavailable');
    if(duration!==layoutDuration){
      layoutDuration=duration;
      layout();
    }
    options.onState?.(state);
    return state;
  };
  const onInput=()=>options.onSeek?.(Number(input.value));
  input.addEventListener('input',onInput);
  update(state);
  return {
    element:root,
    update,
    getState:()=>({...state}),
    destroy:()=>{input.removeEventListener('input',onInput);root.remove();},
  };
}
