import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {classifyChangedFiles,metricFreshness} from './impact.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../verification-map.json',import.meta.url)));
test('comparison change invalidates grounding, journey, browser and performance evidence',()=>{
 const r=classifyChangedFiles(['apps/sutra/src/comparison.js'],map);
 for(const id of ['grounding-evaluation','critical-journey','browser-matrix','performance-profile'])assert.ok(r.affectedSuites.includes(id),id);
 for(const metric of ['engineering_baseline','hero_journey','desktop_browser_matrix','lab_performance'])assert.ok(r.invalidatedMetrics.includes(metric),metric);
 assert.deepEqual(r.unmapped,[]);
});
test('provider change requires cost, security and critical journey verification',()=>{
 const r=classifyChangedFiles(['apps/sutra/src/provider-run.js'],map);
 for(const id of ['provider-cost','security-boundary','critical-journey'])assert.ok(r.affectedSuites.includes(id));
 assert.ok(r.requiredWorkflows.includes('Validate SUTRA learner shell'));
});
test('peer runtime change carries independent consumer and security checks',()=>{
 const r=classifyChangedFiles(['packages/sutra-runtime/index.js'],map);
 for(const workflow of ['Validate SUTRA neutral consumer','Validate SUTRA learner shell','Validate SUTRA browser compatibility matrix'])assert.ok(r.requiredWorkflows.includes(workflow));
});
test('ordinary SUTRA documentation does not invalidate product metrics',()=>{
 const r=classifyChangedFiles(['docs/sutra/PROGRESS.md'],map);assert.deepEqual(r.affectedSuites,[]);assert.deepEqual(r.unmapped,[]);
});
test('new managed product areas fail classification until explicitly mapped',()=>{
 const r=classifyChangedFiles(['packages/sutra-new-boundary/index.js'],map);assert.deepEqual(r.unmapped,['packages/sutra-new-boundary/index.js']);
});
test('unsafe and ambiguous paths are rejected',()=>{
 for(const path of ['../secret','/absolute','apps\\sutra\\x.js'])assert.throws(()=>classifyChangedFiles([path],map));
});
test('metric freshness is revision-aware and does not erase historical values',()=>{
 const metric={id:'m',sourceRevision:'a'.repeat(40),invalidatedBy:['grounding-evaluation']};
 assert.equal(metricFreshness(metric,['grounding-evaluation']).status,'stale');
 assert.equal(metricFreshness(metric,['browser-matrix']).status,'current');
 assert.equal(metric.sourceRevision,'a'.repeat(40));
});
