import {sealRoleArtifact} from './role-artifact-provenance.js';
// Six host-owned deterministic roles over an exact pinned investigation. No model,
// retrieval, evidence adoption, decision authority, or credential access.
import {runTaskGraph} from '../sutra-runtime/investigation-tasks.js';
import {casePin} from './pinned-investigation.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {replayInvestigationVersion,VERSION} from './investigation-revision.js';
import {auditStructuralExposure} from './structural-exposure.js';
const parse=(s,d=12)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const fail=code=>{const e=new Error('Investigation role review refused ('+code+').');e.code=code;throw e;};
const ids=Object.freeze([
 ['frame','frame','planner',[]],['evidence','inventory','researcher',['frame']],
 ['compute','replay','coder',['evidence']],['analysis','contrast','analyst',['compute']],
 ['challenge','exposure','critic',['evidence','compute']],['coordinate','coordinate','coordinator',['frame','evidence','compute','analysis','challenge']]
].map(([id,kind,agentId,dependsOn])=>Object.freeze({id,kind,agentId,dependsOn:Object.freeze(dependsOn)})));
export const ROLE_REVIEW_TASKS=ids;
const decisive=s=>s==='CONDITIONALLY_SATISFIED'||s==='CONDITIONALLY_REFUTED';
const sorted=a=>[...new Set(a)].sort();
export async function runInvestigationReview({versionText,versionPin,runId,signal,onEvent,onExecutionEvent,assertCurrent,timeoutMs=30000}={}){
 if(typeof versionText!=='string'||!versionText.length||versionText.length>262144||typeof versionPin!=='string'||!/^sha256:[a-f0-9]{64}$/.test(versionPin))fail('INPUT');
 let wire=null,contract=null;
 const typed=(kind,execute,validate)=>({execute,admit:(value)=>{if(value?.versionDigest!==versionPin||value?.kind!==kind||!validate(value))fail('ARTIFACT');return value;}});
 const out=(kind,fields)=>({versionDigest:versionPin,kind,...fields,decisionAuthority:'NONE'});
 const handlers={
  frame:typed('frame',async()=>{
   if(await casePin(versionText)!==versionPin)fail('PIN');
   wire=parse(versionText,6);
   if(wire.version!==VERSION||typeof wire.contractText!=='string'||typeof wire.batchText!=='string')fail('VERSION');
   contract=parse(wire.contractText,9);const batch=parse(wire.batchText,5);
   if(typeof contract.question?.digest!=='string'||!Array.isArray(batch.proposals)||batch.proposals.length>8)fail('FRAME');
   return out('frame',{questionDigest:contract.question.digest,candidateIds:batch.proposals.map(x=>x.id),requiredReview:['source authenticity','intended meaning','method validity','external applicability']});
  },v=>typeof v.questionDigest==='string'&&Array.isArray(v.candidateIds)),
  inventory:typed('inventory',async()=>{
   const admitted=await validateReviewedContract(wire.contractText,wire.contractPin);
   const sources=contract.sources.map(s=>({id:s.id,digest:s.digest,lineage:s.lineage}));
   return out('inventory',{contractDigest:admitted.contractDigest,sources,bindingCount:admitted.bindingCount,declaredLineages:sorted(sources.map(s=>s.lineage)),distinctSourceDigests:sorted(sources.map(s=>s.digest)).length,independence:'NOT_ESTABLISHED'});
  },v=>typeof v.contractDigest==='string'&&Array.isArray(v.sources)&&Number.isSafeInteger(v.bindingCount)),
  replay:typed('replay',async()=>{
   const report=await replayInvestigationVersion(versionText,versionPin),i=report.investigation;
   return out('replay',{triage:i.triage.state,verification:i.verification,candidates:i.candidates.map(c=>({id:c.id,admission:c.admission,status:c.computation?.status??'REFUSED',bindingIds:c.computation?.bindingIds??[],sourceIds:c.computation?.sourceIds??[],questionCoverage:c.questionCoverage,meaningStatus:c.meaningStatus})),graphCounts:{nodes:report.graph.nodes.length,edges:report.graph.edges.length},qualification:'Fresh canonical local replay; not independent external verification.'});
  },v=>Array.isArray(v.candidates)&&typeof v.triage==='string'&&typeof v.verification==='object'),
  contrast:typed('contrast',({inputs})=>{
   const c=inputs[0].value.candidates,opposing=[];
   for(let a=0;a<c.length;a++)for(let b=a+1;b<c.length;b++)if(decisive(c[a].status)&&decisive(c[b].status)&&c[a].status!==c[b].status)opposing.push([c[a].id,c[b].id]);
   return out('contrast',{triage:inputs[0].value.triage,opposingPairs:opposing,unresolved:c.filter(x=>!decisive(x.status)).map(x=>x.id),partialQuestionCoverage:c.filter(x=>x.questionCoverage!=='FULL_QUESTION_SPAN').map(x=>x.id),semanticReview:'REQUIRED'});
  },v=>Array.isArray(v.opposingPairs)&&Array.isArray(v.unresolved)),
  exposure:typed('exposure',async()=>{
   const a=await auditStructuralExposure(versionText,versionPin);
   return out('exposure',{counts:a.counts,cut:a.cut,cohorts:a.cohorts.map(c=>({id:c.id,sourceIds:c.sourceIds,affectedCandidateIds:c.affectedCandidateIds,affectedContextCandidateIds:c.affectedContextCandidateIds,independence:c.independence})),qualification:a.qualification});
  },v=>Array.isArray(v.cohorts)&&typeof v.cut?.status==='string'),
  coordinate:typed('coordinate',({inputs})=>{
   const byKind=new Map(inputs.map(a=>[a.kind,a.value])),replay=byKind.get('replay'),contrast=byKind.get('contrast'),exposure=byKind.get('exposure');
   return out('coordinate',{triage:replay.triage,completedArtifactIds:inputs.map(a=>a.taskId),opposingPairCount:contrast.opposingPairs.length,unresolvedCandidateIds:contrast.unresolved,minimumDeclaredCohorts:exposure.cut.minimumCohorts,verification:replay.verification,semanticReview:'REQUIRED',qualification:'A coordinated review of supplied evidence and interpretations; neither agent agreement nor replay establishes empirical truth.'});
  },v=>v.completedArtifactIds.length===5&&v.semanticReview==='REQUIRED')
 };
 return runTaskGraph({tasks:ids,handlers,runId,version:versionPin,signal,onEvent,onExecutionEvent,executionOrigin:'deterministic',assertCurrent,timeoutMs,concurrency:2,maxPerAgent:1,sealArtifact:sealRoleArtifact});
}
