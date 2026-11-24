import test from 'node:test';import assert from 'node:assert/strict';
import {prepareReleaseArtifacts,validatePreparedRelease,validateReleaseConfig,launchSpecCommit,currentSpecCommit,currentSpecBlob} from './release.mjs';
const manifest={networks:[{name:'learner',front_man:'learner',hocon:'./old/learner.json'},{name:'source_learner',front_man:'learner',hocon:'./old/source.json'},{name:'linked_learner',front_man:'learner',hocon:'./old/linked.json'}],allowed_peers:[],peer_policy:{mode:'closed'},deployment:{mode:'static'}};
const graph=name=>({metadata:{description:name},max_steps:4,tools:[{name:'learner',function:{description:'x',parameters:{type:'object'}},instructions:'x',tools:[]}]});
const graphs={learner:graph('learner'),source_learner:graph('source'),linked_learner:graph('linked')};
const links={version:1,networks:{learner:{},source_learner:{},linked_learner:{guide_peer:'https://old.invalid/agents/checklist'}}};
const config=()=>({schema:1,sourceRevision:'a'.repeat(40),publicOrigin:'https://sutra.example',peerOrigin:'https://guide.example',backend:'self_hosted',selfHostedGatewayUrl:'https://operator.example/v1/chat/completions',model:'provider/model-v1',
 liveEvidence:{status:'live_verified',backend:'self_hosted',model:'provider/model-v1',upstreamUrlSha256:'d8a0b14806289f7180a5d62f58009f9306970fadc331c7438b4505ce40b4eeb4',gatewayBuildSha256:'d'.repeat(64),sourceRevision:'a'.repeat(40),contentVersion:'lesson-v1',profileSha256:'d'.repeat(64),catalogSha256:'e'.repeat(64),transcriptSha256:'2'.repeat(64),mediaSha256:'1'.repeat(64),guideSha256:'3'.repeat(64),costEvidenceKind:'self_hosted_resource',observedAt:'2026-11-24T01:00:00Z',runRecordHash:'b'.repeat(64),costReportHash:'c'.repeat(64),usageComplete:true,noAutomaticRetries:true,judgePathPassed:true},
 budgetEvidence:{approved:true,costMode:'operator_owned',spendCeilingUsd:0,judgingReserveRuns:50,evidenceRef:'private:budget/sutra-001'},
 contentEvidence:{status:'reviewed_attested',contentVersion:'lesson-v1',profileSha256:'d'.repeat(64),catalogSha256:'e'.repeat(64),mediaSha256:'1'.repeat(64),transcriptSha256:'2'.repeat(64),guideSha256:'3'.repeat(64),intakeRecordHash:'4'.repeat(64),rightsAttested:true,factualReviewAttested:true,evidenceRef:'private:content/lesson-v1'},
 spec:{launchCommit:launchSpecCommit,compatibilityCommit:currentSpecCommit,compatibilityBlob:currentSpecBlob}});
