// Consequential clarification planning over caller-declared alternatives only.
import {replayInvestigationVersion} from './investigation-revision.js';
import {searchSemanticWitnesses} from './semantic-witness-search.js';
import {FACETS} from './semantic-investigation.js';
export const VERSION='sutra-clarification-plan/v1';
const decisive=s=>s==='CONDITIONALLY_SATISFIED'||s==='CONDITIONALLY_REFUTED';
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const pairKey=(a,b)=>[a,b].sort(sort).join('|');
const questionFor=facet=>({
 entity:'Which entity is intended?',definition:'Which definition of the outcome is intended?',time:'Which time period is intended?',population:'Which population is intended?',geography:'Which geographical scope is intended?',condition:'Under which operating or study condition?',measurement:'Which measurement or metric is intended?',baseline:'Which comparison baseline is intended?',quantifier:'Which quantifier or threshold is intended?',negation:'Which positive or negative claim is intended?',modality:'Which degree of necessity or possibility is intended?',causality:'Is the intended claim descriptive or causal?',method:'Which method is intended?'
})[facet];
// Identical target structure and identical declared meanings/facets form a
// single review class. Repeated copies never inflate pair-discrimination counts.
// Unknown/refused programs are never collapsed into a decisive class.
function classesOf(candidates){
 const m=new Map();
 for(const c of candidates){
  const state=c.computation?.status??'REFUSED';
  const declarations=FACETS.map(k=>[k,c.facets[k].statement,c.facets[k].status]);
  const key=decisive(state)?JSON.stringify([c.computation.targetSignature,state,c.meaning,declarations]):'unresolved:'+c.id;
  if(!m.has(key))m.set(key,{id:c.id,candidateIds:[],state,meaning:c.meaning,facets:c.facets});
  m.get(key).candidateIds.push(c.id);
 }
 return [...m.values()].sort((a,b)=>sort(a.id,b.id));
}
export async function planInvestigationClarifications(versionText,pin,{maxScenarios=8,maxQuestions=3}={}){
 if(!Number.isSafeInteger(maxScenarios)||maxScenarios<1||maxScenarios>16||!Number.isSafeInteger(maxQuestions)||maxQuestions<1||maxQuestions>13)throw RangeError('CLARIFICATION_BUDGET');
 const replay=await replayInvestigationVersion(versionText,pin),candidates=replay.investigation.candidates,classes=classesOf(candidates);
 const witness=await searchSemanticWitnesses(versionText,pin,{maxScenarios});
 const membership=new Map(classes.flatMap(c=>c.candidateIds.map(id=>[id,c.id])));
 const synthetic=new Set(witness.witnesses.map(w=>pairKey(membership.get(w.left),membership.get(w.right))));
 const material=[];
 for(let i=0;i<classes.length;i++)for(let j=i+1;j<classes.length;j++){
  const a=classes[i],b=classes[j],key=pairKey(a.id,b.id);
  if(!decisive(a.state)||!decisive(b.state))continue;
  if(a.state!==b.state)material.push({key,left:a.id,right:b.id,reason:'OBSERVED_CONDITIONAL_DIVERGENCE'});
  else if(synthetic.has(key))material.push({key,left:a.id,right:b.id,reason:'SYNTHETIC_DISTINGUISHING_WITNESS'});
 }
 // Only explicitly declared, unequal statements distinguish a material pair.
 // Absence of an annotation is not evidence for another interpretation.
 const byId=new Map(classes.map(c=>[c.id,c])),options=[];
 for(const facet of FACETS){
  const covers=material.filter(p=>{
   const a=byId.get(p.left).facets[facet].statement,b=byId.get(p.right).facets[facet].statement;
   return a!==null&&b!==null&&a!==b;
  }).map(p=>p.key);
  if(!covers.length)continue;
  const groups=new Map(),unspecified=[];
  for(const c of classes){
   const f=c.facets[facet];if(f.statement===null){unspecified.push(...c.candidateIds);continue;}
   if(!groups.has(f.statement))groups.set(f.statement,[]);
   groups.get(f.statement).push({candidateIds:c.candidateIds,sourceLinkStatus:f.status});
  }
  options.push({facet,question:questionFor(facet),covers,answers:[...groups].map(([statement,alternatives])=>({statement,alternatives})),unspecified});
 }
 // At most 13 axes, exact subset search within caller's question budget.
 // Optimize observed divergent pairs first, then total material pairs, then fewer
 // questions, then canonical facet order. No probabilities or utility weights.
 const observed=new Set(material.filter(p=>p.reason==='OBSERVED_CONDITIONAL_DIVERGENCE').map(p=>p.key));
 let best={indices:[],covered:new Set(),observed:0};
 for(let mask=1;mask<(1<<options.length);mask++){
  const indices=[];for(let i=0;i<options.length;i++)if(mask&(1<<i))indices.push(i);
  if(indices.length>maxQuestions)continue;
  const covered=new Set(indices.flatMap(i=>options[i].covers));
  const obs=[...covered].filter(k=>observed.has(k)).length;
  const win=obs>best.observed||(obs===best.observed&&(covered.size>best.covered.size||(covered.size===best.covered.size&&indices.length<best.indices.length)));
  if(win)best={indices,covered,observed:obs};
 }
 const questions=best.indices.map(i=>options[i]);
 const unresolved=classes.filter(c=>!decisive(c.state)).map(c=>({candidateIds:c.candidateIds,state:c.state}));
 const remainder=material.filter(p=>!best.covered.has(p.key));
 return freeze({version:VERSION,versionDigest:pin,triage:replay.investigation.triage.state,
  budget:{maxQuestions,maxScenarios},reviewClasses:classes.map(({facets,...c})=>c),materialPairs:material,questions,uncoveredMaterialPairs:remainder,unresolved,
  counts:{candidateCount:candidates.length,reviewClassCount:classes.length,materialPairs:material.length,coveredPairs:best.covered.size,coveredObservedPairs:best.observed,questions:questions.length},
  witnessSearch:{status:witness.status,evaluated:witness.evaluatedScenarioCount,possible:witness.possibleScenarioCount,truncated:witness.truncated,witnesses:witness.witnesses},
  optimization:'EXACT_SUBSET_OVER_SUPPLIED_FACETS_WITH_DECLARED_BUDGET',decisionAuthority:'NONE',
  qualification:'Questions discriminate declared alternatives, not establish which is intended. A response does not approve a candidate or resolve unknowns. No automatic adoption, semantic completeness, empirical validity, calibrated probability or measured human effort. Synthetic witnesses may be infeasible.'});
}
