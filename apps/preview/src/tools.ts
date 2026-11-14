import { createDhagoPlayer } from '@/create-player';
import './tools.css';

const SOURCE = './media/studies-in-thread.mp4';
const q = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const player = createDhagoPlayer({source: SOURCE, compatibilitySource:'./media/studies-in-thread.webm',poster:'./media/poster.webp',chapters:'./media/chapters.vtt',captions:'./media/captions.vtt'});
q('#tools-player').append(player);
const video = player.querySelector<HTMLVideoElement>('video')!;
const container = player.querySelector<HTMLElement>('media-container')!;
const metrics = q<HTMLElement>('#tools-metrics');
const chapterNode = q<HTMLElement>('#tools-chapter');
const feedback = q<HTMLElement>('#tools-feedback');
const snapshotNode = q<HTMLElement>('#tools-snapshot');
const eventRows = q<HTMLTableSectionElement>('#tools-event-rows');
const eventCount = q<HTMLElement>('#tools-event-count');
const maxEvents = 120;
const eventTypes = ['loadstart','loadedmetadata','loadeddata','durationchange','canplay','canplaythrough','play','playing','pause','timeupdate','progress','seeking','seeked','waiting','stalled','suspend','emptied','ended','error','volumechange','ratechange'] as const;
type RecordEvent = {event:string; seconds:number|null; readyState:number; networkState:number; dhago:string};
const events:RecordEvent[] = [];
let logging = true;
let lastNoisy = 0;
let pendingFrame = 0;
let lastMetrics = 0;
let pendingStatus = '';
const finite = (n:number):n is number => Number.isFinite(n);
const safeNumber = (n:number) => finite(n) ? Number(n.toFixed(3)) : null;
const clamp = (x:number,min:number,max:number) => Math.min(max,Math.max(min,x));
const stamp = (n:number) => finite(n) && n>=0 ? new Date(n*1000).toISOString().slice(11,19) : '—';
const safeSource = () => {
  try {const u=new URL(video.currentSrc||video.getAttribute('src')||SOURCE,location.href);return u.pathname.split('/').at(-1)||'unknown';}
  catch{return 'unknown';}
};
const timeRanges = (r:TimeRanges) => {
 const out:Array<[number,number]>=[];
 try {for(let i=0;i<Math.min(r.length,100);i++){const a=r.start(i),b=r.end(i);if(finite(a)&&finite(b)&&a>=0&&b>=a)out.push([safeNumber(a)!,safeNumber(b)!]);}}catch{}
 return out;
};
const chapters = () => Array.from(video.textTracks||[]).find(t=>t.kind==='chapters');
const activeChapter = () => {
 const track=chapters();const t=video.currentTime;
 try {const cues=Array.from(track?.cues||[]);
 const match=cues.find((cue,i)=>t>=cue.startTime&&(t<cue.endTime||(i===cues.length-1&&video.ended)));
 return match&&'text' in match?String((match as VTTCue).text):'—';
 }catch{return '—';}
};
const activeCaptions = () => Array.from(video.textTracks||[]).filter(t=>t.kind==='captions'&&t.mode==='showing').map(t=>t.label);
const snapshot = () => ({
  version:1,source:safeSource(),capturedAt:new Date().toISOString(),
  native:{currentTime:safeNumber(video.currentTime),duration:safeNumber(video.duration),paused:video.paused,ended:video.ended,seeking:video.seeking,readyState:video.readyState,networkState:video.networkState,volume:safeNumber(video.volume),muted:video.muted,playbackRate:safeNumber(video.playbackRate),errorCode:video.error?.code??null,buffered:timeRanges(video.buffered),seekable:timeRanges(video.seekable),captions:activeCaptions()},
  dhago:{playbackState:container.dataset.playbackState||'idle',weaveStage:container.dataset.weaveStage||null,
    progress:container.style.getPropertyValue('--dhago-progress')||null,stagePhase:container.style.getPropertyValue('--dhago-stage-phase')||null,
    complete:container.hasAttribute('data-weave-complete'),buffering:container.hasAttribute('data-thread-buffering'),stalled:container.hasAttribute('data-thread-stalled'),
    seeking:container.hasAttribute('data-thread-seeking'),chapter:activeChapter()},
  support:{fullscreen:document.fullscreenEnabled,pictureInPicture:document.pictureInPictureEnabled===true}
});
const createMetrics = () => {
 for(const label of ['Source','Playback','Time / duration','Progress','Paused / ended','Seeking','Ready / network','Buffering / stalled','Stage / phase','Volume / muted','Rate','Captions','Buffered ranges','Seekable ranges','Error']){
 const dt=document.createElement('dt');dt.textContent=label;
 const dd=document.createElement('dd');dd.dataset.metric=label;
 metrics.append(dt,dd);
 }
};
createMetrics();
const setMetric=(name:string,value:string)=>{const el=metrics.querySelector<HTMLElement>('[data-metric="'+name+'"]');if(el&&el.textContent!==value)el.textContent=value;};
const rangeDescription=(r:Array<[number,number]>)=>r.length?r.map(x=>stamp(x[0])+'–'+stamp(x[1])).join(', '):'none';
const drawRange=(selector:string, intervals:Array<[number,number]>,duration:number)=>{
 const host=q<HTMLElement>(selector);
 const nodes:HTMLElement[]=[];
 if(finite(duration)&&duration>0)for(const [a,b] of intervals){
  const left=clamp(a/duration*100,0,100),right=clamp(b/duration*100,0,100);
  if(right<=left)continue;
  const line=document.createElement('span');line.className='range-segment';
  line.style.left=left.toFixed(3)+'%';line.style.width=(right-left).toFixed(3)+'%';
  nodes.push(line);
 }
 host.replaceChildren(...nodes);
};
const render = () => {
 pendingFrame=0;
 const snap=snapshot(),n=snap.native,d=snap.dhago;
 const ratio=n.duration&&n.currentTime!==null?clamp(n.currentTime/n.duration,0,1):null;
 setMetric('Source',snap.source);
 setMetric('Playback',d.playbackState);
 setMetric('Time / duration',stamp(video.currentTime)+' / '+stamp(video.duration));
 setMetric('Progress',ratio===null?'unknown':(ratio*100).toFixed(2)+'%');
 setMetric('Paused / ended',String(n.paused)+' / '+String(n.ended));
 setMetric('Seeking',String(n.seeking));
 setMetric('Ready / network',n.readyState+' / '+n.networkState);
 setMetric('Buffering / stalled',String(d.buffering)+' / '+String(d.stalled));
 setMetric('Stage / phase',(d.weaveStage||'—')+' / '+(d.stagePhase||'—'));
 setMetric('Volume / muted',n.volume+' / '+n.muted);
 setMetric('Rate',String(n.playbackRate));
 setMetric('Captions',n.captions.join(', ')||'off');
 setMetric('Buffered ranges',String(n.buffered.length));
 setMetric('Seekable ranges',String(n.seekable.length));
 setMetric('Error',n.errorCode===null?'none':String(n.errorCode));
 chapterNode.textContent='Chapter: '+d.chapter;
 q('#tools-status').textContent=d.playbackState.toUpperCase();
 drawRange('#tools-played',n.currentTime!==null?[[0,n.currentTime]]:[],video.duration);
 drawRange('#tools-buffered',n.buffered,video.duration);
 drawRange('#tools-seekable',n.seekable,video.duration);
 q('#tools-played-label').textContent=stamp(video.currentTime);
 q('#tools-buffered-label').textContent=rangeDescription(n.buffered);
 q('#tools-seekable-label').textContent=rangeDescription(n.seekable);
 // A compact live sample, not a log of URL parameters or secret-bearing headers.
 snapshotNode.textContent=JSON.stringify(snap,null,2);
};
// Render at most four times a second, but *always* deliver the latest state.
 // A native seek can emit all its events inside the throttle window and then
 // go quiet while paused. Dropping that frame left the inspector at 0% even
 // though currentTime was already at 48 seconds.
