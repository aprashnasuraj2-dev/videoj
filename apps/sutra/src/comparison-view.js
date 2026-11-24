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

export function mountComparisonView(host,{receipt,sources,seekTo,videoClaim,guideClaim=null,contentMode='synthetic'}={}){
 if(!host||typeof host.replaceChildren!=='function')throw Error('Comparison host missing.');
 const evidence=receipt?validateEvidenceClaim({version:1,kind:'source_excerpt',text:receipt.excerpt,receipt},{sources}):null;
 const local=evidence?.valid&&evidence.state==='source_backed_unverified'&&videoClaim?{
  sourceKind:'video',sourceId:evidence.sourceRef.sourceId,sourceVersion:evidence.sourceRef.sourceVersion,sourceHash:evidence.sourceRef.sourceHash,cueId:evidence.sourceRef.cueId,
  title:videoClaim.title,scope:videoClaim.scope,claimKey:videoClaim.claimKey,value:videoClaim.value,
  excerpt:evidence.excerpt,start:evidence.sourceRef.start,end:evidence.sourceRef.end,provenance:videoClaim.provenance,
  observedAt:receipt.retrievedAt,dateBasis:videoClaim.dateBasis
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
 const note=node('p','muted','Comparisons evaluate exact declared values and source scope, not the truth of either claim. The separate conflict demonstration remains hypothetical.');note.dataset.i18n='comparison.note';
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
   ['comparison.meta.source','Source',claim.sourceId],['comparison.meta.version','Version',claim.sourceVersion],['comparison.meta.hash','Source hash',claim.sourceHash??'Not supplied'],
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
  const excerpt=node('blockquote','comparison-excerpt',claim.excerpt);
  excerpt.id='comparison-source-'+claim.sourceKind+'-'+claim.sourceId;
  article.append(list,excerpt);
  if(claim.sourceKind==='guide'&&claim.sourceHref){
   const link=node('a','comparison-source-link','Open written source excerpt');
   const href=new URL(claim.sourceHref,location.href);link.href=href.href;link.target='_blank';link.rel='noopener noreferrer';
   link.setAttribute('aria-describedby',excerpt.id);article.append(link);
   if(claim.sourceHash){
    const verify=node('button',null,'Check written source integrity');verify.type='button';
    verify.addEventListener('click',async()=>{
     verify.disabled=true;seekStatus.textContent='Checking written source bytes and anchored excerpt…';
     try{
      const response=await fetch(href.href,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{Accept:'text/html'}});
      if(!response.ok||response.url&&new URL(response.url).origin!==location.origin||!response.headers.get('content-type')?.toLowerCase().includes('text/html'))throw Error('Unexpected source response');
      if(Number(response.headers.get('content-length'))>65536)throw Error('Source too large');
      const bytes=await response.arrayBuffer();if(bytes.byteLength>65536)throw Error('Source too large');
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==claim.sourceHash)throw Error('Source hash mismatch');
      const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),doc=new DOMParser().parseFromString(text,'text/html');
      const anchored=href.hash?doc.getElementById(decodeURIComponent(href.hash.slice(1))):doc.body;
      if(!anchored||!anchored.textContent.includes(claim.excerpt))throw Error('Anchored excerpt mismatch');
      seekStatus.textContent='Written source bytes and anchored excerpt match this comparison record. This does not establish factual truth.';
     }catch{seekStatus.textContent='Written source integrity could not be confirmed. Do not treat the linked excerpt as matching this comparison record.';}
     finally{verify.disabled=false;}
    });
    article.append(verify);
   }
  }
  if(activeMode==='available'&&claim.sourceKind==='video'&&
   Number.isFinite(claim.start)&&typeof seekTo==='function'){
   const button=node('button',null,'Inspect native video cue at '+String(claim.start)+' seconds');
   button.type='button';
   button.addEventListener('click',async()=>{
    seekStatus.textContent='Checking actual native seek availability…';
    try{
     const reached=await seekTo(claim.start);
     if(!Number.isFinite(reached)||Math.abs(reached-claim.start)>1)throw Error('Native cue not confirmed');
     seekStatus.textContent='Native media reached the catalog cue. This does not verify the claim.';
    }catch{
     seekStatus.textContent='Video cue unavailable. Load the source media first; no successful seek is claimed.';
    }
   });
   article.append(button);
  }
  return article;
 }
 function render(){
  const comparison=compareClaimPair(activeMode==='available'?{video:local,guide:guideClaim}:syntheticComparison);
  const videoCard=card('Video-side source',comparison.video),guideCard=card('Written guide-side source',comparison.guide);
  videoCard.querySelector('h3').dataset.i18n='comparison.video';guideCard.querySelector('h3').dataset.i18n='comparison.guide';
  cards.replaceChildren(videoCard,guideCard);
  status.dataset.state=comparison.status;
  const prefix={
   missing_source:'Missing evidence',unresolved_conflict:'Unresolved disagreement',
   incomparable:'Not comparable',invalid_source:'Invalid source',
   matching_values_unreviewed:'Matching values, agreement unreviewed',
   exact_excerpt_match_unverified:'Exact excerpt match, truth unverified'
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
