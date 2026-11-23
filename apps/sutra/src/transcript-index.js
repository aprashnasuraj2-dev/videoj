const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH=/^[a-f0-9]{64}$/i;
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();

export function createTranscriptIndex({cues=[],meta}={}){
 if(!meta||meta.version!==1||!ID.test(meta.id)||!ID.test(meta.sourceId)||!ID.test(meta.sourceVersion)||!ID.test(meta.transcriptVersion)||!HASH.test(meta.mediaHash)||!HASH.test(meta.transcriptHash)||!Number.isFinite(meta.duration)||meta.duration<=0||meta.duration>86400)throw new TypeError('Invalid transcript metadata.');
 if(typeof meta.language!=='string'||meta.language.length<2||meta.language.length>20||typeof meta.translated!=='boolean')throw new TypeError('Invalid transcript language metadata.');
 if(!Array.isArray(cues)||cues.length>2000)throw new TypeError('Transcript cue count is invalid.');
 const seen=new Set(),rows=cues.map((cue,index)=>{
  const id=clean(cue?.id)||`cue-${index+1}`,text=clean(cue?.text);
  const start=Number(cue?.start),end=Number(cue?.end);
  if(!ID.test(id)||seen.has(id)||!text||text.length>1000||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>meta.duration+.05)throw new TypeError('Invalid transcript cue.');
  seen.add(id);return Object.freeze({id,start,end,text,index});
 }).sort((a,b)=>a.start-b.start||a.end-b.end||a.index-b.index);
 function search(query=''){
  const q=clean(query).slice(0,80).toLocaleLowerCase(meta.language);
  const matched=!q?rows:rows.filter(row=>row.text.toLocaleLowerCase(meta.language).includes(q));
  return matched.slice(0,100).map(row=>({...row}));
 }
 function activeAt(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return null;
  const nearEnd=seconds>=meta.duration-.05;
  const row=rows.find((cue,index)=>seconds>=cue.start&&(seconds<cue.end||(nearEnd&&index===rows.length-1)));
  return row?.id??null;
 }
 function move(visibleIds,currentId,direction){
  const ids=visibleIds.filter(id=>seen.has(id)).slice(0,100);if(!ids.length)return null;
  let index=Math.max(0,ids.indexOf(currentId));
  if(direction==='first')index=0;else if(direction==='last')index=ids.length-1;else if(direction==='next')index=Math.min(ids.length-1,index+1);else if(direction==='previous')index=Math.max(0,index-1);else throw new TypeError('Unknown transcript movement.');
  return ids[index];
 }
 return Object.freeze({
  meta:Object.freeze({...meta}),size:rows.length,
  all:()=>rows.map(row=>({...row})),search,activeAt,move,
  label:row=>`${formatTime(row.start)}–${formatTime(row.end)} · ${row.text}`
 });
}
export function formatTime(seconds){
 const whole=Math.max(0,Math.floor(Number(seconds)||0)),minutes=Math.floor(whole/60),tail=String(whole%60).padStart(2,'0');
 return `${String(minutes).padStart(2,'0')}:${tail}`;
}
