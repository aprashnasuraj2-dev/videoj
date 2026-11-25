import {timingLessonCase,planTimingLesson,readLessonCue,resolveTimingLesson} from '../../../packages/sutra-knowledge/learner-frontier.js';
import {loadContentProfile,readVerifiedLessonMedia} from '../../../packages/sutra-content-profile/index.js';
import {validateNativeSeekTarget,isNativeCueReached} from '../../sutra/src/seek-policy.js';
import {evaluateFrontier} from '../../../packages/sutra-knowledge/frontier.js';
import {frontierCase} from '../../../packages/sutra-knowledge/examples/frontier.mjs';
const by=id=>document.getElementById(id);
const pred=by('prediction'),planButton=by('learn-plan'),observe=by('learn-observe'),watch=by('learn-watch'),exportButton=by('learn-export'),video=by('learn-video');
let generation=0,busy=false,controller=null,prepared=null,learned=null,blob=null;
const live=g=>g===generation;
function text(id,value){by(id).textContent=value;}
function resetMedia(){
 if(blob){video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(blob);blob=null;}
 video.hidden=true;text('learn-media-status','Media not loaded.');delete by('learn-media-status').dataset.state;
}
function reset(){
 generation++;controller?.abort();prepared=null;learned=null;observe.disabled=watch.disabled=exportButton.disabled=true;
 by('learn-worlds').replaceChildren();text('learn-evidence','');delete by('learn-status').dataset.state;resetMedia();
}
function worldCards(target,worlds){
 by(target).replaceChildren(...worlds.map(w=>{
  const card=document.createElement('article');card.className='node';const title=document.createElement('strong'),value=document.createElement('span');
  title.textContent=w.id;value.textContent=w.decision;card.append(title,value);return card;
 }));
}
async function run(fn){
 if(busy)return;busy=true;const g=generation,local=new AbortController();controller=local;
 try{await fn(g,local.signal);}catch{if(live(g)){text('learn-status','Investigation refused or unavailable. No conclusion claimed.');by('learn-status').dataset.state='refused';observe.disabled=watch.disabled=exportButton.disabled=true;learned=null;prepared=null;resetMedia();}}
 finally{busy=false;if(controller===local)controller=null;}
}
pred.addEventListener('change',()=>{reset();text('learn-status','Prediction changed. Plan a fresh investigation.');});
planButton.addEventListener('click',()=>{
 if(busy)return;reset();run(async g=>{
  const result=await planTimingLesson();if(!live(g))return;
  prepared={prediction:pred.value,plan:result};
  worldCards('learn-worlds',result.worlds);
  text('learn-status','Next decisive observation: read the exact catalog cue. Worst-case synthetic cost '+result.plan.worstCost+'.');by('learn-status').dataset.state='planned';observe.disabled=false;
 });
});
observe.addEventListener('click',()=>run(async(g,signal)=>{
 if(!prepared)return;
 const content=await loadContentProfile({baseUrl:new URL('/content/',location.origin).href,signal});
 const receipt=readLessonCue(content);
 const result=await resolveTimingLesson({content,receiptText:JSON.stringify(receipt),prediction:prepared.prediction});
 if(!live(g))return;
 if(result.status!=='catalog_question_resolved'){text('learn-status',result.status+': no conclusion claimed.');by('learn-status').dataset.state=result.status;return;}
 learned={content,result,plan:prepared.plan};
 worldCards('learn-worlds',result.remaining.worlds);
 text('learn-status','Catalog answer: '+(result.answer==='before'?'before 3 seconds':'at or after 3 seconds')+'. '+result.feedback.replaceAll('_',' ')+'. Excluded '+result.excludedWorlds.join(', ')+'. Source consistency only.');
 by('learn-status').dataset.state=result.status;
 text('learn-evidence',receipt.start+'–'+receipt.end+' s · '+receipt.excerpt+' · '+receipt.sourceVersion+' · '+receipt.sourceHash);
 observe.disabled=true;watch.disabled=exportButton.disabled=false;
}));
function waitMedia(event,predicate,act,signal){
 return new Promise((resolve,reject)=>{
  let done=false,timer;
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);video.removeEventListener(event,check);video.removeEventListener('error',failure);signal.removeEventListener('abort',failure);error?reject(error):resolve();};
  const failure=()=>finish(Error('MEDIA_UNAVAILABLE'));
  const check=()=>{try{if(predicate())finish();}catch(e){finish(e);}};
  if(signal.aborted)return failure();
  video.addEventListener(event,check);video.addEventListener('error',failure);signal.addEventListener('abort',failure,{once:true});
  timer=setTimeout(failure,10000);
  try{act();check();}catch(e){finish(e);}
 });
}
watch.addEventListener('click',()=>run(async(g,signal)=>{
 if(!learned)return;resetMedia();const {content,result}=learned,receipt=result.evidence.receipt;
 const source=await readVerifiedLessonMedia({url:new URL(content.profile.media.video,location.origin).href,origin:location.origin,mediaHash:receipt.mediaHash,mode:content.profile.mode,signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
 if(!live(g))return;
 blob=URL.createObjectURL(new Blob([source.bytes],{type:source.mime}));const expected=blob;
 video.hidden=false;
 await waitMedia('loadeddata',()=>video.readyState>=2,()=>{video.src=expected;video.load();},signal);
 if(video.currentSrc!==expected||!Number.isFinite(video.duration)||Math.abs(video.duration-content.source.duration)>.1)throw Error('MEDIA_IDENTITY');
 validateNativeSeekTarget(video,receipt.start);
 await waitMedia('seeked',()=>!video.seeking&&isNativeCueReached(video.currentTime,receipt.start,receipt.end),()=>{video.currentTime=receipt.start;},signal);
 if(!live(g)||video.currentSrc!==expected||!isNativeCueReached(video.currentTime,receipt.start,receipt.end))throw Error('MEDIA_IDENTITY');
 text('learn-media-status','Hash-matched source; native seek reached '+video.currentTime.toFixed(2)+' s. This is navigation evidence, not verification of the recorded event.');
 by('learn-media-status').dataset.state='cue_reached';
}));
exportButton.addEventListener('click',()=>{
 if(!learned||busy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,caseText:timingLessonCase(),plan:learned.plan,result:learned.result},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='sutra-learning-evidence.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function renderPolicy(node,depth=0){
 const pad='  '.repeat(depth);
 if(node.kind==='decision')return pad+node.decision+' (stop)';
 return pad+node.observationId+' · cost '+node.cost+'\n'+node.branches.map(b=>pad+'→ '+b.outcome+'\n'+renderPolicy(b.next,depth+1)).join('\n');
}
let frontierBusy=false;
async function frontier(insufficient){
 if(frontierBusy)return;frontierBusy=true;
 try{
  const c=JSON.parse(frontierCase());if(insufficient)c.observations=c.observations.filter(x=>x.id==='measure_stiffness');
  const r=await evaluateFrontier(JSON.stringify(c));worldCards('frontier-worlds',r.worlds);
  by('frontier-status').dataset.state=r.status;
  text('frontier-status',r.plan?'Best-case '+r.plan.bestCost+' · worst-case '+r.plan.worstCost+' synthetic effort units.':'Available observations cannot distinguish '+r.witness.join(' from ')+'. Abstain.');
  text('frontier-plan',r.plan?renderPolicy(r.plan):'No decisive policy under the declared observations.');
 }catch{delete by('frontier-status').dataset.state;text('frontier-status','Computation refused.');text('frontier-plan','');}
 finally{frontierBusy=false;}
}
by('frontier-run').addEventListener('click',()=>frontier(false));by('frontier-insufficient').addEventListener('click',()=>frontier(true));
