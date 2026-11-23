import {compareClaimPair,syntheticComparison} from './comparison.js';

const node=(tag,cls,text)=>{
 const item=document.createElement(tag);
 if(cls)item.className=cls;
 if(text!==undefined)item.textContent=String(text);
 return item;
};
const valueText=value=>value===undefined?'Unavailable':String(value);

export function mountComparisonView(host,{receipt,seekTo}={}){
 if(!host||typeof host.replaceChildren!=='function')throw Error('Comparison host missing.');
 const local=receipt&&typeof receipt.sourceId==='string'?{
  sourceKind:'video',sourceId:receipt.sourceId,sourceVersion:receipt.sourceVersion,
  title:'Actual synthetic timing-cue catalog',scope:'synthetic_timing_only',claimKey:'marker_presence',
  value:'marker_present',excerpt:receipt.excerpt,start:receipt.start,end:receipt.end
 }:null;
 const controls=node('div','actions');
 const compare=node('button','primary','Inspect available evidence');
 const conflict=node('button',null,'Demonstrate a synthetic conflict');
 compare.type=conflict.type='button';
 controls.append(compare,conflict);
 const status=node('p','comparison-status');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const cards=node('div','comparison-cards');
 const seekStatus=node('p','comparison-seek-status');
 seekStatus.setAttribute('role','status');
 const note=node('p','muted','Comparisons evaluate exact declared values and source scope, not the truth of either claim. The conflict example is hypothetical and unrelated to original lesson footage.');
 host.replaceChildren(controls,status,cards,seekStatus,note);
 let activeMode='available';
 function card(title,claim){
  const article=node('article','comparison-card');
  const heading=node('h3',null,title);
  article.append(heading);
  if(!claim){
   article.append(node('p','comparison-missing','No reviewed source excerpt or provenance is connected.'));
   return article;
  }
  const list=node('dl','comparison-metadata');
  for(const [k,v] of [
   ['Source',claim.sourceId],['Version',claim.sourceVersion],
   ['Scope',claim.scope],['Claim key',claim.claimKey],['Structured value',valueText(claim.value)]
  ]){
   const dt=node('dt',null,k),dd=node('dd',null,v);list.append(dt,dd);
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
  cards.replaceChildren(card('Video-side source',comparison.video),card('Written guide-side source',comparison.guide));
  status.dataset.state=comparison.status;
  const prefix={
   missing_source:'Missing evidence',unresolved_conflict:'Unresolved disagreement',
   incomparable:'Not comparable',invalid_source:'Invalid source',
   consistent_unverified:'Structured match, truth unverified'
  }[comparison.status]??'Not evaluated';
  status.textContent=prefix+'. '+comparison.reason;
  seekStatus.textContent='';
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
