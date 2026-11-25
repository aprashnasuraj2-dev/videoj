export interface DhagoMetadataCue {
  start:number;
  end:number;
  label:string;
}
export interface DhagoMetadataTrack {
  id:string;
  label:string;
  kind:'speaker'|'captions'|'sponsor'|'chapter'|'custom';
  color?:string;
  cues:DhagoMetadataCue[];
}

const defaultColor:Record<DhagoMetadataTrack['kind'],string>={
  chapter:'#b44332',
  captions:'#5f7f86',
  speaker:'#9a713c',
  sponsor:'#7c6a89',
  custom:'#6f7668',
};

const validColor=(value:string|undefined)=>value&&/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(value)?value:undefined;

/**
 * Draw supplied metadata as weft lanes over the same time warp.
 * Native chapter/caption tracks are read directly; speaker/sponsor/custom
 * tracks appear only when a host explicitly supplies them.
 */
export function connectMetadataLanes(
  media:HTMLMediaElement,
  container:HTMLElement,
  authored:DhagoMetadataTrack[]=[]
){
  const root=container.querySelector<HTMLElement>('.dhago-metadata-lanes');
  if(!root)return () => {};
  let trackList:TextTrackList|undefined;

  const render=()=>{
    if(!media.isConnected)return;
    const duration=media.duration;
    if(!(Number.isFinite(duration)&&duration>0)){
      root.hidden=true; root.replaceChildren(); return;
    }
    const native:DhagoMetadataTrack[]=[];
    for(const [index,track] of Array.from(media.textTracks??[]).entries()){
      if(!['chapters','captions','subtitles'].includes(track.kind))continue;
      const cues=Array.from(track.cues??[])
        .filter(c=>Number.isFinite(c.startTime)&&Number.isFinite(c.endTime)&&c.endTime>c.startTime)
        .slice(0,120)
        .map(c=>({start:c.startTime,end:c.endTime,label:'text' in c?String((c as VTTCue).text):track.label||track.kind}));
      if(!cues.length)continue;
      native.push({
        id:`native-${track.kind}-${index}`,
        label:track.kind==='chapters'?'Chapters':track.label||track.language||'Captions',
        kind:track.kind==='chapters'?'chapter':'captions',
        cues,
      });
    }
    const seen=new Set<string>();
    const tracks=[...native,...authored].filter(track=>{
      if(!track.id||seen.has(track.id))return false;
      seen.add(track.id);
      return true;
    }).slice(0,6);
    const fragment=document.createDocumentFragment();
    tracks.forEach(track=>{
      const row=document.createElement('div');
      row.className='dhago-metadata-lane';
      row.dataset.kind=track.kind;
      row.title=track.label;
      const color=validColor(track.color)||defaultColor[track.kind];
      row.style.setProperty('--dhago-lane-color',color);
      track.cues.slice(0,120).forEach(cue=>{
        const start=Math.max(0,Math.min(duration,cue.start));
        const end=Math.max(start,Math.min(duration,cue.end));
        if(end<=start)return;
        const thread=document.createElement('span');
        thread.className='dhago-metadata-thread';
        thread.style.left=(100*start/duration).toFixed(3)+'%';
        thread.style.width=(100*(end-start)/duration).toFixed(3)+'%';
        thread.title=`${track.label}: ${cue.label}`;
        row.append(thread);
      });
      if(row.childElementCount)fragment.append(row);
    });
    root.replaceChildren(fragment);
    root.hidden=!root.childElementCount;
    container.toggleAttribute('data-metadata-weft',Boolean(root.childElementCount));
  };
  const watchTracks=()=>{
    if(media.textTracks!==trackList){
      trackList?.removeEventListener('addtrack',render);
      trackList?.removeEventListener('removetrack',render);
      trackList=media.textTracks;
      trackList?.addEventListener('addtrack',render);
      trackList?.addEventListener('removetrack',render);
    }
    render();
  };
  for(const type of ['loadedmetadata','durationchange'])media.addEventListener(type,watchTracks);
  media.addEventListener('load',render,true);
  watchTracks();
  return ()=>{
    for(const type of ['loadedmetadata','durationchange'])media.removeEventListener(type,watchTracks);
    media.removeEventListener('load',render,true);
    trackList?.removeEventListener('addtrack',render);
    trackList?.removeEventListener('removetrack',render);
  };
}
