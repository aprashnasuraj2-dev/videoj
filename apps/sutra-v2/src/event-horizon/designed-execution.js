import {runNetwork,RuntimeError} from '../../../../packages/sutra-runtime/index.js';
import {readBoundedResponse,isFullJson} from '../../../../packages/sutra-runtime/bounded-response.js';
import {parseUniqueJson} from '../../../../packages/sutra-runtime/strict-json.js';
import {createProviderAdapter} from '../../../../packages/sutra-inference/client.js';
import {admitDesign,delegationAnalysis} from './network-designer.js';
const fail=code=>{throw new RuntimeError(code,'Designed network execution refused ('+code+').');};
const hash=async value=>'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
function freeze(x){
 if(x&&typeof x==='object'){
  for(const v of Object.values(x))freeze(v);
  Object.freeze(x);
 }
 return x;
}
function validOrigin(origin){
 try{
  const u=new URL(origin);
  return u.origin===origin&&(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname));
 }catch{return false;}
}
function safeCode(error){
 const code=error?.code;
 return typeof code==='string'&&/^[A-Z_]{1,60}$/.test(code)?code:'DESIGNED_RUN_FAILED';
}
export function admitPublisherRoute(route){
 if(route?.inference!=='configured'||route.routerBase!=='/api/v1'||route.publisherFunded!==true||route.byok!==false||
 !['hosted','self_hosted'].includes(route.backend)||
 route.provider!==undefined&&!(route.backend==='hosted'?['openai','gemini','groq','openrouter']:['self_hosted']).includes(route.provider)||
 typeof route.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(route.model)||route.model==='mock-1'||
 typeof route.inferenceContractId!=='string'||!/^[a-f0-9]{64}$/.test(route.inferenceContractId))fail('DESIGN_ROUTER_UNAVAILABLE');
 return freeze({model:route.model,provider:route.provider??'publisher_unspecified',backend:route.backend,contract:route.inferenceContractId});
}
export async function prepareDesignedExecution({definition,name='custom_network',objective,origin,maxModelCalls=4,fetchImpl=fetch,signal,isCurrent=()=>true}={}){
 if(!validOrigin(origin)||typeof objective!=='string'||!objective.trim()||objective.length>1000||/[\ud800-\udfff]/u.test(objective)||!Number.isInteger(maxModelCalls)||maxModelCalls<1||maxModelCalls>8||typeof isCurrent!=='function')fail('DESIGN_RUN_INPUT');
 if(signal?.aborted||isCurrent()!==true)fail('DESIGN_STALE');
 const limits=freeze({maxDepth:3,maxAgents:12,maxModelCalls,maxSteps:8,concurrency:1,timeoutMs:60000,maxOutputChars:12000,maxToolCalls:8,maxContextBytes:16384});
 const design=admitDesign(definition,{name,limits});
 const analysis=delegationAnalysis(design.definition);
 // Before approval, only a credentialless status GET is allowed. The
 // objective and definition do not leave the browser during preparation.
 const controller=new AbortController(),abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});
 if(signal?.aborted)abort();
 const timer=setTimeout(abort,5000);
 let route;
 try{
  const {bytes}=await readBoundedResponse({url:origin+'/api/status',fetchImpl,signal:controller.signal,maxBytes:8192,init:{method:'GET',headers:{Accept:'application/json'}},inspect:r=>{if(!isFullJson(r))fail('DESIGN_ROUTER_UNAVAILABLE');return true;}});
  route=admitPublisherRoute(parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:8192,maxDepth:16}));
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
 if(signal?.aborted||isCurrent()!==true)fail('DESIGN_STALE');
 const graphPin=await hash(design.definition);
 const preview=freeze({
  schema:'sutra-designed-run-plan/v1',name:design.name,front:design.front,
  graphPin,objective,definition:design.definition,
  destination:origin+'/api/v1/chat/completions',route,limits,
  declaredDefinitions:analysis.definitionCount,reachableDefinitions:analysis.reachable.length,
  disclosure:['Objective','Public instructions and callable schemas','Derived messages and local delegation results'],
  policy:{peerContacts:0,externalTools:0,externalWrites:0,privateContext:0,automaticRetries:0}
 });
 const planPin=await hash(preview);
 if(signal?.aborted||isCurrent()!==true)fail('DESIGN_STALE');
 let consumed=false;
 return Object.freeze({preview,planPin,async run({approvedPlanPin,signal,onEvent}={}){
  if(consumed)fail('DESIGN_PLAN_CONSUMED');
  if(approvedPlanPin!==planPin)fail('DESIGN_APPROVAL_REQUIRED');
  consumed=true;
  let attempted=0,responses=0;
  const assertCurrent=()=>{
   if(signal?.aborted)fail('CANCELLED');
   if(isCurrent()!==true)fail('DESIGN_STALE');
  };
  try{
   assertCurrent();
   const provider=createProviderAdapter({origin,model:route.model,fetchImpl:(url,init)=>{
    assertCurrent();
    if(url!==preview.destination||init.method!=='POST'||init.credentials!=='omit'||init.redirect!=='error')fail('DESIGN_TRANSPORT');
    attempted++;
    return fetchImpl(url,{...init,headers:{...init.headers,'X-Sutra-Inference-Contract':route.contract}});
   }});
   const adapter=Object.freeze({...provider,async chat(input){
    assertCurrent();
    const result=await provider.chat(input);
    responses++;
    assertCurrent();
    return result;
   }});
   const result=await runNetwork({definition:design.definition,name:design.name,frontMan:design.front,request:objective,model:adapter,limits,signal,onEvent});
   assertCurrent();
   if(attempted!==responses||result.modelCalls!==attempted)fail('DESIGN_ACCOUNTING');
   const names=new Set(design.definition.tools.map(x=>x.name));
   const events=result.events.filter(e=>['agent','tool','model_call'].includes(e.kind)&&['start','end'].includes(e.phase)).map(e=>{
    const safe={kind:e.kind,phase:e.phase};
    for(const k of ['id','parent'])if(typeof e[k]==='string'&&/^[A-Za-z0-9_.:/-]{1,100}$/.test(e[k]))safe[k]=e[k];
    for(const k of ['agent','tool'])if(names.has(e[k]))safe[k]=e[k];
    if(['ok','error','cancelled'].includes(e.status))safe.status=e.status;
    return safe;
   });
   const receipt=freeze({
    schema:'sutra-designed-run-receipt/v1',planPin,graphPin,
    network:design.name,front:design.front,route:route.model,provider:route.provider,
    destination:preview.destination,contract:route.contract,limits,
    status:'completed',modelCalls:result.modelCalls,agentCalls:result.agentCalls,
    attempted,responses,events,authority:'NONE',
    qualification:'Browser-observed metadata only. The configured transport is not proof of live upstream inference, factual truth, independence or billing.'
   });
   return freeze({text:result.text,receipt});
  }catch(error){
   const safe=new RuntimeError(signal?.aborted?'CANCELLED':safeCode(error),'Designed execution stopped. No completed answer is claimed.');
   safe.dispatch=freeze({attempted,responses,outcome:attempted===0?'none_attempted':attempted===responses?'transport_completed':'outcome_unknown',billing:attempted?'unverified':'no_attempt'});
   throw safe;
  }
 }});
}
