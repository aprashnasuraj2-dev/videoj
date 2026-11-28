// Explicit local operator only. No browser transport or hosted relay.
import {admitHybridCouncilConfig} from '../../packages/sutra-knowledge/mixed-council-config.js';
import {runApprovedHybridCouncil} from '../../packages/sutra-knowledge/mixed-council-runner.js';
const MAX=262144;
const fail=code=>{const e=Error('Local hybrid refused.');e.code=code;throw e;};
async function main(){
 const args=process.argv.slice(2),preview=args.length===0||args.length===1&&args[0]==='--plan';
 const execute=args.length===4&&args[0]==='--execute-local'&&args[1]==='--approve-local-disclosure'&&args[2]==='--approve-plan'&&/^sha256:[0-9a-f]{64}$/.test(args[3]);
 if(!preview&&!execute)fail('EXPLICIT_APPROVAL_REQUIRED');
 const chunks=[];let size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>MAX)fail('INPUT_SIZE');chunks.push(chunk);}
 if(!size)fail('INPUT_SIZE');
 const configText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,size)),p=await admitHybridCouncilConfig(configText);
 if(p.preview.hostedConnections!==0)fail('HOSTED_NOT_SUPPORTED');
 if(execute&&args[3]!==p.planPin)fail('PLAN_PIN_MISMATCH');
 if(preview){process.stdout.write(JSON.stringify(p.preview)+'\n');return;}
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{
  const output=await runApprovedHybridCouncil({configText,approvedPlanPin:p.planPin,approveDisclosure:true,approveHosted:false,readCredential:alias=>process.env[alias],signal:controller.signal});
  if(controller.signal.aborted||output.status==='INCOMPLETE_CANCELLED'){process.exitCode=130;return;}
  const text=JSON.stringify(output);if(Buffer.byteLength(text,'utf8')>4000000)fail('OUTPUT_SIZE');
  process.stdout.write(text+'\n');
 }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
main().catch(e=>{const codes=['INPUT_SIZE','OUTPUT_SIZE','EXPLICIT_APPROVAL_REQUIRED','PLAN_PIN_MISMATCH','HOSTED_NOT_SUPPORTED','HYBRID_CONFIG','HYBRID_CONTRACT','CREDENTIAL_REQUIRED','CANCELLED','TIMEOUT'];process.stderr.write(JSON.stringify({status:'REFUSED',reason:codes.includes(e?.code)?e.code:'LOCAL_HYBRID_REFUSED'})+'\n');process.exitCode=1;});
