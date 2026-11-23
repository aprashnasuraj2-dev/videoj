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

test('public manifest keeps inference metadata separate from peer policy',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(app,'public/agents/agent-manifest.json')));
 assert.equal(manifest.llm_router.base_url,'/api/infer');
 assert.equal(manifest.llm_router.byok_router,'https://openrouter.ai/api/v1');
 assert.equal(manifest.llm_router.mock,false);
 assert.deepEqual(manifest.allowed_peers,[]);
 assert.deepEqual(manifest.peer_policy,{mode:'closed'});
 assert.equal(JSON.stringify(manifest).includes('SUTRA_PROVIDER_KEY'),false);
});
test('publisher links map is exact and does not fabricate an unresolved peer binding',()=>{
 const links=JSON.parse(fs.readFileSync(path.join(app,'public/agents/links.json')));
 assert.deepEqual(links,{version:1,networks:{learner:{},source_learner:{}}});
});
test('pre-release artifact inventory names all bundled public agent surfaces',()=>{
 const inventory=fs.readFileSync(path.join(app,'../../docs/sutra/PUBLIC_ARTIFACT_INVENTORY.md'),'utf8');
 for(const marker of ['/agents/agent-manifest.json','/agents/learner.network.json','/agents/source_learner.network.json','/agents/links.json','/api/infer','/api/source-tools'])assert.ok(inventory.includes(marker),marker);
 assert.match(inventory,/peer public origin is intentionally \*\*unset\*\*/i);
 assert.match(inventory,/not deployment evidence/i);
});

test('learner UI exposes composition budget category and labels partial output incomplete',()=>{
 const source=fs.readFileSync(path.join(app,'src/main.js'),'utf8');
 assert.match(source,/COMPOSITION_LIMIT/);
 assert.match(source,/Incomplete partial output/);
 assert.match(source,/No completed (?:peer )?result is claimed/);
});
