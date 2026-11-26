// Bounded host-owned council: arbitrary configured model identities, no network or key handling here.
// Existing provider workspace owns credentials and resource reservations. Models only propose reviewed methods.
import {admitProofCase,parseProposal} from './agent-bridge.js';
import {createVerifier} from './index.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const fail=code=>{const e=new Error('Agent council stopped ('+code+').');e.code=code;throw e;};
const text=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const publicFailure=e=>['HANDLE','MODEL','TRANSPORT','BUDGET','PROFILE_DISABLED','USAGE','PROVIDER_UNKNOWN','SECRET_ECHO','PROVIDER_RESULT','REQUEST'].includes(e?.code)?e.code:'PROPOSAL_REFUSED';
export async function runAgentCouncil({caseText,question,routes,workspace,maxRounds=2,maxOutputTokens=256,timeoutMs=15000,signal}={}){
 if(!text(question,2000)||!Array.isArray(routes)||routes.length<1||routes.length>4||!int(maxRounds,1,3)||!int(maxOutputTokens,1,1024)||!int(timeoutMs,1,30000)||workspace?.mode!=='provider-workspace-laboratory'||typeof workspace.execute!=='function'||typeof workspace.list!=='function')fail('CONFIG');
 const c=admitProofCase(caseText),methodIds=[...c.methods.keys()],ids=new Set(),profiles=workspace.list();
 // Snapshot host-owned route bindings before any model work; no model output may alter routes.
 const team=routes.map(r=>{
  if(!closed(r,['id','role','handle','model','shareScope'])||typeof r.id!=='string'||!ID.test(r.id)||ids.has(r.id)||!text(r.role,200)||typeof r.model!=='string'||r.shareScope!=='reviewed-question-and-method-feedback')fail('ROUTE');
  const profile=profiles.find(p=>p.profileId===r.handle?.profileId);
  if(!profile||!profile.models.includes(r.model))fail('ROUTE');
  ids.add(r.id);return Object.freeze({id:r.id,role:r.role,handle:r.handle,model:r.model,providerId:profile.providerId,profileId:profile.profileId});
 });
 const execute=workspace.execute.bind(workspace),controller=new AbortController();
 const cancelled=()=>controller.abort();if(signal?.aborted)cancelled();else signal?.addEventListener('abort',cancelled,{once:true});
 const timer=setTimeout(cancelled,timeoutMs);
 let abortListener;
 const cancelledPromise=new Promise(resolve=>{abortListener=()=>resolve(null);if(controller.signal.aborted)abortListener();else controller.signal.addEventListener('abort',abortListener,{once:true});});
 const trace=[],verified=new Map();let active=team,termination='ROUND_LIMIT';
 try{
  for(let round=1;round<=maxRounds;round++){
   if(controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   // All agents in a round see the same previous-round snapshot, never a race-dependent partial response.
   const feedback=trace.flatMap(row=>row.agents.filter(x=>x.status==='PROPOSED').map(x=>({round:row.round,agentId:x.agentId,methodId:x.methodId,verification:verified.get(x.methodId).outcome.status})));
   const pending=Promise.all(active.map(async route=>{
    if(controller.signal.aborted)return {agentId:route.id,providerId:route.providerId,model:route.model,status:'REFUSED',reason:'CANCELLED'};
    const base={agentId:route.id,providerId:route.providerId,model:route.model};
    try{
     const operation={kind:'reviewed-method-council-v1',question,role:route.role,obligationId:c.obligationId,methodIds:[...methodIds],round,feedback:feedback.map(x=>({...x})),instruction:'Choose one offered method. Return only JSON {version:1,obligationId,methodId}. Prior findings are conditional, not semantic or factual authority. Do not request credentials, URLs or tools.'};
     const inputBytes=new TextEncoder().encode(JSON.stringify(operation)).length;
     const result=await execute({handle:route.handle,model:route.model,inputBytes,maxOutputTokens,operation});
     if(result.profile?.profileId!==route.profileId||result.profile?.providerId!==route.providerId||result.model!==route.model)fail('PROPOSAL_REFUSED');
     const value=result.value;
     if(!closed(value,['text'])||typeof value.text!=='string')fail('PROPOSAL_REFUSED');
     const proposal=parseProposal(value.text,c.obligationId,methodIds);
     return {...base,status:'PROPOSED',methodId:proposal.methodId};
    }catch(e){return {...base,status:'REFUSED',reason:publicFailure(e)};}
   }));
   const rows=await Promise.race([pending,cancelledPromise]);
   // A non-cooperative injected transport may finish later; it cannot publish late results
   // or trigger further dispatch. Workspace retains its own resource reservation.
   if(rows===null||controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   for(const row of rows){
    if(row.status!=='PROPOSED'||verified.has(row.methodId))continue;
    const method=c.methods.get(row.methodId);
    try{
     const result=await createVerifier().evaluate(method.graphText);
     const receipt=result.report.receipts.find(x=>x.id===method.constraintId);
     if(!receipt)fail('VERIFICATION_REFUSED');
     verified.set(row.methodId,Object.freeze({methodId:row.methodId,graphDigest:result.report.graphDigest,outcome:receipt.outcome,receipt}));
    }catch{
     for(const other of rows)if(other.methodId===row.methodId){other.status='REFUSED';other.reason='VERIFICATION_REFUSED';delete other.methodId;}
    }
   }
   if(controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   trace.push(Object.freeze({round,agents:Object.freeze(rows.map(Object.freeze))}));
   active=active.filter(r=>rows.some(x=>x.agentId===r.id&&x.status==='PROPOSED'));
   if(!active.length){termination='NO_ADMITTED_PROPOSALS';break;}
  }
  const last=trace.at(-1)?.agents??[],proposals=last.filter(x=>x.status==='PROPOSED'),distinct=new Set(proposals.map(x=>x.methodId));
  const used=new Set(trace.flatMap(x=>x.agents.filter(y=>y.status==='PROPOSED').map(y=>y.methodId)));
  const methods=[...verified.values()].filter(x=>used.has(x.methodId));
  return Object.freeze({profile:'sutra-reviewed-agent-council/v1',mode:'injected-transport-laboratory',obligationId:c.obligationId,rounds:Object.freeze(trace),methods:Object.freeze(methods),termination,agreement:termination==='CANCELLED_OR_TIMEOUT'?'INCOMPLETE':proposals.length!==team.length?'INCOMPLETE':distinct.size===1?'SAME_METHOD':'DISTINCT_METHODS',decisionAuthority:'NONE',qualification:'Model proposals select caller-reviewed methods only. Conditional computations do not establish intended meaning, evidence truth or independent model ancestry. No live provider, endpoint, cost or secret is configured here.'});
 }finally{clearTimeout(timer);controller.signal.removeEventListener('abort',abortListener);signal?.removeEventListener('abort',cancelled);}
}
