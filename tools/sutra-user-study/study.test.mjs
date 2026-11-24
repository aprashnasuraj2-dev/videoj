import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {makeCounterbalancedPlan,scoreStudy} from './study.mjs';

const plan=()=>makeCounterbalancedPlan({seed:'sutra-recorded-pilot-seed-v1'});
const observations=(p,{sutraBase=60,manualBase=100,valid=true}={})=>p.rows.flatMap((a,i)=>a.order.map((method,j)=>({
 participant:a.participant,method,variant:a.variants[j],success:true,validEvidence:valid,
 durationSeconds:(method==='sutra'?sutraBase:manualBase)+i,assistanceCount:i<8?0:1,criticalError:false
})));

test('plan is deterministic, exactly 5/5 first-method balanced and assigns both task variants',()=>{
 const a=plan(),b=plan();assert.deepEqual(a,b);assert.equal(a.rows.length,10);
 assert.equal(a.rows.filter(r=>r.order[0]==='sutra').length,5);assert.equal(a.rows.filter(r=>r.order[0]==='manual').length,5);
 assert.ok(a.rows.every(r=>new Set(r.variants).size===2));assert.match(a.seedFingerprint,/^\d{10}$/);assert.match(a.planHash,/^[a-f0-9]{64}$/);
 const assignment=(method,variant)=>a.rows.filter(r=>{const j=r.order.indexOf(method);return r.variants[j]===variant;}).length;
 assert.deepEqual({sutraA:assignment('sutra','A'),sutraB:assignment('sutra','B'),manualA:assignment('manual','A'),manualB:assignment('manual','B')},{sutraA:5,sutraB:5,manualA:5,manualB:5});
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

test('frozen plan identity detects assignment edits and score binds exact observation set',()=>{
 const p=plan(),rows=observations(p),r=scoreStudy({plan:p,observations:rows});assert.equal(r.planHash,p.planHash);assert.match(r.observationsHash,/^[a-f0-9]{64}$/);
 const changed=structuredClone(p);changed.rows[0].variants.reverse();assert.throws(()=>scoreStudy({plan:changed,observations:rows}),/assignment changed/);
 const reordered=[...rows].reverse();assert.equal(scoreStudy({plan:p,observations:reordered}).observationsHash,r.observationsHash,'row order does not rewrite observation identity');
});
test('offline CLI can freeze a plan and score a complete synthetic fixture without converting a negative result to process failure',()=>{
 const cli=new URL('./cli.mjs',import.meta.url).pathname,dir=fs.mkdtempSync(path.join(os.tmpdir(),'sutra-study-'));
 try{
  const planRun=spawnSync(process.execPath,[cli,'plan','sutra-recorded-pilot-seed-v1'],{encoding:'utf8'});assert.equal(planRun.status,0);const p=JSON.parse(planRun.stdout);
  const planFile=path.join(dir,'plan.json'),obsFile=path.join(dir,'obs.json');fs.writeFileSync(planFile,JSON.stringify(p));fs.writeFileSync(obsFile,JSON.stringify(observations(p,{sutraBase:110,manualBase:80})));
  const score=spawnSync(process.execPath,[cli,'score',planFile,obsFile],{encoding:'utf8'});assert.equal(score.status,0);const report=JSON.parse(score.stdout);
  assert.equal(report.targetResult.medianTimeAtLeast30PercentLower,'fail');assert.ok(report.medianTimeReductionFraction<0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
