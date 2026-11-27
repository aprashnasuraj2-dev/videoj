// Exact source plan only; no model decides destinations or reads credentials.
import {prepareResearchInvestigation} from '../../packages/sutra-knowledge/research-investigation.js';
import {createDisclosureConsentInspector} from '../../packages/sutra-consent/index.js';
const fail=code=>{const e=Error('Research operator refused');e.code=code;throw e;};
async function main(){
 const a=process.argv.slice(2),preview=a.length===0||a.length===1&&a[0]==='--plan',execute=a.length===4&&a[0]==='--execute-research'&&a[1]==='--approve-public-contact'&&a[2]==='--approve-plan'&&/^sha256:[0-9a-f]{64}$/.test(a[3]);
 if(!preview&&!execute)fail('APPROVAL');
 const chunks=[];let n=0;for await(const chunk of process.stdin){n+=chunk.length;if(n>262144)fail('SIZE');chunks.push(chunk);}if(!n)fail('SIZE');
 const planText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,n)),p=await prepareResearchInvestigation({planText});
 if(preview){process.stdout.write(JSON.stringify(p.preview)+'\n');return;}if(a[3]!==p.planPin)fail('PLAN_PIN');
 const c=new AbortController(),cancel=()=>c.abort(),events=[];process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{
  const allowed=new Set(p.preview.sources.map(s=>s.url)),consentInspector=createDisclosureConsentInspector({decide:i=>!c.signal.aborted&&i.planPin===p.planPin&&allowed.has(i.destination)?'allow':'deny'});
  const result=await p.execute({approvedPlanPin:p.planPin,consentInspector,runId:'research_'+crypto.randomUUID(),signal:c.signal,onExecutionEvent:e=>events.push(e)});
  if(c.signal.aborted){process.exitCode=130;return;}process.stdout.write(JSON.stringify({result,events,qualification:'Unreviewed source candidates; no automatic adoption.'})+'\n');
 }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
main().catch(e=>{process.stderr.write(JSON.stringify({status:'REFUSED',reason:['APPROVAL','SIZE','PLAN_PIN','CONFIG','SOURCE_COLLISION'].includes(e?.code)?e.code:'RESEARCH_REFUSED'})+'\n');process.exitCode=1;});
