// Trusted, local review planning from the compiler's contrast result.
// Greedy pair separation is not semantic validation or an optimal experimental design.
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const pairKey=p=>p.left+'|'+p.right;
export function planCouncilReview(triage,candidates){
 const qualification='Greedy review prompts separate opposing supplied conditional outcomes by binding inclusion, comparison operator or exact expression. They cannot establish intended meaning, source truth, equivalence, completeness or decision authority.';
 if(!triage)return freeze({state:candidates.length?'REVIEW_SINGLE_PROPOSAL':'NO_PROPOSAL_TO_REVIEW',opposingPairs:0,coveredPairs:0,steps:[],unresolvedPairs:[],qualification});
 const contrast=triage.contrast,entries=new Map(contrast.entries.filter(x=>x.admission==='ADMITTED').map(x=>[x.id,x.computation]));
 const opposing=contrast.pairs.filter(p=>p.stateRelation==='OPPOSITE_CONDITIONAL_STATES').slice().sort((a,b)=>sort(pairKey(a),pairKey(b)));
 if(!opposing.length)return freeze({state:'REVIEW_MEANING_AND_UNRESOLVED_CANDIDATES',opposingPairs:0,coveredPairs:0,steps:[],unresolvedPairs:[],qualification});
 // Candidate features are deterministic projections of already admitted compiler results.
 // Do not infer how a binding should be used; only distinguish inclusion in the target.
 const features=new Map();
 function add(key,kind,label,pair){
  if(!features.has(key))features.set(key,{key,kind,label,pairs:new Set()});
  features.get(key).pairs.add(pairKey(pair));
 }
 for(const p of opposing){
  const l=entries.get(p.left),r=entries.get(p.right);
  for(const id of [...p.bindingRelation.onlyLeft,...p.bindingRelation.onlyRight].sort(sort))add('binding:'+id,'BINDING_INCLUSION','Does the intended comparison include ['+id+']?',p);
  if(l.targetOperator!==r.targetOperator)add('comparison','COMPARISON_OPERATOR','Which comparison operator represents the intended question?',p);
 }
 const pending=new Set(opposing.map(pairKey)),steps=[];
 function choices(feature,covered){
  const ids=[...new Set(covered.flatMap(k=>k.split('|')))].sort(sort);
  return ids.map(id=>({candidateId:id,choice:feature.kind==='BINDING_INCLUSION'?(entries.get(id).bindingIds.includes(feature.key.slice(8))?'INCLUDED':'NOT_INCLUDED'):entries.get(id).targetOperator}));
 }
 // Greedy maximum uncovered-pair coverage; lexicographic tie break. The bounded
 // eight candidates give at most 28 pairs. No claim of a globally minimal plan.
 while(pending.size){
  let best=null,bestCovered=[];
  for(const feature of [...features.values()].sort((a,b)=>sort(a.key,b.key))){
   const covered=[...feature.pairs].filter(p=>pending.has(p)).sort(sort);
   if(covered.length>bestCovered.length){best=feature;bestCovered=covered;}
  }
  if(!best)break;
  steps.push({kind:best.kind,prompt:best.label,coveredPairs:bestCovered,choices:choices(best,bestCovered)});
  for(const p of bestCovered)pending.delete(p);
 }
 // Same bindings and comparator can still produce opposite outcomes through
 // different arithmetic. This is a manual expression-structure review, not a
 // claim that the binding or comparator questions can resolve it.
 for(const k of [...pending].sort(sort)){
  const [left,right]=k.split('|');
  steps.push({kind:'EXPRESSION_STRUCTURE',prompt:'Which complete expression represents the intended question?',coveredPairs:[k],choices:[{candidateId:left,choice:'REVIEW_COMPLETE_EXPRESSION'},{candidateId:right,choice:'REVIEW_COMPLETE_EXPRESSION'}]});
  pending.delete(k);
 }
 return freeze({state:'REVIEW_OPPOSING_INTERPRETATIONS',opposingPairs:opposing.length,coveredPairs:opposing.length-pending.size,steps,unresolvedPairs:[...pending],qualification});
}
