// Trusted local operator runner. Not part of browser build or a hosted API.
import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
import {createProtocolWorkspace} from '../../packages/sutra-inference/protocol-workspace.js';
import {createLoopbackModelExchange} from '../../packages/sutra-inference/loopback-model-exchange.js';
import {validateReviewedContract} from '../../packages/sutra-knowledge/reviewed-claim-compiler.js';
import {runExpressionCouncil} from '../../packages/sutra-knowledge/expression-council.js';
import {createExpressionReviewReceipt} from '../../packages/sutra-knowledge/expression-review-receipt.js';
import {sealExpressionInvestigation} from '../../packages/sutra-knowledge/expression-investigation.js';
import {casePin} from '../../packages/sutra-knowledge/pinned-investigation.js';
import {admitCouncilDisclosure,projectCouncilBindings} from '../../packages/sutra-knowledge/council-disclosure.js';
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
 return {config:parseUniqueJson(wire,{maxChars:MAX,maxDepth:12}),planPin:await casePin(wire)};
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
 const disclosure=admitCouncilDisclosure(c.disclosure,[...agents]);
 await validateReviewedContract(c.contractText,c.contractPin);
 const contract=parseUniqueJson(c.contractText,{maxChars:MAX,maxDepth:9});
 if(!text(contract.question.text,2000)||c.disclosure.bindingIds.some(id=>!contract.bindings.some(b=>b.id===id)))fail('DISCLOSURE');
 const local=createLoopbackModelExchange({routes:c.connections.map(x=>({connectionId:x.id,protocol:x.protocol,endpoint:x.endpoint,models:x.models,authMode:x.authMode})),deadlineMs:c.transportDeadlineMs});
 let workspace;
 try{workspace=createProtocolWorkspace({connections:c.connections.map(x=>({id:x.id,label:x.label,protocol:x.protocol,endpoint:x.endpoint,transportClass:'local',models:x.models})),exchange:local.exchange,globalLimits:c.budget,defaultProfileLimits:c.budget});}
 catch(e){local.close();throw e;}
 return {local,workspace,contract,disclosure};
}
async function main(){
 const args=process.argv.slice(2),preview=args.length===0||args.length===1&&args[0]==='--plan';
 const execute=(args.length===4||args.length===5&&args[4]==='--export-version')&&args[0]==='--execute-local'&&args[1]==='--approve-local-disclosure'&&args[2]==='--approve-plan'&&/^sha256:[a-f0-9]{64}$/.test(args[3]);
 if(!execute&&!preview)fail('EXPLICIT_APPROVAL_REQUIRED');
 const {config,planPin}=await input();
 // Exact input-byte approval binds routes, credential aliases, question, source
 // contract, limits and disclosure. Reject changes before credential enrollment.
 if(execute&&args[3]!==planPin)fail('PLAN_PIN_MISMATCH');
 const {local,workspace,contract,disclosure}=await admit(config);
 const plan={version:VERSION,mode:'LOCAL_PLAN_ONLY',planPin,contractPin:config.contractPin,question:contract.question.text,disclosure:config.disclosure,disclosedBindings:disclosure.explicit?null:projectCouncilBindings(contract,disclosure),agentDisclosures:disclosure.scopes.map(scope=>({...scope,bindings:projectCouncilBindings(contract,scope)})),connections:config.connections,agents:config.agents,roundPolicy:config.roundPolicy,maxRounds:config.maxRounds,maximumAgentSlots:config.agents.length*config.maxRounds,budget:config.budget,maxOutputTokensPerCall:config.maxOutputTokens,timeoutMs:config.timeoutMs,transportDeadlineMs:config.transportDeadlineMs,qualification:'Preview contains the exact question and approved binding descriptors, and selected numeric values only when requested. Prior conditional outcomes may reveal relations. Credential environment names are not credential values. Literal loopback processes may forward data or incur cost. The optional --export-version includes the full reviewed contract in local stdout; share carefully. The plan pin binds bytes, not endpoint ownership or model identity.'};
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
  // Large host-generated artifacts are not provider responses. Keep a separate
  // bounded export walk, checking every leaf and overlapping string chunks
  // against all enrolled literal credential canaries; do not relax provider caps.
  function guardExport(value){
   let nodes=0,chars=0;
   function scan(x,depth){
    if(++nodes>30000||depth>40)fail('EXPORT_SIZE');
    if(typeof x==='string'){
     chars+=x.length;if(chars>2000000)fail('EXPORT_SIZE');
     for(let i=0;i<x.length;i+=32000)workspace.admitOperation(x.slice(i,i+32512));
     return;
    }
    if(x===null||typeof x==='boolean'||typeof x==='number')return;
    if(!x||typeof x!=='object')fail('EXPORT_SHAPE');
    if(Array.isArray(x)){for(const y of x)scan(y,depth+1);return;}
    for(const [key,y] of Object.entries(x)){scan(key,depth+1);scan(y,depth+1);}
   }
   scan(value,0);
  }
  // If a real credential was accidentally pasted into the reviewed contract,
  // catch its decoded value before exporting (even if JSON escaping hides it).
  if(args.includes('--export-version'))guardExport(contract);
  const routes=config.agents.map(x=>({id:x.id,role:x.role,handle:handles.get(x.connectionId),model:x.model,shareScope:'reviewed-question-bindings-and-conditional-feedback'}));
  const controller=new AbortController(),cancel=()=>{controller.abort();local.close();};
  process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  let result;
  try{
   result=await runExpressionCouncil({contractText:config.contractText,contractPin:config.contractPin,disclosure:config.disclosure,routes,workspace,maxRounds:config.maxRounds,maxOutputTokens:config.maxOutputTokens,roundPolicy:config.roundPolicy,timeoutMs:config.timeoutMs,signal:controller.signal});
   local.close();
   const cancelled=()=>controller.signal.aborted||result.termination==='CANCELLED_OR_TIMEOUT';
   let receipt=null,investigation=null,receiptStatus='NO_ADMITTED_PROPOSALS',investigationStatus=args.includes('--export-version')?'RECEIPT_REQUIRED':'NOT_REQUESTED';
   if(result.candidates.length&&!cancelled()){
    try{
     const r=await createExpressionReviewReceipt({contractText:config.contractText,contractPin:config.contractPin,bindingIds:config.disclosure.bindingIds,expressions:result.candidates.map(x=>x.expression)});
     receipt={receiptText:r.receiptText,receiptPin:r.receiptPin};receiptStatus='CREATED';
     if(args.includes('--export-version')){
      if(r.receipt.uniqueCompiledProposals<2)investigationStatus='DISTINCT_CANDIDATES_REQUIRED';
      else try{
       const v=await sealExpressionInvestigation({contractText:config.contractText,contractPin:config.contractPin,...receipt});
       investigation={versionText:v.version.versionText,versionPin:v.version.digest};investigationStatus='CREATED';
      }catch{investigationStatus='VERSION_REFUSED';}
     }
    }catch{receiptStatus='RECEIPT_REFUSED';}
   }
   if(cancelled()){receipt=null;investigation=null;receiptStatus='CANCELLED';investigationStatus='CANCELLED';process.exitCode=130;}
   const output={version:VERSION,mode:'EXPLICIT_LOCAL_LOOPBACK_HTTP',planPin,status:cancelled()?'INCOMPLETE_CANCELLED':result.state,result,receipt,receiptStatus,investigation,investigationStatus,budget:workspace.budgetSnapshot().global,qualification:'Only admitted local loopback requests were attempted. The process may not be the claimed model. No empirical, semantic or decision authority. Resource ceilings are not billed currency. Retain receipt, contract and version pins separately.'};
   guardExport(output);
   // Scan decoded portable receipt and version metadata as well as the raw
   // serialized artifact strings. The decoded source contract was checked above.
   if(receipt)guardExport(parseUniqueJson(receipt.receiptText,{maxChars:MAX,maxDepth:32}));
   if(investigation)guardExport(parseUniqueJson(investigation.versionText,{maxChars:MAX,maxDepth:12}));
   const encoded=JSON.stringify(output);if(Buffer.byteLength(encoded,'utf8')>4000000)fail('EXPORT_SIZE');
   process.stdout.write(encoded+'\n');
  }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);local.close();}
 }finally{local.close();}
}
main().catch(error=>{
 // Do not print untrusted provider text, input, stack, endpoint or credential.
 const known=['INPUT_SIZE','INPUT_ENCODING','CONFIG','BUDGET','TEAM','CONNECTION','AGENT','UNUSED_CONNECTION','DISCLOSURE','DISCLOSURE_FLOW','EXPLICIT_APPROVAL_REQUIRED','PLAN_PIN_MISMATCH','EXPORT_SIZE','EXPORT_SHAPE','LOCAL_CREDENTIAL_REQUIRED','ENDPOINT','ROUTE','PROFILE','REQUEST','SECRET_ECHO','PROVIDER_RESULT','AUTH'];
 process.stderr.write(JSON.stringify({status:'REFUSED',reason:known.includes(error?.code)?error.code:'LOCAL_COUNCIL_REFUSED'})+'\n');process.exitCode=1;
});
