// A separately approved, version-scoped research run. Collected documents are
// quarantined source candidates; neither the existing contract nor conclusions change.
import {casePin} from './pinned-investigation.js';
import {admitResearchPlan} from './research-plan.js';
import {pinConsentInspector} from '../sutra-consent/index.js';
import {admitSourceRoutes,createPublicSourceReader} from '../sutra-inference/public-source-reader.js';
import {runTaskGraph} from '../sutra-runtime/investigation-tasks.js';
import {sealRoleArtifact} from './role-artifact-provenance.js';
const fail=code=>{const e=Error('Research plan refused ('+code+').');e.code=code;throw e;};
export async function prepareResearchInvestigation({planText,resolveAll,io,now=()=>new Date().toISOString()}={}){
 if(typeof now!=='function')fail('CONFIG');
 const p=await admitResearchPlan(planText),{planPin,tasks,preview}=p,sources=admitSourceRoutes(p.sources);
 let consumed=false;
 return Object.freeze({preview,planPin,async execute({approvedPlanPin,consentInspector,runId,signal,onExecutionEvent,assertCurrent=()=>{}}={}){
  if(consumed)fail('CONSUMED');if(approvedPlanPin!==planPin)fail('PLAN_PIN');if(typeof assertCurrent!=='function')fail('CONFIG');
  const inspector=pinConsentInspector(consentInspector);consumed=true;assertCurrent();
  const reader=createPublicSourceReader({sources,deadlineMs:p.timeoutMs,resolveAll,io});
  const out=(kind,fields)=>({versionDigest:p.versionPin,kind,...fields,decisionAuthority:'NONE'});
  const typed=(kind,execute)=>({execute,admit:v=>{if(v?.versionDigest!==p.versionPin||v.kind!==kind||v.decisionAuthority!=='NONE')fail('ARTIFACT');return v;}});
  const handlers={
   research_frame:typed('research_frame',()=>out('research_frame',{planPin,sourceIds:sources.map(s=>s.id),adoption:'NONE'})),
   research_fetch:typed('research_fetch',async({task,signal:taskSignal})=>{
    const s=sources[Number(task.id.slice(7))];if(!s)fail('SOURCE');
    const value=await inspector.perform({operation:'public_source_read',destination:s.url,purpose:'Retrieve this exact public document for a quarantined research candidate.',disclosure:['destination path','network address'],planPin},async(_intent,grantSignal)=>{
     const active=grantSignal?AbortSignal.any([grantSignal,taskSignal]):taskSignal;
     assertCurrent();if(active.aborted)fail('CANCELLED');
     const r=await reader.read(s.id,{signal:active});
     if(active.aborted)fail('CANCELLED');assertCurrent();
     if(r.status!==200||r.mediaType!==s.mediaType||r.bytes>s.maxBytes||typeof r.bodyText!=='string'||!r.bodyText.trim()||new TextEncoder().encode(r.bodyText).length!==r.bytes)fail('RESPONSE');
     const contentDigest=await casePin(r.bodyText),retrievedAt=now();
     if(typeof retrievedAt!=='string'||!Number.isFinite(Date.parse(retrievedAt))||new Date(retrievedAt).toISOString()!==retrievedAt)fail('CLOCK');
     if(active.aborted)fail('CANCELLED');assertCurrent();
     return {sourceId:s.id,url:s.url,mediaType:s.mediaType,bytes:r.bytes,contentDigest,retrievedAt,sourceCandidate:{id:s.id,text:r.bodyText,digest:contentDigest,lineage:'unverified_external'},truthStatus:'UNVERIFIED',adoption:'NONE'};
    },{signal:taskSignal});
    return out('research_fetch',value);
   }),
   research_coordinate:typed('research_coordinate',({inputs})=>out('research_coordinate',{planPin,sourceCandidates:inputs.map(a=>({sourceId:a.value.sourceId,url:a.value.url,contentDigest:a.value.contentDigest,bytes:a.value.bytes})),totalBytes:inputs.reduce((n,a)=>n+a.value.bytes,0),adoption:'NONE',qualification:'All sources remain quarantined; inspect exact text and assign reviewed lineage before any explicit contract revision.'}))
  };
  try{return await runTaskGraph({tasks,handlers,runId,version:p.versionPin,signal,onExecutionEvent,assertCurrent,timeoutMs:p.timeoutMs,concurrency:2,maxPerAgent:1,sealArtifact:sealRoleArtifact,executionOrigin:'host-task'});}
  finally{reader.close();}
 }});
}
