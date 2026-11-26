// Trusted local operator runner. Not part of browser build or a hosted API.
import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
import {createProtocolWorkspace} from '../../packages/sutra-inference/protocol-workspace.js';
import {createLoopbackModelExchange} from '../../packages/sutra-inference/loopback-model-exchange.js';
import {runExpressionCouncil} from '../../packages/sutra-knowledge/expression-council.js';
import {createExpressionReviewReceipt} from '../../packages/sutra-knowledge/expression-review-receipt.js';
import {sealExpressionInvestigation} from '../../packages/sutra-knowledge/expression-investigation.js';
import {casePin} from '../../packages/sutra-knowledge/pinned-investigation.js';
import {projectCouncilBindings} from '../../packages/sutra-knowledge/council-disclosure.js';
import {admitLocalCouncilConfig,LOCAL_COUNCIL_VERSION} from '../../packages/sutra-knowledge/local-council-config.js';
const VERSION=LOCAL_COUNCIL_VERSION,MAX=262144;
const fail=code=>{const e=new Error('Local council refused ('+code+').');e.code=code;throw e;};
async function input(){
 const chunks=[];let bytes=0;
 for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>MAX)fail('INPUT_SIZE');chunks.push(chunk);}
 if(!bytes)fail('INPUT_SIZE');
 let wire;try{wire=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,bytes));}catch{fail('INPUT_ENCODING');}
 return {wire,planPin:await casePin(wire)};
}
async function main(){
 const args=process.argv.slice(2),preview=args.length===0||args.length===1&&args[0]==='--plan';
 const execute=(args.length===4||args.length===5&&args[4]==='--export-version')&&args[0]==='--execute-local'&&args[1]==='--approve-local-disclosure'&&args[2]==='--approve-plan'&&/^sha256:[a-f0-9]{64}$/.test(args[3]);
 if(!execute&&!preview)fail('EXPLICIT_APPROVAL_REQUIRED');
 const {wire,planPin}=await input();
 // Exact input-byte approval binds routes, credential aliases, question, source
 // contract, limits and disclosure. Reject changes before credential enrollment.
 if(execute&&args[3]!==planPin)fail('PLAN_PIN_MISMATCH');
 const {config,contract,disclosure,routes:approvedRoutes}=await admitLocalCouncilConfig(wire);
 const plan={version:VERSION,mode:'LOCAL_PLAN_ONLY',planPin,contractPin:config.contractPin,question:contract.question.text,disclosure:config.disclosure,disclosedBindings:disclosure.explicit?null:projectCouncilBindings(contract,disclosure),agentDisclosures:disclosure.scopes.map(scope=>({...scope,bindings:projectCouncilBindings(contract,scope)})),connections:config.connections,agents:config.agents,roundPolicy:config.roundPolicy,maxRounds:config.maxRounds,maximumAgentSlots:config.agents.length*config.maxRounds,budget:config.budget,maxOutputTokensPerCall:config.maxOutputTokens,timeoutMs:config.timeoutMs,transportDeadlineMs:config.transportDeadlineMs,qualification:'Preview contains the exact question and approved binding descriptors, and selected numeric values only when requested. Prior conditional outcomes may reveal relations. Credential environment names are not credential values. Literal loopback processes may forward data or incur cost. The optional --export-version includes the full reviewed contract in local stdout; share carefully. The plan pin binds bytes, not endpoint ownership or model identity.'};
 if(!execute){process.stdout.write(JSON.stringify(plan)+'\n');return;}
 const local=createLoopbackModelExchange({routes:approvedRoutes,deadlineMs:config.transportDeadlineMs});
 try{
  const workspace=createProtocolWorkspace({connections:config.connections.map(x=>({id:x.id,label:x.label,protocol:x.protocol,endpoint:x.endpoint,transportClass:'local',models:x.models})),exchange:local.exchange,globalLimits:config.budget,defaultProfileLimits:config.budget});
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
