// Portable source candidate recording. Import rehashes exact admitted values,
// but cannot authenticate the historical host or a publisher's assertion.
import {casePin} from './pinned-investigation.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createExecutionCheckpoint,openExecutionCheckpoint} from '../sutra-runtime/execution-checkpoint.js';
import {admitPublicSourcePlan} from '../sutra-inference/public-source-plan.js';
import {researchTasks} from './research-plan.js';
const SCHEMA='sutra-public-research-result/v1';
const fail=code=>{const e=Error('Research result refused ('+code+').');e.code=code;throw e;};
const pin=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
const keys=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function exportResearchResult({preview,result,events}={}){
 if(!preview||!pin(preview.planPin)||!pin(preview.versionDigest)||!['completed','partial'].includes(result?.status))fail('RESULT');
 const cp=await createExecutionCheckpoint(result,events);
 const text=JSON.stringify({schema:SCHEMA,planPin:preview.planPin,versionDigest:preview.versionDigest,sources:preview.sources,result,checkpointText:cp.text,checkpointPin:cp.pin});
 const resultPin=await casePin(text);await openResearchResult({text,expectedPin:resultPin,expectedVersion:preview.versionDigest});
 return Object.freeze({text,pin:resultPin});
}
export async function openResearchResult({text,expectedPin,expectedVersion}={}){
 if(!pin(expectedPin)||!pin(expectedVersion)||await casePin(text)!==expectedPin)fail('PIN');
 const x=freeze(parseUniqueJson(text,{maxChars:262144,maxDepth:32}));
 if(!keys(x,['schema','planPin','versionDigest','sources','result','checkpointText','checkpointPin'])||x.schema!==SCHEMA||!pin(x.planPin)||x.versionDigest!==expectedVersion)fail('IDENTITY');
 const sources=admitPublicSourcePlan(x.sources),cp=await openExecutionCheckpoint(x.checkpointText,x.checkpointPin,expectedVersion);
 if(cp.checkpoint.origin!=='host-task'||!['completed','partial'].includes(cp.checkpoint.status)||JSON.stringify(cp.checkpoint.events[0].payload.tasks)!==JSON.stringify(researchTasks(sources)))fail('MANIFEST');
 const checked=await createExecutionCheckpoint(x.result,cp.checkpoint.events);if(checked.text!==cp.text||checked.pin!==cp.pin)fail('LINEAGE');
 const frame=x.result.artifacts.find(a=>a.taskId==='frame');if(!frame||frame.value.planPin!==x.planPin||JSON.stringify(frame.value.sourceIds)!==JSON.stringify(sources.map(s=>s.id))||frame.value.adoption!=='NONE')fail('FRAME');
 const candidates=[];
 for(const a of x.result.artifacts.filter(a=>a.kind==='research_fetch')){
  const s=sources[Number(a.taskId.slice(7))],v=a.value,c=v?.sourceCandidate;
  if(!s||a.agentId!=='researcher'||!keys(v,['versionDigest','kind','sourceId','url','mediaType','bytes','contentDigest','retrievedAt','sourceCandidate','truthStatus','adoption','decisionAuthority'])||v.versionDigest!==expectedVersion||v.kind!==a.kind||v.sourceId!==s.id||v.url!==s.url||v.mediaType!==s.mediaType||v.truthStatus!=='UNVERIFIED'||v.adoption!=='NONE'||v.decisionAuthority!=='NONE'||!keys(c,['id','text','digest','lineage'])||c.id!==s.id||c.lineage!=='unverified_external'||typeof c.text!=='string'||!c.text.trim()||!Number.isSafeInteger(v.bytes)||v.bytes!==new TextEncoder().encode(c.text).length||v.bytes>s.maxBytes||!pin(c.digest)||c.digest!==v.contentDigest||await casePin(c.text)!==c.digest||typeof v.retrievedAt!=='string'||!Number.isFinite(Date.parse(v.retrievedAt))||new Date(v.retrievedAt).toISOString()!==v.retrievedAt)fail('CANDIDATE');
  candidates.push(Object.freeze({sourceId:s.id,url:s.url,mediaType:s.mediaType,bytes:v.bytes,retrievedAt:v.retrievedAt,contentDigest:c.digest,sourceCandidate:c,truthStatus:'UNVERIFIED'}));
 }
 return Object.freeze({pin:expectedPin,versionDigest:expectedVersion,planPin:x.planPin,status:cp.checkpoint.status,candidates:Object.freeze(candidates),qualification:'Recorded unverified public source candidates. Exact content integrity only; historical retrieval identity and factual truth are not established. Explicit source staging and review required.'});
}
