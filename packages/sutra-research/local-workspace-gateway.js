// Single-user loopback host. Not a public deployment or distributed worker.
import {randomUUID} from 'node:crypto';
import {admitManifest,authorizeResearch,digest,secretLike} from './research-session.js';
import {MODEL_PROFILES,createResearchModelBroker} from './model-broker.js';
import {createSearchProviders} from './providers.js';
import {createDocumentReader} from './document-reader.js';
import {runAutonomousResearch} from './research-supervisor.js';
const fail=code=>{throw Object.assign(Error('Local research gateway refused: '+code),{code});};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const keyPresent=x=>typeof x==='string'&&/^[\x21-\x7e]{8,512}$/.test(x);
const safeCode=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'GATEWAY_FAILURE';
const active=s=>s&&['running','cancelling'].includes(s.state);
const costPolicy=Object.freeze({maxSearches:6,maxDocuments:12,maxLinkDepth:2,maxDurationSeconds:120,maxDownloadBytes:16777216,maxCostMicros:100000,maxModelCalls:6});
export function createLocalResearchGateway({modelCredentials={},searchCredentials={},configure,clock=()=>Date.now()}={}){
 const modelKeys=Object.fromEntries(Object.keys(MODEL_PROFILES).filter(v=>keyPresent(modelCredentials[v])).map(v=>[v,modelCredentials[v]]));
 const searchKeys=Object.fromEntries(['brave','tavily'].filter(v=>keyPresent(searchCredentials[v])).map(v=>[v,searchCredentials[v]]));
 const vendors=Object.keys(modelKeys),searchBackends=Object.keys(searchKeys),mode=configure?'injected_fixture':'local_host_transport';
 let previewed=null,current=null,closed=false;
 const check=()=>{if(closed)fail('GATEWAY_CLOSED');};
 const caps=()=>({schema:'sutra-local-research-capabilities/v1',mode,configuredModelVendors:[...vendors],searchBackends:[...searchBackends],directPublicUrls:true,maxSelectedModels:3,authority:'NONE'});
 function preview(input){
  check();if(active(current))fail('RUN_ACTIVE');
  if(!exact(input,['objective','models'])||typeof input.objective!=='string'||!Array.isArray(input.models)||input.models.length<1||input.models.length>3||input.models.some(m=>!exact(m,['vendor','model'])||!vendors.includes(m.vendor)||typeof m.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(m.model)))fail('MODEL_SELECTION');
  if(secretLike(JSON.stringify(input))||[...Object.values(modelKeys),...Object.values(searchKeys)].some(key=>JSON.stringify(input).includes(key)))fail('SENSITIVE_INPUT');
  const raw=JSON.stringify({schema:'sutra-autonomous-research/v1',objective:input.objective.trim().replace(/\s+/gu,' '),scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false,allowCrossOriginLinks:true,allowRedirects:true,allowPublicQueryParameters:false,allowModelPublicUrls:true},budget:{...costPolicy},providers:searchBackends.map(id=>({id,estimatedMaxCostMicros:5000})),modelPolicy:{allowPublicEvidenceDisclosure:true,models:input.models.map(m=>({...m,maxInputBytes:32768,maxOutputTokens:2048,estimatedMaxCostMicros:10000}))}});
  const p=admitManifest(raw),expiresAt=clock()+120000;
  previewed={raw,pin:p.planPin,expiresAt};
  return {schema:'sutra-local-research-preview/v1',planPin:p.planPin,expiresAt,objective:p.plan.objective,models:p.plan.modelPolicy.models,webAccess:p.plan.modelPolicy.webAccess,searchBackends,scope:p.plan.scope,budget:p.plan.budget,costPolicy:p.costPolicy,reviewMode:p.plan.modelPolicy.reviewMode,authority:'NONE'};
 }
 async function execute(s,raw){
  let a,host;
  try{
   a=authorizeResearch(raw,{approvedPlanPin:s.planPin,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true,signal:s.controller.signal});
   if(configure)host=await configure(a);
   else host={providers:createSearchProviders({credentials:searchKeys}),readDocument:createDocumentReader({authorization:a}),modelBroker:createResearchModelBroker({authorization:a,credentials:modelKeys})};
   a.assertActive();
   const result=await runAutonomousResearch({authorization:a,...host,assignedSessionId:s.sessionId,onEvent:e=>{if(s.state==='running'&&s.events.length<2000)s.events.push(e);}});
   if(s.controller.signal.aborted||s.state!=='running'){s.state='cancelled';return;}
   const text=JSON.stringify(result);if(Buffer.byteLength(text)>32*1024*1024)fail('REPORT_SIZE');
   s.report=result;s.reportPin=digest(text);s.state='closed';
  }catch(e){s.state=s.controller.signal.aborted?'cancelled':'failed';s.reason=s.controller.signal.aborted?'OPERATOR_CANCELLED':safeCode(e);}
  finally{host?.modelBroker?.close();try{await host?.close?.();}catch{}a?.close();}
 }
 function start(input){
  check();if(active(current))fail('RUN_ACTIVE');
  if(!exact(input,['approvedPlanPin','approvePublicContact','approveEstimatedCost','approveModelDisclosure'])||input.approvePublicContact!==true||input.approveEstimatedCost!==true||input.approveModelDisclosure!==true||!previewed||input.approvedPlanPin!==previewed.pin||clock()>=previewed.expiresAt)fail('APPROVAL');
  const raw=previewed.raw;previewed=null;
  const s={sessionId:'research_'+randomUUID(),planPin:input.approvedPlanPin,state:'running',events:[],controller:new AbortController(),report:null,reportPin:null,reason:null};
  current=s;void execute(s,raw);return {sessionId:s.sessionId,planPin:s.planPin,state:s.state,mode};
 }
 function status(id,after=0){
  check();if(!current||id!==current.sessionId)fail('SESSION_NOT_FOUND');
  if(!Number.isSafeInteger(after)||after<0||after>current.events.length)fail('EVENT_CURSOR');
  const s=current;
  return {sessionId:s.sessionId,planPin:s.planPin,state:s.state,mode,events:s.events.slice(after),nextCursor:s.events.length,reason:s.reason,report:s.state==='closed'?s.report:null,reportPin:s.state==='closed'?s.reportPin:null};
 }
 function cancel(id){
  check();if(!current||id!==current.sessionId)fail('SESSION_NOT_FOUND');
  if(current.state==='running'){current.state='cancelling';current.controller.abort();}
  return {sessionId:id,state:current.state};
 }
 return Object.freeze({capabilities:caps,preview,start,status,cancel,close(){closed=true;previewed=null;if(active(current)){current.state='cancelling';current.controller.abort();}}});
}
