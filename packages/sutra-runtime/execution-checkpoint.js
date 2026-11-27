// Bounded, exact-byte, portable execution recording. Not a capability or
// evidence store. Only fresh host recomputation can compare artifact digests.
import {createExecutionJournal} from './execution-events.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const SCHEMA='sutra-execution-checkpoint/v1',MAX=262144;
const pin=v=>typeof v==='string'&&/^sha256:[0-9a-f]{64}$/.test(v);
const fail=code=>{const e=Error('Execution checkpoint refused ('+code+').');e.code=code;throw e;};
const closed=(x,ks)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===ks.length&&ks.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=(a,max)=>Array.isArray(a)&&Object.getPrototypeOf(a)===Array.prototype&&a.length<=max&&Reflect.ownKeys(a).length===a.length+1&&Array.from({length:a.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(a,String(i));return d?.enumerable&&Object.hasOwn(d,'value');}).every(Boolean);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
// Reconstruct only ordinary frozen host data. Frozen accessors, proxies
// supplied by untrusted in-process JS (not a supported isolation boundary),
// cycles and serialization hooks are not admissible artifact data.
function copyFrozen(value){
 let nodes=0,chars=0;const active=new Set();
 function copy(v,depth){
  if(++nodes>12000||depth>24)fail('VALUE');
  if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
  if(typeof v==='string'){chars+=v.length;if(chars>MAX||/[\ud800-\udfff]/u.test(v))fail('VALUE');return v;}
  if(!v||typeof v!=='object'||!Object.isFrozen(v)||active.has(v))fail('VALUE');
  active.add(v);let out;
  if(Array.isArray(v)){if(!dense(v,4096))fail('VALUE');out=v.map(x=>copy(x,depth+1));}
  else{
   if(![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('VALUE');
   const keys=Reflect.ownKeys(v);if(keys.length>1024)fail('VALUE');out={};
   for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||['__proto__','constructor','prototype','toJSON'].includes(k)||!d?.enumerable||!Object.hasOwn(d,'value'))fail('VALUE');chars+=k.length;if(chars>MAX)fail('VALUE');out[k]=copy(d.value,depth+1);}
  }
  active.delete(v);return out;
 }
 return copy(value,0);
}
async function digest(text){if(typeof text!=='string'||!text.length||text.length>MAX||/[\ud800-\udfff]/u.test(text))fail('SIZE');const bytes=new TextEncoder().encode(text);if(bytes.length>MAX)fail('SIZE');return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
function replay(events){
 if(!dense(events,2048)||!events.length)fail('EVENTS');
 const j=createExecutionJournal({maxRuns:1}),captured=[];
 for(const e of events){if(!j.accept(e))fail('TRANSITION');if(captured.length&&e.runId!==captured[0].runId)fail('IDENTITY');captured.push(j.lastEvent(e.runId));}
 const s=j.snapshot(captured[0].runId);
 if(!s||s.status==='running'||captured.at(-1).type!=='run.close'||s.sequence!==captured.length||captured.some(e=>e.runId!==s.runId))fail('INCOMPLETE');
 return {snapshot:s,events:captured};
}
function checkPins(snapshot,pins){
 if(pins===null)return;
 if(snapshot.origin==='local-scripted'||!dense(pins,64))fail('ARTIFACTS');
 const expected=['completed','partial','paused'].includes(snapshot.status)?snapshot.tasks.filter(t=>t.status==='completed'):[];
 if(pins.length!==expected.length)fail('ARTIFACTS');
 const seen=new Map();
 for(const [i,p] of pins.entries()){
  const t=expected[i];
  if(!closed(p,['taskId','valueDigest','artifactDigest','parents'])||p.taskId!==t.id||!pin(p.valueDigest)||!pin(p.artifactDigest)||!dense(p.parents,64)||p.parents.length!==t.dependsOn.length)fail('ARTIFACTS');
  for(const [k,a] of p.parents.entries()){
   const id=t.dependsOn[k],prior=seen.get(id);
   if(!closed(a,['taskId','valueDigest','artifactDigest'])||!prior||a.taskId!==id||a.artifactDigest!==prior.artifactDigest||a.valueDigest!==prior.valueDigest)fail('LINEAGE');
  }
  if(t.restored&&(t.restored.artifactDigest!==p.artifactDigest||t.restored.valueDigest!==p.valueDigest))fail('RESTORED_PIN');
  seen.set(t.id,p);
 }
}
function validate(checkpoint){
 if(!closed(checkpoint,['schema','runId','version','origin','status','events','artifactPins'])||checkpoint.schema!==SCHEMA)fail('SHAPE');
 const r=replay(checkpoint.events),s=r.snapshot;
 if(s.runId!==checkpoint.runId||s.version!==checkpoint.version||s.origin!==checkpoint.origin||s.status!==checkpoint.status)fail('IDENTITY');
 checkPins(s,checkpoint.artifactPins);return r;
}
async function build(events,artifactPins){
 const r=replay(events),s=r.snapshot,cp={schema:SCHEMA,runId:s.runId,version:s.version,origin:s.origin,status:s.status,events:r.events,artifactPins};
 checkPins(s,artifactPins);const text=JSON.stringify(cp);
 return openExecutionCheckpoint(text,await digest(text),s.version);
}
// Metadata-only, including provider attempts. No artifact completeness claim.
export async function createExecutionRecording(events){return build(events,null);}
export async function createExecutionCheckpoint(result,events){
 const r=replay(events),s=r.snapshot;
 if(!closed(result,['runId','version','status','tasks','artifacts'])||result.runId!==s.runId||result.version!==s.version||result.status!==s.status||!dense(result.tasks,64)||!dense(result.artifacts,64))fail('RESULT');
 if(result.tasks.length!==s.tasks.length||result.tasks.some((t,i)=>!closed(t,['id','agentId','kind','status'])||['id','agentId','kind','status'].some(k=>t[k]!==s.tasks[i][k])))fail('RESULT');
 const pins=[];
 for(const a of result.artifacts){
  if(!closed(a,['taskId','kind','agentId','value','provenance']))fail('ARTIFACTS');
  const p=a.provenance,t=s.tasks.find(t=>t.id===a.taskId);
  if(!t||a.agentId!==t.agentId||a.kind!==t.kind||!closed(p,['schema','versionDigest','taskId','agentId','kind','valueDigest','parents','authority','qualification','artifactDigest'])||p.schema!=='sutra-role-artifact/v1'||p.versionDigest!==s.version||p.taskId!==t.id||p.agentId!==t.agentId||p.kind!==t.kind||p.authority!=='NONE'||typeof p.qualification!=='string'||!dense(p.parents,64)||!pin(p.artifactDigest))fail('ARTIFACTS');
  // The admitted value is host-owned data, but do not reserialize arbitrary
  // getters through a public export interface.
  if(await digest(JSON.stringify(copyFrozen(a.value)))!==p.valueDigest)fail('VALUE');
  const safeParents=copyFrozen(p.parents);if(!safeParents.every(x=>closed(x,['taskId','artifactDigest','valueDigest'])))fail('LINEAGE');
  const descriptor={schema:p.schema,versionDigest:p.versionDigest,taskId:p.taskId,agentId:p.agentId,kind:p.kind,valueDigest:p.valueDigest,parents:safeParents,authority:p.authority,qualification:p.qualification};
  if(await digest(JSON.stringify(descriptor))!==p.artifactDigest)fail('ARTIFACT_PIN');
  pins.push({taskId:t.id,valueDigest:p.valueDigest,artifactDigest:p.artifactDigest,parents:safeParents.map(x=>({taskId:x.taskId,valueDigest:x.valueDigest,artifactDigest:x.artifactDigest}))});
 }
 return build(r.events,pins);
}
export async function openExecutionCheckpoint(text,expectedPin,expectedVersion){
 if(!pin(expectedPin)||typeof expectedVersion!=='string'||await digest(text)!==expectedPin)fail('PIN');
 const checkpoint=parseUniqueJson(text,{maxChars:MAX,maxDepth:12});
 const r=validate(checkpoint);if(r.snapshot.version!==expectedVersion)fail('VERSION');
 return freeze({text,pin:expectedPin,checkpoint,snapshot:r.snapshot,qualification:'Recorded metadata and optional host artifact digest links. No historical identity, authority, or restored result is established.'});
}
export function projectExecutionCheckpoint(opened,sequence){
 const x=opened?.checkpoint,r=validate(x);
 if(!Number.isSafeInteger(sequence)||sequence<0||sequence>r.events.length)fail('SEQUENCE');
 const j=createExecutionJournal({maxRuns:1});
 for(const e of r.events.slice(0,sequence))if(!j.accept(e))fail('TRANSITION');
 return freeze({sequence,snapshot:sequence?j.snapshot(x.runId):null,qualification:'Recorded event projection only; no execution, consent, or artifact publication.'});
}
