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

import {auditBenchmarkSplit} from '../benchmark-split-audit.js';
test('held-out split detects exact and declared ancestry leakage; unknown ancestry remains unresolved',async()=>{
 const f=await fixture(),make=async(id,split,text,lineage)=>({id,split,text,contentPin:await casePin(text),lineage});
 const base={version:1,heldOutGoldPin:f.goldPin,cases:[await make('x','held_out','Question X',['root_x']),await make('y','held_out','Question Y',['root_y']),await make('dev','development','Dev question',['root_dev'])]};
 const run=async m=>{const manifestText=JSON.stringify(m);return auditBenchmarkSplit({manifestText,manifestPin:await casePin(manifestText),goldText:f.goldText,goldPin:f.goldPin});};
 assert.equal((await run(base)).status,'NO_DECLARED_COLLISION');
 const collided={...base,cases:[...base.cases.slice(0,2),await make('dev','development','Question X',['root_y'])]};const r=await run(collided);assert.equal(r.status,'CROSS_SPLIT_COLLISION');assert.equal(r.contentCollisions.length,1);assert.deepEqual(r.lineageCollisions,['root_y']);
 const unknown={...base,cases:[...base.cases.slice(0,2),await make('dev','development','Other',[])]};assert.equal((await run(unknown)).status,'UNKNOWN_ANCESTRY');
 await assert.rejects(run({...base,cases:base.cases.slice(1)}),/BENCHMARK_SPLIT_CASE_SET/);
});
