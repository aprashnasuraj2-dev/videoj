// Trusted-host integration candidate. No CLI/browser live activation, no default
// public resolver, no secret prompt. All credentials are enrolled before dispatch.
import {admitMixedCouncilConfig} from './mixed-council-config.js';
import {createMixedModelExchange} from '../sutra-inference/mixed-model-exchange.js';
import {createProtocolWorkspace} from '../sutra-inference/protocol-workspace.js';
import {runExpressionCouncil} from './expression-council.js';
import {createExpressionReviewReceipt} from './expression-review-receipt.js';
const fail=code=>{const e=new Error('Mixed council refused ('+code+').');e.code=code;throw e;};
export async function runApprovedMixedCouncil({configText,approvedPlanPin,approveDisclosure=false,approveHosted=false,readCredential,resolveAll,hostedIO,signal}={}){
 const {config,contract,planPin,preview}=await admitMixedCouncilConfig(configText);
 if(approvedPlanPin!==planPin||approveDisclosure!==true)fail('APPROVAL');
 if(preview.hostedConnections&&approveHosted!==true)fail('HOSTED_APPROVAL');
 if(signal?.aborted)fail('CANCELLED');
 const transport=createMixedModelExchange({connections:config.connections,deadlineMs:config.transportDeadlineMs,resolveAll,hostedIO});
 const controller=new AbortController(),cancel=()=>{controller.abort();transport.close();};
 signal?.addEventListener('abort',cancel,{once:true});
 if(signal?.aborted)cancel();
 try{
  const workspace=createProtocolWorkspace({connections:config.connections.map(({id,label,protocol,endpoint,models,transportClass})=>({id,label,protocol,endpoint,models,transportClass})),exchange:transport.exchange,globalLimits:config.budget,defaultProfileLimits:config.budget});
  const handles=new Map();
  for(const c of config.connections){
   if(controller.signal.aborted)fail('CANCELLED');
   const credential=c.authMode==='none'?'SUTRA_NO_KEY_'+Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join(''):typeof readCredential==='function'?await readCredential(c.credentialEnv):null;
   if(typeof credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credential))fail('CREDENTIAL_REQUIRED');
   handles.set(c.id,workspace.addProfile({providerId:c.id,label:c.label,credential}).handle);
  }
  if(controller.signal.aborted)fail('CANCELLED');
  // Check the actual question, all reviewed source text and plan metadata before
  // any contact. Literal secret canaries are not a general data-loss guarantee.
  for(const value of [contract.question.text,...contract.sources.map(s=>s.text),...config.connections.flatMap(c=>[c.endpoint,c.label,...c.models]),...config.agents.map(a=>a.role)]){
   for(let i=0;i<value.length;i+=32000)workspace.admitOperation(value.slice(i,i+32512));
  }
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
  // Result strings can contain quoted data. Check decoded leaf strings and keys,
  // not just escaped JSON. No secret-bearing raw exception is returned.
  let nodes=0,chars=0;
  function scan(x,depth=0){
   if(++nodes>30000||depth>40)fail('EXPORT_SIZE');
   if(typeof x==='string'){chars+=x.length;if(chars>2000000)fail('EXPORT_SIZE');for(let i=0;i<x.length;i+=32000)workspace.admitOperation(x.slice(i,i+32512));return;}
   if(x===null||typeof x==='number'||typeof x==='boolean')return;
   if(Array.isArray(x)){for(const v of x)scan(v,depth+1);return;}
   if(!x||typeof x!=='object')fail('EXPORT_SHAPE');
   for(const [k,v] of Object.entries(x)){scan(k,depth+1);scan(v,depth+1);}
  }
  scan(output);return Object.freeze(output);
 }finally{signal?.removeEventListener('abort',cancel);transport.close();}
}
