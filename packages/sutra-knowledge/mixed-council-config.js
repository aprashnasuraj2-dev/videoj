// Node-only candidate: mixed local/hosted model planning, no contact or credentials.
import {admitCouncilOperatorConfig} from './local-council-config.js';
import {admitLoopbackRoutes} from '../sutra-inference/loopback-route.js';
import {admitPublicRoutes} from '../sutra-inference/public-route-policy.js';
import {projectCouncilBindings} from './council-disclosure.js';
export const MIXED_COUNCIL_VERSION='sutra-mixed-expression-council/v1';
const fail=code=>{const e=new Error('Mixed council refused ('+code+').');e.code=code;throw e;};
export async function admitMixedCouncilConfig(text){
 const admitted=await admitCouncilOperatorConfig(text,{
  version:MIXED_COUNCIL_VERSION,
  connectionKeys:['id','label','protocol','endpoint','models','authMode','credentialEnv','transportClass'],
  credentialPattern:/^SUTRA_(?:LOCAL|HOSTED)_[A-Z0-9_]{1,64}$/,
  admitRoutes(routes,deadline,connections){
   const local=[],hosted=[];
   for(let i=0;i<routes.length;i++){
    const r=routes[i],c=connections[i];
    if(c.transportClass==='local'){
     if(c.credentialEnv!==null&&!c.credentialEnv.startsWith('SUTRA_LOCAL_'))fail('CREDENTIAL_SCOPE');
     local.push(r);
    }else if(c.transportClass==='hosted'){
     if(c.credentialEnv!==null&&!c.credentialEnv.startsWith('SUTRA_HOSTED_'))fail('CREDENTIAL_SCOPE');
     if(!['openai-compatible-json','anthropic-messages-json'].includes(r.protocol)||r.authMode==='anthropic-key'&&r.protocol!=='anthropic-messages-json')fail('HOSTED_PROTOCOL');
     const {authMode,...publicRoute}=r;hosted.push(publicRoute);
    }else fail('TRANSPORT_CLASS');
   }
   if(local.length)admitLoopbackRoutes(local,deadline);
   if(hosted.length)admitPublicRoutes(hosted);
  }
 });
 const {config,contract,disclosure,planPin}=admitted;
 const preview=Object.freeze({version:MIXED_COUNCIL_VERSION,mode:'MIXED_PLAN_ONLY',planPin,contractPin:config.contractPin,question:contract.question.text,connections:config.connections,agents:config.agents,agentDisclosures:Object.freeze(disclosure.scopes.map(scope=>Object.freeze({...scope,bindings:projectCouncilBindings(contract,scope)}))),budget:config.budget,maxRounds:config.maxRounds,maxOutputTokensPerCall:config.maxOutputTokens,roundPolicy:config.roundPolicy,timeoutMs:config.timeoutMs,transportDeadlineMs:config.transportDeadlineMs,hostedConnections:config.connections.filter(c=>c.transportClass==='hosted').length,qualification:'No DNS, socket, credential access or provider contact during plan admission. Hosted routes require separately authorized transport and disclosure. Local processes may forward data. Resource caps are not monetary limits. Model identity and endpoint ownership are not established.'});
 return Object.freeze({...admitted,preview});
}