test('release config refuses placeholders, incomplete live usage, weak reserve and stale spec pin',()=>{
 assert.equal(validateReleaseConfig(config()).model,'provider/model-v1');
 for(const mutate of [x=>x.model='mock-1',x=>x.backend='hosted',x=>x.selfHostedGatewayUrl='http://operator.example/v1/chat/completions',x=>x.liveEvidence.backend='hosted',x=>x.liveEvidence.upstreamUrlSha256='f'.repeat(64),x=>x.liveEvidence.costEvidenceKind='provider_pricing',x=>x.liveEvidence.sourceRevision='b'.repeat(40),x=>x.liveEvidence.contentVersion='other-lesson',x=>x.liveEvidence.catalogSha256='f'.repeat(64),x=>x.liveEvidence.profileSha256='f'.repeat(64),x=>x.liveEvidence.transcriptSha256='f'.repeat(64),x=>x.liveEvidence.mediaSha256='f'.repeat(64),x=>x.liveEvidence.guideSha256='f'.repeat(64),x=>x.liveEvidence.usageComplete=false,x=>x.liveEvidence.noAutomaticRetries=false,x=>x.liveEvidence.judgePathPassed=false,x=>x.budgetEvidence.judgingReserveRuns=5,x=>x.budgetEvidence.evidenceRef='https://private.example/doc',x=>x.contentEvidence.rightsAttested=false,x=>x.contentEvidence.status='pending',x=>x.contentEvidence.profileSha256='bad',x=>x.spec.compatibilityCommit='d'.repeat(40)]){
  const x=config();mutate(x);assert.throws(()=>validateReleaseConfig(x));
 }
});
test('release preparation publishes one exact funded router, one peer and model-bound immutable graphs',()=>{
 const out=prepareReleaseArtifacts({manifest,links,graphs,config:config()});
 assert.deepEqual(out.manifest.llm_router,{base_url:'https://sutra.example/api/v1',mock:false,publisher_funded:true});
 assert.equal(Object.hasOwn(out.manifest.llm_router,'byok_router'),false);assert.equal(out.manifest.deployment.runtime,'/runtime/sutra-runtime.js');assert.deepEqual(out.manifest.allowed_peers,['https://guide.example']);
 assert.equal(out.links.networks.linked_learner.guide_peer,'https://guide.example/agents/checklist');
 for(const entry of out.manifest.networks){const g=out.graphs[entry.name];assert.equal(g.graph.llm_config.model_name,'provider/model-v1');assert.match(g.sha256,/^[a-f0-9]{64}$/);assert.equal(entry.hocon,g.path);assert.match(g.path,new RegExp('^\\./release/'+g.sha256+'/'));}
 assert.equal(validatePreparedRelease(out).valid,true);
});
test('release artifact verification detects manifest, peer, graph and record drift',()=>{
 for(const mutate of [
  o=>o.manifest.networks[0].front_man='different',
  o=>o.links.networks.learner.extra='https://evil.example/agents/extra',
  o=>o.graphs.learner.graph.tools[0].instructions='Changed but bytes untouched',
  o=>o.graphs.learner.path='./release/wrong/learner.network.json',
  o=>o.manifest.llm_router.base_url='https://evil.example/v1',
  o=>o.manifest.deployment.runtime='/assets/hidden.js',
  o=>o.manifest.allowed_peers.push('https://extra.example'),
  o=>o.links.networks.linked_learner.guide_peer='https://evil.example/agents/checklist',
  o=>o.graphs.learner.graph.llm_config.model_name='other',
  o=>o.releaseRecord.recordSha256='f'.repeat(64)
 ]){const out=structuredClone(prepareReleaseArtifacts({manifest,links,graphs,config:config()}));mutate(out);assert.throws(()=>validatePreparedRelease(out));}
});
test('development manifest must remain router-free so disabled development is never mislabeled funded-ready',()=>{
 const withRouter=structuredClone(manifest);withRouter.llm_router={base_url:'https://fake.example/v1',mock:false,publisher_funded:true};
 assert.throws(()=>prepareReleaseArtifacts({manifest:withRouter,links,graphs,config:config()}),/router-free/);
});

test('hosted release mode is explicit and cannot inherit self-hosted gateway metadata',()=>{const x=config();x.backend='hosted';x.selfHostedGatewayUrl=null;x.liveEvidence.backend='hosted';x.liveEvidence.upstreamUrlSha256='82141e272189210ab931267ec91313de3460102092ac4f85b284b44db52b0caf';x.liveEvidence.gatewayBuildSha256=null;x.liveEvidence.costEvidenceKind='provider_pricing';x.budgetEvidence.costMode='provider_billed';x.budgetEvidence.spendCeilingUsd=25;assert.equal(validateReleaseConfig(x).backend,'hosted');x.selfHostedGatewayUrl='https://operator.example/v1/chat/completions';assert.throws(()=>validateReleaseConfig(x),/backend/);});
