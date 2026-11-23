export function assessSeekTarget({duration,ranges=[]}={},seconds){
 if(!Number.isFinite(seconds)||seconds<0)return Object.freeze({ok:false,reason:'invalid_target',message:'Cue time is invalid.'});
 if(!Number.isFinite(duration)||duration<=0)return Object.freeze({ok:false,reason:'live_or_unknown_duration',message:'This source has no finite seekable duration.'});
 if(seconds>duration)return Object.freeze({ok:false,reason:'outside_duration',message:'Cue is outside the loaded media duration.'});
 if(!Array.isArray(ranges)||!ranges.length)return Object.freeze({ok:false,reason:'no_seekable_range',message:'This media has no available seek range.'});
 const valid=ranges.filter(range=>Array.isArray(range)&&range.length===2&&Number.isFinite(range[0])&&Number.isFinite(range[1])&&range[0]>=0&&range[1]>=range[0]);
 if(!valid.length)return Object.freeze({ok:false,reason:'no_seekable_range',message:'This media has no available seek range.'});
 if(!valid.some(([start,end])=>seconds>=start&&seconds<=end))return Object.freeze({ok:false,reason:'outside_seekable_range',message:'The requested cue is outside the current seekable ranges.'});
 return Object.freeze({ok:true,reason:'seekable',message:'Cue is within the current seekable range.'});
}
export function timeRangesSnapshot(ranges){
 const out=[];if(!ranges||!Number.isInteger(ranges.length)||ranges.length<0||ranges.length>128)return out;
 for(let i=0;i<ranges.length;i++){try{const start=Number(ranges.start(i)),end=Number(ranges.end(i));if(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>=start)out.push([start,end]);}catch{return []}}
 return out;
}
