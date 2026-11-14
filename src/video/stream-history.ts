type PlaybackQualityLike = {
  droppedVideoFrames?: number;
  totalVideoFrames?: number;
};

type RenditionLike = {
  id?: string;
  width?: number;
  height?: number;
  bitrate?: number;
  frameRate?: number;
  codec?: string;
  active?: boolean;
};

type RenditionListLike = EventTarget & Iterable<RenditionLike>;

type VideoLike = HTMLMediaElement & {
  videoWidth?: number;
  videoHeight?: number;
  videoRenditions?: RenditionListLike;
  getVideoPlaybackQuality?: () => PlaybackQualityLike;
  webkitDroppedFrameCount?: number;
  webkitDecodedFrameCount?: number;
};

type QualityObservation = {
  key: string;
  label: string;
  source: 'engine' | 'decoded-dimensions';
  height?: number;
};

const clamp = (value:number,min:number,max:number) => Math.min(max,Math.max(min,value));

/**
 * Turns real playback telemetry into a persistent textile record.
 *
 * Preferred quality truth:
 * 1. an actually-active Video.js videoRenditions entry, when the current
 *    playback engine exposes one;
 * 2. decoded video dimensions as a fallback.
 *
 * Dimensions remain resolution evidence only. They are never converted into
 * or presented as bitrate.
 *
 * Slack marks come only from real waiting/stalled events, and missed stitches
 * come only from browser-exposed dropped-frame counters. Unsupported telemetry
 * stays absent.
 */
