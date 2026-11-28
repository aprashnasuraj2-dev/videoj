// Native execution only. This CLI has no fixture-injection option.
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {admitManifest,authorizeResearch,digest} from './research-session.js';
import {createSearchProviders} from './providers.js';
import {createDocumentReader} from './document-reader.js';
import {createResearchModelBroker} from './model-broker.js';
import {runAutonomousResearch} from './research-supervisor.js';
import {verifyEvidence} from './evidence-index.js';
import {buildLiveAcceptancePlan,acceptanceOutcome} from './live-acceptance-plan.js';
const safeCode=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'OPERATION_FAILED';
const fail=code=>{throw Object.assign(Error('Live acceptance refused: '+code),{code});};
export function previewLiveAcceptance(config){
 const plan=buildLiveAcceptancePlan(config);
 for(const c of plan.cases)admitManifest(c.manifestText);
 return {plan,planPin:digest(JSON.stringify(plan))};
}
export async function executeLiveAcceptance(config,{approvedPlanPin,approvePublicContact=false,approveEstimatedCost=false,approveModelDisclosure=false,credentials={},signal,onCase=()=>{}}={}){
 const {plan,planPin}=previewLiveAcceptance(config);
 if(approvedPlanPin!==planPin||approvePublicContact!==true||approveEstimatedCost!==true||plan.mode==='model'&&approveModelDisclosure!==true)fail('SUITE_APPROVAL');
 if(plan.models.some(m=>typeof credentials[m.vendor]!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credentials[m.vendor])))fail('SUITE_CREDENTIALS');
 const rows=[];
 for(const c of plan.cases){
  if(signal?.aborted)break;
  const p=admitManifest(c.manifestText),start=performance.now();
  const a=authorizeResearch(c.manifestText,{approvedPlanPin:p.planPin,approvePublicContact,approveEstimatedCost,approveModelDisclosure,signal});
  let broker,row;
  try{
   const providers=createSearchProviders(),readDocument=createDocumentReader({authorization:a});
   if(plan.mode==='model')broker=createResearchModelBroker({authorization:a,credentials});
   const r=await runAutonomousResearch({authorization:a,providers,readDocument,...(broker?{modelBroker:broker}:{})});
   const checked=verifyEvidence(r.documents,r.passages),u=r.usage,distinctHosts=new Set(r.documents.map(d=>new URL(d.url).hostname)).size;
   const receipts=r.modelReceipts??[],claims=r.intelligence?.claims??[],reviewedClaims=claims.filter(x=>['candidate_reviewed','candidate_qualified'].includes(x.publicationStatus)).length;
   const receiptIntegrity=receipts.every(x=>x.authority==='NONE'&&/^sha256:[0-9a-f]{64}$/.test(x.inputDigest)&&/^sha256:[0-9a-f]{64}$/.test(x.responseDigest)&&p.plan.modelPolicy?.roles.some(m=>m.role===x.role&&m.model===x.model&&m.vendor===x.vendor));
   const integrity=r.authority==='NONE'&&r.planPin===p.planPin&&checked.passageCount===r.passages.length&&checked.sourceCount===r.documents.length&&receiptIntegrity&&Object.entries({searches:c.budget.maxSearches,documents:c.budget.maxDocuments,reservedBytes:c.budget.maxDownloadBytes,reservedCostMicros:c.budget.maxCostMicros,modelCalls:c.budget.maxModelCalls??0}).every(([k,max])=>Number.isSafeInteger(u[k]??0)&&(u[k]??0)>=0&&(u[k]??0)<=max);
   const metrics={target:c.target,mode:plan.mode,searches:u.searches,documents:r.documents.length,passages:checked.passageCount,distinctHosts,modelCalls:u.modelCalls??0,receiptCount:receipts.length,noWebAnswer:r.modelOnlyAnswer?.sourceStatus==='NO_WEB_EVIDENCE'&&r.modelOnlyAnswer?.authority==='NONE',reviewedClaims,integrity};
   row={id:c.id,planPin:p.planPin,outcome:acceptanceOutcome(metrics),metrics,terminationReason:r.terminationReason,failures:r.failures.map(x=>({operation:x.operation,reason:x.reason})),usage:u,receiptDigests:receipts.map(x=>({role:x.role,vendor:x.vendor,model:x.model,inputDigest:x.inputDigest,responseDigest:x.responseDigest,reportedOutputTokens:x.reportedOutputTokens})),sourceDigests:r.documents.map(d=>({id:d.id,textDigest:d.textDigest,rawDigest:d.rawDigest})),reportDigest:digest(JSON.stringify(r)),durationMs:Math.round(performance.now()-start),authority:'NONE'};
  }catch(e){row={id:c.id,planPin:p.planPin,outcome:'EXECUTION_FAILED',reason:safeCode(e),usage:a.usage(),durationMs:Math.round(performance.now()-start),authority:'NONE'};}
  finally{try{broker?.close();}finally{a.close();}}
  rows.push(row);onCase(row);
  if(row.outcome==='INTEGRITY_FAILURE')break;
 }
 return {schema:'sutra-live-acceptance-receipt/v1',mode:plan.mode,planPin,startedCases:rows.length,plannedCases:plan.cases.length,rows,authority:'NONE',qualification:'Actual native transport attempts, not a guarantee that remote services responded. Operational acceptance is not factual accuracy or independent review. Only digests, bounded operational metrics and refusal codes are retained; no credentials or raw model/source payloads.'};
}
function readConfig(path){if(typeof path!=='string'||statSync(path).size>16384)fail('SUITE_CONFIG');return parseUniqueJson(readFileSync(path,'utf8'),{maxChars:16384,maxDepth:5});}
if(fileURLToPath(import.meta.url)===resolve(process.argv[1]??'')){
 try{
  const [command,path,pin,...flags]=process.argv.slice(2),config=readConfig(path);
  if(command==='--plan'&&pin===undefined){console.log(JSON.stringify(previewLiveAcceptance(config),null,2));}
  else if(command==='--run'&&typeof pin==='string'&&new Set(flags).size===flags.length&&flags.every(x=>['--approve-public-contact','--approve-estimated-cost','--approve-model-disclosure'].includes(x))){
   const keyNames={gemini:'GEMINI_API_KEY',groq:'GROQ_API_KEY',openai:'OPENAI_API_KEY',anthropic:'ANTHROPIC_API_KEY',openrouter:'OPENROUTER_API_KEY'};
   const credentials=Object.fromEntries(config.models.map(m=>[m.vendor,process.env[keyNames[m.vendor]]]));
   const controller=new AbortController();process.once('SIGINT',()=>controller.abort());process.once('SIGTERM',()=>controller.abort());
   const result=await executeLiveAcceptance(config,{approvedPlanPin:pin,approvePublicContact:flags.includes('--approve-public-contact'),approveEstimatedCost:flags.includes('--approve-estimated-cost'),approveModelDisclosure:flags.includes('--approve-model-disclosure'),credentials,signal:controller.signal,onCase:r=>console.error(JSON.stringify({case:r.id,outcome:r.outcome,durationMs:r.durationMs}))});
   console.log(JSON.stringify(result,null,2));if(result.startedCases!==result.plannedCases||result.rows.some(r=>!['NO_WEB_OPERATIONAL_PASS','OPERATIONAL_PASS_REQUIRES_FACTUAL_REVIEW'].includes(r.outcome)))process.exitCode=1;
  }else fail('SUITE_COMMAND');
 }catch(e){console.error(JSON.stringify({error:safeCode(e)}));process.exitCode=1;}
}
