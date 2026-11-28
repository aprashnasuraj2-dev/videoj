// A read-only challenge workflow over two exact, independently retained pins.
// The private replay session is discarded after each run; no preview adopts evidence.
import {runTaskGraph} from '../sutra-runtime/investigation-tasks.js';
import {casePin} from './pinned-investigation.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {createInvestigationReplaySession,VERSION} from './investigation-revision.js';
import {impactProjection} from './impact-projection.js';
import {sealRoleArtifact} from './role-artifact-provenance.js';
const pin=v=>typeof v==='string'&&/^sha256:[0-9a-f]{64}$/.test(v);
const fail=code=>{const e=Error('Challenge review refused ('+code+').');e.code=code;throw e;};
const tasks=[['frame','challenge_frame','planner',[]],['evidence','challenge_evidence','researcher',['frame']],['compute','challenge_replay','coder',['evidence']],['analysis','challenge_contrast','analyst',['compute']],['challenge','challenge_paths','critic',['compute','evidence']],['coordinate','challenge_coordinate','coordinator',['frame','evidence','compute','analysis','challenge']]];
export const CHALLENGE_REVIEW_TASKS=Object.freeze(tasks.map(([id,kind,agentId,dependsOn])=>Object.freeze({id,kind,agentId,dependsOn:Object.freeze(dependsOn)})));
export async function runInvestigationChallenge({beforeText,beforePin,afterText,afterPin,runId,signal,onEvent,onExecutionEvent,assertCurrent,timeoutMs=30000}={}){
 if(!pin(beforePin)||!pin(afterPin)||beforePin===afterPin||[beforeText,afterText].some(x=>typeof x!=='string'||!x.length||x.length>262144))fail('INPUT');
 let parent,child,first,next,projection;
 const out=(kind,fields)=>({versionDigest:afterPin,kind,beforeDigest:beforePin,...fields,decisionAuthority:'NONE'});
 const typed=(kind,execute)=>({execute,admit:v=>{if(v?.kind!==kind||v.versionDigest!==afterPin||v.beforeDigest!==beforePin||v.decisionAuthority!=='NONE')fail('ARTIFACT');return v;}});
 const parse=s=>parseUniqueJson(s,{maxChars:262144,maxDepth:12});
 const handlers={
  challenge_frame:typed('challenge_frame',async()=>{
   if(await casePin(beforeText)!==beforePin||await casePin(afterText)!==afterPin)fail('PIN');
   parent=parse(beforeText);child=parse(afterText);
   if(parent.version!==VERSION||child.version!==VERSION||child.previousDigest!==beforePin)fail('PARENT');
   return out('challenge_frame',{relationship:'EXACT_DIRECT_CHILD',adoption:'NONE'});
  }),
  challenge_evidence:typed('challenge_evidence',async()=>{
   const a=await validateReviewedContract(parent.contractText,parent.contractPin),b=await validateReviewedContract(child.contractText,child.contractPin);
   return out('challenge_evidence',{beforeContract:a.contractDigest,afterContract:b.contractDigest,beforeBindings:a.bindingCount,afterBindings:b.bindingCount,sourceAuthenticity:'NOT_ESTABLISHED'});
  }),
  challenge_replay:typed('challenge_replay',async()=>{
   const session=createInvestigationReplaySession();
   first=await session.replay(beforeText,beforePin);next=await session.replay(afterText,afterPin);
   if(!next.impact||next.impact.beforeDigest!==beforePin||next.impact.afterDigest!==afterPin)fail('IMPACT');
   projection=impactProjection({before:{digest:first.digest,graph:first.report.graph},after:{digest:next.digest,graph:next.report.graph},impact:next.impact});
   return out('challenge_replay',{impact:next.impact,work:{baseline:first.stats.totals,child:next.stats.totals},qualification:'Measured local session operations, not a latency or independent verification claim.'});
  }),
  challenge_contrast:typed('challenge_contrast',({inputs})=>{
   const impact=inputs[0].value.impact;
   return out('challenge_contrast',{candidates:impact.candidates,nextReview:impact.nextReview,missing:impact.missing,triage:impact.triage});
  }),
  challenge_paths:typed('challenge_paths',()=>out('challenge_paths',{projection})),
  challenge_coordinate:typed('challenge_coordinate',({inputs})=>{
   const byKind=new Map(inputs.map(a=>[a.kind,a.value])),a=byKind.get('challenge_contrast'),p=byKind.get('challenge_paths').projection,r=byKind.get('challenge_replay');
   return out('challenge_coordinate',{changedRoots:p.roots,affectedNodeCount:p.nodes.length,affectedEdgeCount:p.edges.length,reviewRequired:a.nextReview,triage:a.triage,work:r.work,adoption:'NONE',qualification:'Read-only review of exact supplied parent and child; no conclusion is adopted or made true.'});
  })
 };
 return runTaskGraph({tasks:CHALLENGE_REVIEW_TASKS,handlers,runId,version:afterPin,signal,onEvent,onExecutionEvent,assertCurrent,timeoutMs,concurrency:2,maxPerAgent:1,sealArtifact:sealRoleArtifact,executionOrigin:'deterministic'});
}
