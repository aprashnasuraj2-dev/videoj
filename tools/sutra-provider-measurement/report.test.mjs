import test from 'node:test';import assert from 'node:assert/strict';import {buildProviderCostReport} from './report.mjs';
const base=()=>({schema:1,sourceRevision:'a'.repeat(40),provider:'provider',model:'model-v1',currency:'USD',
 priceBasis:{promptPerMillion:2,completionPerMillion:8,effectiveAt:'2026-11-24T00:00:00Z',source:'operator-recorded provider price page'},
 monthlyRunScenario:1000,runs:[
  {id:'r1',outcome:'completed',observedAt:'2026-11-24T00:01:00Z',requests:[
   {sequence:1,outcome:'completed',retry:false,usage:{promptTokens:1000,completionTokens:200}},
   {sequence:2,outcome:'completed',retry:false,usage:{promptTokens:500,completionTokens:100}}]},
  {id:'r2',outcome:'completed',observedAt:'2026-11-24T00:02:00Z',requests:[
   {sequence:1,outcome:'completed',retry:false,usage:{promptTokens:2000,completionTokens:250}},
   {sequence:2,outcome:'completed',retry:true,usage:{promptTokens:1000,completionTokens:100}}]}
 ]});
test('complete observed usage produces transparent mean p95 projection and sensitivity including retries',()=>{
 const r=buildProviderCostReport(base());assert.equal(r.costComplete,true);assert.equal(r.observed.providerRequests,4);assert.equal(r.observed.retries,1);
 assert.equal(r.completedRunMeanUsd,0.0068);assert.equal(r.completedRunP95Usd,0.0098);assert.equal(r.projectedMonthlyUsd,6.8);
 assert.equal(r.sensitivity.oneFullMeanRetryUsd,0.0136);assert.ok(r.sensitivity.doubledPromptMeanUsd>r.completedRunMeanUsd);
});
test('any missing request usage nulls mean p95 monthly and sensitivity instead of estimating',()=>{
 const x=base();x.runs[0].requests[1].usage=null;const r=buildProviderCostReport(x);
 assert.equal(r.costComplete,false);assert.equal(r.observed.incompleteUsageRequests,1);assert.equal(r.completedRunMeanUsd,null);assert.equal(r.completedRunP95Usd,null);
 assert.equal(r.projectedMonthlyUsd,null);assert.equal(r.sensitivity,null);assert.ok(r.runs[0].knownPartialCostUsd>0);
});
test('failed and cancelled requests remain visible in spend record rather than disappearing',()=>{
 const x=base();x.runs.push({id:'r3',outcome:'failed',observedAt:'2026-11-24T00:03:00Z',requests:[{sequence:1,outcome:'failed',retry:false,usage:{promptTokens:500,completionTokens:0}}]});
 x.runs.push({id:'r4',outcome:'cancelled',observedAt:'2026-11-24T00:04:00Z',requests:[{sequence:1,outcome:'cancelled',retry:false,usage:null}]});
 const r=buildProviderCostReport(x);assert.equal(r.observed.failedRuns,1);assert.equal(r.observed.cancelledRuns,1);assert.equal(r.observed.providerRequests,6);assert.equal(r.costComplete,false);
});
test('malformed prices, duplicate runs, negative tokens and fabricated monthly scale fail closed',()=>{
 for(const mutate of [
  x=>x.priceBasis.promptPerMillion=-1,x=>x.runs[1].id='r1',x=>x.runs[0].requests[0].usage.promptTokens=-1,x=>x.monthlyRunScenario=0,
  x=>x.runs[0].requests[0].usage={promptTokens:1,completionTokens:1,totalTokens:2}
 ]){const x=base();mutate(x);assert.throws(()=>buildProviderCostReport(x));}
});
