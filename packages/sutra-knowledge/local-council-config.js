// Shared browser/CLI preflight for the exact user-operated local council config.
// No credentials, fetch, subprocess, socket or transport creation.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {admitLoopbackRoutes} from '../sutra-inference/loopback-route.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {admitCouncilDisclosure} from './council-disclosure.js';
import {casePin} from './pinned-investigation.js';
export const LOCAL_COUNCIL_VERSION='sutra-local-expression-council/v1',MAX=262144;
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/,ENV=/^SUTRA_LOCAL_[A-Z0-9_]{1,64}$/;
const keys=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const fail=code=>{const e=new Error('Local council refused ('+code+').');e.code=code;throw e;};
const text=(x,n)=>typeof x==='string'&&x.length<=n&&x.trim().length>0&&!/[\ud800-\udfff]/u.test(x);
const VERSION=LOCAL_COUNCIL_VERSION;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function admitLocalCouncilConfig(configText){
 if(typeof configText!=='string'||!configText.length||new TextEncoder().encode(configText).length>MAX)fail('INPUT_SIZE');
 const c=parseUniqueJson(configText,{maxChars:MAX,maxDepth:12});
 if(!keys(c,['version','contractText','contractPin','disclosure','connections','agents','budget','maxRounds','maxOutputTokens','roundPolicy','timeoutMs','transportDeadlineMs'])||c.version!==VERSION||!int(c.maxRounds,1,3)||!int(c.maxOutputTokens,1,1024)||!int(c.timeoutMs,100,30000)||!int(c.transportDeadlineMs,100,c.timeoutMs)||!['fixed','stop-on-stagnation'].includes(c.roundPolicy))fail('CONFIG');
 if(!keys(c.budget,['maxCalls','maxInputBytes','maxOutputTokens','maxConcurrent'])||!int(c.budget.maxCalls,1,12)||!int(c.budget.maxInputBytes,1,1048576)||!int(c.budget.maxOutputTokens,1,8192)||!int(c.budget.maxConcurrent,1,Math.min(4,c.budget.maxCalls)))fail('BUDGET');
 if(!Array.isArray(c.connections)||c.connections.length<1||c.connections.length>4||!Array.isArray(c.agents)||c.agents.length<1||c.agents.length>4||c.agents.length*c.maxRounds>8)fail('TEAM');
 const connections=new Map();
 for(const x of c.connections){
  if(!keys(x,['id','label','protocol','endpoint','models','authMode','credentialEnv'])||connections.has(x.id)||!text(x.label,64)||!['none','bearer','anthropic-key'].includes(x.authMode)||(x.authMode==='none'?x.credentialEnv!==null:typeof x.credentialEnv!=='string'||!ENV.test(x.credentialEnv)))fail('CONNECTION');
  connections.set(x.id,x);
 }
 const agents=new Set(),usedConnections=new Set();
 for(const x of c.agents){
  const connection=connections.get(x?.connectionId);
  if(!keys(x,['id','role','connectionId','model'])||typeof x.id!=='string'||!ID.test(x.id)||agents.has(x.id)||!text(x.role,200)||!connection||!Array.isArray(connection.models)||!connection.models.includes(x.model))fail('AGENT');
  agents.add(x.id);usedConnections.add(x.connectionId);
 }
 if(usedConnections.size!==connections.size)fail('UNUSED_CONNECTION');
 const disclosure=admitCouncilDisclosure(c.disclosure,[...agents]);
 await validateReviewedContract(c.contractText,c.contractPin);
 const contract=parseUniqueJson(c.contractText,{maxChars:MAX,maxDepth:9});
 if(!text(contract.question.text,2000)||c.disclosure.bindingIds.some(id=>!contract.bindings.some(b=>b.id===id)))fail('DISCLOSURE');
 const routes=c.connections.map(x=>({connectionId:x.id,protocol:x.protocol,endpoint:x.endpoint,models:x.models,authMode:x.authMode}));
 admitLoopbackRoutes(routes,c.transportDeadlineMs);
 return freeze({config:c,contract,disclosure,routes,planPin:await casePin(configText)});
}
