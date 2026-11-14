type PlaybackQualityLike = {
  droppedVideoFrames?: number;
  totalVideoFrames?: number;
};

type VideoLike = HTMLMediaElement & {
  videoWidth?: number;
  videoHeight?: number;
  getVideoPlaybackQuality?: () => PlaybackQualityLike;
  webkitDroppedFrameCount?: number;
  webkitDecodedFrameCount?: number;
};

const clamp = (value:number,min:number,max:number) => Math.min(max,Math.max(min,value));

/**
 * Turns real playback telemetry into a persistent textile record.
 *
 * - rendition thickness uses decoded video dimensions exposed by the engine/browser;
 * - slack marks are created only from real waiting/stalled events;
 * - missed stitches come only from playback-quality dropped-frame counters.
 *
 * Unsupported telemetry simply stays absent.
 */
export function connectStreamHistory(media:HTMLMediaElement,container:HTMLElement) {
  const history=container.querySelector<HTMLElement>('.dhago-stream-history');
  const summary=container.querySelector<HTMLElement>('.dhago-stream-summary');
  if(!history) return () => {};

  const video=media as VideoLike;
  let qualityKey='';
  let qualityNode:HTMLElement|null=null;
  let qualityStart=0;
  let qualityChanges=0;
  let droppedBaseline:number|undefined;
  let droppedObserved=0;
  let bufferNode:HTMLElement|null=null;
  let bufferStart=0;
  let bufferCount=0;

  const duration=()=>Number.isFinite(media.duration)&&media.duration>0?media.duration:0;
  const pct=(time:number)=>{
    const d=duration();
    return d?clamp(100*time/d,0,100):0;
  };
  const setRange=(node:HTMLElement,start:number,end:number)=>{
    node.style.left=pct(start).toFixed(3)+'%';
    node.style.width=Math.max(0,pct(end)-pct(start)).toFixed(3)+'%';
  };
  const updateSummary=()=>{
    if(!summary)return;
    const parts:string[]=[];
    if(qualityKey)parts.push(`decoded ${qualityKey}`);
    if(qualityChanges>1)parts.push(`${qualityChanges-1} rendition change${qualityChanges===2?'':'s'}`);
    if(bufferCount)parts.push(`${bufferCount} buffering interruption${bufferCount===1?'':'s'}`);
    if(droppedObserved)parts.push(`${droppedObserved} dropped frame${droppedObserved===1?'':'s'} observed`);
    summary.textContent=parts.length?`Stream history: ${parts.join(', ')}.`:'Stream history: no exposed streaming telemetry yet.';
  };
  const readDropped=()=>{
    try{
      if(typeof video.getVideoPlaybackQuality==='function'){
        const q=video.getVideoPlaybackQuality();
        const dropped=Number(q?.droppedVideoFrames);
        return Number.isFinite(dropped)&&dropped>=0?dropped:undefined;
      }
    }catch{}
    const webkit=Number(video.webkitDroppedFrameCount);
    return Number.isFinite(webkit)&&webkit>=0?webkit:undefined;
  };
  const markDropped=(count:number)=>{
    const d=duration();
    if(!d||count<=0)return;
    const node=document.createElement('span');
    node.className='dhago-drop-stitch';
    node.style.left=pct(media.currentTime).toFixed(3)+'%';
    node.dataset.count=String(count);
    history.append(node);
    while(history.querySelectorAll('.dhago-drop-stitch').length>48)
      history.querySelector('.dhago-drop-stitch')?.remove();
  };
  const syncDropped=()=>{
    const dropped=readDropped();
    if(dropped===undefined)return;
    container.setAttribute('data-stream-dropped-supported','');
    if(droppedBaseline===undefined){
      droppedBaseline=dropped;
      return;
    }
    const delta=dropped-droppedBaseline;
    if(delta>0){
      droppedObserved+=delta;
      markDropped(delta);
      container.dataset.streamDroppedFrames=String(droppedObserved);
      droppedBaseline=dropped;
      updateSummary();
    }else if(delta<0){
      // New media source / engine reset.
      droppedBaseline=dropped;
    }
  };
  const syncQuality=()=>{
    if(media.tagName==='AUDIO')return;
    const width=Number(video.videoWidth);
    const height=Number(video.videoHeight);
    if(!(width>0&&height>0))return;
    const key=`${Math.round(width)}×${Math.round(height)}`;
    const now=Number.isFinite(media.currentTime)?media.currentTime:0;
    if(key!==qualityKey){
      if(qualityNode)setRange(qualityNode,qualityStart,now);
      qualityKey=key;
      qualityStart=now<.25?0:now;
      qualityChanges++;
      qualityNode=document.createElement('span');
      qualityNode.className='dhago-quality-thread';
      qualityNode.dataset.rendition=key;
      qualityNode.style.setProperty('--dhago-quality-thread-px',clamp(2+(height-240)/240,2,7).toFixed(2)+'px');
      setRange(qualityNode,qualityStart,now);
      history.append(qualityNode);
      container.dataset.streamRendition=key;
      container.toggleAttribute('data-stream-rendition-changed',qualityChanges>1);
      updateSummary();
    }else if(qualityNode){
      setRange(qualityNode,qualityStart,now);
    }
  };
  const closeBuffer=()=>{
    if(!bufferNode)return;
    setRange(bufferNode,bufferStart,media.currentTime);
    bufferNode=null;
  };
  const startBuffer=(event:Event)=>{
    if(media.paused||media.ended||media.error||media.seeking)return;
    if(!bufferNode){
      bufferStart=media.currentTime;
      bufferNode=document.createElement('span');
      bufferNode.className='dhago-slack-thread';
      bufferNode.dataset.cause=event.type;
      setRange(bufferNode,bufferStart,bufferStart);
      history.append(bufferNode);
      bufferCount++;
      container.dataset.streamBufferEvents=String(bufferCount);
      updateSummary();
    }
  };
  const reset=()=>{
    history.replaceChildren();
    qualityKey=''; qualityNode=null; qualityStart=0; qualityChanges=0;
    droppedBaseline=undefined; droppedObserved=0;
    bufferNode=null; bufferStart=0; bufferCount=0;
    container.removeAttribute('data-stream-rendition');
    container.removeAttribute('data-stream-rendition-changed');
    container.removeAttribute('data-stream-dropped-frames');
    container.removeAttribute('data-stream-buffer-events');
    updateSummary();
  };
  const sync=()=>{
    syncQuality();
    syncDropped();
    if(bufferNode)setRange(bufferNode,bufferStart,media.currentTime);
  };

  const onWaiting=(event:Event)=>startBuffer(event);
  const onResume=()=>{ closeBuffer(); sync(); };
  const onReset=()=>reset();
  const onSync=()=>sync();
  for(const type of ['waiting','stalled'])media.addEventListener(type,onWaiting);
  for(const type of ['playing','canplay','pause','ended','error'])media.addEventListener(type,onResume);
  for(const type of ['loadedmetadata','loadeddata','durationchange','resize','timeupdate','seeked'])media.addEventListener(type,onSync);
  for(const type of ['emptied','loadstart'])media.addEventListener(type,onReset);

  sync();
  return ()=>{
    for(const type of ['waiting','stalled'])media.removeEventListener(type,onWaiting);
    for(const type of ['playing','canplay','pause','ended','error'])media.removeEventListener(type,onResume);
    for(const type of ['loadedmetadata','loadeddata','durationchange','resize','timeupdate','seeked'])media.removeEventListener(type,onSync);
    for(const type of ['emptied','loadstart'])media.removeEventListener(type,onReset);
  };
}
