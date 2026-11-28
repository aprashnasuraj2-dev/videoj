import {consumeTaskRecovery} from './execution-recovery.js';
import {createExecutionEmitter} from './execution-events.js';
/* Host-owned bounded investigation DAG. No tool, provider, credential or truth authority is granted by a task. */
function taskFail(code){const e=new Error('Investigation task runtime refused ('+code+').');e.code=code;throw e;}

function taskId(v){return typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v);}

function taskRecord(v,keys){return v!==null&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v))&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable&&Object.hasOwn(d,'value');});}

function taskArray(v,max){return Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(v,String(i));return d?.enumerable&&Object.hasOwn(d,'value');}).every(Boolean);}

export function compileTaskGraph(tasks,handlers){
 if(!taskArray(tasks,64)||!tasks.length||!handlers||typeof handlers!=='object')taskFail('CONFIG');
 const map=new Map(),registry=new Map();
 for(const raw of tasks){
  if(!taskRecord(raw,['id','kind','agentId','dependsOn'])||!taskId(raw.id)||!taskId(raw.kind)||!taskId(raw.agentId)||map.has(raw.id)||!taskArray(raw.dependsOn,64)||!raw.dependsOn.every(taskId)||new Set(raw.dependsOn).size!==raw.dependsOn.length)taskFail('TASK');
  if(!registry.has(raw.kind)){
   const d=Object.getOwnPropertyDescriptor(handlers,raw.kind),h=d?.value;
   if(!d?.enumerable||!taskRecord(h,['execute','admit'])||typeof h.execute!=='function'||typeof h.admit!=='function')taskFail('HANDLER');
   registry.set(raw.kind,Object.freeze({execute:h.execute,admit:h.admit}));
  }
  map.set(raw.id,Object.freeze({...raw,dependsOn:Object.freeze([...raw.dependsOn])}));
 }
 const seen=new Set(),active=new Set(),order=[];
 function visit(id){if(active.has(id))taskFail('CYCLE');if(seen.has(id))return;const t=map.get(id);if(!t)taskFail('DEPENDENCY');active.add(id);for(const dep of t.dependsOn)visit(dep);active.delete(id);seen.add(id);order.push(t);}
 for(const id of map.keys())visit(id);
 return {order:Object.freeze(order),registry};
}

function copyTaskArtifact(value){
 let nodes=0,chars=0;const active=new Set();
 function copy(v,depth){
  if(++nodes>12000||depth>24)taskFail('ARTIFACT');
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='number'&&Number.isFinite(v))return v;
  if(typeof v==='string'){chars+=v.length;if(chars>262144||/[\ud800-\udfff]/u.test(v))taskFail('ARTIFACT');return v;}
  if(typeof v!=='object'||active.has(v))taskFail('ARTIFACT');
  active.add(v);let out;
  if(Array.isArray(v)){if(!taskArray(v,4096))taskFail('ARTIFACT');out=v.map(x=>copy(x,depth+1));}
  else{
   if(![Object.prototype,null].includes(Object.getPrototypeOf(v)))taskFail('ARTIFACT');
   const keys=Reflect.ownKeys(v);if(keys.length>1024)taskFail('ARTIFACT');out={};
   for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||['__proto__','constructor','prototype'].includes(k)||!d?.enumerable||!Object.hasOwn(d,'value'))taskFail('ARTIFACT');chars+=k.length;if(chars>262144)taskFail('ARTIFACT');out[k]=copy(d.value,depth+1);}
  }
  active.delete(v);return Object.freeze(out);
 }
 return copy(value,0);
}

