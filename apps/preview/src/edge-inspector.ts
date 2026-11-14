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
const names=['Source','Paused','Ended','Seeking','ReadyState','NetworkState','Time / duration','Volume / muted','Rate','Playback state','Buffering / stalled','Progress','Stage','Chapter','Text tracks','Fullscreen / PiP'];
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
 set('Source',sourceName(m));set('Paused',String(m.paused));set('Ended',String(m.ended));set('Seeking',String(m.seeking));
 set('ReadyState',String(m.readyState));set('NetworkState',String(m.networkState));
 set('Time / duration',sane(m.currentTime)+' / '+sane(m.duration));
 set('Volume / muted',sane(m.volume)+' / '+m.muted);set('Rate',sane(m.playbackRate));
 set('Playback state',shell?.dataset.playbackState||'initializing');
 set('Buffering / stalled',String(shell?.hasAttribute('data-thread-buffering')||false)+' / '+String(shell?.hasAttribute('data-thread-stalled')||false));
 set('Progress',shell?.style.getPropertyValue('--dhago-progress')||'unknown');
 set('Stage',shell?.dataset.weaveStage||'—');set('Chapter',activeCue(m));
 set('Text tracks',Array.from(m.textTracks).map(t=>t.kind+':'+t.mode).join(', ')||'none');
 set('Fullscreen / PiP',String(document.fullscreenEnabled)+' / '+String(document.pictureInPictureEnabled===true));
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
 feedback.textContent='Observing selected specimen. Values are real media state, not simulated network events.';
 paint();
};
new MutationObserver(connect).observe(host,{childList:true});
connect();
actions.addEventListener('click',async event=>{
 const button=(event.target as Element).closest<HTMLButtonElement>('button[data-edge]');
 if(!button)return;
 const m=media;if(!m){feedback.textContent='No specimen is mounted.';return;}
 const action=button.dataset.edge;
 try{
  if(action==='reset'){document.querySelector<HTMLButtonElement>('#lab-restart')?.click();feedback.textContent='Specimen reset requested; reloading native media.';return;}
  if(action==='play'){await m.play();feedback.textContent='Native play() resolved.';}
  else if(action==='pause'){m.pause();feedback.textContent='Native pause() applied.';}
  else if(['start','back','forward','nearend'].includes(action||'')){
   if(!Number.isFinite(m.duration)||m.duration<=0){feedback.textContent='Cannot seek: duration is not finite and positive.';return;}
   const t=action==='start'?0:action==='nearend'?Math.max(0,m.duration-.15):m.currentTime+(action==='back'?-10:10);
   m.currentTime=Math.max(0,Math.min(m.duration,t));feedback.textContent='Requested genuine media seek to '+sane(t)+'s.';
  }else if(action==='mute'){m.muted=!m.muted;feedback.textContent='Muted='+m.muted;}
  else if(action==='zero-volume'){m.volume=0;feedback.textContent='Volume set to zero.';}
  else if(action==='speed'){m.playbackRate=1.5;feedback.textContent='Playback rate 1.5×.';}
  else if(action==='captions'){
    const track=Array.from(m.textTracks).find(t=>t.kind==='captions');
    if(!track){feedback.textContent='No native caption track in this specimen.';return;}
    track.mode=track.mode==='showing'?'disabled':'showing';feedback.textContent='Captions '+track.mode+'.';
  }
 }catch(error){feedback.textContent='Native API rejected action: '+(error instanceof Error?error.name:'unknown error');}
 schedule();
});
