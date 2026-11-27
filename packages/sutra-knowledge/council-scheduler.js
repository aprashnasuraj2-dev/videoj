import {capacitySlots} from '../sutra-inference/authorized-routing.js';
import {runTaskGraph} from '../sutra-runtime/investigation-tasks.js';
// Shared host-owned scheduler for bounded investigation councils.
// No model can choose a route, authorize disclosure, execute a tool or supply a verdict.
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const councilFail=code=>{const e=new Error('Agent council stopped ('+code+').');e.code=code;throw e;};
export const councilText=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[\ud800-\udfff]/u.test(v);
export const councilClosed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
export const councilInt=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
export const denseCouncilArray=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>i).every(i=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');});
const publicFailure=e=>['HANDLE','MODEL','TRANSPORT','BUDGET','PROFILE_DISABLED','USAGE','PROVIDER_UNKNOWN','SECRET_ECHO','PROVIDER_RESULT','REQUEST','OPERATION','REQUEST_SIZE','CLOCK'].includes(e?.code)?e.code:'PROPOSAL_REFUSED';
export function prepareCouncil({routes,workspace,shareScope,maxRounds=2,maxOutputTokens=256,timeoutMs=15000,signal,maxSlots=12}={}){
 if(!Array.isArray(routes)||routes.length<1||routes.length>4||!denseCouncilArray(routes)||!councilInt(maxRounds,1,3)||!councilInt(maxOutputTokens,1,1024)||!councilInt(timeoutMs,1,30000)||routes.length*maxRounds>maxSlots||workspace?.mode!=='provider-workspace-laboratory'||typeof workspace.execute!=='function'||typeof workspace.list!=='function'||typeof workspace.admitOperation!=='function'||typeof workspace.capturePublicationFence!=='function')councilFail('CONFIG');
 const assertPublication=workspace.capturePublicationFence();
 const ids=new Set(),profiles=workspace.list();
 const team=routes.map(r=>{
  if(!councilClosed(r,['id','role','handle','model','shareScope'])||typeof r.id!=='string'||!ID.test(r.id)||ids.has(r.id)||!councilText(r.role,200)||typeof r.model!=='string'||r.shareScope!==shareScope)councilFail('ROUTE');
  const profile=profiles.find(p=>p.profileId===r.handle?.profileId);
  if(!profile||!profile.models.includes(r.model))councilFail('ROUTE');
  ids.add(r.id);return Object.freeze({id:r.id,role:r.role,handle:r.handle,model:r.model,providerId:profile.providerId,profileId:profile.profileId});
 });
 return Object.freeze({assertPublication,team:Object.freeze(team),execute:workspace.execute.bind(workspace),admitOperation:workspace.admitOperation.bind(workspace),capacity:typeof workspace.dispatchCapacity==='function'?workspace.dispatchCapacity.bind(workspace):null,maxRounds,maxOutputTokens,timeoutMs,signal});
}
// Policies are trusted internal code. The only model-controlled value they
// receive is bounded untrusted text; route handles never enter their operations.
export async function runCouncilRounds(config,{operation,admit,verify,feedbackRow,progressIdentity=null}){
 const {assertPublication,team,execute,admitOperation,capacity,maxRounds,maxOutputTokens,timeoutMs,signal}=config,controller=new AbortController();
 const cancelled=()=>controller.abort();if(signal?.aborted)cancelled();else signal?.addEventListener('abort',cancelled,{once:true});
 const timer=setTimeout(cancelled,timeoutMs);
 let abortListener;const cancelledPromise=new Promise(resolve=>{abortListener=()=>resolve(null);if(controller.signal.aborted)abortListener();else controller.signal.addEventListener('abort',abortListener,{once:true});});
 const trace=[],verified=new Map(),seenProgress=new Set();let active=team,termination='ROUND_LIMIT';
 try{
  for(let round=1;round<=maxRounds;round++){
   if(controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   const feedback=trace.flatMap(row=>row.agents.filter(x=>x.status==='PROPOSED').map(x=>feedbackRow(row.round,x,verified.get(x.candidateKey))));
   const invoke=async route=>{
    const base={agentId:route.id,providerId:route.providerId,model:route.model};
    if(controller.signal.aborted)return {...base,status:'REFUSED',reason:'CANCELLED'};
    try{
     assertPublication();
     // Explicitly project public role/identity, not the credential-bearing route.
     const publicRoute=Object.freeze({id:route.id,role:route.role});
     const op=operation(publicRoute,round,feedback.map(x=>({...x})));
     const inputBytes=new TextEncoder().encode(JSON.stringify(op)).length;
     const result=await execute({handle:route.handle,model:route.model,inputBytes,maxOutputTokens,operation:op},{signal:controller.signal});
     if(controller.signal.aborted)councilFail('CANCELLED');
     if(result.profile?.profileId!==route.profileId||result.profile?.providerId!==route.providerId||result.model!==route.model)councilFail('PROPOSAL_REFUSED');
     assertPublication();
     const value=result.value;if(!councilClosed(value,['text'])||typeof value.text!=='string')councilFail('PROPOSAL_REFUSED');
     const candidate=admit(value.text,publicRoute);
     if(candidate===null)return {...base,status:'ABSTAINED'};
     if(!councilText(candidate,4096))councilFail('PROPOSAL_REFUSED');
     // The policy has decoded the inner JSON. Recheck this value before it
     // becomes a trace key, compiler input, or cross-agent feedback.
     admitOperation(candidate);
     return {...base,status:'PROPOSED',candidateKey:candidate};
    }catch(e){return {...base,status:'REFUSED',reason:publicFailure(e)};}
   };
   // A round can contain more agents than the admitted concurrent capacity.
   // Schedule bounded waves, using the same previous-round feedback for all
   // of them. No wait/retry for unrelated or unknown active reservations.
   const rows=await dispatchWaves(active,invoke,capacity,maxOutputTokens,controller.signal);
   if(rows===null||controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   assertPublication();
   for(const row of rows){
    if(row.status!=='PROPOSED'||verified.has(row.candidateKey))continue;
    try{const artifact=await Promise.race([Promise.resolve().then(()=>controller.signal.aborted?null:verify(row.candidateKey)),cancelledPromise]);if(controller.signal.aborted)break;if(!artifact)councilFail('VERIFICATION_REFUSED');verified.set(row.candidateKey,artifact);}
    catch{const rejected=row.candidateKey;for(const other of rows)if(other.candidateKey===rejected){other.status='REFUSED';other.reason='VERIFICATION_REFUSED';delete other.candidateKey;}}
   }
   assertPublication();
   if(controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   trace.push(Object.freeze({round,agents:Object.freeze(rows.map(Object.freeze))}));
   active=active.filter(r=>rows.some(x=>x.agentId===r.id&&x.status==='PROPOSED'));
   if(!active.length){termination='NO_ADMITTED_PROPOSALS';break;}
   if(progressIdentity){
    let added=0;
    for(const row of rows){if(row.status!=='PROPOSED')continue;const identity=progressIdentity(verified.get(row.candidateKey));if(!seenProgress.has(identity)){seenProgress.add(identity);added++;}}
    // A refusal or abstention cannot masquerade as stable full-team coverage.
    // A repeated typed proposal is a resource-stopping signal, not a verdict.
    if(round>1&&round<maxRounds&&active.length===team.length&&added===0){termination='STAGNANT_CANDIDATES';break;}
   }
  }
  assertPublication();
  const last=trace.at(-1)?.agents??[],proposals=last.filter(x=>x.status==='PROPOSED'),distinct=new Set(proposals.map(x=>x.candidateKey));
  const used=new Set(trace.flatMap(x=>x.agents.filter(y=>y.status==='PROPOSED').map(y=>y.candidateKey)));
  return Object.freeze({rounds:Object.freeze(trace),artifacts:Object.freeze([...verified].filter(([key])=>used.has(key)).map(([,value])=>value)),termination,agreement:termination==='CANCELLED_OR_TIMEOUT'||proposals.length!==team.length?'INCOMPLETE':distinct.size===1?'SAME_CANDIDATE':'DISTINCT_CANDIDATES'});
 }finally{clearTimeout(timer);controller.signal.removeEventListener('abort',abortListener);signal?.removeEventListener('abort',cancelled);}
}

// Capacity is only a conservative scheduling hint: the ledger still reserves
// exact request bytes and enforces every cap on actual dispatch. A third-party
// concurrent operation can consume a hinted slot; do not retry that refusal.
const refuse=(route,reason)=>({agentId:route.id,providerId:route.providerId,model:route.model,status:'REFUSED',reason});
async function dispatchWaves(active,invoke,capacity,tokens,signal){
 if(!capacity)return dispatchTaskWave(active,invoke,signal);
 let queue=active.slice();const results=new Map();
 while(queue.length){
  if(signal.aborted)return null;
  let snapshot;
  try{snapshot=capacity();}catch(e){for(const r of queue)results.set(r.id,refuse(r,publicFailure(e)));break;}
  let global=capacitySlots(snapshot.global,tokens);const available=new Map(snapshot.profiles.map(p=>[p.profileId,p.enabled?capacitySlots(p,tokens):0]));
  const wave=[],rest=[];
  for(const r of queue){
   if(global>0&&(available.get(r.profileId)??0)>0){wave.push(r);global--;available.set(r.profileId,available.get(r.profileId)-1);}
   else rest.push(r);
  }
  if(!wave.length){
   for(const r of rest){const p=snapshot.profiles.find(x=>x.profileId===r.profileId);results.set(r.id,refuse(r,!p||!p.enabled?'PROFILE_DISABLED':'BUDGET'));}
   break;
  }
  const rows=await dispatchTaskWave(wave,invoke,signal);
  if(rows===null||signal.aborted)return null;
  for(const row of rows)results.set(row.agentId,row);
  queue=rest;
 }
 // Stable original route order independent of wave or completion order.
 return active.map(r=>results.get(r.id));
}

// Host-owned task admission is distinct from the downstream conditional verifier.
async function dispatchTaskWave(routes,invoke,signal){
 const tasks=routes.map((route,i)=>({id:'slot_'+i,kind:'council_transport',agentId:route.id,dependsOn:[]}));
 const lookup=new Map(tasks.map((t,i)=>[t.id,routes[i]]));
 const result=await runTaskGraph({tasks,runId:'council_wave',version:'scoped_round',concurrency:routes.length,signal,handlers:{council_transport:{execute:({task})=>invoke(lookup.get(task.id)),admit:(row,{task})=>{if(row?.agentId!==task.agentId||!['PROPOSED','ABSTAINED','REFUSED'].includes(row.status))councilFail('PROPOSAL_REFUSED');return row;}}}});
 if(signal.aborted||result.status==='cancelled'||result.status==='timeout'||result.status==='stale')return null;
 const rows=new Map(result.artifacts.map(x=>[x.taskId,x.value]));
 return tasks.map(t=>rows.has(t.id)?{...rows.get(t.id)}:refuse(lookup.get(t.id),'PROPOSAL_REFUSED'));
}
