// Portable deterministic task history. No raw evidence, artifacts, credentials,
// consent, or automatic task resumption. A retained hash is not historical identity.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {ROLE_REVIEW_TASKS,runInvestigationReview} from './investigation-role-review.js';
const VERSION='sutra-role-review-checkpoint/v1';
const fail=c=>{const e=new Error('Role review checkpoint refused ('+c+').');e.code=c;throw e;};
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const closed=(x,ks)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===ks.length&&ks.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=(x,max)=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&x.length<=max&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');}).every(Boolean);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const taskById=new Map(ROLE_REVIEW_TASKS.map(t=>[t.id,t]));
const terminal=new Set(['completed','failed','blocked','cancelled']);
function transitions(events,runId,version,until=events.length){
 const states=new Map(ROLE_REVIEW_TASKS.map(t=>[t.id,'queued']));
 if(!dense(events,64)||!Number.isSafeInteger(until)||until<0||until>events.length)fail('EVENTS');
 for(let i=0;i<until;i++){
  const e=events[i],task=taskById.get(e?.taskId);
  if(!closed(e,['schema','runId','version','sequence','taskId','agentId','kind','status'])||e.schema!==1||e.runId!==runId||e.version!==version||e.sequence!==i+1||!task||task.agentId!==e.agentId||task.kind!==e.kind)fail('EVENT');
  const previous=states.get(task.id),dependencies=task.dependsOn.map(d=>states.get(d));
  const legal=e.status==='executing'?previous==='queued'&&dependencies.every(s=>s==='completed'):
   e.status==='validating'?previous==='executing':
   e.status==='completed'?previous==='validating':
   e.status==='failed'?previous==='executing'||previous==='validating':
   e.status==='blocked'?previous==='queued'&&dependencies.some(s=>['failed','blocked','cancelled'].includes(s)):
   e.status==='cancelled'?['queued','executing','validating'].includes(previous):false;
  if(!legal)fail('TRANSITION');states.set(task.id,e.status);
 }
 return ROLE_REVIEW_TASKS.map(t=>({id:t.id,agentId:t.agentId,kind:t.kind,status:states.get(t.id)}));
}
function validate(x){
 if(!closed(x,['version','runId','versionDigest','status','events','artifactPins'])||x.version!==VERSION||!id(x.runId)||!pin(x.versionDigest)||!['completed','partial','cancelled','timeout','stale'].includes(x.status)||!dense(x.artifactPins,6))fail('SHAPE');
 const tasks=transitions(x.events,x.runId,x.versionDigest),completed=tasks.filter(t=>t.status==='completed');
 if(tasks.some(t=>!terminal.has(t.status)))fail('INCOMPLETE');
 if(x.status==='completed'&&completed.length!==6||x.status==='partial'&&(completed.length===6||tasks.some(t=>t.status==='cancelled')))fail('TERMINATION');
 const expected=['completed','partial'].includes(x.status)?completed.map(t=>t.id):[];
 if(x.artifactPins.length!==expected.length)fail('ARTIFACTS');
 for(const [i,a] of x.artifactPins.entries())if(!closed(a,['taskId','digest'])||a.taskId!==expected[i]||!pin(a.digest))fail('ARTIFACTS');
 return tasks;
}
export async function createRoleReviewCheckpoint(result,events){
 if(!result||!dense(result.tasks,6)||!dense(result.artifacts,6)||!dense(events,64))fail('RESULT');
 const captured=events.map(e=>({...e}));
 const artifactPins=[];
 for(const a of result.artifacts){if(a.kind!==taskById.get(a.taskId)?.kind||a.agentId!==taskById.get(a.taskId)?.agentId||a.value?.versionDigest!==result.version)fail('ARTIFACTS');artifactPins.push({taskId:a.taskId,digest:await casePin(JSON.stringify(a.value))});}
 const checkpoint={version:VERSION,runId:result.runId,versionDigest:result.version,status:result.status,events:captured,artifactPins};
 const tasks=validate(checkpoint);
 if(JSON.stringify(tasks)!==JSON.stringify(result.tasks))fail('RESULT');
 const text=JSON.stringify(checkpoint);return openRoleReviewCheckpoint(text,await casePin(text),result.version);
}
export async function openRoleReviewCheckpoint(text,expectedPin,expectedVersion){
 if(typeof text!=='string'||text.length>32768||!pin(expectedPin)||!pin(expectedVersion)||await casePin(text)!==expectedPin)fail('PIN');
 const checkpoint=parseUniqueJson(text,{maxChars:32768,maxDepth:8});
 const tasks=validate(checkpoint);
 if(checkpoint.versionDigest!==expectedVersion)fail('VERSION');
 return freeze({text,pin:expectedPin,checkpoint,tasks,qualification:'Pinned recorded metadata only. Historical execution identity, origin and timing are not authenticated; no permission or computation result is restored.'});
}
export function projectRoleReviewEvents(opened,sequence){
 const x=opened?.checkpoint;validate(x);
 return freeze({runId:x.runId,versionDigest:x.versionDigest,sequence,taskStates:transitions(x.events,x.runId,x.versionDigest,sequence),qualification:'Recorded event playback only; no task execution or artifact publication.'});
}
export async function verifyRoleReviewCheckpoint({checkpointText,checkpointPin,versionText,versionPin,signal,assertCurrent}={}){
 const opened=await openRoleReviewCheckpoint(checkpointText,checkpointPin,versionPin);
 if(opened.checkpoint.status!=='completed')fail('NOT_COMPLETED');
 if(signal?.aborted)fail('CANCELLED');assertCurrent?.();
 const fresh=await runInvestigationReview({versionText,versionPin,runId:'checkpoint_recompute',signal,assertCurrent});
 if(signal?.aborted)fail('CANCELLED');assertCurrent?.();
 if(fresh.status!=='completed')fail('RECOMPUTE');
 const recomputed=[];
 for(const a of fresh.artifacts){recomputed.push({taskId:a.taskId,digest:await casePin(JSON.stringify(a.value))});if(signal?.aborted)fail('CANCELLED');assertCurrent?.();}
 const matches=JSON.stringify(recomputed)===JSON.stringify(opened.checkpoint.artifactPins);
 return freeze({status:matches?'RECOMPUTED_ARTIFACT_DIGESTS_MATCH':'RECOMPUTED_ARTIFACT_DIGESTS_DIFFER',versionDigest:versionPin,checkpointPin,checkedArtifacts:recomputed.length,decisionAuthority:'NONE',qualification:'Fresh deterministic local execution, not replay of historical model calls or proof of historical identity, source truth or intended meaning.'});
}
