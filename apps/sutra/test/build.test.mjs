import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import config from '../vite.config.js';
import runtimeConfig from '../vite.runtime.config.js';
const app=fileURLToPath(new URL('../',import.meta.url));
test('output remains inside isolated app',()=>assert.equal(config.build.outDir,path.join(app,'dist')));
test('Vite root does not depend on preview app',()=>{assert.equal(config.root,app);assert.equal(runtimeConfig.root,app);assert.equal(runtimeConfig.build.emptyOutDir,false);assert.equal(runtimeConfig.publicDir,false);});
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

test('manifest graph paths equal current Git blob identities and retain byte-identical immutable copies',async()=>{
 const {createHash}=await import('node:crypto');
 const manifest=JSON.parse(fs.readFileSync(path.join(app,'public/agents/agent-manifest.json')));
 for(const entry of manifest.networks){
  const canonical=path.join(app,'public/agents',entry.name+'.network.json');
  const canonicalBytes=fs.readFileSync(canonical);
  const blob=createHash('sha1').update(Buffer.from(`blob ${canonicalBytes.length}\0`)).update(canonicalBytes).digest('hex');
  const declared=new URL(entry.hocon,'https://sutra.test/agents/');
  assert.equal(declared.pathname,`/agents/v/${blob}/${entry.name}.network.json`,`${entry.name} path must change whenever canonical graph bytes change`);
  const versioned=fs.readFileSync(path.join(app,'public',declared.pathname));
  assert.deepEqual(versioned,canonicalBytes,`${entry.name} versioned graph must exactly match canonical source`);
 }
});


test('static _headers security boundary matches default Worker API policy and keeps assets off Worker-first path',async()=>{
 const {securityHeaders}=await import('../../../services/sutra-api/worker.js');
 const lines=fs.readFileSync(path.join(app,'public/_headers'),'utf8').split(/\r?\n/);
 const actual={};let wildcard=false;
 for(const line of lines){
  if(line.trim()==='/*'){wildcard=true;continue;}
  if(wildcard&&!/^\s/.test(line)&&line.trim())break;
  if(!wildcard||!line.trim())continue;
  const colon=line.indexOf(':');if(colon>0)actual[line.slice(0,colon).trim()]=line.slice(colon+1).trim();
 }
 const expected=securityHeaders({});
 for(const [key,value] of Object.entries(expected))assert.equal(actual[key],value,`${key} must not drift between static and API policy`);
 const wrangler=JSON.parse(fs.readFileSync(path.join(app,'../../services/sutra-api/wrangler.jsonc')));
 assert.deepEqual(wrangler.assets.run_worker_first,['/api/*']);
 assert.equal(wrangler.vars.SUTRA_PEER_ORIGINS,'');
});


test('first-party browser storage is limited to explicit local state controllers',()=>{
 const roots=[
  path.join(app,'src'),
  path.join(app,'../../packages/sutra-inference'),
  path.join(app,'../../packages/sutra-runtime'),
  path.join(app,'../../packages/sutra-consent')
 ];
 const files=[];
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='vendor'&&entry.name!=='node_modules')walk(full);}else if(/\.(?:js|mjs)$/.test(entry.name))files.push(full);}};
 for(const root of roots)walk(root);
 const hits=[];
 for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  for(const marker of ['localStorage','sessionStorage','indexedDB','document.cookie'])if(text.includes(marker))hits.push({file:path.relative(app,file),marker});
 }
 assert.deepEqual(hits,[{file:'src/main.js',marker:'localStorage'},{file:'src/workspace-integration.js',marker:'localStorage'}]);
});


test('linked publication contains exact aliases and no peer-owned inference routing',async()=>{
 const {resolveSymbolicPeerLinks,compileNetwork}=await import('../../../packages/sutra-runtime/index.js');
 const manifest=JSON.parse(fs.readFileSync(path.join(app,'public/agents/agent-manifest.json')));
 const links=JSON.parse(fs.readFileSync(path.join(app,'public/agents/links.json')));
 const linked=JSON.parse(fs.readFileSync(path.join(app,'public/agents/linked_learner.network.json')));
 const result=resolveSymbolicPeerLinks(linked,links,'linked_learner');
 assert.deepEqual(result.tools[0].tools,['https://sutra-guide.aafnaipatro.com/agents/checklist']);
 assert.throws(()=>compileNetwork(linked,{name:'linked_learner'}),e=>e.code==='REFERENCE');
 assert.throws(()=>compileNetwork(result,{name:'linked_learner'}),e=>e.code==='REFERENCE');
 compileNetwork(result,{name:'linked_learner',allowPeers:true});
 assert.deepEqual(manifest.peer_policy,{mode:'closed'});
 for(const publicDoc of [manifest,links])for(const field of ['apiKey','inference','router','modelOverride','credentials'])assert.equal(Object.hasOwn(publicDoc,field),false);
});

