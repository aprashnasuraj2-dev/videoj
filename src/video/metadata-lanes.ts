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

const kinds=new Set<DhagoMetadataTrack['kind']>(['speaker','captions','sponsor','chapter','custom']);
const defaultColor:Record<DhagoMetadataTrack['kind'],string>={
  chapter:'#b44332',
  captions:'#5f7f86',
  speaker:'#9a713c',
  sponsor:'#7c6a89',
  custom:'#6f7668',
};

const validColor=(value:string|undefined)=>{
  if(typeof value!=='string'||!value||value.length>64)return undefined;
  try{return CSS.supports('color',value)?value:undefined;}catch{return undefined;}
};
const normalizeAuthoredTrack=(track:DhagoMetadataTrack):DhagoMetadataTrack|null=>{
  const id=typeof track?.id==='string'?track.id.trim().slice(0,80):'';
  if(!id)return null;
  const kind=kinds.has(track.kind)?track.kind:'custom';
  const label=typeof track.label==='string'&&track.label.trim()?track.label.trim().slice(0,160):id;
  const cues=Array.isArray(track.cues)?track.cues
    .filter(cue=>cue&&Number.isFinite(cue.start)&&Number.isFinite(cue.end)&&cue.end>cue.start)
    .slice(0,120)
    .map(cue=>({
      start:Number(cue.start),
      end:Number(cue.end),
      label:typeof cue.label==='string'?cue.label.slice(0,240):'',
    })):[];
  return {id,label,kind,color:validColor(track.color),cues};
};

/**
 * Draw supplied metadata as weft lanes over the same time warp.
 * Native chapter/caption tracks are read directly; speaker/sponsor/custom
 * tracks appear only when a host explicitly supplies them.
 *
 * Runtime input is treated as untrusted host data: non-finite/zero-length
 * ranges are discarded, duplicate IDs are ignored, lane/cue counts are
 * bounded, and invalid colors fall back to the kind default.
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
      root.hidden=true;
      root.replaceChildren();
      container.removeAttribute('data-metadata-weft');
      return;
    }

    const native:DhagoMetadataTrack[]=[];
    for(const [index,track] of Array.from(media.textTracks??[]).entries()){
      if(!['chapters','captions','subtitles'].includes(track.kind))continue;
      const cues=Array.from(track.cues??[])
        .filter(c=>Number.isFinite(c.startTime)&&Number.isFinite(c.endTime)&&c.endTime>c.startTime)
        .slice(0,120)
        .map(c=>({
          start:c.startTime,
          end:c.endTime,
          label:'text' in c?String((c as VTTCue).text).slice(0,240):track.label||track.kind,
        }));
      if(!cues.length)continue;
      native.push({
        id:`native-${track.kind}-${index}`,
        label:track.kind==='chapters'?'Chapters':track.label||track.language||'Captions',
        kind:track.kind==='chapters'?'chapter':'captions',
        cues,
      });
    }

    const normalized=Array.isArray(authored)
      ? authored.map(normalizeAuthoredTrack).filter((track):track is DhagoMetadataTrack=>Boolean(track))
      : [];
    const seen=new Set<string>();
    const tracks=[...native,...normalized].filter(track=>{
      if(seen.has(track.id))return false;
      seen.add(track.id);
      return true;
    }).slice(0,6);

    const fragment=document.createDocumentFragment();
    tracks.forEach(track=>{
      const row=document.createElement('div');
      row.className='dhago-metadata-lane';
      row.dataset.kind=track.kind;
      row.dataset.trackId=track.id;
      row.title=track.label;
      const color=validColor(track.color)||defaultColor[track.kind];
      row.style.setProperty('--dhago-lane-color',color);

      track.cues.slice(0,120).forEach(cue=>{
        if(!Number.isFinite(cue.start)||!Number.isFinite(cue.end)||cue.end<=cue.start)return;
        const start=clampTime(cue.start,duration);
        const end=clampTime(cue.end,duration);
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

  for(const type of ['loadedmetadata','durationchange','emptied'])media.addEventListener(type,watchTracks);
  media.addEventListener('load',render,true);
  watchTracks();

  return ()=>{
    for(const type of ['loadedmetadata','durationchange','emptied'])media.removeEventListener(type,watchTracks);
    media.removeEventListener('load',render,true);
    trackList?.removeEventListener('addtrack',render);
    trackList?.removeEventListener('removetrack',render);
  };
}

const clampTime=(value:number,duration:number)=>Math.max(0,Math.min(duration,value));
