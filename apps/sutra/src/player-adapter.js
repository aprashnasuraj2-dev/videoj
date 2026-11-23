// Explicit reusable DHAGO boundary. No imports from apps/preview or DETOUR.
import {readPlaybackState} from './playback-state.js';
import {assessSeekTarget,timeRangesSnapshot} from './seek-policy.js';
import {createDhagoPlayer} from '../../../src/create-player.ts';

export function mountTimingPlayer(host,{source,compatibilitySource,fallbackUrl,poster,chapters,captions}){
 const player=createDhagoPlayer({source,compatibilitySource,fallbackUrl,poster,chapters,captions,surface:'minimal'});
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
   if(media.error){const error=new Error('Current media is in a load or decode error state.');error.code='SEEK_UNAVAILABLE';error.reason='media_error';throw error;}
   const decision=assessSeekTarget({duration:media.duration,ranges:timeRangesSnapshot(media.seekable)},seconds);
   if(!decision.ok){const error=new Error(decision.message);error.code='SEEK_UNAVAILABLE';error.reason=decision.reason;throw error;}
   await waitFor('seeked',()=>!media.seeking&&Math.abs(media.currentTime-seconds)<=1,()=>{media.currentTime=seconds;});
   return media.currentTime;
  },
  async replaceSource(nextSource){
   if(typeof nextSource!=='string'||!nextSource||nextSource.length>4096)throw new Error('Replacement media source is invalid.');
   media.pause();media.src=nextSource;media.load();
   await waitFor('loadedmetadata',()=>media.readyState>=1);
   return readPlaybackState(media);
  },
  setVolume(value){
   if(!Number.isFinite(value)||value<0||value>1)throw new Error('Volume must be between zero and one.');
   media.volume=value;return media.volume;
  },
  setCaptions(enabled=true){
   const tracks=Array.from(media.textTracks??[]).filter(track=>track.kind==='captions'||track.kind==='subtitles');
   if(!tracks.length)throw new Error('No captions track is available.');
   tracks.forEach((track,index)=>{track.mode=enabled&&index===0?'showing':'disabled';});
   return tracks.some(track=>track.mode==='showing');
  }
 };
}
