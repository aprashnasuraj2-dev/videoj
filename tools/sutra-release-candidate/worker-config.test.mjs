import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {renderWorkerConfig} from './worker-config.mjs';import {launchSpecCommit,currentSpecCommit,currentSpecBlob} from './release.mjs';
const base=()=>JSON.parse(fs.readFileSync(new URL('../../services/sutra-api/wrangler.private.jsonc',import.meta.url),'utf8'));
const cfg=()=>({schema:1,sourceRevision:'a'.repeat(40),publicOrigin:'https://sutra.example',peerOrigin:'https://guide.example',backend:'self_hosted',selfHostedGatewayUrl:'https://operator.example/v1/chat/completions',model:'provider/model-v1',liveEvidence:{status:'live_verified',backend:'self_hosted',model:'provider/model-v1',observedAt:'2026-11-24T01:00:00Z',runRecordHash:'b'.repeat(64),costReportHash:'c'.repeat(64),usageComplete:true,judgePathPassed:true},budgetEvidence:{approved:true,costMode:'operator_owned',spendCeilingUsd:0,judgingReserveRuns:50,evidenceRef:'private:budget/sutra-001'},contentEvidence:{status:'reviewed_attested',contentVersion:'lesson-v1',profileSha256:'d'.repeat(64),catalogSha256:'e'.repeat(64),mediaSha256:'1'.repeat(64),transcriptSha256:'2'.repeat(64),guideSha256:'3'.repeat(64),intakeRecordHash:'4'.repeat(64),rightsAttested:true,factualReviewAttested:true,evidenceRef:'private:content/lesson-v1'},spec:{launchCommit:launchSpecCommit,compatibilityCommit:currentSpecCommit,compatibilityBlob:currentSpecBlob}});
test('renderer binds exact release origin/model/peer while preserving bounded policy and excluding secrets',()=>{
 const r=renderWorkerConfig({baseConfig:base(),releaseConfig:cfg()});
 assert.equal(r.config.vars.SUTRA_ENABLE_INFERENCE,'true');assert.equal(r.config.vars.SUTRA_INFERENCE_BACKEND,'self_hosted');assert.equal(r.config.vars.SUTRA_SELF_HOSTED_UPSTREAM_URL,'https://operator.example/v1/chat/completions');assert.equal(r.config.vars.SUTRA_ALLOWED_ORIGIN,'https://sutra.example');assert.equal(r.config.vars.SUTRA_MODELS,'provider/model-v1');assert.equal(r.config.vars.SUTRA_PEER_ORIGINS,'https://guide.example');
 assert.equal(r.config.workers_dev,false);assert.equal(r.config.preview_urls,false);assert.equal(Object.hasOwn(r.config.vars,'SUTRA_PROVIDER_KEY'),false);assert.equal(Object.hasOwn(r.config.vars,'SUTRA_CLIENT_HASH_SECRET'),false);
 assert.equal(r.record.backend,'self_hosted');assert.equal(r.record.upstreamSha256,'d8a0b14806289f7180a5d62f58009f9306970fadc331c7438b4505ce40b4eeb4');assert.deepEqual(r.record.requiredSecretBindings,['SUTRA_SELF_HOSTED_TOKEN','SUTRA_CLIENT_HASH_SECRET']);assert.match(r.record.recordHash,/^[a-f0-9]{64}$/);
});
test('renderer refuses public secret vars, unsafe quota envelopes and release/model drift',()=>{
 for(const mutate of [
  b=>b.vars.SUTRA_PROVIDER_KEY='secret',
  b=>b.vars.SUTRA_SELF_HOSTED_TOKEN='secret',
  b=>b.vars.SUTRA_MAX_CONCURRENT='99',
  b=>b.vars.SUTRA_MAX_CLIENT_CALLS='101',
  b=>b.vars.SUTRA_MAX_DAILY_OUTPUT_TOKENS='999999'
 ]){const b=base();mutate(b);assert.throws(()=>renderWorkerConfig({baseConfig:b,releaseConfig:cfg()}));}
 const c=cfg();c.model='mock-1';assert.throws(()=>renderWorkerConfig({baseConfig:base(),releaseConfig:c}));
});

test('hosted renderer requires an explicit hosted release and removes stale self-hosted gateway state',()=>{const c=cfg();c.backend='hosted';c.selfHostedGatewayUrl=null;c.liveEvidence.backend='hosted';c.budgetEvidence.costMode='provider_billed';c.budgetEvidence.spendCeilingUsd=25;const b=base();b.vars.SUTRA_SELF_HOSTED_UPSTREAM_URL='https://stale.example/v1/chat/completions';const r=renderWorkerConfig({baseConfig:b,releaseConfig:c});assert.equal(r.config.vars.SUTRA_INFERENCE_BACKEND,'hosted');assert.equal(Object.hasOwn(r.config.vars,'SUTRA_SELF_HOSTED_UPSTREAM_URL'),false);assert.deepEqual(r.record.requiredSecretBindings,['SUTRA_PROVIDER_KEY','SUTRA_CLIENT_HASH_SECRET']);});
