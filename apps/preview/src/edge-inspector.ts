/**
 * Passive inspection of the currently mounted Stress Lab specimen.
 * Does not fake HTMLMediaElement states or mutate the skin's internal DOM.
 */
const host=document.querySelector<HTMLElement>('#lab-player')!;
const metrics=document.querySelector<HTMLElement>('#edge-truth-metrics')!;
const actions=document.querySelector<HTMLElement>('#edge-actions')!;
const feedback=document.querySelector<HTMLElement>('#edge-feedback')!;
let media:HTMLMediaElement|null=null;
let controller:AbortController|null=null;
let scheduled=0;
const names=['Media','Paused','Finished','Seeking','Ready to play','Connection','Position / length','Volume / muted','Playback speed','Playback state','Waiting / stalled','Timeline progress','Visual transition','Current chapter','Captions and chapters','Fullscreen / small window'];
const nodes=new Map<string,HTMLElement>();
for(const name of names){
 const wrap=document.createElement('div');const dt=document.createElement('dt');dt.textContent=name;
 const dd=document.createElement('dd');dd.textContent='—';wrap.append(dt,dd);metrics.append(wrap);nodes.set(name,dd);
}
const set=(key:string,value:string)=>{const el=nodes.get(key);if(el&&el.textContent!==value)el.textContent=value;};
const sane=(n:number)=>Number.isFinite(n)?n.toFixed(2):'unknown';
const sourceName=(m:HTMLMediaElement)=>{try{return new URL(m.currentSrc||m.getAttribute('src')||'',location.href).pathname.split('/').pop()||'unknown';}catch{return 'unknown';}};
const activeCue=(m:HTMLMediaElement)=>{
 try{
 const t=Array.from(m.textTracks).find(t=>t.kind==='chapters'),cues=Array.from(t?.cues||[]);
 return (cues.find((cue,i)=>m.currentTime>=cue.startTime&&(m.currentTime<cue.endTime||(i===cues.length-1&&m.ended))) as VTTCue|undefined)?.text||'—';
 }catch{return '—';}
};
function paint(){
 scheduled=0;const m=media;
 if(!m){for(const name of names)set(name,'—');return;}
 const shell=m.closest<HTMLElement>('media-container');
 set('Media',sourceName(m));set('Paused',String(m.paused));set('Finished',String(m.ended));set('Seeking',String(m.seeking));
 set('Ready to play',['Not loaded','Details received','Current frame ready','Ready to watch','Media buffered'][m.readyState]||'Unknown');set('Connection',['No source','Idle','Loading','Source unavailable'][m.networkState]||'Unknown');
 set('Position / length',sane(m.currentTime)+' / '+sane(m.duration));
 set('Volume / muted',sane(m.volume)+' / '+m.muted);set('Playback speed',sane(m.playbackRate));
 set('Playback state',shell?.dataset.playbackState||'initializing');
 set('Waiting / stalled',String(shell?.hasAttribute('data-thread-buffering')||false)+' / '+String(shell?.hasAttribute('data-thread-stalled')||false));
 set('Timeline progress',Number.isFinite(m.duration)&&m.duration>0?Math.round(100*m.currentTime/m.duration)+'%':'—');
 set('Visual transition',shell?.dataset.weaveStage||'—');set('Current chapter',activeCue(m));
 set('Captions and chapters',Array.from(m.textTracks).map(t=>t.kind+':'+t.mode).join(', ')||'none');
 set('Fullscreen / small window',String(document.fullscreenEnabled)+' / '+String(document.pictureInPictureEnabled===true));
}
function schedule(){
 if(scheduled)return;
 scheduled=requestAnimationFrame(paint);
}
const connect=()=>{
 const next=host.querySelector<HTMLMediaElement>('video, audio, mux-video');
 if(next===media)return;
 controller?.abort();controller=null;media=next;
 if(!media){paint();return;}
 controller=new AbortController();
 for(const ev of ['loadstart','loadedmetadata','durationchange','timeupdate','play','playing','pause','ended','error','seeking','seeked','waiting','stalled','canplay','volumechange','ratechange','emptied']){
  media.addEventListener(ev,schedule,{signal:controller.signal});
 }
 feedback.textContent='These readings follow the selected film or recording as it plays.';
 paint();
};
new MutationObserver(connect).observe(host,{childList:true});
connect();
actions.addEventListener('click',async event=>{
 const button=(event.target as Element).closest<HTMLButtonElement>('button[data-edge]');
 if(!button)return;
 const m=media;if(!m){feedback.textContent='Choose a study to explore playback details.';return;}
 const action=button.dataset.edge;
 try{
  if(action==='reset'){document.querySelector<HTMLButtonElement>('#lab-restart')?.click();feedback.textContent='Restarting this study…';return;}
  if(action==='play'){await m.play();feedback.textContent='Playback started.';}
  else if(action==='pause'){m.pause();feedback.textContent='Playback paused.';}
  else if(['start','back','forward','nearend'].includes(action||'')){
   if(!Number.isFinite(m.duration)||m.duration<=0){feedback.textContent='This recording does not have a seekable ending.';return;}
   const t=action==='start'?0:action==='nearend'?Math.max(0,m.duration-.15):m.currentTime+(action==='back'?-10:10);
   m.currentTime=Math.max(0,Math.min(m.duration,t));feedback.textContent='Moving to '+sane(Math.max(0,Math.min(m.duration,t)))+' seconds.';
  }else if(action==='mute'){m.muted=!m.muted;feedback.textContent=m.muted?'Sound muted.':'Sound on.';}
  else if(action==='zero-volume'){m.volume=0;feedback.textContent='Volume lowered to zero.';}
  else if(action==='speed'){m.playbackRate=1.5;feedback.textContent='Playing at 1.5× speed.';}
  else if(action==='captions'){
    const track=Array.from(m.textTracks).find(t=>t.kind==='captions');
    if(!track){feedback.textContent='This recording does not offer captions.';return;}
    track.mode=track.mode==='showing'?'disabled':'showing';feedback.textContent=track.mode==='showing'?'Captions visible.':'Captions hidden.';
  }
 }catch(error){feedback.textContent='The browser could not complete that action: '+(error instanceof Error?error.name:'unknown error');}
 schedule();
});
