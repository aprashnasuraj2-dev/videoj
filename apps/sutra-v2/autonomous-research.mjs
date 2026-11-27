// Standalone operator: no browser credentials, no inherited network authority.
import {admitManifest,authorizeResearch} from '../../packages/sutra-research/research-session.js';
import {createSearchProviders} from '../../packages/sutra-research/providers.js';
import {createDocumentReader} from '../../packages/sutra-research/document-reader.js';
import {runAutonomousResearch} from '../../packages/sutra-research/research-supervisor.js';
const fail=code=>{throw Object.assign(Error('Research operator refused'),{code});};
async function main(){
 const args=process.argv.slice(2),preview=args.length===1&&args[0]==='--plan',execute=args.length===5&&args[0]==='--execute-research'&&args[1]==='--approve-public-contact'&&args[2]==='--approve-estimated-cost'&&args[3]==='--approve-plan'&&/^sha256:[0-9a-f]{64}$/.test(args[4]);
 if(!preview&&!execute)fail('APPROVAL');
 let n=0;const chunks=[];for await(const x of process.stdin){n+=x.length;if(n>16384)fail('SIZE');chunks.push(x);}
 const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks)),p=admitManifest(raw);
 if(preview){process.stdout.write(JSON.stringify(p,null,2)+'\n');return;}
 const cancel=new AbortController(),abort=()=>cancel.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 const authorization=authorizeResearch(raw,{approvedPlanPin:args[4],approvePublicContact:true,approveEstimatedCost:true,signal:cancel.signal});
 try{
  const providers=createSearchProviders({credentials:{brave:process.env.SUTRA_SEARCH_BRAVE,tavily:process.env.SUTRA_SEARCH_TAVILY}});
  const report=await runAutonomousResearch({authorization,providers,readDocument:createDocumentReader({authorization}),onEvent:e=>process.stderr.write(JSON.stringify(e)+'\n')});
  if(cancel.signal.aborted){process.exitCode=130;return;}
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
 }finally{authorization.close();process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
main().catch(e=>{process.stderr.write(JSON.stringify({status:'REFUSED',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'RESEARCH_REFUSED'})+'\n');process.exitCode=1;});
