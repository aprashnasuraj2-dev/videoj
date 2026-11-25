import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {auditTrialPartition,compareTrialVersions,recoveryTrialFixture} from '../trial-partition.js';
const fixture=()=>recoveryTrialFixture('final');
async function changed(mutate){const f=await fixture(),c=JSON.parse(f.sourceText);mutate(c);const sourceText=JSON.stringify(c);return {sourceText,pin:await casePin(sourceText)};}
test('aggregate does not establish universal subgroup direction; exact raw counterexample and reported uncertainty differ',async()=>{
 const f=await fixture(),a=await auditTrialPartition(f.sourceText,f.pin,'aggregate'),p=await auditTrialPartition(f.sourceText,f.pin,'partition');
 assert.equal(a.rows.length,1);assert.equal(a.rows[0].observedDirection,'LOWER');assert.equal(a.universalObservedLower,'NOT_TESTED');assert.equal(a.conservation,null);
 assert.equal(p.universalObservedLower,'REFUTED_IN_DECLARED_PARTITION');assert.deepEqual(p.descriptiveCounterexamples,['no_respiratory_support']);
 assert.deepEqual(p.reportedIntervalsNotBelowNull,['no_respiratory_support']);assert.equal(p.universalCausalBenefit,'NOT_ESTABLISHED');
 const r=p.rows[3];assert.equal(r.observedDirection,'HIGHER');assert.equal(r.reportedAdjusted.intervalPosition,'INCLUDES_NULL');assert.notEqual(r.crudeRiskRatio,r.reportedAdjusted.point);
 for(const x of Object.values(p.conservation))assert.equal(x.aggregate,x.sum);
 assert.equal(r.report.receipts.find(x=>x.id==='strictly_lower').outcome.status,'constraint_refuted');
});
test('preliminary/final version drift is not independent replication',async()=>{
 const a=await recoveryTrialFixture('preliminary'),b=await fixture(),r=await compareTrialVersions(a.sourceText,a.pin,b.sourceText,b.pin);
 assert.deepEqual(r.result.changes,[{id:'no_respiratory_support',field:'reportedAdjusted.lower',before:'91/100',after:'23/25'}]);
 assert.equal(r.result.declaredStudyRoots,1);assert.equal(r.result.independentReplication,'NOT_ESTABLISHED');
 await assert.rejects(compareTrialVersions(b.sourceText,b.pin,b.sourceText,b.pin),/TRIAL_VERSION_IDENTITY/);
 const c=await changed(x=>{x.endpoint='Different outcome';});await assert.rejects(compareTrialVersions(a.sourceText,a.pin,c.sourceText,c.pin),/TRIAL_VERSION_SCOPE/);
});
test('strict pin, count, conservation, row identity, interval and schema boundaries',async()=>{
 const f=await fixture();await assert.rejects(auditTrialPartition(f.sourceText+' ',f.pin,'partition'),/TRIAL_PIN_MISMATCH/);
 for(const [mutate,reason] of [
 [x=>{x.strata[0].treatedTotal=0;},/TRIAL_COUNTS/],
 [x=>{x.strata[0].treatedEvents=325;},/TRIAL_COUNTS/],
 [x=>{x.strata[0].treatedEvents++;},/TRIAL_PARTITION_TOTALS/],
 [x=>{x.strata[1].id=x.strata[0].id;},/TRIAL_PARTITION/],
 [x=>{x.strata[0].adjusted.lower=80;},/TRIAL_INTERVAL/],
 [x=>{x.strata[0].adjusted.metric='crude_risk_ratio';},/TRIAL_INTERVAL/],
 [x=>{x.strata[0].claim='verified';},/TRIAL_COUNTS/],
 [x=>{x.strata[0].treatedEvents=-0;},null]
 ]){
  const c=await changed(mutate);if(reason)await assert.rejects(auditTrialPartition(c.sourceText,c.pin,'partition'),reason);
 }
});
test('zero control events and equality do not become an invented ratio or strict reduction',async()=>{
 const f=await changed(x=>{
  for(const r of x.strata){r.treatedEvents=0;r.controlEvents=0;r.adjusted.lower=100;r.adjusted.point=100;r.adjusted.upper=100;}
  x.aggregate.treatedEvents=0;x.aggregate.controlEvents=0;x.aggregate.adjusted.lower=100;x.aggregate.adjusted.point=100;x.aggregate.adjusted.upper=100;
 });
 const p=await auditTrialPartition(f.sourceText,f.pin,'partition');
 assert.equal(p.universalObservedLower,'REFUTED_IN_DECLARED_PARTITION');
 for(const r of p.rows){assert.equal(r.observedDirection,'EQUAL');assert.equal(r.crudeRiskRatio,null);assert.equal(r.crudeRiskRatioStatus,'indeterminate');assert.equal(r.reportedAdjusted.intervalPosition,'INCLUDES_NULL');}
});
