import {compareClaimPair,syntheticComparison} from './comparison.js';
import {applyLocale} from './localization.js';
import {validateEvidenceClaim} from '../../../packages/sutra-evidence/index.js';
import {buildUncertaintyGuidance} from './uncertainty-guidance.js';

const node=(tag,cls,text)=>{
 const item=document.createElement(tag);
 if(cls)item.className=cls;
 if(text!==undefined)item.textContent=String(text);
 return item;
};
const valueText=value=>value===undefined?'Unavailable':String(value);

export function mountComparisonView(host,{receipt,sources,seekTo}={}){
 if(!host||typeof host.replaceChildren!=='function')throw Error('Comparison host missing.');
 const evidence=receipt?validateEvidenceClaim({version:1,kind:'source_excerpt',text:receipt.excerpt,receipt},{sources}):null;
 const local=evidence?.valid&&evidence.state==='source_backed_unverified'?{
  sourceKind:'video',sourceId:evidence.sourceRef.sourceId,sourceVersion:evidence.sourceRef.sourceVersion,cueId:evidence.sourceRef.cueId,
  title:'Actual synthetic timing-cue catalog',scope:'synthetic_timing_only',claimKey:'marker_presence',
  value:'marker_present',excerpt:evidence.excerpt,start:evidence.sourceRef.start,end:evidence.sourceRef.end,
  provenance:'SUTRA local synthetic timing catalog, not human-reviewed footage',
  observedAt:receipt.retrievedAt,dateBasis:'Fixture receipt retrieval timestamp'
 }:null;
 const controls=node('div','actions');
 const compare=node('button','primary','Inspect available evidence');compare.dataset.i18n='comparison.inspect';
 const conflict=node('button',null,'Demonstrate a synthetic conflict');conflict.dataset.i18n='comparison.conflict';
 compare.type=conflict.type='button';
 controls.append(compare,conflict);
 const status=node('p','comparison-status');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const cards=node('div','comparison-cards');
 const seekStatus=node('p','comparison-seek-status');
 seekStatus.setAttribute('role','status');
 const nextStep=node('p','comparison-next-step');nextStep.setAttribute('role','note');
 const note=node('p','muted','Comparisons evaluate exact declared values and source scope, not the truth of either claim. The conflict example is hypothetical and unrelated to original lesson footage.');note.dataset.i18n='comparison.note';
 host.replaceChildren(controls,status,nextStep,cards,seekStatus,note);
 let activeMode='available';
 function card(title,claim){
  const article=node('article','comparison-card');
  const heading=node('h3',null,title);
  article.append(heading);
  if(!claim){
   const missing=node('p','comparison-missing','No reviewed source excerpt or provenance is connected.');missing.dataset.i18n='comparison.missing';article.append(missing);
   return article;
  }
  const list=node('dl','comparison-metadata');
  for(const [key,k,v] of [
   ['comparison.meta.source','Source',claim.sourceId],['comparison.meta.version','Version',claim.sourceVersion],
   ['comparison.meta.scope','Scope',claim.scope],['comparison.meta.claim','Claim key',claim.claimKey],
   ['comparison.meta.value','Structured value',valueText(claim.value)],
   ['comparison.meta.provenance','Provenance',claim.provenance],
   ['comparison.meta.timestamp','Recorded timestamp',claim.observedAt??'Not supplied'],
   ['comparison.meta.date','Date meaning',claim.dateBasis??'Not supplied']
  ]){
   const dt=node('dt',null,k),dd=node('dd',null,v);dt.dataset.i18n=key;
   if(key==='comparison.meta.timestamp'&&claim.observedAt)dd.dataset.formatDatetime=claim.observedAt;
   list.append(dt,dd);
  }
  article.append(list,node('blockquote','comparison-excerpt',claim.excerpt));
  if(activeMode==='available'&&claim.sourceKind==='video'&&
   Number.isFinite(claim.start)&&typeof seekTo==='function'){
   const button=node('button',null,'Inspect native video cue at '+String(claim.start)+' seconds');
   button.type='button';
   button.addEventListener('click',async()=>{
    seekStatus.textContent='Checking actual native seek availability…';
    try{
     const reached=await seekTo(claim.start);
     if(!Number.isFinite(reached)||Math.abs(reached-claim.start)>1)throw Error('Native cue not confirmed');
     seekStatus.textContent='Native media reached the synthetic catalog cue. This does not verify the claim.';
    }catch{
     seekStatus.textContent='Video cue unavailable. Load the synthetic timing fixture first; no successful seek is claimed.';
    }
   });
   article.append(button);
  }
  return article;
 }
 function render(){
  const comparison=compareClaimPair(activeMode==='available'?
   {video:local,guide:null}:syntheticComparison);
  const videoCard=card('Video-side source',comparison.video),guideCard=card('Written guide-side source',comparison.guide);
  videoCard.querySelector('h3').dataset.i18n='comparison.video';guideCard.querySelector('h3').dataset.i18n='comparison.guide';
  cards.replaceChildren(videoCard,guideCard);
  status.dataset.state=comparison.status;
  const prefix={
   missing_source:'Missing evidence',unresolved_conflict:'Unresolved disagreement',
   incomparable:'Not comparable',invalid_source:'Invalid source',
   consistent_unverified:'Structured match, truth unverified'
  }[comparison.status]??'Not evaluated';
  status.textContent=prefix+'. '+comparison.reason;
  const guidance=buildUncertaintyGuidance(comparison);
  nextStep.dataset.disposition=guidance.disposition;
  nextStep.textContent='Next human step: '+guidance.nextAction;
  seekStatus.textContent='';
  applyLocale(host,document.documentElement.lang||'en');
  return comparison.status;
 }
 compare.addEventListener('click',()=>{
  activeMode='available';compare.classList.add('primary');conflict.classList.remove('primary');render();
 });
 conflict.addEventListener('click',()=>{
  activeMode='conflict';conflict.classList.add('primary');compare.classList.remove('primary');render();
 });
 render();
 return {showAvailable(){activeMode='available';render();},showConflict(){activeMode='conflict';render();}};
}
