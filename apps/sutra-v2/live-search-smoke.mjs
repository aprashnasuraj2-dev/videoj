import {admitLiveSmokeManifest,runSearchSmoke} from '../../packages/sutra-research/live-search-smoke.js';
const fail=code=>{throw Object.assign(Error('Live smoke refused'),{code});};
async function main(){
 const args=process.argv.slice(2),preview=args.length===1&&args[0]==='--plan',execute=args.length===5&&args[0]==='--execute-live-smoke'&&args[1]==='--approve-public-contact'&&args[2]==='--approve-estimated-cost'&&args[3]==='--approve-plan'&&/^sha256:[0-9a-f]{64}$/.test(args[4]);
 if(!preview&&!execute)fail('APPROVAL');
 let n=0;const chunks=[];for await(const x of process.stdin){n+=x.length;if(n>16384)fail('SIZE');chunks.push(x);}
 const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks)),plan=admitLiveSmokeManifest(raw);
 if(preview){process.stdout.write(JSON.stringify(plan,null,2)+'\n');return;}
 const controller=new AbortController(),abort=()=>controller.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try{
  const report=await runSearchSmoke({raw,approvedPlanPin:args[4],approvePublicContact:true,approveEstimatedCost:true,credentials:{brave:process.env.SUTRA_SEARCH_BRAVE,tavily:process.env.SUTRA_SEARCH_TAVILY},signal:controller.signal});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');if(report.status!=='passed')process.exitCode=1;
 }finally{process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
main().catch(e=>{process.stderr.write(JSON.stringify({status:'REFUSED',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'SMOKE_REFUSED'})+'\n');process.exitCode=1;});
