// No HTTP listener, no credential input through stdin or arguments.
import {prepareHostedHybridGateway} from '../../packages/sutra-knowledge/hosted-hybrid-gateway.js';
const MAX=262144;
const fail=code=>{const e=Error('Hosted hybrid refused.');e.code=code;throw e;};
async function main(){
 const a=process.argv.slice(2),preview=a.length===0||a.length===1&&a[0]==='--plan';
 const execute=a.length===5&&a[0]==='--execute-hosted'&&a[1]==='--approve-disclosure'&&a[2]==='--approve-hosted-disclosure'&&a[3]==='--approve-plan'&&/^sha256:[0-9a-f]{64}$/.test(a[4]);
 if(!preview&&!execute)fail('EXPLICIT_APPROVAL_REQUIRED');
 const chunks=[];let size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>MAX)fail('INPUT_SIZE');chunks.push(chunk);}
 if(!size)fail('INPUT_SIZE');
 const configText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,size));
 const gateway=await prepareHostedHybridGateway({configText,readCredential:alias=>process.env[alias]});
 if(preview){process.stdout.write(JSON.stringify(gateway.preview)+'\n');return;}
 if(a[4]!==gateway.planPin)fail('PLAN_PIN_MISMATCH');
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{
  const result=await gateway.execute({approvedPlanPin:a[4],approveDisclosure:true,approveHosted:true,signal:controller.signal});
  if(controller.signal.aborted||result.status==='INCOMPLETE_CANCELLED'){process.exitCode=130;return;}
  const text=JSON.stringify(result);if(Buffer.byteLength(text,'utf8')>4000000)fail('OUTPUT_SIZE');
  process.stdout.write(text+'\n');
 }catch(e){if(controller.signal.aborted){process.exitCode=130;return;}throw e;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
main().catch(e=>{const codes=['INPUT_SIZE','OUTPUT_SIZE','EXPLICIT_APPROVAL_REQUIRED','PLAN_PIN_MISMATCH','HOSTED_REQUIRED','LOCAL_NOT_ALLOWED','RECIPIENT_POLICY','CREDENTIAL_REQUIRED','CANCELLED','TIMEOUT'];process.stderr.write(JSON.stringify({status:'REFUSED',reason:codes.includes(e?.code)?e.code:'HOSTED_HYBRID_REFUSED'})+'\n');process.exitCode=1;});
