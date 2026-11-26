import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GROUPS,effortBaseline,reservationCapacity,readCapacityWorksheet,buildCapacityWorksheet} from './capacity.mjs';
const groups=()=>Object.fromEntries(GROUPS.map(name=>[name,readFileSync(new URL('../../docs/sutra/checklists/'+name+'.md',import.meta.url),'utf8')]));
const vars=name=>JSON.parse(readFileSync(new URL('../../services/sutra-api/'+name,import.meta.url),'utf8')).vars;
test('100 original estimates and reserve reconcile without double-counting joint ownership',()=>{
 const e=readCapacityWorksheet().effort;
 assert.equal(e.phases,100);assert.equal(e.basePersonHours,168.5);assert.equal(e.contingencyPersonHours,25.275);assert.equal(e.includingContingency,193.775);
 assert.deepEqual(e.ownerPersonHours,{E:115,P:9,'E+P':44.5});
 assert.deepEqual(e.workstreams.map(x=>x.basePersonHours),[11,17,21.5,18.5,17,18,14.5,21,15.5,14.5]);
 assert.deepEqual(e.availabilityScenarios.map(x=>x.daysForEntireOriginalBaseline),[97,49,33]);
 assert.equal(e.actualRemainingHours,null);assert.equal(e.actualDailyAvailability,null);
});
test('malformed, missing or duplicate estimates cannot silently reduce totals',()=>{
 const k=GROUPS[0],original=groups();
 for(const changed of [original[k].replace('## Phase 002','## Phase 001'),original[k].replace('## Phase 002','## Other 002'),original[k].replace('1 person-hours','NaN person-hours'),original[k].replace('**owner:** P.','**owner:** Unknown.'),original[k].replace('1 person-hours','0 person-hours'),original[k]+'\n- **Baseline effort:** 1 person-hours; **owner:** E.\n'])assert.throws(()=>effortBaseline({...original,[k]:changed}));
 assert.throws(()=>effortBaseline({...original,extra:'unknown'}));assert.throws(()=>effortBaseline(original,-1));
});
test('actual disabled configuration and hypothetical token sensitivity are separate from actual cost',()=>{
 const w=readCapacityWorksheet(),p=w.privateWorker;
 assert.deepEqual(p.limits,{max:100,perClient:8,maxConcurrent:2,maxInput:3379200,maxOutput:51200});
 assert.deepEqual(p.sourceLimits,{max:10000,perClient:500});assert.equal(w.assetWorker.sourceLimits,null);
 assert.deepEqual(p.scenarios.map(x=>[x.maxReservations,x.wholeTasksGlobal,x.wholeTasksPerClient,x.unusedGlobalReservations]),[[100,25,2,0],[100,12,1,4],[100,25,2,0],[100,12,1,4],[50,6,1,2]]);
 assert.deepEqual(w.tokenScenarios.map(x=>[x.assumedPromptTokens,x.assumedCompletionTokens]),[[8000,1600],[16000,1600],[16000,3200],[32000,3200]]);
 assert.ok(w.tokenScenarios.every(x=>x.estimatedUsd===null));assert.equal(w.approvedSpendUsd,null);assert.equal(w.actualProviderPrices,null);assert.equal(p.inferenceEnabled,false);
});
test('resource cap can bind before call cap and prevent a whole task',()=>{
 const limits={max:100,perClient:8,maxConcurrent:2,maxInput:1000,maxOutput:51200};
 const x=reservationCapacity(limits,{callsPerAttempt:4,inputBytesPerCall:400,requestedOutputPerCall:512});
 assert.equal(x.maxReservations,2);assert.equal(x.wholeTasksGlobal,0);assert.equal(x.wholeTasksPerClient,0);
 assert.throws(()=>reservationCapacity(limits,{callsPerAttempt:4,inputBytesPerCall:33793,requestedOutputPerCall:512}));
});
test('enabled inference or invalid settings are refused',()=>{
 const input={groups:groups(),privateVars:vars('wrangler.private.jsonc'),assetWorkerVars:vars('wrangler.jsonc')};
 for(const patch of [{SUTRA_ENABLE_INFERENCE:'true'},{SUTRA_MODELS:'mock'},{SUTRA_MAX_DAILY_CALLS:'0'},{SUTRA_MAX_DAILY_SOURCE_READS:'-1'},{SUTRA_MAX_OUTPUT_TOKENS:'1025'}])assert.throws(()=>buildCapacityWorksheet({...input,privateVars:{...input.privateVars,...patch}}));
});
