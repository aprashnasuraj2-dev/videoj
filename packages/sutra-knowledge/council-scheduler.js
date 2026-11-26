// Shared host-owned scheduler for bounded investigation councils.
// No model can choose a route, authorize disclosure, execute a tool or supply a verdict.
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const councilFail=code=>{const e=new Error('Agent council stopped ('+code+').');e.code=code;throw e;};
export const councilText=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[\ud800-\udfff]/u.test(v);
export const councilClosed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
export const councilInt=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
export const denseCouncilArray=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>i).every(i=>{const d=Object.getOwnPropertyDescriptor(x,String(i));return d?.enumerable&&Object.hasOwn(d,'value');});
const publicFailure=e=>['HANDLE','MODEL','TRANSPORT','BUDGET','PROFILE_DISABLED','USAGE','PROVIDER_UNKNOWN','SECRET_ECHO','PROVIDER_RESULT','REQUEST','OPERATION','REQUEST_SIZE'].includes(e?.code)?e.code:'PROPOSAL_REFUSED';
export function prepareCouncil({routes,workspace,shareScope,maxRounds=2,maxOutputTokens=256,timeoutMs=15000,signal,maxSlots=12}={}){
 if(!Array.isArray(routes)||routes.length<1||routes.length>4||!denseCouncilArray(routes)||!councilInt(maxRounds,1,3)||!councilInt(maxOutputTokens,1,1024)||!councilInt(timeoutMs,1,30000)||routes.length*maxRounds>maxSlots||workspace?.mode!=='provider-workspace-laboratory'||typeof workspace.execute!=='function'||typeof workspace.list!=='function')councilFail('CONFIG');
 const ids=new Set(),profiles=workspace.list();
 const team=routes.map(r=>{
  if(!councilClosed(r,['id','role','handle','model','shareScope'])||typeof r.id!=='string'||!ID.test(r.id)||ids.has(r.id)||!councilText(r.role,200)||typeof r.model!=='string'||r.shareScope!==shareScope)councilFail('ROUTE');
  const profile=profiles.find(p=>p.profileId===r.handle?.profileId);
  if(!profile||!profile.models.includes(r.model))councilFail('ROUTE');
  ids.add(r.id);return Object.freeze({id:r.id,role:r.role,handle:r.handle,model:r.model,providerId:profile.providerId,profileId:profile.profileId});
 });
 return Object.freeze({team:Object.freeze(team),execute:workspace.execute.bind(workspace),maxRounds,maxOutputTokens,timeoutMs,signal});
}
// Policies are trusted internal code. The only model-controlled value they
// receive is bounded untrusted text; route handles never enter their operations.
export async function runCouncilRounds(config,{operation,admit,verify,feedbackRow}){
 const {team,execute,maxRounds,maxOutputTokens,timeoutMs,signal}=config,controller=new AbortController();
 const cancelled=()=>controller.abort();if(signal?.aborted)cancelled();else signal?.addEventListener('abort',cancelled,{once:true});
 const timer=setTimeout(cancelled,timeoutMs);
 let abortListener;const cancelledPromise=new Promise(resolve=>{abortListener=()=>resolve(null);if(controller.signal.aborted)abortListener();else controller.signal.addEventListener('abort',abortListener,{once:true});});
 const trace=[],verified=new Map();let active=team,termination='ROUND_LIMIT';
 try{
  for(let round=1;round<=maxRounds;round++){
   if(controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   const feedback=trace.flatMap(row=>row.agents.filter(x=>x.status==='PROPOSED').map(x=>feedbackRow(row.round,x,verified.get(x.candidateKey))));
   const pending=Promise.all(active.map(async route=>{
    const base={agentId:route.id,providerId:route.providerId,model:route.model};
    if(controller.signal.aborted)return {...base,status:'REFUSED',reason:'CANCELLED'};
    try{
     // Explicitly project public role/identity, not the credential-bearing route.
     const publicRoute=Object.freeze({id:route.id,role:route.role});
     const op=operation(publicRoute,round,feedback.map(x=>({...x})));
     const inputBytes=new TextEncoder().encode(JSON.stringify(op)).length;
     const result=await execute({handle:route.handle,model:route.model,inputBytes,maxOutputTokens,operation:op});
     if(result.profile?.profileId!==route.profileId||result.profile?.providerId!==route.providerId||result.model!==route.model)councilFail('PROPOSAL_REFUSED');
     const value=result.value;if(!councilClosed(value,['text'])||typeof value.text!=='string')councilFail('PROPOSAL_REFUSED');
     const candidate=admit(value.text);
     if(candidate===null)return {...base,status:'ABSTAINED'};
     if(!councilText(candidate,4096))councilFail('PROPOSAL_REFUSED');
     return {...base,status:'PROPOSED',candidateKey:candidate};
    }catch(e){return {...base,status:'REFUSED',reason:publicFailure(e)};}
   }));
   const rows=await Promise.race([pending,cancelledPromise]);
   if(rows===null||controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   for(const row of rows){
    if(row.status!=='PROPOSED'||verified.has(row.candidateKey))continue;
    try{const artifact=await verify(row.candidateKey);if(!artifact)councilFail('VERIFICATION_REFUSED');verified.set(row.candidateKey,artifact);}
    catch{const rejected=row.candidateKey;for(const other of rows)if(other.candidateKey===rejected){other.status='REFUSED';other.reason='VERIFICATION_REFUSED';delete other.candidateKey;}}
   }
   if(controller.signal.aborted){termination='CANCELLED_OR_TIMEOUT';break;}
   trace.push(Object.freeze({round,agents:Object.freeze(rows.map(Object.freeze))}));
   active=active.filter(r=>rows.some(x=>x.agentId===r.id&&x.status==='PROPOSED'));
   if(!active.length){termination='NO_ADMITTED_PROPOSALS';break;}
  }
  const last=trace.at(-1)?.agents??[],proposals=last.filter(x=>x.status==='PROPOSED'),distinct=new Set(proposals.map(x=>x.candidateKey));
  const used=new Set(trace.flatMap(x=>x.agents.filter(y=>y.status==='PROPOSED').map(y=>y.candidateKey)));
  return Object.freeze({rounds:Object.freeze(trace),artifacts:Object.freeze([...verified].filter(([key])=>used.has(key)).map(([,value])=>value)),termination,agreement:termination==='CANCELLED_OR_TIMEOUT'||proposals.length!==team.length?'INCOMPLETE':distinct.size===1?'SAME_CANDIDATE':'DISTINCT_CANDIDATES'});
 }finally{clearTimeout(timer);controller.signal.removeEventListener('abort',abortListener);signal?.removeEventListener('abort',cancelled);}
}
