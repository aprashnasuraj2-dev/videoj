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
