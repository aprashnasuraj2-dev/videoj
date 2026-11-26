import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,access} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {build,verify,scan} from './build.mjs';
test('candidate builds twice with deterministic inventory and rejects tampering',async t=>{
 const root=await mkdtemp(join(tmpdir(),'sutra-kit-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const a=join(root,'a'),b=join(root,'b'),m=await build(a),n=await build(b);
 assert.equal(m.candidate,n.candidate);assert.deepEqual(m.files,n.files);assert.equal(m.artifacts.length,3);
 assert.deepEqual(await verify(a),m);
 for(const item of ['publisher-starter/packages/sutra-runtime/vendor/nsdeploy/LICENSE.txt','publisher-starter/packages/sutra-runtime/vendor/nsdeploy/NOTICE.md','evidence-validator/LICENSE','consent-inspector/LICENSE'])assert.ok(m.files.some(f=>f.path===item),item);
 await writeFile(join(a,'unexpected.txt'),'unexpected');await assert.rejects(verify(a),/inventory mismatch/);await rm(join(a,'unexpected.txt'));
 const file=join(a,'evidence-validator/index.js');await writeFile(file,Buffer.concat([await readFile(file),Buffer.from('\n// mutation\n')]));await assert.rejects(verify(a),/inventory mismatch/);
});
test('secret pattern canaries and forbidden paths fail closed',()=>{
 assert.throws(()=>scan('.env',Buffer.from('not a secret')),/Unsafe/);
 assert.throws(()=>scan('sample.txt',Buffer.from('ghp_'+'A'.repeat(40))),/rejected/);
 assert.throws(()=>scan('sample.txt',Buffer.from('-----BEGIN '+'PRIVATE KEY-----')),/rejected/);
 assert.doesNotThrow(()=>scan('example.json',Buffer.from('{"verification":"unverified"}')));
});

test('SUTRA contributor path names runnable entry points without inventing a public release or support SLA',async()=>{
 const guide=await readFile(new URL('../../docs/sutra/CONTRIBUTING.md',import.meta.url),'utf8');
 const changelog=await readFile(new URL('../../docs/sutra/CHANGELOG.md',import.meta.url),'utf8');
 for(const marker of [
  'packages/sutra-evidence/',
  'packages/sutra-consent/',
  'packages/sutra-source-tools/',
  'packages/sutra-runtime/',
  'tools/sutra-open-kit/',
  'apps/sutra/',
  'apps/sutra-peer/',
  'services/sutra-api/',
  'node docs/sutra/tools/progress.mjs check',
  'npm --prefix apps/sutra ci',
  'npm --prefix apps/sutra run build',
  'node packages/sutra-runtime/verify-vendor.mjs',
  'SECURITY.md',
  '>=22.12',
  'Vite 8.3.4',
  'Playwright 1.62.1',
  '@videojs/html@10.4.0',
  'Direct BYOK: not supported',
  'There is no guaranteed response time',
  'repository/GitHub release',
  'npm publication',
  'npm publication is optional',
  'SUTRA-P088-08'
 ])assert.ok(guide.includes(marker),marker);
 assert.match(guide,/private vulnerability reporting/i);
 assert.match(guide,/no public release/i);
 assert.match(changelog,/no public release yet/i);
 assert.match(changelog,/## Unreleased/);
 assert.match(changelog,/branch commit, CI artifact, private Open Kit candidate, staging build or proposed URL/i);
 assert.doesNotMatch(changelog,/^## \[[0-9]/m,'no version may be invented before public release');
});

test('pre-release technical report binds implementation claims to existing source paths and preserves unverified limits',async()=>{
 const report=await readFile(new URL('../../docs/sutra/Technical_Report.md',import.meta.url),'utf8');
 for(const marker of [
  'System responsibility split',
  'Public artifact resolution and peer policy',
  'Evidence validation and context filtering',
  'Reproduction commands',
  'Hosting, cache and quota model',
  'Security/privacy mechanisms and limits',
  'Current release limits / untested environments',
  'Source-to-claim index',
  'SUTRA-P085-04',
  'pre-release engineering report draft'
 ])assert.ok(report.includes(marker),marker);
 for(const rel of [
  'apps/sutra/src/main.js',
  'packages/sutra-runtime/index.js',
  'packages/sutra-evidence/index.js',
  'packages/sutra-source-tools/index.js',
  'packages/sutra-consent/index.js',
  'apps/sutra/src/provider-run.js',
  'apps/sutra/src/receipt-actions.js',
  'services/sutra-api/inference.js',
  'services/sutra-api/quota.js',
  'services/sutra-api/wrangler.jsonc',
  'apps/sutra/public/_headers',
  'deploy/sutra-pages/ingress.test.mjs',
  'docs/sutra/progress.json'
 ])await access(new URL('../../'+rel,import.meta.url));
 assert.match(report,/live funded-provider economics have \*\*not\*\* been measured/i);
 assert.match(report,/No production SUTRA hostname.*is claimed/i);
 assert.match(report,/catalog_matched.*not factual-truth/i);
 assert.doesNotMatch(report,/sutra\.aafnaipatro\.com.*(?:is live|deployed|production is active)/i);
});

test('community impact note separates reusable engineering evidence from external adoption claims',async()=>{
 const note=await readFile(new URL('../../docs/sutra/COMMUNITY_TOOLS_AND_IMPACT.md',import.meta.url),'utf8');
 for(const marker of [
  'Evidence validator',
  'Consent inspector',
  'Restricted browser runtime',
  'Source tools',
  'Publisher starter',
  'Open Kit packager',
  'Installation usability is not adoption',
  'External-builder evidence still missing',
  'Maintenance boundary',
  'Short factual contribution paragraph',
  'same-owner SUTRA caller/peer origins count as zero independent adopters',
  'CI runners count as zero external builders'
 ])assert.ok(note.includes(marker),marker);
 assert.match(note,/Current independent external adoption count: \*\*not established\*\*/);
 assert.match(note,/without a hosted-service SLA, guaranteed response time or promise of indefinite compatibility/i);
 assert.match(note,/does not yet demonstrate independent external adoption, public third-party interoperability, or production impact/i);
 assert.doesNotMatch(note,/\b[1-9][0-9]* independent (?:adopters|builders|users)\b/i);
});

test('judging availability runbook records official end conversion and avoids fake monitoring or rollback claims',async()=>{
 const note=await readFile(new URL('../../docs/sutra/JUDGING_AVAILABILITY_RUNBOOK.md',import.meta.url),'utf8');
 for(const marker of [
  'https://cognizant-agenticweb.devpost.com/rules',
  '2027-01-18 17:00 Pacific Time',
  '2027-01-19 01:00 UTC',
  '2027-01-19 06:45 Asia/Kathmandu',
  'Residual provider and infrastructure risks',
  'Manual recovery sequence after an authorized public release',
  'No scheduled-monitoring claim',
  'P089-04/P089-05 remain open',
  'production mutation'
 ])assert.ok(note.includes(marker),marker);
 assert.match(note,/no automated judging-period monitor, pager, scheduled health check or background recovery job is claimed/i);
 assert.match(note,/no authorized live funded provider sample\/economics yet/i);
 assert.match(note,/no public SUTRA production origins/i);
 assert.match(note,/does \*\*not\*\* authorize production mutation/i);
 assert.doesNotMatch(note,/rollback (?:was|has been) successfully rehearsed/i);
});
