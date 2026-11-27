// Credentialed smoke of the REAL search adapters. No simulated success path in the CLI.
import {admitManifest,authorizeResearch,digest} from './research-session.js';
import {createSearchProviders,SEARCH_BYTES} from './providers.js';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
const fail=code=>{throw Object.assign(Error('Live smoke refused: '+code),{code});};
export function admitLiveSmokeManifest(raw){
 const p=admitManifest(raw),m=p.plan;
 if(m.modelPolicy||m.providers.length!==2||m.budget.maxSearches!==2||m.budget.maxDurationSeconds>120||m.budget.maxDownloadBytes<2*SEARCH_BYTES||m.budget.maxCostMicros<m.providers.reduce((n,r)=>n+r.estimatedMaxCostMicros,0))fail('SMOKE_SCOPE');
 return p;
}
export async function runSearchSmoke({raw,approvedPlanPin,approvePublicContact,approveEstimatedCost,credentials,signal,transport}){
 const p=admitLiveSmokeManifest(raw);
 if(p.plan.providers.some(r=>!credentials?.[r.id]))fail('SMOKE_CREDENTIALS');
 const a=authorizeResearch(raw,{approvedPlanPin,approvePublicContact,approveEstimatedCost,signal});
 const providers=createSearchProviders({credentials,...(transport?{transport}:{})}),checks=[];
 try{
  for(const p of a.plan.providers){
   a.assertActive();a.reserve('search',{bytes:SEARCH_BYTES,costMicros:p.estimatedMaxCostMicros});
   const start=performance.now();
   try{
    const results=await providers[p.id].search(a.plan.objective,{signal:a.signal});a.assertActive();
    const urls=[...new Set(results.flatMap(r=>{try{return [admitDocumentURL(r.url,{allowQuery:true})];}catch{return [];}}))];
    if(!urls.length)fail('NO_ADMISSIBLE_RESULTS');
    checks.push({provider:p.id,status:'passed',results:results.length,admissibleUrls:urls.length,responseIndexDigest:digest(JSON.stringify(urls)),durationMs:Math.round(performance.now()-start)});
   }catch(e){checks.push({provider:p.id,status:'failed',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'PROVIDER_FAILURE'});}
  }
  return {schema:'sutra-search-smoke/v1',mode:transport?'injected_fixture':'credentialed_live_transport',status:checks.length===2&&checks.every(c=>c.status==='passed')?'passed':'failed',checkedAt:new Date().toISOString(),planPin:a.planPin,checks,usage:a.usage(),qualification:'Search interoperability only. No document retrieval, evidence correctness, source independence or vendor invoice verification.'};
 }finally{a.close();}
}
