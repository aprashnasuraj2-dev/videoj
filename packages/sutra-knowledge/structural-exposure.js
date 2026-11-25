// Scoped structural dependency cuts, not empirical source independence.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {replayInvestigationVersion} from './investigation-revision.js';
export const VERSION='sutra-structural-exposure/v1';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const sort=(a,b)=>a<b?-1:a>b?1:0;
const unique=xs=>[...new Set(xs)].sort(sort);
const decisive=s=>s==='CONDITIONALLY_SATISFIED'||s==='CONDITIONALLY_REFUTED';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function auditStructuralExposure(versionText,versionPin){
 const replay=await replayInvestigationVersion(versionText,versionPin),v=parse(versionText,6),c=parse(v.contractText);
 const sources=c.sources.slice().sort((a,b)=>sort(a.id,b.id));
 const parent=new Map(sources.map(s=>[s.id,s.id]));
 const root=i=>{while(parent.get(i)!==i)i=parent.get(i);return i;};
 const joins=[];
 for(let i=0;i<sources.length;i++)for(let j=i+1;j<sources.length;j++){
  const a=sources[i],b=sources[j],reasons=[];
  if(a.lineage===b.lineage)reasons.push('SAME_DECLARED_LINEAGE');
  if(a.digest===b.digest)reasons.push('EXACT_DUPLICATE_BYTES');
  if(!reasons.length)continue;
  joins.push({left:a.id,right:b.id,reasons});
  const x=root(a.id),y=root(b.id);if(x!==y)parent.set(sort(x,y)<0?y:x,sort(x,y)<0?x:y);
 }
 const groups=new Map();
 for(const s of sources){const r=root(s.id);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(s);}
 const components=[...groups].map(([id,s])=>({id:'cohort_'+id,sourceIds:s.map(x=>x.id),declaredLineages:unique(s.map(x=>x.lineage)),sourceDigests:unique(s.map(x=>x.digest)),independence:'NOT_ESTABLISHED'}));
 const membership=new Map(components.flatMap(g=>g.sourceIds.map(id=>[id,g.id])));
 const candidates=replay.investigation.candidates.map(a=>{
  const comp=a.computation,sourceIds=comp?.sourceIds??[];
  const contextSourceIds=unique(Object.values(a.facets).flatMap(f=>f.references.filter(r=>r.span).map(r=>r.span.sourceId)));
  return {id:a.id,state:comp?.status??'REFUSED',targetSignature:comp?.targetSignature??null,
   targetSourceIds:sourceIds,targetCohorts:unique(sourceIds.filter(s=>membership.has(s)).map(s=>membership.get(s))),
   questionQuantityDependency:sourceIds.includes('question'),
   contextOnlyCohorts:unique(contextSourceIds.filter(s=>membership.has(s)&&!sourceIds.includes(s)).map(s=>membership.get(s))).filter(id=>!sourceIds.some(s=>membership.get(s)===id)),
   ancestryCompleteness:'UNKNOWN'};
 });
 // Exact structure copies do not multiply the number of target obligations.
 const structures=new Map();
 for(const a of candidates.filter(a=>decisive(a.state))){
  if(!structures.has(a.targetSignature))structures.set(a.targetSignature,{id:a.id,candidateIds:[],targetCohorts:a.targetCohorts,state:a.state});
  const g=structures.get(a.targetSignature);
  if(g.state!==a.state||JSON.stringify(g.targetCohorts)!==JSON.stringify(a.targetCohorts))throw Error('STRUCTURAL_EXPOSURE_INVARIANT');
  g.candidateIds.push(a.id);
 }
 const targets=[...structures.values()],cohorts=components.map(g=>{
  const affected=targets.filter(t=>t.targetCohorts.includes(g.id));
  return {...g,affectedTargetClasses:affected.map(t=>t.id),affectedCandidateIds:affected.flatMap(t=>t.candidateIds),
   affectedContextCandidateIds:candidates.filter(c=>c.contextOnlyCohorts.includes(g.id)).map(c=>c.id)};
 });
 const allCuts=[];
 // Each target currently needs every admitted numeric leaf in its DAG.
 // Hitting any one source cohort removes at least one reviewed dependency.
 // Enumerate exact minimum sets over <=8 supplied cohorts; no new observations.
 let min=null;
 for(let mask=1;mask<(1<<cohorts.length);mask++){
  const ids=cohorts.filter((_,i)=>mask&(1<<i)).map(g=>g.id);
  if(min!==null&&ids.length>min)continue;
  if(!targets.length||!targets.every(t=>t.targetCohorts.some(c=>ids.includes(c))))continue;
  if(min===null||ids.length<min){min=ids.length;allCuts.length=0;}
  allCuts.push(ids);
 }
 const status=!targets.length?'NO_DECISIVE_TARGETS':min===null?'NO_EXTERNAL_COHORT_CUT_COVERS_ALL_TARGETS':'MINIMUM_DECLARED_COHORT_CUT_FOUND';
 return freeze({version:VERSION,versionDigest:versionPin,cohorts,joins,candidates,targetClasses:targets,
  cut:{status,minimumCohorts:min,sets:allCuts,uncoverableTargets:targets.filter(t=>!t.targetCohorts.length).map(t=>t.id)},
  counts:{sourceArtifacts:sources.length,declaredLineages:unique(sources.map(s=>s.lineage)).length,exactByteIdentities:unique(sources.map(s=>s.digest)).length,conservativeCohorts:cohorts.length,decisiveCandidateCount:candidates.filter(a=>decisive(a.state)).length,distinctDecisiveTargets:targets.length},
  decisionAuthority:'NONE',qualification:'Cohorts conservatively connect equal declared lineage or exact duplicate bytes, not verified common causes or independent roots. A cut touches a required input of each supplied decisive graph; it is not a proof that removing a source reverses truth, that a system physically fails, or that no substitute evidence exists. Context-only dependencies remain separate; unknown ancestry and unresolved candidates remain visible.'});
}
