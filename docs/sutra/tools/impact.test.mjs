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

test('guide fixtures and executable tests are explicitly classified while markdown remains documentation-only',()=>{
 const guide=classifyChangedFiles(['apps/sutra/public/guides/example.html'],map);
 assert.ok(guide.affectedSuites.includes('grounding-evaluation'));assert.ok(guide.affectedSuites.includes('publication-integrity'));assert.deepEqual(guide.unmapped,[]);
 const tests=classifyChangedFiles(['apps/sutra/test/hero-browser.cjs'],map);
 assert.deepEqual(tests.unmapped,[]);assert.ok(tests.affectedSuites.includes('verification-tests'));
 const docs=classifyChangedFiles(['apps/sutra/README.md'],map);assert.deepEqual(docs.unmapped,[]);
});

test('expensive browser/evaluation workflows do not use catch-all app or package triggers',()=>{
 const matrix=fs.readFileSync(new URL('../../../.github/workflows/sutra-browser-matrix.yml',import.meta.url),'utf8');
 const evaluation=fs.readFileSync(new URL('../../../.github/workflows/sutra-evaluation.yml',import.meta.url),'utf8');
 assert.doesNotMatch(matrix,/apps\/sutra\/\*\*/);assert.doesNotMatch(matrix,/packages\/sutra-\*\/\*\*/);
 assert.match(matrix,/apps\/sutra\/src\/\*\*/);assert.match(matrix,/packages\/sutra-runtime\/\*\*/);
 assert.doesNotMatch(evaluation,/apps\/sutra\/\*\*/);assert.doesNotMatch(evaluation,/packages\/sutra-\*\/\*\*/);
 assert.match(evaluation,/apps\/sutra\/src\/comparison\.js/);assert.match(evaluation,/tools\/sutra-evaluation\/\*\*/);
});

test('provider measurement tooling is mapped to provider-cost revalidation rather than treated as orphan code',()=>{
 const r=classifyChangedFiles(['tools/sutra-provider-measurement/report.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('provider-cost'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA provider measurement gate'));assert.ok(r.invalidatedMetrics.includes('provider_cost'));
});

test('specialized expensive workflows gate jobs on revision-bound metric freshness for long-lived PRs',()=>{
 const matrix=fs.readFileSync(new URL('../../../.github/workflows/sutra-browser-matrix.yml',import.meta.url),'utf8');
 const evaluation=fs.readFileSync(new URL('../../../.github/workflows/sutra-evaluation.yml',import.meta.url),'utf8');
 assert.match(matrix,/desktop_browser_matrix/);assert.match(matrix,/needs: freshness/);assert.match(matrix,/run_matrix/);assert.match(matrix,/workflow_dispatch/);
 assert.match(evaluation,/engineering_baseline/);assert.match(evaluation,/needs: freshness/);assert.match(evaluation,/run_evaluation/);assert.match(evaluation,/workflow_dispatch/);
 for(const text of [matrix,evaluation]){assert.match(text,/fetch-depth: 0/);assert.match(text,/github\.event\.pull_request\.head\.sha/);assert.match(text,/impact\.mjs --metrics/);}
});

test('user-study readiness tooling is explicitly mapped without inventing a participant metric',()=>{
 const r=classifyChangedFiles(['tools/sutra-user-study/study.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('user-study-readiness'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA user-study scoring gate'));assert.deepEqual(r.invalidatedMetrics,[]);
});

test('outside-builder readiness tooling is explicitly mapped without inventing adoption evidence',()=>{
 const r=classifyChangedFiles(['tools/sutra-builder-trial/trial.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('builder-trial-readiness'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA outside-builder trial gate'));assert.deepEqual(r.invalidatedMetrics,[]);
});

test('physical-device readiness tooling is mapped without turning emulation into physical evidence',()=>{
 const r=classifyChangedFiles(['tools/sutra-device-check/device.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('physical-device-readiness'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA physical-device evidence gate'));assert.deepEqual(r.invalidatedMetrics,[]);
});

