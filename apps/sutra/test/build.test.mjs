import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import config from '../vite.config.js';
const app=fileURLToPath(new URL('../',import.meta.url));
test('output remains inside isolated app',()=>assert.equal(config.build.outDir,path.join(app,'dist')));
test('Vite root does not depend on preview app',()=>assert.equal(config.root,app));
test('built bundle exists with relative assets',()=>{const html=fs.readFileSync(path.join(app,'dist/index.html'),'utf8');assert.match(html,/\.\/assets\//);});
test('source imports evidence but no preview or DETOUR modules',()=>{const s=fs.readFileSync(path.join(app,'src/main.js'),'utf8');assert.match(s,/packages\/sutra-evidence/);assert.doesNotMatch(s,/apps\/preview|detour\/|videojs\(/);});
test('shared Video.js runtime is resolved from the app dependency boundary',()=>{assert.ok(config.resolve.dedupe.includes('@videojs/html'));const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json')));assert.equal(pkg.dependencies['@videojs/html'],'10.4.0');assert.equal(pkg.dependencies['@videojs/mux-video'],'10.4.0');});
test('timing fixture metadata matches actual media bytes and cue receipt',async()=>{const {createHash}=await import('node:crypto');const {validateReceipt}=await import('../../../packages/sutra-evidence/index.js');const meta=JSON.parse(fs.readFileSync(path.join(app,'src/fixtures/timing-source.json')));const bytes=fs.readFileSync(path.join(app,'public/media/timing-fixture.mp4'));assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.source.mediaHash);assert.equal(validateReceipt(meta.receipt,{sources:[meta.source]}).level,'catalog_matched');});
test('published local graph matches independent runtime example',()=>{assert.deepEqual(JSON.parse(fs.readFileSync(path.join(app,'public/agents/learner.network.json'))),JSON.parse(fs.readFileSync(path.join(app,'../../packages/sutra-runtime/examples/learner.network.json'))));});
test('client assets exclude server credential/config identifiers and fixed paid upstream',()=>{for(const name of fs.readdirSync(path.join(app,'dist/assets'))){if(!name.endsWith('.js'))continue;const content=fs.readFileSync(path.join(app,'dist/assets',name),'utf8');for(const marker of ['SUTRA_PROVIDER_KEY','SUTRA_CLIENT_HASH_SECRET','SERVER_ONLY_KEY_MARKER','https://api.openai.com/v1/chat/completions'])assert.ok(!content.includes(marker),`server-only marker leaked into ${name}`);}});

test('built learner has no third-party advertising or analytics script surface',()=>{
 const html=fs.readFileSync(path.join(app,'dist/index.html'),'utf8');
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:\/\//i);
 assert.doesNotMatch(html,/<link[^>]+href=["']https?:\/\//i);
 const markers=['googletagmanager.com','google-analytics.com','doubleclick.net','adsbygoogle','connect.facebook.net','hotjar.com','segment.com'];
 for(const name of fs.readdirSync(path.join(app,'dist/assets'))){
  if(!name.endsWith('.js'))continue;
  const content=fs.readFileSync(path.join(app,'dist/assets',name),'utf8').toLowerCase();
  for(const marker of markers)assert.ok(!content.includes(marker),`third-party analytics/ad marker ${marker} found in ${name}`);
 }
});

test('manifest graph cache versions equal current Git blob identities',async()=>{
 const {createHash}=await import('node:crypto');
 const manifest=JSON.parse(fs.readFileSync(path.join(app,'public/agents/agent-manifest.json')));
 for(const entry of manifest.networks){
  const declared=new URL(entry.hocon,'https://sutra.test/agents/');
  const file=path.join(app,'public',declared.pathname);
  const bytes=fs.readFileSync(file);
  const blob=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  assert.equal(declared.searchParams.get('v'),blob,`${entry.name} version must change whenever graph bytes change`);
 }
});
