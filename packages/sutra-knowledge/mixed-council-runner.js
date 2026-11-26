// Trusted-host integration candidate. No CLI/browser live activation, no default
// public resolver, no secret prompt. All credentials are enrolled before dispatch.
import {admitMixedCouncilConfig} from './mixed-council-config.js';
import {createMixedModelExchange} from '../sutra-inference/mixed-model-exchange.js';
import {createProtocolWorkspace} from '../sutra-inference/protocol-workspace.js';
import {runExpressionCouncil} from './expression-council.js';
import {createExpressionReviewReceipt} from './expression-review-receipt.js';
const fail=code=>{const e=new Error('Mixed council refused ('+code+').');e.code=code;throw e;};
// The credential callback is host-controlled, but can hang or throw a secret-bearing
// error. Abort the wait, not the host's underlying promise; observe late rejections.
function credentialFor(read,alias,signal,reason){
 if(signal.aborted)fail(reason());
 return new Promise((resolve,reject)=>{
  const finish=(ok,value)=>{signal.removeEventListener('abort',cancel);ok?resolve(value):reject(new Error('Mixed council refused ('+value+')'));};
  const cancel=()=>finish(false,reason());
  signal.addEventListener('abort',cancel,{once:true});
  Promise.resolve().then(()=>signal.aborted?null:read(alias,signal)).then(
   value=>signal.aborted?cancel():finish(true,value),
   ()=>finish(false,signal.aborted?reason():'CREDENTIAL_READ')
  );
 });
}
// Scan decoded leaf values and keys, including every plan identifier and alias.
function scanBounded(workspace,x){
 let nodes=0,chars=0;
 function scan(x,depth=0){
  if(++nodes>30000||depth>40)fail('SCAN_SIZE');
  if(typeof x==='string'){chars+=x.length;if(chars>2000000)fail('SCAN_SIZE');for(let i=0;i<x.length;i+=32000)workspace.admitOperation(x.slice(i,i+32512));return;}
  if(x===null||typeof x==='number'||typeof x==='boolean')return;
  if(Array.isArray(x)){for(const v of x)scan(v,depth+1);return;}
  if(!x||typeof x!=='object')fail('SCAN_SHAPE');
  for(const [k,v] of Object.entries(x)){scan(k,depth+1);scan(v,depth+1);}
 }
 scan(x);
}
export async function runApprovedMixedCouncil({configText,approvedPlanPin,approveDisclosure=false,approveHosted=false,readCredential,resolveAll,hostedIO,signal}={}){
 const {config,contract,planPin,preview}=await admitMixedCouncilConfig(configText);
 if(approvedPlanPin!==planPin||approveDisclosure!==true)fail('APPROVAL');
 if(preview.hostedConnections&&approveHosted!==true)fail('HOSTED_APPROVAL');
 if(signal?.aborted)fail('CANCELLED');
 const transport=createMixedModelExchange({connections:config.connections,deadlineMs:config.transportDeadlineMs,resolveAll,hostedIO});
 const controller=new AbortController();let stopCode='CANCELLED';
 const cancel=()=>{controller.abort();transport.close();};
 const timer=setTimeout(()=>{stopCode='TIMEOUT';cancel();},config.timeoutMs);
 signal?.addEventListener('abort',cancel,{once:true});
 if(signal?.aborted)cancel();
 try{
  const workspace=createProtocolWorkspace({connections:config.connections.map(({id,label,protocol,endpoint,models,transportClass})=>({id,label,protocol,endpoint,models,transportClass})),exchange:transport.exchange,globalLimits:config.budget,defaultProfileLimits:config.budget});
  const handles=new Map();
  for(const c of config.connections){
   if(controller.signal.aborted)fail(stopCode);
   const credential=c.authMode==='none'?'SUTRA_NO_KEY_'+Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join(''):typeof readCredential==='function'?await credentialFor(readCredential,c.credentialEnv,controller.signal,()=>stopCode):null;
   if(controller.signal.aborted)fail(stopCode);
   if(typeof credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credential))fail('CREDENTIAL_REQUIRED');
   handles.set(c.id,workspace.addProfile({providerId:c.id,label:c.label,credential}).handle);
  }
  if(controller.signal.aborted)fail(stopCode);
  // All aliases are enrolled before a full decoded plan/evidence scan and
  // before either route contacts a provider. Literal scans are not full DLP.
  scanBounded(workspace,config);scanBounded(workspace,contract);
  if(controller.signal.aborted)fail(stopCode);
  const routes=config.agents.map(x=>({id:x.id,role:x.role,handle:handles.get(x.connectionId),model:x.model,shareScope:'reviewed-question-bindings-and-conditional-feedback'}));
  const result=await runExpressionCouncil({contractText:config.contractText,contractPin:config.contractPin,disclosure:config.disclosure,routes,workspace,maxRounds:config.maxRounds,maxOutputTokens:config.maxOutputTokens,roundPolicy:config.roundPolicy,timeoutMs:config.timeoutMs,signal:controller.signal});
  transport.close();
  let receipt=null;
  if(!controller.signal.aborted&&result.termination!=='CANCELLED_OR_TIMEOUT'&&result.candidates.length){
   const r=await createExpressionReviewReceipt({contractText:config.contractText,contractPin:config.contractPin,bindingIds:config.disclosure.bindingIds,expressions:result.candidates.map(c=>c.expression)});
   if(!controller.signal.aborted)receipt={receiptText:r.receiptText,receiptPin:r.receiptPin};
  }
  // Do not export handles, route credentials or host-side transport objects.
  const budget=workspace.budgetSnapshot().global;
  const output={mode:'EXPLICIT_MIXED_HOST_CANDIDATE',planPin,contractPin:config.contractPin,status:controller.signal.aborted?'INCOMPLETE_CANCELLED':result.state,result:controller.signal.aborted?null:result,receipt:controller.signal.aborted?null:receipt,budget,decisionAuthority:'NONE',qualification:'Hosted I/O is explicitly host-injected; no production activation, authenticated model identity, billed currency, semantic or empirical authority.'};
  scanBounded(workspace,output);return Object.freeze(output);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);transport.close();}
}
