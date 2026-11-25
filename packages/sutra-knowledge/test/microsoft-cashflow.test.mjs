import test from 'node:test';
import assert from 'node:assert/strict';
import {microsoftCashFlowExample,diagnoseMicrosoftCashFlow} from '../microsoft-cashflow.js';
import {alignedInvestigationExport} from '../aligned-investigation.js';
import {auditAssumptionContrast} from '../assumption-contrast.js';
import {createVerifier} from '../index.js';
const wire=JSON.stringify;
test('public filing example: higher operating cash is insufficient; cash PPE resolves the conditional proxy',async()=>{
 const f=await microsoftCashFlowExample();
 const stages=[[],f.operatingOnly,f.full,f.withdrawn];
 const results=[];
 for(const history of stages)results.push((await alignedInvestigationExport(f.caseText,f.pin,wire(history))).result);
 assert.deepEqual(results.map(x=>x.state),['UNDERDETERMINED','UNDERDETERMINED','REFUTED','UNDERDETERMINED']);
 assert.deepEqual(results.map(x=>x.report.survivingWorlds.length),[4,2,1,4]);
 assert.deepEqual(results.map(x=>x.rootSummary.length),[0,1,1,0]);
 assert.equal(results[2].report.activeEvidence.length,6);assert.equal(results[2].rootSummary[0].sourceIds.length,2);
 assert.equal(results[2].report.truthStatus,'unverified');
 const w=JSON.parse(f.caseText).worlds.find(w=>w.id===results[2].report.survivingWorlds[0]);
 const run=await createVerifier().evaluate(w.graphText),by=new Map(run.report.receipts.map(r=>[r.id,r.outcome]));
 assert.equal(by.get('proxy25').value,String(136162n-64551n)+'/1');
 assert.equal(by.get('proxy26').value,String(182935n-115948n)+'/1');
 assert.equal((182935n-115948n)-(136162n-64551n),-4624n);
 const contrast=await auditAssumptionContrast(f.caseText,f.pin,wire(f.full));
 assert.equal(contrast.anchors.length,1);assert.equal(contrast.anchors[0].evidenceCompatibleContrast.count,0);
 assert.equal(contrast.anchors[0].evidenceExcludedContrast.count,2);
});
test('normalized extract integrity, not filing authenticity; changed source and wrong case pin fail closed',async()=>{
 const f=await microsoftCashFlowExample(),events=structuredClone(f.full),e=events.find(e=>e.observationId==='read_fy26_filing_ppe26'),d=JSON.parse(e.sourceText);d.values.ppe26.value='64551/1';e.sourceText=wire(d);
 await assert.rejects(alignedInvestigationExport(f.caseText,f.pin,wire(events)),/EVIDENCE_HASH_MISMATCH/);
 await assert.rejects(alignedInvestigationExport(f.caseText,'sha256:'+'0'.repeat(64),wire(f.full)),/CASE_PIN_MISMATCH/);
});

test('threshold is computed, evidence-sensitive, receipt-bound and exactly equal to the proxy delta',async()=>{
 const f=await microsoftCashFlowExample(),d=await diagnoseMicrosoftCashFlow(f.caseText,f.pin,wire(f.operatingOnly));
 assert.equal(d.state,'UNDERDETERMINED');assert.equal(d.worlds.length,2);
 assert.deepEqual(new Set(d.worlds.map(w=>w.quantities.proxy26.value)),new Set(['118384/1','66987/1']));
 assert.deepEqual(new Set(d.worlds.map(w=>w.quantities.ppe_limit.value)),new Set(['111324/1']));
 assert.equal(d.activeEvidence.length,3);
 const actual=await diagnoseMicrosoftCashFlow(f.caseText,f.pin,wire(f.full)),q=actual.worlds[0].quantities;
 assert.equal(actual.state,'REFUTED');assert.equal(q.delta.value,'-4624/1');assert.equal(q.ppe_limit.value,'111324/1');assert.equal(q.ppe26.value,'115948/1');assert.match(q.delta.receiptDigest,/^sha256:[0-9a-f]{64}$/);
 const withdrawn=await diagnoseMicrosoftCashFlow(f.caseText,f.pin,wire(f.withdrawn));assert.equal(withdrawn.activeEvidence.length,0);assert.equal(withdrawn.priorReads,6);assert.equal(withdrawn.worlds.length,4);
 await assert.rejects(diagnoseMicrosoftCashFlow(f.caseText+' ',f.pin),/FINANCE_FIXTURE_MISMATCH/);
});
