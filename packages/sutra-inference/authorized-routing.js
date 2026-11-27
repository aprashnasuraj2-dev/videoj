/* Capability-declared, exact-plan, consent-per-recipient routing; no transport or credential authority. */
import {pinConsentInspector} from '../sutra-consent/index.js';
import {runTaskGraph,compileTaskGraph} from '../sutra-runtime/investigation-tasks.js';
const preparedPlans=new WeakSet();
function routeFail(code){const e=new Error('Provider route orchestration refused ('+code+').');e.code=code;throw e;}

function routeClosed(x,keys){return x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});}

function routeDense(x,max){return Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&x.length<=max&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');}).every(Boolean);}

export function capacitySlots(bucket,tokens,inputBytes=1){
 if(!bucket?.limits||!bucket?.used||!Number.isSafeInteger(tokens)||tokens<1||!Number.isSafeInteger(inputBytes)||inputBytes<1)return 0;
 const {limits,used}=bucket;
 return Math.max(0,Math.min(limits.maxConcurrent-used.active,limits.maxCalls-used.calls,Math.floor((limits.maxOutputTokens-used.outputTokens)/tokens),Math.floor((limits.maxInputBytes-used.inputBytes)/inputBytes)));
}

export function rankProviderRoutes(routes,capability,localFirst=false){
 return routes.filter(r=>r.capabilities.includes(capability)).slice().sort((a,b)=>(localFirst?Number(a.transportClass!=='local')-Number(b.transportClass!=='local'):0)||a.priority-b.priority||(a.id<b.id?-1:a.id>b.id?1:0));
}

export async function prepareAuthorizedProviderTask({workspace,routes,capability,operation,disclosure,version,localFirst=false,maxOutputTokens=256,timeoutMs=15000,assertCurrent=()=>{}}={}){
 const label=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
 const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
 if(workspace?.transportMode!=='injected-protocol-laboratory'||!['describeRoute','capturePublicationFence','admitOperation','dispatchCapacity','prepareRequest'].every(k=>typeof workspace[k]==='function')||!routeDense(routes,8)||!routes.length||!label(capability)||typeof version!=='string'||!/^sha256:[a-f0-9]{64}$/.test(version)||!routeDense(disclosure,12)||!disclosure.length||!disclosure.every(label)||new Set(disclosure).size!==disclosure.length||typeof localFirst!=='boolean'||!int(maxOutputTokens,1,8192)||!int(timeoutMs,1,30000)||typeof assertCurrent!=='function')routeFail('CONFIG');
 const fence=workspace.capturePublicationFence(),check=()=>{fence();assertCurrent();};
 check();const ids=new Set(),identities=new Set(),captured=[];
 for(const route of routes){
  if(!routeClosed(route,['id','handle','model','capabilities','priority'])||!label(route.id)||ids.has(route.id)||!routeDense(route.capabilities,16)||!route.capabilities.length||!route.capabilities.every(label)||new Set(route.capabilities).size!==route.capabilities.length||!int(route.priority,0,1000))routeFail('ROUTE');
  const profile=workspace.describeRoute(route.handle),conn=workspace.connections.find(c=>c.id===profile.providerId);
  if(!conn||!profile.models.includes(route.model)||!conn.models.includes(route.model)||identities.has(profile.profileId+'/'+route.model))routeFail('ROUTE');
  ids.add(route.id);identities.add(profile.profileId+'/'+route.model);
  captured.push(Object.freeze({id:route.id,handle:route.handle,profileId:profile.profileId,providerId:profile.providerId,model:route.model,protocol:conn.protocol,transportClass:conn.transportClass,capabilities:Object.freeze([...route.capabilities]),priority:route.priority}));
 }
 const eligible=rankProviderRoutes(captured,capability,localFirst);
 if(!eligible.length)routeFail('CAPABILITY');
 const payload=workspace.admitOperation(operation);
 const estimate=Math.max(1,new TextEncoder().encode(JSON.stringify(payload)).length),prepared=new Map();
 for(const route of eligible)prepared.set(route.id,workspace.prepareRequest({handle:route.handle,model:route.model,inputBytes:estimate,maxOutputTokens,operation:payload}));
 const plan=workspace.admitOperation({schema:'sutra-provider-task/v1',version,capability,operation:payload,disclosure:[...disclosure],maxOutputTokens,timeoutMs,localFirst,routes:eligible.map(({handle,...meta})=>({...meta,inputBytes:prepared.get(meta.id).inputBytes})),qualification:'Host-declared capability; capacity is a hint. Each selected recipient needs separate consent. No retry after dispatch.'});
 const bytes=new TextEncoder().encode(JSON.stringify(plan)),digest=await crypto.subtle.digest('SHA-256',bytes);
 const planPin='sha256:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 check();let consumed=false;
 const availability=route=>{
  const inputBytes=prepared.get(route.id).inputBytes;
  const cap=workspace.dispatchCapacity(),profile=cap.profiles.find(p=>p.profileId===route.profileId);
  if(!profile?.enabled)return 'PROFILE_DISABLED';
  if(!capacitySlots(cap.global,maxOutputTokens,inputBytes)||!capacitySlots(profile,maxOutputTokens,inputBytes))return 'BUDGET';
  return 'CAPACITY_HINT';
 };
 const preparedPlan=Object.freeze({plan,planPin,async execute({approvedPlanPin,consentInspector,signal,assertCurrent:executionFence=()=>{}}={}){
  if(consumed)routeFail('CONSUMED');
  if(approvedPlanPin!==planPin)routeFail('PIN');
  const inspector=pinConsentInspector(consentInspector);
  if(typeof executionFence!=='function')routeFail('CONFIG');
  consumed=true;const deadline=AbortSignal.timeout(timeoutMs),active=signal?AbortSignal.any([signal,deadline]):deadline;
  const assertLive=()=>{if(active.aborted)routeFail('CANCELLED');check();executionFence();};
  const decisions=[];
  for(const route of eligible){
   assertLive();const before=availability(route);if(before!=='CAPACITY_HINT'){decisions.push(Object.freeze({routeId:route.id,decision:before}));continue;}
   const intent={operation:'model_inference',destination:route.providerId+'/'+route.profileId+'/'+route.model,purpose:'Execute the exact reviewed provider task for this selected recipient.',disclosure:[...plan.disclosure],planPin};
   // A denial, revoked grant, unknown provider outcome or dispatch failure is terminal.
   const outcome=await inspector.perform(intent,async(_intent,grantSignal)=>{
    const dispatchSignal=grantSignal?AbortSignal.any([active,grantSignal]):active;
    if(dispatchSignal.aborted)routeFail('CANCELLED');assertLive();
    const recheck=availability(route);
    if(recheck!=='CAPACITY_HINT')return {skipped:recheck};
    decisions.push(Object.freeze({routeId:route.id,decision:'DISPATCHED'}));
    const result=await prepared.get(route.id).execute({signal:dispatchSignal});
    if(dispatchSignal.aborted)routeFail('CANCELLED');assertLive();
    if(result.profile?.profileId!==route.profileId||result.profile?.providerId!==route.providerId||result.model!==route.model)routeFail('RESULT');
    return {result};
   },{signal:active});
   assertLive();
   if(outcome.skipped){decisions.push(Object.freeze({routeId:route.id,decision:outcome.skipped}));continue;}
   return Object.freeze({status:'completed',routeId:route.id,planPin,result:outcome.result,decisions:Object.freeze(decisions),qualification:'Transport result only; not artifact admission or proof.'});
  }
  return Object.freeze({status:'unavailable',planPin,decisions:Object.freeze(decisions)});
 }});
 preparedPlans.add(preparedPlan);return preparedPlan;
}

// Explicit host adapter over the same typed DAG. Each task requires a separately
// prepared and approved exact operation; inputs are for local artifact admission
// only and are NEVER automatically appended to a model request.
export async function runAuthorizedProviderGraph({tasks,approvals,runId,version,concurrency=2,timeoutMs=30000,signal,onEvent,assertCurrent=()=>{}}={}){
 if(!routeDense(approvals,64)||!approvals.length||typeof assertCurrent!=='function'||typeof version!=='string'||!/^sha256:[a-f0-9]{64}$/.test(version))routeFail('CONFIG');
 const byTask=new Map(),plans=new Set();
 for(const entry of approvals){
  if(!routeClosed(entry,['taskId','prepared','approvedPlanPin','consentInspector','admit'])||typeof entry.taskId!=='string'||byTask.has(entry.taskId)||!preparedPlans.has(entry.prepared)||plans.has(entry.prepared)||entry.prepared.plan.version!==version||entry.approvedPlanPin!==entry.prepared.planPin||typeof entry.admit!=='function')routeFail('GRAPH_APPROVAL');
  const consentInspector=pinConsentInspector(entry.consentInspector);
  plans.add(entry.prepared);byTask.set(entry.taskId,Object.freeze({...entry,consentInspector}));
 }
 const handlers={provider_task:{
  async execute({task,signal:taskSignal}){
   const a=byTask.get(task.id),out=await a.prepared.execute({approvedPlanPin:a.approvedPlanPin,consentInspector:a.consentInspector,signal:taskSignal,assertCurrent});
   if(out.status!=='completed'||typeof out.result?.value?.text!=='string')routeFail('UNAVAILABLE');
   return Object.freeze({planPin:out.planPin,routeId:out.routeId,text:out.result.value.text});
  },
  admit(value,context){
   // Local host admission can use predecessor artifacts; provider payload remains pinned.
   return byTask.get(context.task.id).admit(value,context);
  }
 }};
 const graph=compileTaskGraph(tasks,handlers);
 if(graph.order.length!==byTask.size||graph.order.some(t=>!byTask.has(t.id)))routeFail('GRAPH_APPROVAL');
 return runTaskGraph({tasks:graph.order,handlers,runId,version,concurrency,timeoutMs,signal,onEvent,assertCurrent});
}
