// Node-only candidate: mixed local/hosted model planning, no contact or credentials.
import {admitCouncilOperatorConfig} from './local-council-config.js';
import {admitLoopbackRoutes} from '../sutra-inference/loopback-route.js';
import {admitPublicRoutes} from '../sutra-inference/public-route-policy.js';
import {projectCouncilBindings} from './council-disclosure.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {HYBRID_REVIEW_TASKS} from './investigation-role-review.js';
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

export const HYBRID_OPERATOR_VERSION='sutra-mixed-hybrid-operator/v1';
// Two exact inputs must describe the same reviewed contract. The outer pin
// binds the evaluated version as well as every route, scope and resource limit.
export async function admitHybridCouncilConfig(text){
 const planPin=await casePin(text),x=parseUniqueJson(text,{maxChars:262144,maxDepth:12});
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==4||!['version','versionText','versionPin','councilConfigText'].every(k=>Object.hasOwn(x,k))||x.version!==HYBRID_OPERATOR_VERSION||typeof x.versionText!=='string'||typeof x.councilConfigText!=='string')fail('HYBRID_CONFIG');
 await replayInvestigationVersion(x.versionText,x.versionPin);
 const wire=parseUniqueJson(x.versionText,{maxChars:262144,maxDepth:12}),mixed=await admitMixedCouncilConfig(x.councilConfigText);
 if(wire.contractPin!==mixed.config.contractPin||wire.contractText!==mixed.config.contractText)fail('HYBRID_CONTRACT');
 const preview=Object.freeze({...mixed.preview,version:HYBRID_OPERATOR_VERSION,mode:'HYBRID_PLAN_ONLY',planPin,councilConfigPin:mixed.planPin,versionDigest:x.versionPin,tasks:HYBRID_REVIEW_TASKS,qualification:'Exact version and council configuration. No I/O during preview. Approved model proposals remain quarantined; local arithmetic is conditional. Hosted I/O must be separately authorized and injected.'});
 return Object.freeze({planPin,versionText:x.versionText,versionPin:x.versionPin,mixed,preview});
}
