// Explicit local operator extraction runner. No browser-held keys, no hosted API.
import {admitLocalBindingConfig,LOCAL_BINDING_TRANSFER} from '../../packages/sutra-knowledge/local-binding-config.js';
import {createProtocolWorkspace} from '../../packages/sutra-inference/protocol-workspace.js';
import {createLoopbackModelExchange} from '../../packages/sutra-inference/loopback-model-exchange.js';
import {previewBindingSuggestionRequest,runApprovedBindingSuggestionRequest} from '../../packages/sutra-knowledge/binding-suggestion-request.js';
const fail=code=>{const e=new Error('Local bindings refused ('+code+').');e.code=code;throw e;};
async function input(){
 const chunks=[];let bytes=0;
 for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>262144)fail('INPUT_SIZE');chunks.push(chunk);}
 if(!bytes)fail('INPUT_SIZE');
 try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,bytes));}catch{fail('INPUT_ENCODING');}
}
async function main(){
 const args=process.argv.slice(2),preview=args.length===0||args.length===1&&args[0]==='--plan';
 const execute=args.length===4&&args[0]==='--execute-local'&&args[1]==='--approve-local-disclosure'&&args[2]==='--approve-plan'&&/^sha256:[a-f0-9]{64}$/.test(args[3]);
 if(!preview&&!execute)fail('EXPLICIT_APPROVAL_REQUIRED');
 const configText=await input(),p=await admitLocalBindingConfig(configText);
 if(!execute){process.stdout.write(JSON.stringify(p.preview)+'\n');return;}
 if(args[3]!==p.planPin)fail('PLAN_PIN_MISMATCH');
 const c=p.config,x=c.connection,credential=x.authMode==='none'?'SUTRA_LOCAL_NO_KEY_'+Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join(''):process.env[x.credentialEnv];
 if(typeof credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credential))fail('LOCAL_CREDENTIAL_REQUIRED');
 const transport=createLoopbackModelExchange({routes:p.routes,deadlineMs:c.transportDeadlineMs});
 const controller=new AbortController(),cancel=()=>{controller.abort();transport.close();};
 process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{
  const workspace=createProtocolWorkspace({connections:[{id:x.id,label:x.label,protocol:x.protocol,endpoint:x.endpoint,transportClass:'local',models:x.models}],exchange:transport.exchange,globalLimits:p.budget,defaultProfileLimits:p.budget});
  const handle=workspace.addProfile({providerId:x.id,label:x.label,credential}).handle;
  const options={draftText:c.draftText,draftPin:c.draftPin,sourceIds:c.sourceIds,route:{id:'extractor',role:'Suggest exact source quantities',handle,model:x.models[0],shareScope:'selected-source-text-for-binding-suggestions'},workspace,maxOutputTokens:c.maxOutputTokens,timeoutMs:c.timeoutMs,signal:controller.signal};
  const plan=await previewBindingSuggestionRequest(options);
  workspace.admitOperation(plan.plan.operation);
  const result=await runApprovedBindingSuggestionRequest({...options,approvedPlanPin:plan.planPin,approveDisclosure:true});
  if(controller.signal.aborted)fail('CANCELLED_OR_TIMEOUT');
  const transfer={version:LOCAL_BINDING_TRANSFER,planPin:p.planPin,draftPin:c.draftPin,proposalText:result.proposalText,proposalPin:result.proposalPin};
  workspace.admitOperation(transfer);
  const wire=JSON.stringify(transfer);if(Buffer.byteLength(wire,'utf8')>65536)fail('TRANSFER_SIZE');
  process.stdout.write(wire);
  // Retain this digest separately from redirected stdout; it is not a signature.
  process.stderr.write(JSON.stringify({status:'REVIEW_REQUIRED',proposalPin:result.proposalPin,reviewable:result.preview.rows.filter(r=>r.state==='REVIEW_REQUIRED').length,refused:result.preview.rows.filter(r=>r.state==='REFUSED').length})+'\n');
 }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);transport.close();}
}
main().catch(e=>{
 const known=['INPUT_SIZE','INPUT_ENCODING','CONFIG','CONNECTION','DRAFT_PIN','DISCLOSURE','DISCLOSURE_SIZE','ENDPOINT','ROUTE','EXPLICIT_APPROVAL_REQUIRED','PLAN_PIN_MISMATCH','LOCAL_CREDENTIAL_REQUIRED','CANCELLED_OR_TIMEOUT','PROVIDER_REFUSED','PROPOSAL_REFUSED','TRANSFER_SIZE','SECRET_ECHO'];
 process.stderr.write(JSON.stringify({status:'REFUSED',reason:known.includes(e?.code)?e.code:'LOCAL_BINDINGS_REFUSED'})+'\n');process.exitCode=1;
});