test('generated inventory exactly binds manifest, links, graphs and built runtime bytes',async()=>{
 const {createInventory}=await import('../tools/publication-inventory.mjs');
 const stored=JSON.parse(fs.readFileSync(path.join(app,'dist/agents/artifact-inventory.json')));
 assert.deepEqual(stored,await createInventory());
 assert.deepEqual(stored.networks.map(n=>n.name),['learner','source_learner','linked_learner']);
 assert.ok(stored.runtimePaths.some(p=>p.endsWith('.js')));assert.equal(stored.inferenceDiscoveryPath,'/api/status');
 assert.ok(stored.artifacts.every(a=>/^[0-9a-f]{64}$/.test(a.sha256)&&a.bytes>0));
 assert.ok(stored.artifacts.every(a=>a.path.startsWith('/agents/')||a.path.startsWith('/assets/')||a.path.startsWith('/runtime/')));
});

test('synthetic written comparison link is byte-bound to the published guide and exact anchor excerpt',async()=>{
 const {createHash}=await import('node:crypto');
 const {syntheticComparison}=await import('../src/comparison.js');
 const claim=syntheticComparison.guide;
 assert.match(claim.sourceHash,/^[a-f0-9]{64}$/);assert.match(claim.sourceHref,/^\.\/guides\//);
 const [file,fragment]=claim.sourceHref.slice(2).split('#');
 const bytes=fs.readFileSync(path.join(app,'public',file));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),claim.sourceHash);
 const text=bytes.toString('utf8');assert.ok(fragment);assert.ok(text.includes('id="'+fragment+'"')||text.includes("id='"+fragment+"'"));
 assert.ok(text.includes(claim.excerpt));assert.match(text,/not a real publisher, reviewed guide, factual authority/);
});

test('direct BYOK is intentionally absent from the learner client boundary',()=>{
 const source=fs.readFileSync(path.join(app,'src/main.js'),'utf8')+fs.readFileSync(path.join(app,'src/provider-panel.js'),'utf8')+fs.readFileSync(path.join(app,'src/provider-run.js'),'utf8');
 assert.doesNotMatch(source,/<input[^>]*(?:api[-_ ]?key|token|credential)/i);
 assert.doesNotMatch(source,/<textarea[^>]*(?:api[-_ ]?key|token|credential)/i);
 assert.doesNotMatch(source,/localStorage\.(?:setItem|getItem)\([^)]*(?:key|token|credential)/i);
 assert.match(source,/No personal API key is accepted/);
 assert.match(source,/Direct BYOK is not supported/);
});

test('built candidate exposes a stable public browser runtime module backed by the same restricted runtime code',async()=>{
 const runtimePath=path.join(app,'dist/runtime/sutra-runtime.js');assert.ok(fs.existsSync(runtimePath));
 const mod=await import(pathToFileURL(runtimePath).href+'?t='+Date.now());
 for(const name of ['compileNetwork','executionLimits','loadLocalNetwork','loadPeerNetwork','resolveSymbolicPeerLinks','runNetwork','createProviderAdapter','createConsentInspector','createLocalActionRegistry','LocalActionError'])assert.equal(typeof mod[name],'function',name);
 assert.deepEqual(mod.sutraRuntimeProfile,{name:'sutra-restricted-browser-runtime',version:'0.1.0',execution:'browser',networkFormat:'resolved-neuro-san-json',defaultInference:'publisher-funded-optional-until-release',byok:false,truthGuarantee:'none'});
 const inventory=JSON.parse(fs.readFileSync(path.join(app,'dist/agents/artifact-inventory.json'),'utf8'));
 assert.equal(inventory.publicRuntimePath,'/runtime/sutra-runtime.js');
 const entry=inventory.artifacts.find(x=>x.path==='/runtime/sutra-runtime.js');assert.equal(entry.kind,'browser_runtime');assert.match(entry.sha256,/^[a-f0-9]{64}$/);
});

test('reviewed guide excerpt route has a defense-in-depth no-execution header policy',()=>{
 const lines=fs.readFileSync(path.join(app,'public/_headers'),'utf8').split(/\r?\n/);
 const headers={};let active=false;
 for(const line of lines){
  if(line.trim()==='/guides/release/*'){active=true;continue;}
  if(active&&!/^\s/.test(line)&&line.trim())break;
  if(!active||!line.trim())continue;
  const colon=line.indexOf(':');if(colon>0)headers[line.slice(0,colon).trim()]=line.slice(colon+1).trim();
 }
 assert.equal(headers['Content-Security-Policy'],"default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'none'; style-src 'none'; img-src 'none'; media-src 'none'; font-src 'none'; connect-src 'none'");
 assert.equal(headers['Referrer-Policy'],'no-referrer');assert.equal(headers['X-Content-Type-Options'],'nosniff');assert.equal(headers['X-Frame-Options'],'DENY');
 assert.equal(headers['Cache-Control'],'public, max-age=31536000, immutable');
});
