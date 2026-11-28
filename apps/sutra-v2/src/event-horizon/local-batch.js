// User-authored local dataflow. This is a deterministic task workshop, not
// autonomous model agents. The existing scheduler remains execution authority.
import {compileTaskGraph,runTaskGraph} from '../../../../packages/sutra-runtime/investigation-tasks.js';
import {quantityUnits,exactMagnitude,conversionGraph,convertQuantity} from './local-computation.js';

export const MAX_LOCAL_TASKS=12;
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const fail=code=>{throw Error('LOCAL_BATCH_'+code);};
const shape=(x,keys)=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.getOwnPropertyDescriptor(x,k)?.enumerable&&Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value'));
const digest=async text=>'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');

export function prepareLocalBatch(rows,{concurrency=2}={}){
 if(!Array.isArray(rows)||rows.length<1||rows.length>MAX_LOCAL_TASKS||!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>4)fail('LIMIT');
 const byId=new Map();
 for(const r of rows){
  if(!shape(r,['id','owner','kind','from','to','value','predecessor'])||!id(r.id)||!id(r.owner)||byId.has(r.id)||typeof r.kind!=='string'||!Object.hasOwn(quantityUnits,r.kind)||!quantityUnits[r.kind].includes(r.from)||!quantityUnits[r.kind].includes(r.to)||r.predecessor!==null&&!id(r.predecessor))fail('ROW');
  if(r.predecessor!==null&&r.value!==null)fail('AMBIGUOUS_INPUT');
  const value=r.predecessor===null?exactMagnitude(r.value):null;
  // Validate all declared units with the actual compiler before admission.
  conversionGraph({kind:r.kind,from:r.from,to:r.to,value:value??'1'});
  byId.set(r.id,Object.freeze({id:r.id,owner:r.owner,kind:r.kind,from:r.from,to:r.to,value,predecessor:r.predecessor}));
 }
 for(const r of byId.values())if(r.predecessor!==null){
  const parent=byId.get(r.predecessor);
  if(!parent||parent.kind!==r.kind||parent.to!==r.from)fail('DEPENDENCY_UNITS');
 }
 const tasks=[...byId.values()].map(r=>({id:r.id,kind:'exact_conversion',agentId:r.owner,dependsOn:r.predecessor===null?[]:[r.predecessor]}));
 const handlers={exact_conversion:{
  execute:async({task,inputs,signal})=>{
   const row=byId.get(task.id);
   if(signal.aborted)fail('CANCELLED');
   const input=row.predecessor===null?row.value:inputs[0]?.value?.value;
   const result=await convertQuantity({kind:row.kind,from:row.from,to:row.to,value:input});
   if(signal.aborted)fail('CANCELLED');
   return {value:result.value,unit:result.unit,quantityKind:row.kind,graphText:result.graphText,reportText:result.reportText,digest:result.digest};
  },
  admit:(result,{task})=>{
   const row=byId.get(task.id);
   if(result.unit!==row.to||result.quantityKind!==row.kind||typeof result.graphText!=='string'||typeof result.reportText!=='string'||!/^sha256:[a-f0-9]{64}$/.test(result.digest))fail('ARTIFACT');
   exactMagnitude(result.value);
   return result;
  }
 }};
 const compiled=compileTaskGraph(tasks,handlers);
 const plan=Object.freeze({schema:'sutra-local-batch/v1',rows:Object.freeze([...byId.values()]),concurrency,maxPerAgent:1,taskCount:tasks.length,ownerCount:new Set(tasks.map(t=>t.agentId)).size,modelCalls:0});
 const planText=JSON.stringify(plan);
 return Object.freeze({plan,planText,tasks:compiled.order,async execute({runId,signal,onExecutionEvent}={}){
  if(!id(runId))fail('RUN');
  const version=await digest(planText);
  const result=await runTaskGraph({tasks,handlers,runId,version,concurrency,maxPerAgent:1,timeoutMs:30000,signal,onExecutionEvent,executionOrigin:'deterministic'});
  return Object.freeze({plan,planText,planPin:version,result,qualification:'Deterministic local computation over declared inputs. Task owners are logical scheduler assignments, not separate AI models or independent empirical reviewers.'});
 }});
}
