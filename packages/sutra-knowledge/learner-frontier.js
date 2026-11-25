// Integration: learner evidence is a catalog declaration, never automatically
// a verified observation of the physical world. No model-supplied outcome labels.
import {evaluateFrontier} from './frontier.js';
import {validateReceipt} from '../sutra-evidence/index.js';
import {createSourceTools} from '../sutra-source-tools/index.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
const hash=/^[a-f0-9]{64}$/;
const predictions=['before','not_before','unsure'];
const ids=['start_two','start_four'];
const times=[2,4];
const input=(id,value,basis)=>({id,kind:'input',value:String(value),dimension:[0,0,1],basis});
function graph(start){
 return JSON.stringify({schemaVersion:1,nodes:[
  input('cue_start',start,'Hypothetical catalog start time, seconds'),
  input('threshold',3,'Question threshold, seconds'),
  {id:'before_threshold',kind:'constraint',op:'lt',args:['cue_start','threshold']}
 ]});
}
export function timingLessonCase(){
 return JSON.stringify({version:1,decisionId:'cue_before_three',costUnit:'synthetic_effort',worlds:ids.map((id,i)=>({id,graphText:graph(times[i]),constraintId:'before_threshold'})),
 observations:[{id:'read_catalog_cue',cost:1,outcomes:{start_two:'two',start_four:'four'}}]});
}
export async function planTimingLesson(){return evaluateFrontier(timingLessonCase());}
// Trusted caller supplies independently loaded, validated v1 content profile.
// The untrusted receipt is bounded wire JSON; the caller cannot simply supply
// a world ID or claim a physical observation was made.
function lessonSource(content){
 if(content?.profile?.mode!=='synthetic'||content?.source?.id!=='synthetic-timing-fixture'||
 content?.featuredCue?.id!=='timing-marker'||!hash.test(content?.artifacts?.profileSha256??'')||
 !hash.test(content?.artifacts?.catalogSha256??'')||!hash.test(content?.artifacts?.transcriptSha256??''))throw TypeError('LESSON_PROFILE_REFUSED');
 return content.source;
}
export function readLessonCue(content){
 const source=lessonSource(content);
 return freeze(createSourceTools([source],{now:()=>content.profile.observedAt})
  .call('read_cue',{sourceId:source.id,cueId:content.featuredCue.id}).receipts[0]);
}
export async function resolveTimingLesson({content,receiptText,prediction}){
 if(!predictions.includes(prediction))throw TypeError('LESSON_PREDICTION_REFUSED');
 const source=lessonSource(content);
 const receipt=parseUniqueJson(receiptText,{maxChars:8192,maxDepth:4});
 const checked=validateReceipt(receipt,{sources:[source]});
 if(!checked.valid||checked.level!=='catalog_matched'||receipt.cueId!==content.featuredCue.id)
  return freeze({status:'receipt_refused',truthStatus:'unverified',errors:checked.errors.map(x=>x.code),prediction});
 const matched=times.indexOf(receipt.start);
 const evidence={receipt,profileSha256:content.artifacts.profileSha256,catalogSha256:content.artifacts.catalogSha256,
  transcriptSha256:content.artifacts.transcriptSha256,level:'catalog_matched',truthStatus:'unverified'};
 if(matched<0)return freeze({status:'outside_declared_worlds',truthStatus:'unverified',prediction,evidence,
  explanation:'The validated cue does not match either hypothetical start time. Expand the world set; do not force a conclusion.'});
 const full=JSON.parse(timingLessonCase());
 full.worlds=full.worlds.filter(w=>w.id===ids[matched]);full.observations=[];
 const remaining=await evaluateFrontier(JSON.stringify(full));
 const answer=remaining.plan.decision==='constraint_satisfied'?'before':'not_before';
 return freeze({status:'catalog_question_resolved',truthStatus:'unverified',prediction,answer,
  feedback:prediction==='unsure'?'uncertainty_resolved':prediction===answer?'prediction_supported':'prediction_revised',
  evidence,remaining,excludedWorlds:ids.filter(i=>i!==ids[matched]),
  explanation:'This resolves the question about the catalogued cue start, not the truth of the transcript or actual video event.'});
}