test('real-content intake tooling is mapped without converting rights declarations into verified rights',()=>{
 const r=classifyChangedFiles(['tools/sutra-content-intake/intake.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('content-intake-readiness'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA real-content intake gate'));assert.deepEqual(r.invalidatedMetrics,[]);
});

test('screen-reader readiness tooling is mapped without converting automated audits into human AT evidence',()=>{
 const r=classifyChangedFiles(['tools/sutra-screenreader-check/screenreader.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('screenreader-readiness'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA screen-reader evidence gate'));assert.deepEqual(r.invalidatedMetrics,[]);
});

test('release-candidate tooling is mapped without turning templates into release evidence',()=>{
 const r=classifyChangedFiles(['tools/sutra-release-candidate/release.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('release-candidate-readiness'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA release-candidate artifact gate'));assert.deepEqual(r.invalidatedMetrics,[]);
});

test('standalone runtime build configuration is explicitly mapped to browser, performance and publication evidence',()=>{
 const r=classifyChangedFiles(['apps/sutra/vite.runtime.config.js'],map);
 assert.deepEqual(r.unmapped,[]);
 for(const id of ['browser-matrix','performance-profile','publication-integrity'])assert.ok(r.affectedSuites.includes(id),id);
 for(const metric of ['desktop_browser_matrix','lab_performance','publication_inventory'])assert.ok(r.invalidatedMetrics.includes(metric),metric);
});

test('shared content profile changes invalidate every evidence family that depends on lesson bytes/context',()=>{
 const r=classifyChangedFiles(['packages/sutra-content-profile/index.js','apps/sutra/public/content/content-profile.json'],map);
 assert.deepEqual(r.unmapped,[]);
 for(const id of ['grounding-evaluation','critical-journey','browser-matrix','performance-profile','provider-cost','publication-integrity'])assert.ok(r.affectedSuites.includes(id),id);
 for(const metric of ['engineering_baseline','hero_journey','desktop_browser_matrix','lab_performance','provider_cost','publication_inventory'])assert.ok(r.invalidatedMetrics.includes(metric),metric);
});

test('published transcript byte changes invalidate semantic, browser, performance, cost and publication evidence',()=>{
 const r=classifyChangedFiles(['apps/sutra/public/transcripts/lesson.txt'],map);
 assert.deepEqual(r.unmapped,[]);
 for(const id of ['grounding-evaluation','critical-journey','browser-matrix','performance-profile','provider-cost','publication-integrity'])assert.ok(r.affectedSuites.includes(id),id);
 for(const metric of ['engineering_baseline','hero_journey','desktop_browser_matrix','lab_performance','provider_cost','publication_inventory'])assert.ok(r.invalidatedMetrics.includes(metric),metric);
});

test('reviewed-content pack compiler is mapped to every content-sensitive evidence family',()=>{
 const r=classifyChangedFiles(['tools/sutra-content-pack/pack.mjs'],map);
 assert.deepEqual(r.unmapped,[]);assert.ok(r.affectedSuites.includes('content-pack-readiness'));assert.ok(r.requiredWorkflows.includes('Validate SUTRA reviewed content pack compiler'));
 for(const metric of ['engineering_baseline','hero_journey','desktop_browser_matrix','lab_performance','provider_cost','publication_inventory'])assert.ok(r.invalidatedMetrics.includes(metric),metric);
});

test('local action implementation changes trigger both its standalone tests and learner verification',()=>{
 const r=classifyChangedFiles(['packages/sutra-actions/index.js'],map);
 assert.ok(r.requiredWorkflows.includes('Validate SUTRA learner shell'));
 const workflow=fs.readFileSync(new URL('../../../.github/workflows/sutra-shell.yml',import.meta.url),'utf8');
 assert.equal((workflow.match(/packages\/sutra-actions\/\*\*/g)||[]).length,2);
 assert.match(workflow,/packages\/sutra-actions\/test\/\*\.test\.mjs/);
});
