// Standalone operator: no browser credentials, no inherited network authority.
import {createReadStream} from 'node:fs';
import {admitManifest,authorizeResearch} from '../../packages/sutra-research/research-session.js';
import {createSearchProviders} from '../../packages/sutra-research/providers.js';
import {createDocumentReader} from '../../packages/sutra-research/document-reader.js';
import {createCheckpointWriter,consumeCheckpointFile} from '../../packages/sutra-research/research-checkpoint.js';
import {formatMarkdownReport} from '../../packages/sutra-research/research-report.js';
import {runAutonomousResearch} from '../../packages/sutra-research/research-supervisor.js';
const fail=code=>{throw Object.assign(Error('Research operator refused'),{code});};
async function boundedText(stream,max){
 let n=0;const chunks=[];for await(const x of stream){n+=x.length;if(n>max)fail('SIZE');chunks.push(x);}
 return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks));
}
async function main(){
 const args=process.argv.slice(2),preview=args.length===1&&args[0]==='--plan';
 const execute=args.length>=5&&args[0]==='--execute-research'&&args[1]==='--approve-public-contact'&&args[2]==='--approve-estimated-cost'&&args[3]==='--approve-plan'&&/^sha256:[0-9a-f]{64}$/.test(args[4]);
 if(!preview&&!execute)fail('APPROVAL');
 const opts=new Map(),allowed=new Set(['--checkpoint-dir','--pause-after','--resume-checkpoint','--resume-pin','--format']);
 if(execute)for(let i=5;i<args.length;i+=2){if(!allowed.has(args[i])||opts.has(args[i])||!args[i+1]||args[i+1].startsWith('--'))fail('OPTIONS');opts.set(args[i],args[i+1]);}
 if(opts.has('--resume-checkpoint')!==opts.has('--resume-pin')||opts.has('--pause-after')&&!opts.has('--checkpoint-dir')||opts.has('--resume-checkpoint')&&!opts.has('--checkpoint-dir'))fail('OPTIONS');
 if(opts.has('--format')&&!['json','markdown'].includes(opts.get('--format')))fail('OPTIONS');
 const pauseAfter=opts.has('--pause-after')?Number(opts.get('--pause-after')):Infinity;
 if(pauseAfter!==Infinity&&(!Number.isSafeInteger(pauseAfter)||pauseAfter<1||pauseAfter>200))fail('OPTIONS');
 const raw=await boundedText(process.stdin,16384),p=admitManifest(raw);
 if(preview){process.stdout.write(JSON.stringify(p,null,2)+'\n');return;}
 if(args[4]!==p.planPin)fail('APPROVAL');
 const resumeText=opts.has('--resume-checkpoint')?await boundedText(createReadStream(opts.get('--resume-checkpoint')),32*1024*1024):undefined;
 const cancel=new AbortController(),abort=()=>cancel.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 const authorization=authorizeResearch(raw,{approvedPlanPin:args[4],approvePublicContact:true,approveEstimatedCost:true,signal:cancel.signal,resumeText,resumePin:opts.get('--resume-pin')});
 try{
  const providers=createSearchProviders({credentials:{brave:process.env.SUTRA_SEARCH_BRAVE,tavily:process.env.SUTRA_SEARCH_TAVILY}});
  const writer=opts.has('--checkpoint-dir')?await createCheckpointWriter(opts.get('--checkpoint-dir')):undefined;
  let checkpointDigest;
  const onCheckpoint=writer?async s=>{checkpointDigest=await writer(s);}:undefined;
  if(opts.has('--resume-checkpoint'))await consumeCheckpointFile(opts.get('--resume-checkpoint'),opts.get('--resume-pin'));
  const report=await runAutonomousResearch({authorization,providers,onCheckpoint,pauseAfterOperations:pauseAfter,readDocument:createDocumentReader({authorization}),onEvent:e=>process.stderr.write(JSON.stringify(e)+'\n')});
  if(checkpointDigest)process.stderr.write('Research checkpoint SHA-256: '+checkpointDigest+'\n');
  if(cancel.signal.aborted){process.exitCode=130;return;}
  process.stdout.write(opts.get('--format')==='markdown'?formatMarkdownReport(report):JSON.stringify({...report,...(checkpointDigest?{checkpointDigest}:{})},null,2)+'\n');
 }finally{authorization.close();process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
main().catch(e=>{process.stderr.write(JSON.stringify({status:'REFUSED',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'RESEARCH_REFUSED'})+'\n');process.exitCode=1;});
