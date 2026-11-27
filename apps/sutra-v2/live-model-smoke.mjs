import {previewModelSmoke,runModelSmoke} from '../../packages/sutra-research/live-model-smoke.js';
import {MODEL_PROFILES} from '../../packages/sutra-research/model-broker.js';
async function main(){
 const args=process.argv.slice(2),structured=process.env.SUTRA_SMOKE_STRUCTURED==='true',selection=process.env.SUTRA_SMOKE_MODELS_JSON?JSON.parse(process.env.SUTRA_SMOKE_MODELS_JSON):undefined;
 if(args.length===1&&args[0]==='--plan'){console.log(JSON.stringify(previewModelSmoke(selection,{structured}),null,2));return;}
 if(args.length!==5||args[0]!=='--execute-live-model-smoke'||args[1]!=='--approve-provider-contact'||args[2]!=='--approve-estimated-cost'||args[3]!=='--approve-plan')throw Object.assign(Error('Refused'),{code:'APPROVAL'});
 const c=new AbortController(),abort=()=>c.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try{
  const credentials=Object.fromEntries(Object.entries(MODEL_PROFILES).map(([v,p])=>[v,process.env[p.env]]));
  const report=await runModelSmoke({approvedPlanPin:args[4],approveProviderContact:true,approveEstimatedCost:true,credentials,selection,structured,signal:c.signal});
  console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
 }finally{process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
main().catch(e=>{console.error(JSON.stringify({status:'REFUSED',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'MODEL_SMOKE_REFUSED'}));process.exitCode=1;});
