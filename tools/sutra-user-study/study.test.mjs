import test from 'node:test';import assert from 'node:assert/strict';import {makeCounterbalancedPlan,scoreStudy} from './study.mjs';

const plan=()=>makeCounterbalancedPlan({seed:'sutra-recorded-pilot-seed-v1'});
const observations=(p,{sutraBase=60,manualBase=100,valid=true}={})=>p.rows.flatMap((a,i)=>a.order.map((method,j)=>({
 participant:a.participant,method,variant:a.variants[j],success:true,validEvidence:valid,
 durationSeconds:(method==='sutra'?sutraBase:manualBase)+i,assistanceCount:i<8?0:1,criticalError:false
})));

test('plan is deterministic, exactly 5/5 first-method balanced and assigns both task variants',()=>{
 const a=plan(),b=plan();assert.deepEqual(a,b);assert.equal(a.rows.length,10);
 assert.equal(a.rows.filter(r=>r.order[0]==='sutra').length,5);assert.equal(a.rows.filter(r=>r.order[0]==='manual').length,5);
 assert.ok(a.rows.every(r=>new Set(r.variants).size===2));assert.match(a.seedFingerprint,/^\d{10}$/);
});

test('complete paired valid-evidence study computes target metrics without dropping slow rows',()=>{
 const p=plan(),result=scoreStudy({plan:p,observations:observations(p)});
 assert.equal(result.sutra.participants,10);assert.equal(result.manual.participants,10);assert.equal(result.evidenceAccuracyComparable,true);
 assert.equal(result.sutra.unaidedSuccesses,8);assert.equal(result.targetResult.unaidedCompletion,'pass');
 assert.equal(result.targetResult.noEvidenceAccuracyLoss,'pass');assert.equal(result.targetResult.medianTimeAtLeast30PercentLower,'pass');
 assert.ok(result.medianTimeReductionFraction>0.3);assert.equal(result.paired.length,10);
});

test('evidence accuracy loss nulls time-improvement claim instead of rewarding faster invalid answers',()=>{
 const p=plan(),rows=observations(p);rows.find(r=>r.method==='sutra').validEvidence=false;rows.find(r=>r.method==='sutra').success=false;
 const r=scoreStudy({plan:p,observations:rows});assert.equal(r.evidenceAccuracyComparable,false);assert.equal(r.medianTimeReductionFraction,null);
 assert.equal(r.targetResult.noEvidenceAccuracyLoss,'fail');assert.equal(r.targetResult.medianTimeAtLeast30PercentLower,'fail');
});

test('missing, duplicate, assignment-mismatched and coached/inconsistent rows fail closed',()=>{
 const p=plan();
 assert.throws(()=>scoreStudy({plan:p,observations:observations(p).slice(1)}),/Complete/);
 const dup=observations(p);dup[1]={...dup[0]};assert.throws(()=>scoreStudy({plan:p,observations:dup}));
 const wrong=observations(p);wrong[0].variant=wrong[0].variant==='A'?'B':'A';assert.throws(()=>scoreStudy({plan:p,observations:wrong}),/frozen counterbalanced/);
 const bad=observations(p);bad[0].validEvidence=false;assert.throws(()=>scoreStudy({plan:p,observations:bad}),/success cannot lack/);
});

test('counterexample where manual is faster remains a negative result rather than being normalized away',()=>{
 const p=plan(),r=scoreStudy({plan:p,observations:observations(p,{sutraBase:110,manualBase:80})});
 assert.ok(r.medianTimeReductionFraction<0);assert.equal(r.targetResult.medianTimeAtLeast30PercentLower,'fail');
});
