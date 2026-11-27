// Node-only, explicitly invoked operator gateway. Never a browser/public relay.
// An exact plan is not a grant: the operator must separately approve hosted disclosure.
import {lookup} from 'node:dns/promises';
import {connect} from 'node:tls';
import {request} from 'node:https';
import {admitHybridCouncilConfig} from './mixed-council-config.js';
import {runApprovedHybridCouncil} from './mixed-council-runner.js';
const fail=code=>{const e=Error('Hosted gateway refused ('+code+').');e.code=code;throw e;};
const profiles=Object.freeze([
 Object.freeze({vendor:'openai',endpoint:'https://api.openai.com/v1/chat/completions',protocol:'openai-compatible-json',authMode:'bearer',credentialEnv:'SUTRA_HOSTED_OPENAI'}),
 Object.freeze({vendor:'anthropic',endpoint:'https://api.anthropic.com/v1/messages',protocol:'anthropic-messages-json',authMode:'anthropic-key',credentialEnv:'SUTRA_HOSTED_ANTHROPIC'}),
 Object.freeze({vendor:'gemini',endpoint:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',protocol:'openai-compatible-json',authMode:'bearer',credentialEnv:'SUTRA_HOSTED_GEMINI'})
]);
export const HOSTED_GATEWAY_PROFILES=profiles;
export async function resolveHostedAddresses(hostname){
 if(!profiles.some(p=>new URL(p.endpoint).hostname===hostname))fail('HOST');
 // The OS resolver returns all available addresses; the existing public route
 // policy rejects the entire answer set if any address is non-public.
 return (await lookup(hostname,{all:true,verbatim:true})).map(({address,family})=>({address,family}));
}
export async function prepareHostedHybridGateway({configText,readCredential,resolveAll=resolveHostedAddresses,hostedIO={dialTls:connect,requestHttps:request}}={}){
 const admitted=await admitHybridCouncilConfig(configText),connections=admitted.mixed.config.connections;
 if(!admitted.preview.hostedConnections)fail('HOSTED_REQUIRED');
 // Credential aliases are tied to exact official endpoints and protocols.
 // Local processes are intentionally refused here: a separate local operator
 // path exists, and mixing a locally controlled relay would weaken this policy.
 if(connections.some(c=>c.transportClass!=='hosted'))fail('LOCAL_NOT_ALLOWED');
 const recipients=connections.map(c=>{
  const p=profiles.find(p=>p.endpoint===c.endpoint&&p.protocol===c.protocol&&p.authMode===c.authMode&&p.credentialEnv===c.credentialEnv);
  if(!p)fail('RECIPIENT_POLICY');
  return Object.freeze({connectionId:c.id,vendor:p.vendor,endpoint:p.endpoint,models:c.models,credentialAlias:p.credentialEnv});
 });
 const preview=Object.freeze({...admitted.preview,mode:'HOSTED_GATEWAY_PLAN_ONLY',recipients:Object.freeze(recipients),qualification:'No DNS, credential read or model request during preview. Exact official endpoint and credential alias policy; bounded non-streaming compatibility protocol. No dollar cap, guarantee of model support or automatic retry.'});
 let consumed=false;
 return Object.freeze({preview,planPin:admitted.planPin,async execute({approvedPlanPin,approveDisclosure,approveHosted,signal}={}){
  if(consumed)fail('CONSUMED');
  if(approvedPlanPin!==admitted.planPin||approveDisclosure!==true||approveHosted!==true)fail('APPROVAL');
  if(typeof readCredential!=='function'||typeof resolveAll!=='function'||signal?.aborted)fail('HOST_CONFIG');
  consumed=true;
  // No caller-controlled URL, credential, endpoint override or I/O appears in
  // the executable JSON; only trusted process code can supply test adapters.
  const result=await runApprovedHybridCouncil({configText,approvedPlanPin,approveDisclosure:true,approveHosted:true,readCredential,resolveAll,hostedIO,signal});
  if(signal?.aborted)fail('CANCELLED');
  return Object.freeze({...result,mode:'EXPLICIT_HOSTED_GATEWAY',qualification:'Explicit one-use operator invocation with pinned DNS/TLS transport; model output remains conditional and quarantined. Remote processing or billing may persist after cancellation.'});
 }});
}
