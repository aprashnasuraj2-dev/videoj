// Integrity linkage for already admitted deterministic role artifacts.
// Does not authenticate source origin, intended meaning, or historical execution.
import {casePin} from './pinned-investigation.js';
const pin=v=>typeof v==='string'&&/^sha256:[0-9a-f]{64}$/.test(v);
const fail=()=>{const e=new Error('Role artifact provenance refused');e.code='ROLE_PROVENANCE';throw e;};
export async function sealRoleArtifact({task,inputs,value,version,signal}){
 if(signal?.aborted||!pin(version)||value?.versionDigest!==version||value?.kind!==task.kind||value?.decisionAuthority!=='NONE'||inputs.length!==task.dependsOn.length)fail();
 const parents=[];
 for(const [i,a] of inputs.entries()){
  const p=a.provenance;
  if(a.taskId!==task.dependsOn[i]||p?.versionDigest!==version||p.taskId!==a.taskId||!pin(p.artifactDigest)||!pin(p.valueDigest))fail();
  parents.push({taskId:a.taskId,artifactDigest:p.artifactDigest,valueDigest:p.valueDigest});
 }
 const descriptor={schema:'sutra-role-artifact/v1',versionDigest:version,taskId:task.id,agentId:task.agentId,kind:task.kind,valueDigest:await casePin(JSON.stringify(value)),parents,authority:'NONE',qualification:'Integrity linkage of local admitted value; not a truth, authenticity, semantic, or confidence verdict.'};
 const artifactDigest=await casePin(JSON.stringify(descriptor));
 if(signal?.aborted)fail();
 return {...descriptor,artifactDigest};
}
