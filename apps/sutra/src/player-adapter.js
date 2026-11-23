// Explicit reusable DHAGO boundary. No imports from apps/preview or DETOUR.
import {createDhagoPlayer} from '../../../src/create-player.ts';

export function mountTimingPlayer(host,{source,chapters,captions}){
 const player=createDhagoPlayer({source,chapters,captions,surface:'minimal'});
 host.replaceChildren(player);
 const media=player.querySelector('video');
 if(!media)throw new Error('Native media element unavailable.');
 // Actual native state remains authoritative. No timer synthesizes progress.
 function waitFor(event,predicate,act){
  return new Promise((resolve,reject)=>{
   let timer;
   const cleanup=()=>{clearTimeout(timer);media.removeEventListener(event,changed);media.removeEventListener('error',failed);};
   const changed=()=>{if(predicate()){cleanup();resolve();}};
   const failed=()=>{cleanup();reject(new Error('Media could not complete the requested operation.'));};
   media.addEventListener(event,changed);media.addEventListener('error',failed,{once:true});
   timer=setTimeout(failed,10000);
   try{act?.();changed();}catch(error){cleanup();reject(error);}
  });
 }
 return {element:player,media,
  ready:()=>waitFor('loadedmetadata',()=>media.readyState>=1),
  async seek(seconds){
   if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(media.duration)||seconds>media.duration)throw new Error('Cue is outside the loaded media.');
   if(!media.seekable.length)throw new Error('This media has no available seek range.');
   let available=false;for(let i=0;i<media.seekable.length;i++)if(seconds>=media.seekable.start(i)&&seconds<=media.seekable.end(i))available=true;
   if(!available)throw new Error('The requested cue is outside available seek ranges.');
   await waitFor('seeked',()=>!media.seeking&&Math.abs(media.currentTime-seconds)<=1,()=>{media.currentTime=seconds;});
   return media.currentTime;
  }
 };
}
