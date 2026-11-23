// Explicit reusable DHAGO boundary. No imports from apps/preview or DETOUR.
import {readPlaybackState} from './playback-state.js';
import {createDhagoPlayer} from '../../../src/create-player.ts';

export function validateNativeSeekTarget(media,seconds){
 if(!media||!Number.isFinite(seconds)||seconds<0)throw new Error('Cue target is invalid.');
 const duration=media.duration;
 if(!Number.isFinite(duration)||duration<=0)throw new Error('This media has no finite seekable duration.');
 if(seconds>duration)throw new Error('Cue is outside the loaded media.');
 const ranges=media.seekable;
 if(!ranges||!Number.isInteger(ranges.length)||ranges.length<1)throw new Error('This media has no available seek range.');
 let available=false;
 for(let i=0;i<ranges.length;i++){
  const start=ranges.start(i),end=ranges.end(i);
  if(Number.isFinite(start)&&Number.isFinite(end)&&seconds>=start&&seconds<=end){available=true;break;}
 }
 if(!available)throw new Error('The requested cue is outside available seek ranges.');
 return seconds;
}

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
 return {element:player,media,readState:()=>readPlaybackState(media),
  ready:()=>waitFor('loadedmetadata',()=>media.readyState>=1),
  async seek(seconds){
   validateNativeSeekTarget(media,seconds);
   await waitFor('seeked',()=>!media.seeking&&Math.abs(media.currentTime-seconds)<=1,()=>{media.currentTime=seconds;});
   return media.currentTime;
  }
 };
}
