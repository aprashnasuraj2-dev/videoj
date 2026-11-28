// Local portable deterministic recovery. Exact retained pins establish integrity
// relative to the trusted host, not authenticated historical execution.
import {createExecutionCheckpoint,openExecutionCheckpoint} from './execution-checkpoint.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const SCHEMA='sutra-task-recovery/v1',MAX=262144,capabilities=new WeakMap();
const fail=code=>{const e=Error('Task recovery refused ('+code+').');e.code=code;throw e;};
const pin=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
const profile=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,79}\/v[1-9][0-9]{0,2}$/.test(x);
const keys=(x,ks)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
async function digest(text){if(typeof text!=='string'||!text.length||text.length>MAX||/[\ud800-\udfff]/u.test(text))fail('SIZE');const b=new TextEncoder().encode(text);if(b.length>MAX)fail('SIZE');return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');}
function requirePaused(cp){
 if(cp.checkpoint.origin!=='deterministic'||cp.checkpoint.status!=='paused'||!cp.checkpoint.artifactPins?.length||!cp.snapshot.tasks.some(t=>t.status==='queued')||cp.snapshot.tasks.some(t=>!['queued','completed'].includes(t.status)))fail('NOT_SAFE_PAUSE');
}
export async function createTaskRecoveryCheckpoint({result,events,recoveryProfile}={}){
 if(!profile(recoveryProfile))fail('PROFILE');
 if(!Object.isFrozen(result)||!Object.isFrozen(result?.artifacts)||result.artifacts.some(a=>!Object.isFrozen(a)||!Object.isFrozen(a.provenance)))fail('RESULT');
 const cp=await createExecutionCheckpoint(result,events);requirePaused(cp);
 const text=JSON.stringify({schema:SCHEMA,recoveryProfile,checkpointText:cp.text,checkpointPin:cp.pin,artifacts:result.artifacts});
 return Object.freeze({text,pin:await digest(text),version:cp.checkpoint.version,recoveryProfile,qualification:'Contains private admitted values. Keep locally and retain the pin separately. A trusted local pin does not authenticate past execution.'});
}
export async function prepareTaskRecovery({text,expectedPin,expectedVersion,recoveryProfile}={}){
 if(!pin(expectedPin)||!pin(expectedVersion)||!profile(recoveryProfile)||await digest(text)!==expectedPin)fail('PIN');
 const x=freeze(parseUniqueJson(text,{maxChars:MAX,maxDepth:32}));
 if(!keys(x,['schema','recoveryProfile','checkpointText','checkpointPin','artifacts'])||x.schema!==SCHEMA||x.recoveryProfile!==recoveryProfile)fail('PROFILE');
 const cp=await openExecutionCheckpoint(x.checkpointText,x.checkpointPin,expectedVersion);requirePaused(cp);
 // Rehash each retained value and predecessor link against the independently
 // retained checkpoint. Imported values are never accepted as new evidence.
 const result=Object.freeze({runId:cp.checkpoint.runId,version:expectedVersion,status:'paused',tasks:Object.freeze(cp.snapshot.tasks.map(t=>Object.freeze({id:t.id,agentId:t.agentId,kind:t.kind,status:t.status}))),artifacts:x.artifacts});
 const checked=await createExecutionCheckpoint(result,cp.checkpoint.events);
 if(checked.pin!==cp.pin||checked.text!==cp.text)fail('LINEAGE');
 const capability=Object.freeze({kind:SCHEMA});
 capabilities.set(capability,Object.freeze({version:expectedVersion,priorRunId:result.runId,recoveryPin:expectedPin,recoveryProfile,manifest:cp.checkpoint.events[0].payload.tasks,artifacts:x.artifacts}));
 return capability;
}
// Only runtime-owned deterministic restoration consumes this opaque handle.
export function consumeTaskRecovery(capability,{version,runId,recoveryProfile,manifest}){
 const r=capabilities.get(capability);if(!r)fail('CAPABILITY');capabilities.delete(capability);
 if(r.version!==version||r.priorRunId===runId||r.recoveryProfile!==recoveryProfile||JSON.stringify(r.manifest)!==JSON.stringify(manifest))fail('IDENTITY');
 return r;
}
