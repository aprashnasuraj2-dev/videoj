import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {admitPairedBenchmarkBudget} from '../benchmark-budget-admission.js';
async function fixture(){
 const goldText=JSON.stringify({version:1,cases:[{id:'x',label:'supported'},{id:'y',label:'underdetermined'}]}),goldPin=await casePin(goldText);
 const resultsText=JSON.stringify({version:1,goldPin,arms:['a','b'].map(id=>({id,predictions:[{id:'x',label:'supported'},{id:'y',label:'abstain'}]}))}),resultsPin=await casePin(resultsText);
 const protocolText=JSON.stringify({version:1,goldPin,split:'held_out',caps:{calls:2,inputBytes:100,outputTokens:20}}),protocolPin=await casePin(protocolText);
 const usage={version:1,protocolPin,resultsPin,arms:['a','b'].map(id=>({id,cases:['x','y'].map(id=>({id,calls:1,inputBytes:50,outputTokens:10}))}))};
 return {goldText,goldPin,resultsText,resultsPin,protocolText,protocolPin,usage};
}
async function run(f){const usageText=JSON.stringify(f.usage);return admitPairedBenchmarkBudget({...f,usageText,usagePin:await casePin(usageText)});}
test('both arms report every case under identical declared caps without claiming genuine held-out status',async()=>{const r=await run(await fixture());assert.equal(r.declaredSplit,'held_out');assert.equal(r.totals[0].calls,2);assert.equal(r.score.arms[0].coverage,.5);assert.equal(r.decisionAuthority,'NONE');});
test('overspend, unknown and duplicated cases or arms refuse instead of omitting failures',async()=>{for(const edit of [u=>u.arms[0].cases[0].calls=3,u=>u.arms[0].cases[0].id='unknown',u=>u.arms[0].cases[0].id='y',u=>u.arms[1].id='a',u=>u.arms[0].cases.pop()]){const f=await fixture();edit(f.usage);await assert.rejects(run(f),/BENCHMARK_BUDGET_/);}});
