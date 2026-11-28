import {admitLocalSemanticConfig} from '../../packages/sutra-knowledge/local-semantic-config.js';
import {evaluateHybridSemantic} from '../../packages/sutra-knowledge/semantic-hybrid.js';
import {casePin} from '../../packages/sutra-knowledge/pinned-investigation.js';
import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
import {createProtocolWorkspace} from '../../packages/sutra-inference/protocol-workspace.js';
import {createLoopbackModelExchange} from '../../packages/sutra-inference/loopback-model-exchange.js';
const fail=c=>{throw Object.assign(Error('Local semantic refused: '+c),{code:c});};
async function input(){const chunks=[];let size=0;for await(const b of process.stdin){size+=b.length;if(size>262144)fail('CONFIG_SIZE');chunks.push(b);}return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,size));}
async function main(){
 const args=process.argv.slice(2),preview=!args.length||args.length===1&&args[0]==='--plan',execute=args.length===4&&args[0]==='--execute-local'&&args[1]==='--approve-local-disclosure'&&args[2]==='--approve-plan'&&/^sha256:[a-f0-9]{64}$/.test(args[3]);
 if(!preview&&!execute)fail('APPROVAL_REQUIRED');
 const p=await admitLocalSemanticConfig(await input());
 if(preview){console.log(JSON.stringify({mode:'PLAN_ONLY',plan:p.plan,planPin:p.planPin}));return;}
 if(args[3]!==p.planPin)fail('PLAN_PIN_MISMATCH');
 const x=p.c.connection,credential=x.authMode==='none'?'SUTRA_LOCAL_NO_KEY_'+Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join(''):process.env[x.credentialEnv];
 if(typeof credential!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credential))fail('CREDENTIAL_REQUIRED');
 const transport=createLoopbackModelExchange({routes:p.routes,deadlineMs:p.c.timeoutMs}),controller=new AbortController(),cancel=()=>{controller.abort();transport.close();};
 process.once('SIGINT',cancel);process.once('SIGTERM',cancel);const timer=setTimeout(cancel,p.c.timeoutMs);
 try{
  const workspace=createProtocolWorkspace({connections:[{id:x.id,label:x.label,protocol:x.protocol,endpoint:x.endpoint,transportClass:'local',models:[x.model]}],exchange:transport.exchange,globalLimits:p.plan.limits,defaultProfileLimits:p.plan.limits});
  const handle=workspace.addProfile({providerId:x.id,label:x.label,credential}).handle;
  workspace.admitOperation(x);workspace.admitOperation(p.plan.operation);
  const prepared=workspace.prepareRequest({handle,model:x.model,inputBytes:1,maxOutputTokens:p.c.maxOutputTokens,operation:p.plan.operation});
  const result=await prepared.execute({signal:controller.signal});
  if(controller.signal.aborted)fail('CANCELLED');
  const responseText=result.value.text;workspace.admitOperation(parseUniqueJson(responseText,{maxChars:65536,maxDepth:12}));
  const evaluated=await evaluateHybridSemantic(p.input,{sourceIds:p.c.sourceIds,approvedPacketPin:p.prepared.packetPin,responseText});
  if(controller.signal.aborted)fail('CANCELLED');
  workspace.admitOperation(evaluated.reportText);
  process.stdout.write(responseText);
  process.stderr.write(JSON.stringify({status:'UNTRUSTED_MEANINGS_REVIEW_REQUIRED',packetPin:p.prepared.packetPin,responsePin:await casePin(responseText),reportPin:evaluated.reportPin,disposition:evaluated.disposition,authority:'NONE'})+'\n');
 }finally{clearTimeout(timer);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);transport.close();}
}
main().catch(e=>{const known=['CONFIG_SIZE','CONFIG','CONNECTION','ENDPOINT','ROUTE','APPROVAL_REQUIRED','PLAN_PIN_MISMATCH','CREDENTIAL_REQUIRED','CANCELLED','SECRET_ECHO'];process.stderr.write(JSON.stringify({status:'REFUSED',reason:known.includes(e?.code)?e.code:typeof e?.message==='string'&&/^(?:HYBRID_SEMANTIC|SEMANTIC_ENGINE|COMPILER|CASE)_[A-Z0-9_]{1,64}$/.test(e.message)?e.message:'LOCAL_SEMANTIC_REFUSED'})+'\n');process.exitCode=1;});
