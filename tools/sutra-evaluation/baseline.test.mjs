import test from 'node:test';import assert from 'node:assert/strict';
import {evaluate,cases} from './baseline.mjs';
test('frozen synthetic retrieval and adversarial regressions, with honest metric boundaries',async()=>{
 assert.equal(cases.retrieval.length,20);assert.equal(cases.retrieval.filter(c=>c.expectedDisposition==='abstain').length,10);
 assert.equal(cases.adversarial.length,10);assert.equal(new Set([...cases.retrieval,...cases.adversarial].map(c=>c.id)).size,30);
 const report=await evaluate();assert.equal(report.summary.retrievalPassed,20);assert.equal(report.summary.adversarialPassed,10);
 assert.equal(report.summary.direct.modelCalls,0);assert.equal(report.summary.direct.cueExactMatches,20);assert.equal(report.summary.delegated.cueExactMatches,20);
 assert.equal(report.summary.delegated.totalModelCalls,90);assert.equal(report.summary.delegated.totalRpc,90);
 assert.equal(report.summary.delegated.providerTokens,null);assert.equal(report.summary.semanticPrecision,null);
 assert.ok(report.rows.every(r=>r.directMs>=0&&r.delegatedMs>=0));
 console.log('SUTRA_BASELINE '+JSON.stringify(report.summary));
});
