// Trusted local operator runner. Not part of browser build or a hosted API.
import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
import {createProtocolWorkspace} from '../../packages/sutra-inference/protocol-workspace.js';
import {createLoopbackModelExchange} from '../../packages/sutra-inference/loopback-model-exchange.js';
import {validateReviewedContract} from '../../packages/sutra-knowledge/reviewed-claim-compiler.js';
import {runExpressionCouncil} from '../../packages/sutra-knowledge/expression-council.js';
import {createExpressionReviewReceipt} from '../../packages/sutra-knowledge/expression-review-receipt.js';
const VERSION='sutra-local-expression-council/v1',MAX=262144;
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/,ENV=/^SUTRA_LOCAL_[A-Z0-9_]{1,64}$/;
const keys=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const fail=code=>{const e=new Error('Local council refused ('+code+').');e.code=code;throw e;};
const text=(x,n)=>typeof x==='string'&&x.length<=n&&x.trim().length>0&&!/[\ud800-\udfff]/u.test(x);
async function input(){
 const chunks=[];let bytes=0;
 for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>MAX)fail('INPUT_SIZE');chunks.push(chunk);}
 if(!bytes)fail('INPUT_SIZE');
 let wire;try{wire=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,bytes));}catch{fail('INPUT_ENCODING');}
 return parseUniqueJson(wire,{maxChars:MAX,maxDepth:12});
}
async function admit(c){
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
 if(!keys(c.disclosure,['bindingIds','includeValues'])||!Array.isArray(c.disclosure.bindingIds)||c.disclosure.bindingIds.length<1||c.disclosure.bindingIds.length>16||new Set(c.disclosure.bindingIds).size!==c.disclosure.bindingIds.length||c.disclosure.bindingIds.some(x=>typeof x!=='string'||!ID.test(x))||typeof c.disclosure.includeValues!=='boolean')fail('DISCLOSURE');
 await validateReviewedContract(c.contractText,c.contractPin);
 const contract=parseUniqueJson(c.contractText,{maxChars:MAX,maxDepth:9});
 if(!text(contract.question.text,2000)||c.disclosure.bindingIds.some(id=>!contract.bindings.some(b=>b.id===id)))fail('DISCLOSURE');
 const local=createLoopbackModelExchange({routes:c.connections.map(x=>({connectionId:x.id,protocol:x.protocol,endpoint:x.endpoint,models:x.models,authMode:x.authMode})),deadlineMs:c.transportDeadlineMs});
 let workspace;
 try{workspace=createProtocolWorkspace({connections:c.connections.map(x=>({id:x.id,label:x.label,protocol:x.protocol,endpoint:x.endpoint,transportClass:'local',models:x.models})),exchange:local.exchange,globalLimits:c.budget,defaultProfileLimits:c.budget});}
 catch(e){local.close();throw e;}
 return {local,workspace,contract};
}
async function main(){
 const args=process.argv.slice(2),execute=args.length===2&&args.includes('--execute-local')&&args.includes('--approve-local-disclosure');
 if(!execute&&!(args.length===0||args.length===1&&args[0]==='--plan'))fail('EXPLICIT_APPROVAL_REQUIRED');
 const config=await input(),{local,workspace,contract}=await admit(config);
 const plan={version:VERSION,mode:'LOCAL_PLAN_ONLY',contractPin:config.contractPin,question:contract.question.text,disclosure:config.disclosure,connections:config.connections.map(({credentialEnv,...x})=>x),agents:config.agents,roundPolicy:config.roundPolicy,maximumAgentSlots:config.agents.length*config.maxRounds,budget:config.budget,maxOutputTokensPerCall:config.maxOutputTokens,qualification:'Explicit operator approval is required before any contact. Literal loopback only. Local model processes may themselves have external effects or costs; this runner does not authenticate them or assert offline operation.'};
 try{
  if(!execute){process.stdout.write(JSON.stringify(plan)+'\n');return;}
  // Resolve every configured credential and enroll before dispatch. A missing
  // credential cannot cause a partially executed investigation.
  const handles=new Map();
  for(const c of config.connections){
   const credential=c.authMode==='none'?'SUTRA_LOCAL_NO_KEY_'+Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join(''):process.env[c.credentialEnv];
   if(typeof credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credential))fail('LOCAL_CREDENTIAL_REQUIRED');
   handles.set(c.id,workspace.addProfile({providerId:c.id,label:c.label,credential}).handle);
  }
  const routes=config.agents.map(x=>({id:x.id,role:x.role,handle:handles.get(x.connectionId),model:x.model,shareScope:'reviewed-question-bindings-and-conditional-feedback'}));
  const controller=new AbortController(),cancel=()=>{controller.abort();local.close();};
  process.once('SIGINT',cancel);
  let result;
  try{result=await runExpressionCouncil({contractText:config.contractText,contractPin:config.contractPin,disclosure:config.disclosure,routes,workspace,maxRounds:config.maxRounds,maxOutputTokens:config.maxOutputTokens,roundPolicy:config.roundPolicy,timeoutMs:config.timeoutMs,signal:controller.signal});}
  finally{process.removeListener('SIGINT',cancel);local.close();}
  let receipt=null;
  if(result.candidates.length&&result.termination!=='CANCELLED_OR_TIMEOUT')try{const r=await createExpressionReviewReceipt({contractText:config.contractText,contractPin:config.contractPin,bindingIds:config.disclosure.bindingIds,expressions:result.candidates.map(x=>x.expression)});receipt={receiptText:r.receiptText,receiptPin:r.receiptPin};}catch{/* Preserve completed local result; never retry models for receipt failure. */}
  const output={version:VERSION,mode:'EXPLICIT_LOCAL_LOOPBACK_HTTP',result,receipt,budget:workspace.budgetSnapshot().global,qualification:'Local TCP transport completed only admitted calls. The contacted process may not be the claimed model. No empirical, semantic or decision authority. Resource ceilings are not billed currency. Retain receipt and contract pins separately.'};
  // The trusted host must not echo a credential in a public result, even if
  // the result includes source or model metadata from another pathway.
  const safe=workspace.admitOperation(output);
  process.stdout.write(JSON.stringify(safe)+'\n');
 }finally{local.close();}
}
main().catch(error=>{
 // Do not print untrusted provider text, input, stack, endpoint or credential.
 const known=['INPUT_SIZE','INPUT_ENCODING','CONFIG','BUDGET','TEAM','CONNECTION','AGENT','UNUSED_CONNECTION','DISCLOSURE','EXPLICIT_APPROVAL_REQUIRED','LOCAL_CREDENTIAL_REQUIRED','ENDPOINT','ROUTE','PROFILE','REQUEST','SECRET_ECHO','PROVIDER_RESULT','AUTH'];
 process.stderr.write(JSON.stringify({status:'REFUSED',reason:known.includes(error?.code)?error.code:'LOCAL_COUNCIL_REFUSED'})+'\n');process.exitCode=1;
});
