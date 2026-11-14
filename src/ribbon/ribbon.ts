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

/**
 * Host-neutral woven timeline.
 *
 * Input: chapter/metadata cue geometry.
 * State in: actual playback time and optional telemetry.
 * State out: normalized progress + active chapter through getState/onState.
 *
 * It does not import Video.js and can sit under any player UI.
 */
export function createWovenRibbon(options:WovenRibbonOptions):WovenRibbonHandle {
  const root=document.createElement('div');
  root.className='woven-time-ribbon';
  root.setAttribute('role','group');
  root.setAttribute('aria-label',options.label??'Woven chapter timeline');

  const visual=document.createElement('div');
  visual.className='woven-ribbon-visual';
  const warp=document.createElement('div');
  warp.className='woven-ribbon-warp';
  visual.append(warp);

  const tracks=[{
    id:'chapters',label:'Chapters',color:'#b44332',cues:options.chapters,
  },...(options.tracks??[])];
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
      span.title=`${track.label}: ${cue.label}`;
      lane.append(span);
    });
    visual.append(lane);
  });

  const input=document.createElement('input');
  input.type='range';
  input.className='woven-ribbon-slider';
  input.min='0'; input.max='1'; input.step='0.01'; input.value='0';
  input.setAttribute('aria-label','Seek');

  const readout=document.createElement('output');
  readout.className='woven-ribbon-readout';
  readout.setAttribute('aria-live','polite');
  root.append(visual,input,readout);

  let state:WovenRibbonState={currentTime:0,duration:0,progress:0,activeChapterIndex:-1};
  const layout=()=>{
    const duration=state.duration;
    if(!(duration>0))return;
    root.querySelectorAll<HTMLElement>('.woven-ribbon-cue').forEach(cue=>{
      const start=Number(cue.dataset.start);
      const end=Number(cue.dataset.end);
      cue.style.left=(100*clamp(start,0,duration)/duration).toFixed(3)+'%';
      cue.style.width=(100*clamp(end-start,0,duration)/duration).toFixed(3)+'%';
    });
  };
  const update=(next:WovenRibbonPlaybackState)=>{
    const duration=Number.isFinite(next.duration)&&next.duration>0?next.duration:0;
    const currentTime=duration?clamp(next.currentTime,0,duration):0;
    const progress=duration?currentTime/duration:0;
    const activeChapterIndex=options.chapters.findIndex((cue,index)=>
      currentTime>=cue.start&&(currentTime<cue.end||(index===options.chapters.length-1&&currentTime>=cue.start))
    );
    state={...next,currentTime,duration,progress,activeChapterIndex};
    input.max=String(duration||1);
    input.value=String(currentTime);
    root.style.setProperty('--woven-progress',(progress*100).toFixed(3)+'%');
    root.toggleAttribute('data-buffering',Boolean(next.buffering));
    if(Number.isFinite(next.renditionHeight)&&Number(next.renditionHeight)>0)
      root.style.setProperty('--woven-quality-thread',clamp(2+(Number(next.renditionHeight)-240)/240,2,7).toFixed(2)+'px');
    else root.style.removeProperty('--woven-quality-thread');
    root.dataset.droppedFrames=String(Math.max(0,Math.floor(next.droppedFrames??0)));
    root.querySelectorAll<HTMLElement>('.woven-ribbon-lane[data-track="chapters"] .woven-ribbon-cue')
      .forEach((cue,index)=>cue.toggleAttribute('data-active',index===activeChapterIndex));
    const chapter=activeChapterIndex>=0?options.chapters[activeChapterIndex]?.label:'Unmarked passage';
    readout.value=`${Math.round(progress*100)}% · ${chapter}`;
    layout();
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
