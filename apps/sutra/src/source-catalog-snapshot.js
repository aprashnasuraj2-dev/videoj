// A UI-side catalog must be an inert copy of independently bound source data.
// JSON.stringify/structuredClone on arbitrary caller objects can run getters.
// Wire data is JSON.parse'd first; reject executable JS host objects here.
import {snapshotDataRecord,snapshotDataArray} from '../../../packages/sutra-evidence/index.js';
const sourceKeys=['id','version','hash','mediaHash','duration','cues'];
const cueKeys=['id','start','end','text'];
const strict=(record,keys)=>{
 const names=Object.keys(record);
 if(names.length!==keys.length||names.some(name=>!keys.includes(name)))throw TypeError('Unexpected source field.');
 return record;
};
export function snapshotSourceCatalog(sources){
 const list=snapshotDataArray(sources,20);
 if(!list.length)throw TypeError('Source catalog must not be empty.');
 return Object.freeze(list.map(raw=>{
  const s=strict(snapshotDataRecord(raw,10),sourceKeys);
  const cues=snapshotDataArray(s.cues,500).map(item=>{
   const cue=strict(snapshotDataRecord(item,8),cueKeys);
   return Object.freeze({id:cue.id,start:cue.start,end:cue.end,text:cue.text});
  });
  return Object.freeze({id:s.id,version:s.version,hash:s.hash,mediaHash:s.mediaHash,duration:s.duration,cues:Object.freeze(cues)});
 }));
}
