// Single-user loopback host. Not a public deployment or distributed worker.
import {randomUUID} from 'node:crypto';
import {admitManifest,authorizeResearch,digest,secretLike} from './research-session.js';
import {MODEL_PROFILES,createResearchModelBroker} from './model-broker.js';
import {createSearchProviders} from './providers.js';
import {createDocumentReader} from './document-reader.js';
import {createObscuraRenderer,createObscuraEnhancedReader} from './obscura-adapter.js';
import {runAutonomousResearch} from './research-supervisor.js';
import {createOnDemandWebAccess} from './on-demand-web.js';
const fail=code=>{throw Object.assign(Error('Local research gateway refused: '+code),{code});};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const keyPresent=x=>typeof x==='string'&&/^[\x21-\x7e]{8,512}$/.test(x);
const safeCode=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'GATEWAY_FAILURE';
const active=s=>s&&['running','cancelling'].includes(s.state);
const costPolicy=Object.freeze({maxSearches:6,maxDocuments:12,maxLinkDepth:2,maxDurationSeconds:120,maxDownloadBytes:16777216,maxCostMicros:100000,maxModelCalls:6});
// A single autonomous run is a runtime-scoped capability, not a per-URL human consent ceremony.
const autonomousBudget=Object.freeze({maxSearches:3,maxDocuments:6,maxLinkDepth:1,maxDurationSeconds:90,maxDownloadBytes:5242880,maxCostMicros:20000});
export function createLocalResearchGateway({modelCredentials={},searchCredentials={},configure,clock=()=>Date.now(),enableObscura=false,obscuraBinaryPath}={}){
 const modelKeys=Object.fromEntries(Object.keys(MODEL_PROFILES).filter(v=>keyPresent(modelCredentials[v])).map(v=>[v,modelCredentials[v]]));
 const searchKeys=Object.fromEntries(['brave','tavily'].filter(v=>keyPresent(searchCredentials[v])).map(v=>[v,searchCredentials[v]]));
 const vendors=Object.keys(modelKeys),searchBackends=Object.keys(searchKeys),mode=configure?'injected_fixture':'local_host_transport';
  const obscuraRenderer=enableObscura===true?createObscuraRenderer({binaryPath:obscuraBinaryPath}):null;
 let previewed=null,current=null,closed=false;
 const web=createOnDemandWebAccess({searchCredentials:searchKeys,renderer:obscuraRenderer,clock,isBusy:()=>active(current)});
 const check=()=>{if(closed)fail('GATEWAY_CLOSED');};
 const caps=()=>({schema:'sutra-local-research-capabilities/v1',mode,configuredModelVendors:[...vendors],searchBackends:[...searchBackends],directPublicUrls:true,jsRendering:obscuraRenderer?'operator_enabled_experimental':'unavailable',maxSelectedModels:3,autonomousModelFree:true,autonomousDefaultSearch:searchBackends.length?'configured_search':'wikipedia_limited',webTools:web.capabilities(),authority:'NONE'});
 function preview(input){
  check();if(active(current)||web.isBusy())fail('RUN_ACTIVE');
  if(!exact(input,['objective','models',...(Object.hasOwn(input??{},'reviewEnabled')?['reviewEnabled']:[]),...(Object.hasOwn(input??{},'browserScheduled')?['browserScheduled']:[])])||(Object.hasOwn(input,'reviewEnabled')&&typeof input.reviewEnabled!=='boolean')||(Object.hasOwn(input,'browserScheduled')&&typeof input.browserScheduled!=='boolean')||typeof input.objective!=='string'||!Array.isArray(input.models)||input.models.length<1||input.models.length>3||input.models.some(m=>!exact(m,['vendor','model'])||!vendors.includes(m.vendor)||typeof m.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(m.model)))fail('MODEL_SELECTION');
  if(secretLike(JSON.stringify(input))||[...Object.values(modelKeys),...Object.values(searchKeys)].some(key=>JSON.stringify(input).includes(key)))fail('SENSITIVE_INPUT');
  const raw=JSON.stringify({schema:'sutra-autonomous-research/v1',objective:input.objective.trim().replace(/\s+/gu,' '),scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false,allowCrossOriginLinks:true,allowRedirects:true,allowPublicQueryParameters:false,allowModelPublicUrls:true,...(obscuraRenderer?{allowJsRendering:true}:{})},budget:{...costPolicy},providers:searchBackends.map(id=>({id,estimatedMaxCostMicros:5000})),modelPolicy:{allowPublicEvidenceDisclosure:true,...(input.reviewEnabled===false?{reviewEnabled:false}:{}),models:input.models.map(m=>({...m,maxInputBytes:32768,maxOutputTokens:2048,estimatedMaxCostMicros:10000}))}});
  const p=admitManifest(raw),expiresAt=clock()+120000;
  const approvalId=randomUUID();previewed={raw,pin:p.planPin,approvalId,expiresAt,browserScheduled:input.browserScheduled===true};
  return {schema:'sutra-local-research-preview/v1',planPin:p.planPin,approvalId,expiresAt,objective:p.plan.objective,models:p.plan.modelPolicy.models,webAccess:p.plan.modelPolicy.webAccess,searchBackends,scope:p.plan.scope,budget:p.plan.budget,costPolicy:p.costPolicy,reviewMode:p.plan.modelPolicy.reviewMode,browserScheduled:previewed.browserScheduled,authority:'NONE'};
 }
 async function execute(s,raw){
  let a,host;
  try{
   a=authorizeResearch(raw,{approvedPlanPin:s.planPin,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true,signal:s.controller.signal});
   if(configure)host=await configure(a);
   else host={providers:createSearchProviders({credentials:searchKeys}),readDocument:obscuraRenderer?createObscuraEnhancedReader({authorization:a,renderer:obscuraRenderer}):createDocumentReader({authorization:a}),...(a.plan.modelPolicy?{modelBroker:createResearchModelBroker({authorization:a,credentials:modelKeys})}:{})};
   a.assertActive();
   const result=await runAutonomousResearch({authorization:a,...host,assignedSessionId:s.sessionId,beforeOperation:s.browserScheduled?op=>awaitBrowserPermit(s,op,a.signal):undefined,onEvent:e=>{if(s.state==='running'&&s.events.length<2000)s.events.push(e);}});
   if(s.controller.signal.aborted||s.state!=='running'){s.state='cancelled';return;}
   const text=JSON.stringify(result);if(Buffer.byteLength(text)>32*1024*1024)fail('REPORT_SIZE');
   s.report=result;s.reportPin=digest(text);s.state='closed';
  }catch(e){s.state=s.controller.signal.aborted?'cancelled':'failed';s.reason=s.controller.signal.aborted?'OPERATOR_CANCELLED':safeCode(e);}
  finally{host?.modelBroker?.close();try{await host?.close?.();}catch{}a?.close();}
 }
 function start(input){
  check();if(active(current)||web.isBusy())fail('RUN_ACTIVE');
  if(!exact(input,['approvedPlanPin','approvalId','approvePublicContact','approveEstimatedCost','approveModelDisclosure'])||input.approvePublicContact!==true||input.approveEstimatedCost!==true||input.approveModelDisclosure!==true||!previewed||input.approvedPlanPin!==previewed.pin||input.approvalId!==previewed.approvalId||clock()>=previewed.expiresAt)fail('APPROVAL');
  const {raw,browserScheduled}=previewed;previewed=null;
  const s={browserScheduled,permit:null,permitSequence:0,sessionId:'research_'+randomUUID(),planPin:input.approvedPlanPin,state:'running',events:[],controller:new AbortController(),report:null,reportPin:null,reason:null};
  current=s;void execute(s,raw);return {sessionId:s.sessionId,planPin:s.planPin,state:s.state,mode};
 }
 // Operator-owned local runtime capability: one objective initiates deterministic,
 // multi-step source discovery, evaluation and extraction without any model.
 // Agent/tool integrations can invoke this from the trusted host; the browser
 // route fixes actor=user and cannot supply an impersonated agent identity.
 function startAutonomous(input,{actor='user'}={}){
  check();if(active(current)||web.isBusy())fail('RUN_ACTIVE');
  const modelled=Object.hasOwn(input??{},'models');
  if(!['user','agent','engine'].includes(actor)||!exact(input,['objective',...(modelled?['models']:[])])||typeof input.objective!=='string')fail('AUTONOMOUS_INPUT');
  const models=modelled?input.models:[];
  if(!Array.isArray(models)||models.length>3||models.some(m=>!exact(m,['vendor','model'])||!vendors.includes(m.vendor)||typeof m.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(m.model))||new Set(models.map(x=>x.vendor+'|'+x.model)).size!==models.length)fail('MODEL_SELECTION');
  const objective=input.objective.trim().replace(/\s+/gu,' ');
  if(!objective||objective.length>1000||secretLike(objective)||/[\u0000-\u001f\u007f]/.test(objective))fail('AUTONOMOUS_INPUT');
  const configured=searchBackends.length?searchBackends:['wikipedia'];
  const providers=configured.slice(0,2).map(id=>({id,estimatedMaxCostMicros:id==='wikipedia'?1:5000}));
  const raw=JSON.stringify({schema:'sutra-autonomous-research/v1',objective,
   scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false,allowCrossOriginLinks:true,allowRedirects:true,allowPublicQueryParameters:true,...(models.length?{allowModelPublicUrls:true}:{}),...(obscuraRenderer?{allowJsRendering:true}:{})},
   budget:models.length?{...autonomousBudget,maxDurationSeconds:120,maxCostMicros:100000,maxModelCalls:6}:{...autonomousBudget},providers,
   ...(models.length?{modelPolicy:{allowPublicEvidenceDisclosure:true,models:models.map(m=>({...m,maxInputBytes:32768,maxOutputTokens:2048,estimatedMaxCostMicros:10000}))}}:{})});
  const plan=admitManifest(raw);
  previewed=null;
  const session={browserScheduled:false,permit:null,permitSequence:0,actor,autonomous:true,sessionId:'research_'+randomUUID(),planPin:plan.planPin,state:'running',events:[],controller:new AbortController(),report:null,reportPin:null,reason:null};
  current=session;void execute(session,raw);
  return {sessionId:session.sessionId,planPin:session.planPin,state:session.state,mode,autonomous:true,actor,modelCallsEnabled:models.length>0};
 }
 function status(id,after=0){
  check();if(!current||id!==current.sessionId)fail('SESSION_NOT_FOUND');
  if(!Number.isSafeInteger(after)||after<0||after>current.events.length)fail('EVENT_CURSOR');
  const s=current;
  return {sessionId:s.sessionId,planPin:s.planPin,state:s.state,mode,autonomous:s.autonomous===true,actor:s.actor??'user',events:s.events.slice(after),nextCursor:s.events.length,reason:s.reason,report:s.state==='closed'?s.report:null,reportPin:s.state==='closed'?s.reportPin:null,pendingOperation:s.permit?.descriptor??null};
 }
 function awaitBrowserPermit(s,op,signal){
  if(signal.aborted||s.state!=='running'||s.permit)fail('OPERATION_STATE');
  const descriptor=Object.freeze({id:randomUUID(),sequence:++s.permitSequence,kind:op.kind,role:op.role});
  return new Promise((resolve,reject)=>{
   const abort=()=>{if(s.permit?.descriptor===descriptor)s.permit=null;reject(Object.assign(Error('OPERATION_CANCELLED'),{code:'OPERATION_CANCELLED'}));};
   s.permit={descriptor,release:()=>{signal.removeEventListener('abort',abort);s.permit=null;resolve();}};
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  });
 }
 function advance(input){
  check();if(!exact(input,['sessionId','planPin','operationId','sequence'])||!current||input.sessionId!==current.sessionId||input.planPin!==current.planPin||current.state!=='running'||!current.permit||input.operationId!==current.permit.descriptor.id||input.sequence!==current.permit.descriptor.sequence)fail('OPERATION_PERMIT');
  current.permit.release();return {accepted:true,operationId:input.operationId,sequence:input.sequence};
 }
 function cancel(id){
  check();if(!current||id!==current.sessionId)fail('SESSION_NOT_FOUND');
  if(current.state==='running'){current.state='cancelling';current.controller.abort();}
  return {sessionId:id,state:current.state};
 }
 return Object.freeze({capabilities:caps,preview,start,startAutonomous,status,advance,cancel,web,close(){web.close();closed=true;previewed=null;if(active(current)){current.state='cancelling';current.controller.abort();}}});
}
