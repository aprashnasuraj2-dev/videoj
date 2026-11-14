import { createWovenRibbon, type WovenRibbonCue, type WovenRibbonTrack } from '@/ribbon/ribbon';
import '@/ribbon/ribbon.css';
import './ribbon-demo.css';

const video=document.querySelector<HTMLVideoElement>('#ribbon-video')!;
const chapters:WovenRibbonCue[]=[
  {start:0,end:16,label:'A thread of light'},
  {start:16,end:32,label:'The shape of quiet'},
  {start:32,end:48,label:'Where shadows gather'},
  {start:48,end:64,label:'Coming home'},
];
const tracks:WovenRibbonTrack[]=[
  {id:'captions',label:'English descriptive captions',color:'#5f7f86',cues:chapters.map(c=>({...c,label:'Descriptive caption cue'}))},
  {id:'scene-note',label:'Scene notes',color:'#9a713c',cues:[
    {start:0,end:8,label:'Light'}, {start:16,end:24,label:'Quiet'}, {start:32,end:40,label:'Shadow'}, {start:48,end:64,label:'Return'},
  ]},
];
const handles=['#default-ribbon','#minimal-ribbon'].map(selector=>{
  const handle=createWovenRibbon({chapters,tracks,label:'Woven Time Ribbon',onSeek:time=>{video.currentTime=time;}});
  document.querySelector(selector)!.append(handle.element);
  return handle;
});
let dropped=0;
const readDropped=()=>{
  try{return video.getVideoPlaybackQuality?.().droppedVideoFrames??0;}catch{return 0;}
};
const sync=()=>{
  dropped=readDropped();
  handles.forEach(handle=>handle.update({
    currentTime:video.currentTime,
    duration:video.duration,
    buffering:video.readyState<3&&!video.paused&&!video.ended,
    droppedFrames:dropped,
    renditionHeight:video.videoHeight||undefined,
  }));
};
for(const type of ['loadedmetadata','durationchange','timeupdate','playing','waiting','stalled','pause','ended','resize'] as const)
  video.addEventListener(type,sync);
sync();
