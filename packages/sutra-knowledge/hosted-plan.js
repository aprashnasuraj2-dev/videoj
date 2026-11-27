// Browser-safe hosted configuration compiler. No credential, DNS, I/O or
// authorization. The Node gateway independently revalidates the exact result.
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {admitCouncilOperatorConfig} from './local-council-config.js';
import {projectCouncilBindings} from './council-disclosure.js';
const profiles=Object.freeze([
 Object.freeze({vendor:'openai',endpoint:'https://api.openai.com/v1/chat/completions',protocol:'openai-compatible-json',authMode:'bearer',credentialEnv:'SUTRA_HOSTED_OPENAI'}),
 Object.freeze({vendor:'anthropic',endpoint:'https://api.anthropic.com/v1/messages',protocol:'anthropic-messages-json',authMode:'anthropic-key',credentialEnv:'SUTRA_HOSTED_ANTHROPIC'}),
 Object.freeze({vendor:'gemini',endpoint:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',protocol:'openai-compatible-json',authMode:'bearer',credentialEnv:'SUTRA_HOSTED_GEMINI'})
]);
export const HOSTED_GATEWAY_PROFILES=profiles;

const fail=code=>{const e=Error('Hosted plan refused ('+code+').');e.code=code;throw e;};
const keys=(x,ks)=>x&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===ks.length&&ks.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
const dense=(a,max)=>Array.isArray(a)&&Object.getPrototypeOf(a)===Array.prototype&&a.length<=max&&Reflect.ownKeys(a).length===a.length+1&&Array.from({length:a.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(a,String(i));return d?.enumerable&&Object.hasOwn(d,'value');}).every(Boolean);
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const model=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(x);
const ints=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export async function buildHostedHybridPlan({versionText,versionPin,specialists,maxRounds=1,maxOutputTokens=256,maxConcurrent=Math.min(2,Array.isArray(specialists)?specialists.length:0),maxInputBytes=262144,timeoutMs=30000}={}){
 if(!dense(specialists,6)||specialists.length<1||!ints(maxRounds,1,3)||specialists.length*maxRounds>8||!ints(maxOutputTokens,1,1024)||!ints(maxConcurrent,1,Math.min(4,specialists.length*maxRounds))||!ints(maxInputBytes,1,1048576)||!ints(timeoutMs,100,30000))fail('CONFIG');
 // Capture data before any asynchronous replay.
 const team=specialists.map(s=>{
  if(!keys(s,['id','role','vendor','model','bindingIds','includeValues','feedbackFrom'])||!id(s.id)||typeof s.role!=='string'||!s.role.trim()||s.role.length>200||!profiles.some(p=>p.vendor===s.vendor)||!model(s.model)||!dense(s.bindingIds,16)||!s.bindingIds.length||!s.bindingIds.every(id)||typeof s.includeValues!=='boolean'||!dense(s.feedbackFrom,5)||!s.feedbackFrom.every(id))fail('SPECIALIST');
  return {id:s.id,role:s.role,vendor:s.vendor,model:s.model,bindingIds:[...s.bindingIds],includeValues:s.includeValues,feedbackFrom:[...s.feedbackFrom]};
 });
 await replayInvestigationVersion(versionText,versionPin);
 const w=parseUniqueJson(versionText,{maxChars:262144,maxDepth:12});
 const connections=[],agents=[],agentScopes=[];
 for(const p of profiles){
  const selected=team.filter(s=>s.vendor===p.vendor);if(!selected.length)continue;
  connections.push({id:p.vendor,label:p.vendor,protocol:p.protocol,endpoint:p.endpoint,models:[...new Set(selected.map(s=>s.model))],authMode:p.authMode,credentialEnv:p.credentialEnv,transportClass:'hosted'});
 }
 for(const s of team){agents.push({id:s.id,role:s.role,connectionId:s.vendor,model:s.model});agentScopes.push({agentId:s.id,bindingIds:s.bindingIds,includeValues:s.includeValues,feedbackFrom:s.feedbackFrom});}
 const slots=team.length*maxRounds,disclosure={bindingIds:[...new Set(team.flatMap(s=>s.bindingIds))],includeValues:team.some(s=>s.includeValues),agentScopes};
 const config={version:'sutra-mixed-expression-council/v1',contractText:w.contractText,contractPin:w.contractPin,disclosure,connections,agents,budget:{maxCalls:slots,maxInputBytes,maxOutputTokens:slots*maxOutputTokens,maxConcurrent},maxRounds,maxOutputTokens,roundPolicy:'fixed',timeoutMs,transportDeadlineMs:timeoutMs};
 const councilConfigText=JSON.stringify(config);
 const admitted=await admitCouncilOperatorConfig(councilConfigText,{version:config.version,connectionKeys:['id','label','protocol','endpoint','models','authMode','credentialEnv','transportClass'],credentialPattern:/^SUTRA_HOSTED_[A-Z0-9_]{1,64}$/,maxParticipants:6,admitRoutes(_routes,_deadline,cs){
  if(cs.some(c=>c.transportClass!=='hosted'||!profiles.some(p=>p.endpoint===c.endpoint&&p.protocol===c.protocol&&p.authMode===c.authMode&&p.credentialEnv===c.credentialEnv)))fail('RECIPIENT');
 }});
 const text=JSON.stringify({version:'sutra-mixed-hybrid-operator/v1',versionText,versionPin,councilConfigText}),planPin=await casePin(text);
 return Object.freeze({text,planPin,preview:Object.freeze({versionDigest:versionPin,planPin,connections:admitted.config.connections,agents:admitted.config.agents,agentDisclosures:Object.freeze(admitted.disclosure.scopes.map(scope=>Object.freeze({...scope,bindings:projectCouncilBindings(admitted.contract,scope)}))),budget:admitted.config.budget,maxRounds,maxOutputTokens,qualification:'Local export only. Exact question and scoped binding descriptors/values may be sent after separate host approval. No endpoint contact or credential access during preparation.'})});
}