let trailingRender: number | undefined;
const scheduleRender = () => {
 if(pendingFrame || trailingRender !== undefined) return;
 const remaining = Math.max(0, 240 - (performance.now() - lastMetrics));
 if(remaining > 0) {
   trailingRender = window.setTimeout(() => {
     trailingRender = undefined;
     scheduleRender();
   }, remaining);
   return;
 }
 pendingFrame = requestAnimationFrame(() => {
   lastMetrics = performance.now();
   render(); // Reads the latest native properties, never an old event snapshot.
 });
};
const renderEvents=()=>{
 const fragment=document.createDocumentFragment();
 for(const e of events){
   const tr=document.createElement('tr');
   for(const field of [e.event,e.seconds===null?'—':stamp(e.seconds),String(e.readyState),String(e.networkState),e.dhago]){
     const td=document.createElement('td');td.textContent=field;tr.append(td);
   }
   fragment.append(tr);
 }
 eventRows.replaceChildren(fragment);
 eventCount.textContent=events.length+' / '+maxEvents;
};
for(const name of eventTypes)video.addEventListener(name,()=>{
 if(logging){
  const now=performance.now();
  if((name==='timeupdate'||name==='progress')&&now-lastNoisy<1000){scheduleRender();return;}
  if(name==='timeupdate'||name==='progress')lastNoisy=now;
  events.unshift({event:name,seconds:safeNumber(video.currentTime),readyState:video.readyState,networkState:video.networkState,dhago:container.dataset.playbackState||'idle'});
  if(events.length>maxEvents)events.length=maxEvents;
  renderEvents();
 }
 scheduleRender();
});
q('#tools-seeks').addEventListener('click',(event)=>{
 const button=(event.target as Element).closest<HTMLButtonElement>('button[data-seek]');
 if(!button)return;
 const token=button.dataset.seek||'0',d=video.duration;
 if(!finite(d)||d<=0){feedback.textContent='Seek unavailable until finite media duration is known.';return;}
 let target:number;
 if(token.endsWith('%'))target=d*Number(token.slice(0,-1))/100;
 else if(token==='nearend')target=Math.max(0,d-.15);
 else if(token==='0')target=0;
 else target=video.currentTime+Number(token);
 if(!finite(target)){feedback.textContent='Invalid seek target.';return;}
 video.currentTime=clamp(target,0,d);
 feedback.textContent='Requested '+stamp(video.currentTime)+'; media seeking is reflected in the inspector.';
 scheduleRender();
});
q<HTMLFormElement>('#tools-seek-form').addEventListener('submit',e=>{
 e.preventDefault();const exact=Number(q<HTMLInputElement>('#tools-exact').value);
 if(!q<HTMLInputElement>('#tools-exact').value.trim()||!finite(exact)||!finite(video.duration)||video.duration<=0){
   feedback.textContent='Enter a finite timestamp after metadata loads.';return;
 }
 video.currentTime=clamp(exact,0,video.duration);feedback.textContent='Exact seek requested: '+exact+' seconds.';scheduleRender();
});
q<HTMLButtonElement>('#tools-toggle-log').addEventListener('click',e=>{
 logging=!logging;
 const b=e.currentTarget as HTMLButtonElement;
 b.textContent=logging?'Pause logging':'Resume logging';
 b.setAttribute('aria-pressed',String(!logging));
});
q('#tools-clear-log').addEventListener('click',()=>{events.length=0;renderEvents();feedback.textContent='Event history cleared.';});
q('#tools-copy-state').addEventListener('click',async()=>{
 try{
 await navigator.clipboard.writeText(JSON.stringify(snapshot(),null,2));
 feedback.textContent='Sanitized snapshot copied.';
 }catch{feedback.textContent='Clipboard permission denied. Select and copy the sanitized snapshot text below.';snapshotNode.focus();}
});
q('#tools-reset').addEventListener('click',()=>{
 video.pause();
 video.defaultPlaybackRate=1;video.playbackRate=1;video.muted=false;video.volume=1;
 const baseline=new URL(SOURCE,location.href);
 const actual=new URL(video.currentSrc||video.src||SOURCE,location.href);
 const restored=actual.pathname!==baseline.pathname;
 if(restored){video.src=SOURCE;video.load();video.addEventListener('loadedmetadata',()=>{video.currentTime=0;scheduleRender();},{once:true});}
 else if(video.readyState>0)video.currentTime=0;
 for(const t of Array.from(video.textTracks||[]))if(t.kind==='captions')t.mode='disabled';
 feedback.textContent='Restored original media, start position, normal speed and sound. Event history preserved.';
 scheduleRender();
});
renderEvents();render();
