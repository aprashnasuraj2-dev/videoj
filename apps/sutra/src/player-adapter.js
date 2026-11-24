// Explicit reusable DHAGO boundary. No imports from apps/preview or DETOUR.
import {readPlaybackState} from './playback-state.js';
import {validateNativeSeekTarget} from './seek-policy.js';
import {createDhagoPlayer} from '../../../src/create-player.ts';

export function mountTimingPlayer(host,{source,poster,chapters,captions}){
 const player=createDhagoPlayer({source,poster,chapters,captions,surface:'minimal'});
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
  async replaceSource(nextSource){
   if(typeof nextSource!=='string'||!nextSource.trim()||nextSource.length>4096)throw new Error('Replacement media source is invalid.');
   try{media.pause();}catch{}
   // Reset native state before changing source so stale duration/currentTime is
   // never interpreted as the replacement media being ready.
   media.removeAttribute('src');media.load();
   await waitFor('loadedmetadata',()=>media.readyState>=1&&Number.isFinite(media.duration)&&media.duration>0,()=>{
    media.src=nextSource;media.load();
   });
   return readPlaybackState(media);
  },
  async seek(seconds){
   validateNativeSeekTarget(media,seconds);
   await waitFor('seeked',()=>!media.seeking&&Math.abs(media.currentTime-seconds)<=1,()=>{media.currentTime=seconds;});
   return media.currentTime;
  }
 };
}
