/* Bounded, non-authoritative execution metadata. No evidence, model text, secrets or grants. */
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const VERSION=/^[A-Za-z0-9:_-]{1,128}$/;
const id=x=>typeof x==='string'&&ID.test(x);
const ver=x=>typeof x==='string'&&VERSION.test(x);
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const closed=(v,keys)=>v!==null&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v))&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=(v,max)=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(v,String(i));return d?.enumerable&&Object.hasOwn(d,'value');}).every(Boolean);
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const terminal=new Set(['completed','failed','blocked','cancelled']);
const origins=new Set(['host-task','deterministic','authorized-provider','local-scripted']);
const taskEnds=new Set(['completed','partial','cancelled','timeout','stale','refused']);
const councilEnds=new Set(['completed','refused','cancelled']);
const taskManifest=t=>closed(t,['id','kind','agentId','dependsOn'])&&id(t.id)&&id(t.kind)&&id(t.agentId)&&dense(t.dependsOn,64)&&t.dependsOn.every(id)&&new Set(t.dependsOn).size===t.dependsOn.length;
const taskPayload=p=>closed(p,['taskId','agentId','kind','status'])&&id(p.taskId)&&id(p.agentId)&&id(p.kind)&&['executing','validating','completed','failed','blocked','cancelled'].includes(p.status);
const councilPayload=p=>closed(p,['agentId','round','phase'])&&id(p.agentId)&&int(p.round,1,100)&&['request','response','transport-refused','proposal','abstained','rejected'].includes(p.phase);
function manifest(p,origin){
 if(origin==='local-scripted'){
  if(!closed(p,['agents'])||!dense(p.agents,4)||!p.agents.length||!p.agents.every(id)||new Set(p.agents).size!==p.agents.length)return null;
  return {tasks:new Map(),agents:new Map(p.agents.map(id=>[id,{id,status:'queued',round:0,requests:0,responses:0,proposals:0,rounds:new Map()}]))};
 }
 if(!closed(p,['tasks'])||!dense(p.tasks,64)||!p.tasks.length||!p.tasks.every(taskManifest)||new Set(p.tasks.map(t=>t.id)).size!==p.tasks.length)return null;
 const tasks=new Map(p.tasks.map(t=>[t.id,{id:t.id,kind:t.kind,agentId:t.agentId,dependsOn:[...t.dependsOn],status:'queued'}]));
 const visited=new Set(),visiting=new Set();function visit(k){if(visited.has(k))return true;if(visiting.has(k)||!tasks.has(k))return false;visiting.add(k);if(!tasks.get(k).dependsOn.every(visit))return false;visiting.delete(k);visited.add(k);return true;}
 if(![...tasks.keys()].every(visit))return null;
 return {tasks,agents:new Map()};
}
function taskStep(run,p){
 if(!taskPayload(p))return false;const t=run.tasks.get(p.taskId);if(!t||t.agentId!==p.agentId||t.kind!==p.kind)return false;
 const before=t.status,ds=t.dependsOn.map(k=>run.tasks.get(k).status),s=p.status;
 const legal=s==='executing'?before==='queued'&&ds.every(x=>x==='completed'):s==='validating'?before==='executing':s==='completed'?before==='validating':s==='failed'?['executing','validating'].includes(before):s==='blocked'?before==='queued'&&ds.some(x=>['failed','blocked','cancelled'].includes(x)):s==='cancelled'&&!terminal.has(before);
 if(!legal)return false;t.status=s;return true;
}
function councilStep(run,p){
 if(!councilPayload(p)||!run.agents.has(p.agentId))return false;
 const a=run.agents.get(p.agentId),prev=a.rounds.get(p.round),s=p.phase;
 if(s==='request'&&prev||['response','transport-refused'].includes(s)&&prev!=='request'||s==='proposal'&&prev!=='response'||['abstained','rejected'].includes(s)&&prev&&!['request','response','transport-refused'].includes(prev))return false;
 a.rounds.set(p.round,s);if(s==='request')a.requests++;if(s==='response')a.responses++;if(s==='proposal')a.proposals++;
 if(p.round>=a.round){a.round=p.round;a.status=({request:'working',response:'validating','transport-refused':'refused',proposal:'proposal-admitted',abstained:'abstained',rejected:'rejected'})[s];}return true;
}
function close(run,p){
 if(!closed(p,['status']))return false;const s=p.status;
 if(run.origin==='local-scripted'){
  if(!councilEnds.has(s))return false;
  for(const a of run.agents.values())a.status=s==='completed'?({queued:'not-run',working:'incomplete',validating:'unadmitted'}[a.status]??a.status):s;
 }else{
  if(!taskEnds.has(s))return false;const all=[...run.tasks.values()];
  if(s!=='refused'&&all.some(t=>!terminal.has(t.status)))return false;
  if(s==='completed'&&all.some(t=>t.status!=='completed')||s==='partial'&&(all.every(t=>t.status==='completed')||all.some(t=>t.status==='cancelled')))return false;
 }
 run.status=s;return true;
}
function snapshot(r){
 const tasks=[...r.tasks.values()].map(t=>({...t,dependsOn:[...t.dependsOn],waitingFor:t.status==='queued'?t.dependsOn.filter(k=>r.tasks.get(k).status!=='completed'):[]}));
 const agents=r.origin==='local-scripted'?[...r.agents.values()].map(({rounds,...a})=>({...a})):Array.from(new Set(tasks.map(t=>t.agentId)),id=>{
  const assigned=tasks.filter(t=>t.agentId===id),states=assigned.map(t=>t.status);
  const status=['executing','validating','queued','failed','blocked','cancelled','completed'].find(s=>states.includes(s));
  return {id,status,taskIds:assigned.map(t=>t.id),activeTaskIds:assigned.filter(t=>['executing','validating'].includes(t.status)).map(t=>t.id),waitingTaskIds:assigned.filter(t=>t.waitingFor.length).map(t=>t.id),completed:states.filter(s=>s==='completed').length};
 });
 return freeze({schema:'sutra-execution-event/v1',runId:r.runId,version:r.version,origin:r.origin,sequence:r.sequence,status:r.status,tasks,agents});
}
export function createExecutionEmitter({runId,version,origin,publish}){
 if(!id(runId)||!ver(version)||!origins.has(origin)||typeof publish!=='function')throw TypeError('EXECUTION_CONFIG');
 let sequence=0,ended=false;
 return Object.freeze({emit(type,payload){
  if(ended||sequence===0&&type!=='run.open'||sequence>0&&type==='run.open')return false;
  // Payloads are host-owned closed metadata, not arbitrary provider outputs.
  const e=freeze({schema:'sutra-execution-event/v1',runId,version,origin,sequence:++sequence,type,payload});
  if(type==='run.close')ended=true;
  try{publish(e);}catch{/* Observation cannot grant or deny execution. */}return true;
 }});
}
export function createExecutionJournal({maxRuns=8,maxEvents=256}={}){
 if(!int(maxRuns,1,32)||!int(maxEvents,194,512))throw TypeError('EXECUTION_LIMIT');
 const runs=new Map(),retired=new Set(),listeners=new Set(),queue=[];let dispatching=false;
 function notify(e,s){queue.push([e,s]);if(dispatching)return;dispatching=true;try{while(queue.length){const args=queue.shift();for(const fn of [...listeners])try{fn(...args);}catch{/* isolate observers */}}}finally{dispatching=false;}}
 function accept(raw){
  if(!closed(raw,['schema','runId','version','origin','sequence','type','payload'])||raw.schema!=='sutra-execution-event/v1'||!id(raw.runId)||!ver(raw.version)||!origins.has(raw.origin)||!int(raw.sequence,1,maxEvents))return false;
  const key=raw.runId;let r=runs.get(key);
  if(raw.type==='run.open'){
   if(r||retired.has(key)||raw.sequence!==1)return false;const m=manifest(raw.payload,raw.origin);if(!m)return false;
   if(runs.size>=maxRuns){const old=[...runs.values()].find(x=>x.status!=='running');if(!old)return false;runs.delete(old.runId);retired.add(old.runId);if(retired.size>128)retired.delete(retired.values().next().value);}
   r={...m,runId:key,version:raw.version,origin:raw.origin,sequence:0,status:'running',events:[]};runs.set(key,r);
  }else{
   if(!r||r.status!=='running'||r.origin!==raw.origin||r.version!==raw.version||raw.sequence!==r.sequence+1)return false;
   if(raw.type==='task.state'&&r.origin!=='local-scripted'){if(!taskStep(r,raw.payload))return false;}
   else if(raw.type==='council.phase'&&r.origin==='local-scripted'){if(!councilStep(r,raw.payload))return false;}
   else if(raw.type==='run.close'){if(!close(r,raw.payload))return false;}
   else return false;
  }
  // Only copy after validation; strict schemas prohibit getters, unknown keys and secrets.
  const e=freeze(JSON.parse(JSON.stringify(raw)));r.sequence=e.sequence;r.events.push(e);notify(e,snapshot(r));return true;
 }
 return Object.freeze({accept,subscribe(fn){if(typeof fn!=='function')throw TypeError('EXECUTION_LISTENER');listeners.add(fn);return ()=>listeners.delete(fn);},snapshot(runId){const r=runs.get(runId);return r?snapshot(r):null;},events(runId){return Object.freeze([...(runs.get(runId)?.events??[])]);},runs(){return Object.freeze([...runs.values()].map(snapshot));}});
}