export async function runTaskGraph({tasks,handlers,runId,version,concurrency=2,maxPerAgent=concurrency,timeoutMs=30000,signal,onEvent,onExecutionEvent,executionOrigin='host-task',sealArtifact,maxNewTasks,recovery,recoveryProfile,assertCurrent=()=>{}}={}){
 if(!taskId(runId)||typeof version!=='string'||!version.length||version.length>128||!/^[A-Za-z0-9:_-]+$/.test(version)||!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>8||!Number.isSafeInteger(maxPerAgent)||maxPerAgent<1||maxPerAgent>8||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||typeof assertCurrent!=='function'||onEvent!==undefined&&typeof onEvent!=='function'||onExecutionEvent!==undefined&&typeof onExecutionEvent!=='function'||!['host-task','deterministic','authorized-provider'].includes(executionOrigin)||sealArtifact!==undefined&&typeof sealArtifact!=='function')taskFail('CONFIG');
 if((maxNewTasks!==undefined||recovery!==undefined)&&(executionOrigin!=='deterministic'||typeof sealArtifact!=='function'||typeof recoveryProfile!=='string'))taskFail('RECOVERY_CONFIG');
 if(maxNewTasks!==undefined&&(!Number.isSafeInteger(maxNewTasks)||maxNewTasks<1||maxNewTasks>64))taskFail('RECOVERY_CONFIG');
 const {order,registry}=compileTaskGraph(tasks,handlers),controller=new AbortController(),states=new Map(order.map(t=>[t.id,'queued'])),artifacts=new Map(),running=new Map(),agentActive=new Map();
 const retained=recovery===undefined?null:consumeTaskRecovery(recovery,{version,runId,recoveryProfile,manifest:order});
 let sequence=0,stopReason=null,scheduled=0;
 const emitter=onExecutionEvent?createExecutionEmitter({runId,version,origin:executionOrigin,publish:onExecutionEvent}):null;
 emitter?.emit('run.open',{tasks:order});
 const stop=reason=>{if(stopReason===null){stopReason=reason;controller.abort();}};
 const external=()=>stop('cancelled');
 if(signal?.aborted)external();else signal?.addEventListener('abort',external,{once:true});
 const timer=setTimeout(()=>stop('timeout'),timeoutMs);
 let wake;const abortWait=new Promise(resolve=>{wake=()=>resolve(null);if(controller.signal.aborted)wake();else controller.signal.addEventListener('abort',wake,{once:true});});
 const emit=(task,status)=>{states.set(task.id,status);const event=Object.freeze({schema:1,runId,version,sequence:++sequence,taskId:task.id,agentId:task.agentId,kind:task.kind,status});emitter?.emit('task.state',{taskId:task.id,agentId:task.agentId,kind:task.kind,status});try{onEvent?.(event);}catch{/* telemetry is not authority */}};
 function fence(){if(controller.signal.aborted)return false;try{assertCurrent();}catch{stop('stale');return false;}return !controller.signal.aborted;}
 async function invoke(task){
  if(!fence())return;
  const handler=registry.get(task.kind),inputs=Object.freeze(task.dependsOn.map(id=>artifacts.get(id)));
  emit(task,'executing');
  try{
   if(!fence())return;
   const observeProvider=activity=>{if(executionOrigin!=='authorized-provider'||states.get(task.id)!=='executing'||!fence()||!taskRecord(activity,['routeId','planPin','phase']))return false;return emitter?.emit('provider.phase',{taskId:task.id,agentId:task.agentId,kind:task.kind,routeId:activity.routeId,planPin:activity.planPin,phase:activity.phase})??false;};
   const observeConsultation=activity=>{if(executionOrigin!=='host-task'||task.kind!=='model_consult'||states.get(task.id)!=='executing'||!fence()||!taskRecord(activity,['slotId','round','planPin','phase']))return false;return emitter?.emit('consultation.phase',{taskId:task.id,agentId:task.agentId,kind:task.kind,...activity})??false;};
   const raw=await handler.execute(Object.freeze({task,inputs,signal:controller.signal,observeProvider,observeConsultation}));
   if(!fence())return;
   emit(task,'validating');if(!fence())return;
   const value=copyTaskArtifact(handler.admit(raw,Object.freeze({task,inputs})));
   if(!fence())return;
   // Sealing is an optional host-owned admission stage, never a model action.
   // A cancellation, timeout or version change during asynchronous hashing fences publication.
   const provenance=sealArtifact?copyTaskArtifact(await sealArtifact(Object.freeze({task,inputs,value,version,signal:controller.signal}))):undefined;
   if(!fence())return;
   artifacts.set(task.id,Object.freeze({taskId:task.id,kind:task.kind,agentId:task.agentId,value,...(sealArtifact?{provenance}:{})}));
   emit(task,'completed');
  }catch{if(fence())emit(task,'failed');}
 }
 try{
  if(retained){
   for(const a of retained.artifacts){
    if(!fence())break;
    const task=order.find(t=>t.id===a.taskId);
    if(!task||task.dependsOn.some(id=>states.get(id)!=='completed'))taskFail('RECOVERY_DEPENDENCY');
    artifacts.set(task.id,a);states.set(task.id,'completed');
    emitter?.emit('task.restore',{taskId:task.id,agentId:task.agentId,kind:task.kind,recoveryPin:retained.recoveryPin,priorRunId:retained.priorRunId,artifactDigest:a.provenance.artifactDigest,valueDigest:a.provenance.valueDigest});
   }
  }
  while(fence()){
   let changed=false;
   for(const task of order){
    if(!fence())break;
    if(states.get(task.id)!=='queued')continue;
    if(task.dependsOn.some(id=>['failed','blocked','cancelled'].includes(states.get(id)))){emit(task,'blocked');changed=true;}
    else if(scheduled<(maxNewTasks??64)&&running.size<concurrency&&(agentActive.get(task.agentId)??0)<maxPerAgent&&task.dependsOn.every(id=>states.get(id)==='completed')){
     // Mark in-flight before executing: synchronous observers cannot allocate the same task twice.
     scheduled++;agentActive.set(task.agentId,(agentActive.get(task.agentId)??0)+1);
     const job=Promise.resolve().then(()=>invoke(task)).finally(()=>{running.delete(task.id);agentActive.set(task.agentId,agentActive.get(task.agentId)-1);});
     running.set(task.id,job);states.set(task.id,'scheduled');changed=true;
    }
   }
   if(running.size){await Promise.race([Promise.race([...running.values()]),abortWait]);continue;}
   if(!changed)break;
  }
  if(stopReason){for(const task of order)if(['queued','scheduled','executing','validating'].includes(states.get(task.id)))emit(task,'cancelled');}
  // Stale/cancelled runs return metadata only, not previously admitted partial artifacts.
  const status=stopReason??(order.every(t=>states.get(t.id)==='completed')?'completed':order.some(t=>states.get(t.id)==='queued')?'paused':'partial');emitter?.emit('run.close',{status});
  return Object.freeze({runId,version,status,tasks:Object.freeze(order.map(t=>Object.freeze({id:t.id,agentId:t.agentId,kind:t.kind,status:states.get(t.id)}))),artifacts:Object.freeze(stopReason?[]:order.filter(t=>artifacts.has(t.id)).map(t=>artifacts.get(t.id)))});
 }finally{clearTimeout(timer);controller.signal.removeEventListener('abort',wake);signal?.removeEventListener('abort',external);}
}
