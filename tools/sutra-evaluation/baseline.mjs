import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {createSourceTools} from '../../packages/sutra-source-tools/index.js';
import {validateReceipt} from '../../packages/sutra-evidence/index.js';
import {runNetwork} from '../../packages/sutra-runtime/index.js';
import {createSourceScriptedModel} from '../../packages/sutra-runtime/testing.js';
import {handleSourceTools} from '../../services/sutra-api/worker.js';
import {compareClaimPair,syntheticComparison} from '../../apps/sutra/src/comparison.js';
import {buildUncertaintyGuidance} from '../../apps/sutra/src/uncertainty-guidance.js';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
export const cases=await readJson('../../docs/sutra/evaluation/engineering-cases-v1.json');
const fixture=await readJson('../../apps/sutra/src/fixtures/timing-source.json');
const graph=await readJson('../../apps/sutra/public/agents/source_learner.network.json');
const sources=[fixture.source],origin='https://sutra.test';
const cueIds=receipts=>[...new Set(receipts.map(r=>r.cueId))].sort();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const check=receipts=>receipts.every(receipt=>validateReceipt(receipt,{sources}).level==='catalog_matched');
const median=values=>{const s=[...values].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
function adversarialCase(mutation){
 const p=structuredClone(syntheticComparison);
 const mutations={
  conflicting_value:()=>{},type_mismatch:()=>{p.guide.value='2';},scope_mismatch:()=>{p.guide.scope='other';},claim_key_mismatch:()=>{p.guide.claimKey='other';},
  missing_guide:()=>{p.guide=null;},missing_video:()=>{p.video=null;},missing_source_id:()=>{p.guide.sourceId='';},wrong_role:()=>{p.guide.sourceKind='video';},
  invalid_interval:()=>{p.video.start=4;p.video.end=2;},invalid_cue_id:()=>{p.video.cueId='bad\ncue';}
 };
 if(!Object.hasOwn(mutations,mutation))throw Error('Unknown mutation');mutations[mutation]();
 return p;
}
export async function evaluate(){
 const direct=createSourceTools(sources),rows=[];
 for(const c of cases.retrieval){
  let begin=performance.now();
  const directResult=direct.call('search_lesson',{query:c.query});
  const directMs=performance.now()-begin;
  let rpc=0;const seen=new Map();begin=performance.now();
  const result=await runNetwork({definition:graph,name:'source_learner',request:'Inspect the supplied literal fixture query.',model:createSourceScriptedModel({query:c.query}),sourceTools:{origin,sources,fetchImpl:async(url,options)=>{
   rpc++;if(url!==origin+'/api/source-tools')throw Error('Unexpected source URL');
   return handleSourceTools(new Request(url,{...options,headers:{...options.headers,Origin:origin}}));
  },onReceipt:r=>seen.set(r.sourceId+'|'+r.cueId,r)}});
  const delegatedMs=performance.now()-begin,receipts=[...seen.values()];
  const directIds=cueIds(directResult.receipts),delegatedIds=cueIds(receipts);
  const directDisposition=directIds.length?'source_backed_unverified':'abstain';
  const delegatedDisposition=delegatedIds.length?'source_backed_unverified':/abstains: no matching source cue/.test(result.text)?'abstain':'invalid';
  rows.push({id:c.id,expectedCueIds:c.expectedCueIds,directIds,delegatedIds,directDisposition,delegatedDisposition,
   directValid:check(directResult.receipts),delegatedValid:check(receipts),directMs,delegatedMs,modelCalls:result.modelCalls,agentCalls:result.agentCalls,rpc,
   pass:same(directIds,c.expectedCueIds)&&same(delegatedIds,c.expectedCueIds)&&directDisposition===c.expectedDisposition&&delegatedDisposition===c.expectedDisposition&&check(directResult.receipts)&&check(receipts)});
 }
 const adversarial=cases.adversarial.map(c=>{const result=compareClaimPair(adversarialCase(c.mutation));const guidance=buildUncertaintyGuidance(result);
  return {id:c.id,expected:c.expected,observed:result.status,disposition:guidance.disposition,pass:result.status===c.expected&&guidance.disposition==='abstain'&&guidance.certification==='none'};
 });
 const summary={profile:'in-process synthetic model and source handler, no network/paid inference; no held-out semantics',datasetVersion:cases.version,
  retrievalCases:rows.length,retrievalPassed:rows.filter(r=>r.pass).length,adversarialCases:adversarial.length,adversarialPassed:adversarial.filter(r=>r.pass).length,
  direct:{medianMs:median(rows.map(r=>r.directMs)),modelCalls:0,remoteRpc:0,cueExactMatches:rows.filter(r=>same(r.directIds,r.expectedCueIds)).length},
  delegated:{medianMs:median(rows.map(r=>r.delegatedMs)),medianModelCalls:median(rows.map(r=>r.modelCalls)),totalModelCalls:rows.reduce((s,r)=>s+r.modelCalls,0),totalRpc:rows.reduce((s,r)=>s+r.rpc,0),cueExactMatches:rows.filter(r=>same(r.delegatedIds,r.expectedCueIds)).length,providerTokens:null},
  factualTruth:'unverified',semanticPrecision:null};
 return {summary,rows,adversarial};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){const report=await evaluate();console.log(JSON.stringify(report,null,2));if(report.summary.retrievalPassed!==report.summary.retrievalCases||report.summary.adversarialPassed!==report.summary.adversarialCases)process.exitCode=1;}
