import {prepareApprovedExpressionCouncil} from './approved-expression-council.js';
import {pinConsentInspector} from '../sutra-consent/index.js';
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
const pin=v=>typeof v==='string'&&/^sha256:[0-9a-f]{64}$/.test(v);
const task=(id,kind,agentId,dependsOn)=>Object.freeze({id,kind,agentId,dependsOn:Object.freeze(dependsOn)});
export const HYBRID_REVIEW_TASKS=Object.freeze([...ids.slice(0,5),task('consult','model_consult','critic',['evidence']),task('compare','proposal_compare','analyst',['compute','analysis','consult']),task('coordinate','coordinate','coordinator',['frame','evidence','compute','analysis','challenge','consult','compare'])]);
export function runInvestigationReview(options){return runRoleGraph(options);}
async function runRoleGraph({versionText,versionPin,runId,signal,onEvent,onExecutionEvent,assertCurrent,timeoutMs=30000}={},consultation=null){
 if(typeof versionText!=='string'||!versionText.length||versionText.length>262144||typeof versionPin!=='string'||!/^sha256:[a-f0-9]{64}$/.test(versionPin))fail('INPUT');
 let wire=null,contract=null,canonicalReport=null;
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
   const report=await replayInvestigationVersion(versionText,versionPin),i=report.investigation;canonicalReport=report;
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
   return out('coordinate',{triage:replay.triage,completedArtifactIds:inputs.map(a=>a.taskId),opposingPairCount:contrast.opposingPairs.length,unresolvedCandidateIds:contrast.unresolved,minimumDeclaredCohorts:exposure.cut.minimumCohorts,verification:replay.verification,semanticReview:'REQUIRED',...(consultation?{modelConsultation:byKind.get('proposal_compare')}:{}),qualification:'A coordinated review of supplied evidence and interpretations; neither agent agreement nor replay establishes empirical truth.'});
  },v=>v.completedArtifactIds.length===(consultation?7:5)&&v.semanticReview==='REQUIRED')
 };
 if(consultation){
  handlers.model_consult=typed('model_consult',async({signal:taskSignal,observeConsultation})=>{
   const result=await consultation.approval.execute({approvedPlanPin:consultation.approval.planPin,consentInspector:consultation.inspector,signal:taskSignal,assertCurrent,onActivity:event=>observeConsultation({...event,planPin:consultation.approval.planPin})});
   if(result.contractDigest!==wire.contractPin||result.decisionAuthority!=='NONE'||result.semanticReview!=='REQUIRED'||result.termination==='CANCELLED_OR_TIMEOUT')fail('MODEL_CONSULT');
   return out('model_consult',{planPin:consultation.approval.planPin,contractDigest:result.contractDigest,termination:result.termination,agreement:result.agreement,coverage:{plannedSlots:consultation.approval.plan.agents.length*consultation.approval.plan.maxRounds,observedSlots:result.rounds.reduce((n,r)=>n+r.agents.length,0),admittedSlots:result.rounds.reduce((n,r)=>n+r.agents.filter(a=>a.status==='PROPOSED').length,0),state:result.state},candidates:result.candidates.map(c=>({expression:c.expression,proposalDigest:c.proposalDigest,bindingIds:c.usedBindings,status:c.target.status,authorship:c.authorship,semanticReview:c.semanticReview})),semanticReview:'REQUIRED',qualification:'Model proposals compiled locally; not adopted into the reviewed version.'});
  },v=>pin(v.planPin)&&Array.isArray(v.candidates)&&v.candidates.every(c=>pin(c.proposalDigest)&&c.authorship==='MODEL_PROPOSAL'&&c.semanticReview==='REQUIRED'));
  handlers.proposal_compare=typed('proposal_compare',({inputs})=>{
   const generated=inputs.find(a=>a.kind==='model_consult').value,existing=new Set(canonicalReport.investigation.candidates.map(c=>c.computation?.proposalDigest).filter(Boolean));
   return out('proposal_compare',{reviewedCandidateIds:canonicalReport.investigation.candidates.map(c=>c.id),generated:generated.candidates.map(c=>({proposalDigest:c.proposalDigest,status:c.status,relation:existing.has(c.proposalDigest)?'MATCHES_REVIEWED_PROPOSAL_BYTES':'NEW_PROPOSAL_REQUIRES_REVIEW'})),semanticReview:'REQUIRED',qualification:'Byte identity is not semantic equivalence; new proposals remain quarantined.'});
  },v=>Array.isArray(v.generated)&&v.semanticReview==='REQUIRED');
 }
 return runTaskGraph({tasks:consultation?HYBRID_REVIEW_TASKS:ids,handlers,runId,version:versionPin,signal,onEvent,onExecutionEvent,executionOrigin:consultation?'host-task':'deterministic',assertCurrent,timeoutMs,concurrency:2,maxPerAgent:1,sealArtifact:sealRoleArtifact});
}

// Host-held exact approval for the optional model branch of the same six-role DAG.
// The reviewed version and its candidate set remain immutable.
export async function prepareHybridInvestigationReview({versionText,versionPin,routes,workspace,disclosure,maxRounds=1,maxOutputTokens=256,timeoutMs=15000,roundPolicy='fixed'}={}){
 if(typeof versionText!=='string'||!pin(versionPin)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)fail('INPUT');
 await replayInvestigationVersion(versionText,versionPin);
 const wire=parse(versionText,6);
 const approval=await prepareApprovedExpressionCouncil({contractText:wire.contractText,contractPin:wire.contractPin,routes,workspace,disclosure,maxRounds,maxOutputTokens,timeoutMs,roundPolicy});
 const plan=Object.freeze({schema:'sutra-hybrid-review/v1',versionDigest:versionPin,tasks:HYBRID_REVIEW_TASKS,councilPlanPin:approval.planPin,councilPlan:approval.plan,qualification:'One scoped model consultation and local conditional comparison. No automatic evidence, interpretation or decision adoption.'});
 const planPin=await casePin(JSON.stringify(plan));let consumed=false;
 return Object.freeze({plan,planPin,async execute({approvedPlanPin,consentInspector,runId,signal,onEvent,onExecutionEvent,assertCurrent=()=>{}}={}){
  if(consumed)fail('CONSUMED');if(approvedPlanPin!==planPin)fail('PLAN_PIN');
  if(typeof assertCurrent!=='function'||typeof runId!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(runId))fail('CONFIG');
  const inspector=pinConsentInspector(consentInspector);consumed=true;assertCurrent();
  return runRoleGraph({versionText,versionPin,runId,signal,onEvent,onExecutionEvent,assertCurrent,timeoutMs:Math.min(60000,timeoutMs+30000)},{approval,inspector});
 }});
}