export function connectStreamHistory(media:HTMLMediaElement,container:HTMLElement) {
  const history=container.querySelector<HTMLElement>('.dhago-stream-history');
  const summary=container.querySelector<HTMLElement>('.dhago-stream-summary');
  if(!history) return () => {};

  const video=media as VideoLike;
  let qualityKey='';
  let qualityLabel='';
  let qualityNode:HTMLElement|null=null;
  let qualityStart=0;
  let qualityChanges=0;
  let droppedBaseline:number|undefined;
  let droppedObserved=0;
  let bufferNode:HTMLElement|null=null;
  let bufferStart=0;
  let bufferCount=0;
  let renditionList:RenditionListLike|null=null;
  let renditionAbort:AbortController|null=null;

  const sourceIdentity=()=>media.currentSrc||media.getAttribute('src')||'';
  let lastSourceIdentity=sourceIdentity();

  const duration=()=>Number.isFinite(media.duration)&&media.duration>0?media.duration:0;
  const capHistory=(selector:string,max:number)=>{
    const nodes=history.querySelectorAll(selector);
    for(let i=0;i<nodes.length-max;i++)nodes[i]?.remove();
  };
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
    if(qualityLabel)parts.push(qualityLabel);
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
    if(!duration()||count<=0)return;
    const node=document.createElement('span');
    node.className='dhago-drop-stitch';
    node.style.left=pct(media.currentTime).toFixed(3)+'%';
    node.dataset.count=String(count);
    history.append(node);
    capHistory('.dhago-drop-stitch',48);
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
      droppedBaseline=dropped;
    }
  };

  const readQuality=():QualityObservation|null=>{
    if(media.tagName==='AUDIO')return null;

    try{
      const list=video.videoRenditions;
      if(list&&typeof list[Symbol.iterator]==='function'){
        const renditions=Array.from(list);
        const active=renditions.find(r=>r?.active);
        if(active){
          const index=renditions.indexOf(active);
          const width=Number(active.width);
          const height=Number(active.height);
          const bitrate=Number(active.bitrate);
          const frameRate=Number(active.frameRate);
          const id=active.id?String(active.id):'';
          const dimensions=width>0&&height>0?`${Math.round(width)}×${Math.round(height)}`:'';
          const bitrateText=bitrate>0?`${Math.round(bitrate/1000)} kbps`:'';
          const frameRateText=frameRate>0?`${Math.round(frameRate*100)/100} fps`:'';
          const codec=active.codec?String(active.codec):'';
          const identity=[
            id||`index-${index}`,
            dimensions,
            bitrate>0?String(Math.round(bitrate)):'',
            codec,
            frameRate>0?String(frameRate):'',
          ].filter(Boolean).join('|');
          const decodedHeight=Number(video.videoHeight);
          return {
            key:'engine:'+identity,
            label:'engine rendition '+[id,dimensions,bitrateText,frameRateText].filter(Boolean).join(' · '),
            source:'engine',
            height:height>0?height:decodedHeight>0?decodedHeight:undefined,
          };
        }
      }
    }catch{}

    const width=Number(video.videoWidth);
    const height=Number(video.videoHeight);
    if(width>0&&height>0){
      return {
        key:`decoded:${Math.round(width)}x${Math.round(height)}`,
        label:`decoded ${Math.round(width)}×${Math.round(height)}`,
        source:'decoded-dimensions',
        height,
      };
    }
    return null;
  };

  const syncQuality=()=>{
    const quality=readQuality();
    if(!quality)return;
    const now=Number.isFinite(media.currentTime)?media.currentTime:0;
    if(quality.key!==qualityKey){
      if(qualityNode)setRange(qualityNode,qualityStart,now);
      qualityKey=quality.key;
      qualityLabel=quality.label;
      qualityStart=now<.25?0:now;
      qualityChanges++;
      qualityNode=document.createElement('span');
      qualityNode.className='dhago-quality-thread';
      qualityNode.dataset.rendition=quality.label;
      const height=Number(quality.height);
      qualityNode.style.setProperty(
        '--dhago-quality-thread-px',
        height>0?clamp(2+(height-240)/240,2,7).toFixed(2)+'px':'3px'
      );
      setRange(qualityNode,qualityStart,now);
      history.append(qualityNode);
      capHistory('.dhago-quality-thread',96);
      container.dataset.streamRendition=quality.label;
      container.dataset.streamRenditionSource=quality.source;
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
  const cancelBuffer=()=>{
    if(!bufferNode)return;
    bufferNode.remove();
    bufferNode=null;
    bufferCount=Math.max(0,bufferCount-1);
    if(bufferCount)container.dataset.streamBufferEvents=String(bufferCount);
    else container.removeAttribute('data-stream-buffer-events');
    updateSummary();
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
      capHistory('.dhago-slack-thread',96);
      bufferCount++;
      container.dataset.streamBufferEvents=String(bufferCount);
      updateSummary();
    }
  };

  const reset=()=>{
    history.replaceChildren();
    qualityKey=''; qualityLabel=''; qualityNode=null; qualityStart=0; qualityChanges=0;
    droppedBaseline=undefined; droppedObserved=0;
    bufferNode=null; bufferStart=0; bufferCount=0;
    container.removeAttribute('data-stream-rendition');
    container.removeAttribute('data-stream-rendition-source');
    container.removeAttribute('data-stream-rendition-changed');
    container.removeAttribute('data-stream-dropped-frames');
    container.removeAttribute('data-stream-buffer-events');
    container.removeAttribute('data-stream-dropped-supported');
    updateSummary();
  };

  const sync=()=>{
    syncQuality();
    syncDropped();
    if(bufferNode)setRange(bufferNode,bufferStart,media.currentTime);
  };

  const bindRenditions=()=>{
    let next:RenditionListLike|null=null;
    try{
      const candidate=video.videoRenditions;
      if(candidate&&typeof candidate[Symbol.iterator]==='function')next=candidate;
    }catch{}
    if(next===renditionList)return;
    renditionAbort?.abort();
    renditionAbort=null;
    renditionList=next;
    if(renditionList){
      renditionAbort=new AbortController();
      for(const type of ['activechange','addrendition','removerendition','change']){
        renditionList.addEventListener(type,syncQuality,{signal:renditionAbort.signal});
      }
    }
    syncQuality();
  };

  const resetIfSourceChanged=()=>{
    const next=sourceIdentity();
    if(next===lastSourceIdentity)return;
    lastSourceIdentity=next;
    reset();
    bindRenditions();
  };

  const onWaiting=(event:Event)=>startBuffer(event);
  const onResume=()=>{ closeBuffer(); sync(); };
  const onSeeking=()=>{ cancelBuffer(); sync(); };
  const onPotentialSourceChange=()=>resetIfSourceChanged();
  const onSync=()=>{ bindRenditions(); sync(); };

  for(const type of ['waiting','stalled'])media.addEventListener(type,onWaiting);
  for(const type of ['playing','canplay','pause','ended','error'])media.addEventListener(type,onResume);
  media.addEventListener('seeking',onSeeking);
  for(const type of ['loadedmetadata','loadeddata','durationchange','resize','timeupdate','seeked'])media.addEventListener(type,onSync);
  for(const type of ['emptied','loadstart'])media.addEventListener(type,onPotentialSourceChange);

  bindRenditions();
  sync();

  return ()=>{
    renditionAbort?.abort();
    for(const type of ['waiting','stalled'])media.removeEventListener(type,onWaiting);
    for(const type of ['playing','canplay','pause','ended','error'])media.removeEventListener(type,onResume);
    media.removeEventListener('seeking',onSeeking);
    for(const type of ['loadedmetadata','loadeddata','durationchange','resize','timeupdate','seeked'])media.removeEventListener(type,onSync);
    for(const type of ['emptied','loadstart'])media.removeEventListener(type,onPotentialSourceChange);
  };
}
