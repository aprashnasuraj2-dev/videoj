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
 let activeSeek=null;
 const cancelSeek=()=>{const previous=activeSeek;activeSeek=null;previous?.abort();};
 const mediaError=(code,message)=>{const error=new Error(message);error.name='MediaOperationError';error.code=code;return error;};
 function waitFor(event,predicate,act,signal){
  return new Promise((resolve,reject)=>{
   let timer,settled=false;
   const cleanup=()=>{signal?.removeEventListener('abort',aborted);clearTimeout(timer);media.removeEventListener(event,changed);media.removeEventListener('error',failed);};
   const stop=error=>{if(settled)return;settled=true;cleanup();reject(error);};
   const aborted=()=>stop(mediaError('MEDIA_CANCELLED','Media operation cancelled.'));
   const changed=()=>{try{if(!settled&&predicate()){settled=true;cleanup();resolve();}}catch(error){stop(error);}};
   const failed=()=>stop(mediaError(media.error?.code===4?'MEDIA_UNSUPPORTED':'MEDIA_LOAD_FAILED',
    media.error?.code===4?'The selected media format or source is not supported.':'Media could not complete the requested operation.'));
   if(signal?.aborted){aborted();return;}
   signal?.addEventListener('abort',aborted,{once:true});
   media.addEventListener(event,changed);media.addEventListener('error',failed,{once:true});
   timer=setTimeout(()=>stop(mediaError('MEDIA_TIMEOUT','Media operation exceeded the ten-second limit.')),10000);
   try{act?.();if(media.error)failed();else changed();}catch(error){stop(error);}
  });
 }
 return {element:player,media,readState:()=>readPlaybackState(media),
  ready:({signal}={})=>waitFor('loadedmetadata',()=>media.readyState>=1,undefined,signal),
  cancelSeek,
  async replaceSource(nextSource){
   if(typeof nextSource!=='string'||!nextSource.trim()||nextSource.length>4096)throw mediaError('MEDIA_SOURCE','Replacement media source is invalid.');
   cancelSeek();
   const previous=media.currentSrc||media.getAttribute('src')||'';
   const setSource=source=>{media.removeAttribute('src');media.load();media.src=source;media.load();};
   try{media.pause();}catch{}
   try{
    await waitFor('loadedmetadata',()=>media.readyState>=1&&Number.isFinite(media.duration)&&media.duration>0,()=>setSource(nextSource));
   }catch(error){
    // A replacement must not strand a previously usable lesson. Restore the
    // last native source when possible, but still report the replacement as a
    // failure so callers never mistake recovery for a successful source swap.
    if(previous&&previous!==nextSource){
     try{
      await waitFor('loadedmetadata',()=>media.readyState>=1&&Number.isFinite(media.duration)&&media.duration>0,()=>setSource(previous));
      error.recovered=true;
     }catch(restoreError){
      const stopped=mediaError('MEDIA_RESTORE_FAILED','Replacement media failed and the previous source could not be restored.');
      stopped.cause=restoreError;throw stopped;
     }
    }
    throw error;
   }
   return readPlaybackState(media);
  },
  async seek(seconds,{signal}={}){
   signal?.throwIfAborted();validateNativeSeekTarget(media,seconds);
   cancelSeek();const owner=new AbortController();activeSeek=owner;
   const bound=signal?AbortSignal.any([signal,owner.signal]):owner.signal;
   const source=media.currentSrc;
   try{
    await waitFor('seeked',()=>!media.seeking&&Math.abs(media.currentTime-seconds)<=1,()=>{media.currentTime=seconds;},bound);
    bound.throwIfAborted();
    if(activeSeek!==owner||media.currentSrc!==source)throw mediaError('MEDIA_CANCELLED','Native seek authority changed.');
    return media.currentTime;
   }finally{if(activeSeek===owner)activeSeek=null;}
  }
 };
}
