import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
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
  'SUTRA-P088-08'
 ])assert.ok(guide.includes(marker),marker);
 assert.match(guide,/private vulnerability reporting/i);
 assert.match(guide,/no public release/i);
 assert.match(changelog,/no public release yet/i);
 assert.match(changelog,/## Unreleased/);
 assert.match(changelog,/branch commit, CI artifact, private Open Kit candidate, staging build or proposed URL/i);
 assert.doesNotMatch(changelog,/^## \[[0-9]/m,'no version may be invented before public release');
});
