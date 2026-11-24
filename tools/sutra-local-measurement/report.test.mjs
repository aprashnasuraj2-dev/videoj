import test from 'node:test';import assert from 'node:assert/strict';import {buildSelfHostedResourceReport} from './report.mjs';
const base=()=>({schema:1,sourceRevision:'a'.repeat(40),backend:'self_hosted',model:'open-weight/tool-model',gatewayUrlSha256:'b'.repeat(64),gatewayBuildSha256:'d'.repeat(64),
 engine:{name:'llama.cpp',version:'fixture-v1'},weights:{sha256:'c'.repeat(64),license:'fixture-license',source:'synthetic fixture weights metadata'},hardware:{gpuModel:'Synthetic GPU',vramGiB:24,systemRamGiB:64},
 costBasis:{electricityUsdPerKwh:.12,hardwareAmortizationUsdPerHour:.5,energyMeasurement:'wall_meter_total',effectiveAt:'2026-11-24T00:00:00Z',source:'synthetic operator cost basis'},monthlyRunScenario:1000,
 batches:[
  {id:'b1',observedAt:'2026-11-24T00:01:00Z',concurrency:1,durationMs:2000,energyWh:10,requests:[{id:'r1',outcome:'completed',latencyMs:1800,modelCalls:3,retryCount:0,usage:{promptTokens:1200,completionTokens:180}}]},
  {id:'b2',observedAt:'2026-11-24T00:02:00Z',concurrency:2,durationMs:3000,energyWh:18,requests:[{id:'r2',outcome:'completed',latencyMs:2500,modelCalls:3,retryCount:0,usage:{promptTokens:1300,completionTokens:170}},{id:'r3',outcome:'failed',latencyMs:2900,modelCalls:2,retryCount:0,usage:{promptTokens:900,completionTokens:0}}]}
 ]});
test('self-hosted report separates measured latency, energy and operator-owned cost from provider pricing',()=>{const r=buildSelfHostedResourceReport(base());assert.equal(r.kind,'self_hosted_resource');assert.equal(r.observed.attempts,3);assert.equal(r.observed.completed,2);assert.equal(r.observed.failed,1);assert.equal(r.observed.retries,0);assert.equal(r.usageComplete,true);assert.equal(r.noAutomaticRetries,true);assert.equal(r.latencyP50Ms,2500);assert.equal(r.latencyP95Ms,2900);assert.equal(r.concurrency.length,2);assert.ok(r.observedOperationalCostUsd>0);assert.ok(r.projectedMonthlyOperationalUsd>0);assert.match(r.limitation,/excludes network/);});
test('unknown token usage remains explicit without inventing tokens or changing measured energy cost',()=>{const x=base();x.batches[1].requests[1].usage=null;const r=buildSelfHostedResourceReport(x);assert.equal(r.usageComplete,false);assert.equal(r.observed.unknownUsageRequests,1);assert.equal(r.observed.promptTokens,2500);assert.ok(r.observedOperationalCostUsd>0);});
test('duplicate ids, impossible concurrency, negative energy and malformed hardware evidence fail closed',()=>{for(const mutate of [x=>x.batches[1].requests[0].id='r1',x=>x.batches[1].concurrency=3,x=>x.batches[0].energyWh=-1,x=>x.hardware.vramGiB=0,x=>x.gatewayUrlSha256='bad',x=>x.gatewayBuildSha256='bad',x=>x.backend='hosted',x=>x.batches[0].requests[0].retryCount=-1,x=>x.batches[0].requests[0].latencyMs=2500,x=>x.costBasis.energyMeasurement='guess']){const x=base();mutate(x);assert.throws(()=>buildSelfHostedResourceReport(x));}});
test('failed and cancelled attempts remain in denominators and concurrency groups',()=>{const x=base();x.batches.push({id:'b3',observedAt:'2026-11-24T00:03:00Z',concurrency:1,durationMs:1200,energyWh:5,requests:[{id:'r4',outcome:'cancelled',latencyMs:1100,modelCalls:1,retryCount:0,usage:null}]});const r=buildSelfHostedResourceReport(x);assert.equal(r.observed.attempts,4);assert.equal(r.observed.cancelled,1);assert.equal(r.usageComplete,false);assert.equal(r.concurrency.find(g=>g.concurrency===1).attempts,2);});

test('observed retries remain measurable but are explicitly noncompliant with SUTRA no-auto-retry policy',()=>{const x=base();x.batches[0].requests[0].modelCalls=3;x.batches[0].requests[0].retryCount=1;const r=buildSelfHostedResourceReport(x);assert.equal(r.observed.retries,1);assert.equal(r.noAutomaticRetries,false);});

test('measurement windows cannot overlap because hardware time and wall energy would be double-counted',()=>{
 const x=base();x.batches[1].observedAt='2026-11-24T00:01:01Z';
 assert.throws(()=>buildSelfHostedResourceReport(x),/Overlapping self-hosted measurement windows/);
});
test('adjacent non-overlapping windows are allowed and observedAt is the window start',()=>{
 const x=base();x.batches[1].observedAt='2026-11-24T00:01:02Z';
 const r=buildSelfHostedResourceReport(x);assert.equal(r.observed.batches,2);assert.equal(r.observed.totalWallMs,5000);
});

test('self-hosted resource records reject future cost basis and internally impossible call/token accounting',()=>{
 for(const mutate of [x=>x.costBasis.effectiveAt='2026-11-25T00:00:00Z',x=>x.batches[0].requests[0].retryCount=3,x=>{x.batches[1].requests[1].modelCalls=0;}]){
  const x=base();mutate(x);assert.throws(()=>buildSelfHostedResourceReport(x));
 }
 const x=base();x.batches[1].requests[1].modelCalls=0;x.batches[1].requests[1].usage={promptTokens:0,completionTokens:0};
 assert.equal(buildSelfHostedResourceReport(x).usageComplete,true);
});
