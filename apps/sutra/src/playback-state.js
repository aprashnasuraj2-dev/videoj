export const playbackReadDefinition=Object.freeze({name:'read_playback_state',effect:'read',inputSchema:Object.freeze({type:'object',properties:Object.freeze({}),required:Object.freeze([]),additionalProperties:false})});
// Snapshot-only capability. Callers never receive a media element or DOM selector.
export function readPlaybackState(media,args={}){
 if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length)throw Error('Playback read accepts no arguments.');
 if(!media)return {available:false,reason:'media_not_loaded'};
 try{
  const {currentTime,duration,paused,ended,seeking,readyState}=media;
  if(media.error||!Number.isFinite(currentTime)||currentTime<0||!Number.isFinite(duration)||duration<=0||currentTime>duration+.1||!Number.isInteger(readyState)||readyState<1||readyState>4||[paused,ended,seeking].some(x=>typeof x!=='boolean'))return {available:false,reason:'metadata_unavailable'};
  return {available:true,currentTime,duration,paused,ended,seeking,readyState};
 }catch{return {available:false,reason:'media_unavailable'};}
}
