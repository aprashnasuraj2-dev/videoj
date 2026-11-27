import test from 'node:test';
import {assertV2StaticHeaders,guideCandidateHeaders,rootStaticPolicy,V2_STATIC_CSP,GUIDE_ORIGIN} from '../static-headers.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFile,access} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),app=resolve(here,'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
test('canonical built entry is SUTRA v2',async()=>{const html=await readFile(resolve(app,'dist/index.html'),'utf8');assert.match(html,/SUTRA/);assert.match(html,/Debugger for conclusions/);assert.match(html,/KNOWLEDGE COMPILER/);});
test('V2 does not publish retired lesson or media fixtures',async()=>{for(const rel of ['content/content-profile.json','content/source-catalog.json','transcripts/synthetic-timing.txt','media/timing-fixture.mp4'])await assert.rejects(access(resolve(app,'dist',rel)),{code:'ENOENT'});});
test('support wasm matches generated pin and default CSP stays self-only',async()=>{const pin=(await readFile(resolve(app,'src/generated-support-pin.js'),'utf8')).match(/[a-f0-9]{64}/)?.[0];assert.ok(pin);assert.equal(sha(await readFile(resolve(app,'dist/support-lattice.wasm'))),pin);const headers=await readFile(resolve(app,'dist/_headers'),'utf8');assert.equal(rootStaticPolicy(assertV2StaticHeaders(headers)),V2_STATIC_CSP);assert.match(headers,/connect-src 'self';/);assert.doesNotMatch(headers,/sutra-guide\.aafnaipatro\.com/);});

test('V2 requires scoped WASM permission; packaged drift fails closed',async()=>{
 const [built,source]=await Promise.all([readFile(resolve(app,'dist/_headers'),'utf8'),readFile(resolve(app,'_headers'),'utf8')]);
 const withoutWasm=source.replace(" 'wasm-unsafe-eval'",'');
 assert.equal(built,source);
 assert.equal(built,withoutWasm.replace("script-src 'self';","script-src 'self' 'wasm-unsafe-eval';"));
 assert.doesNotMatch(withoutWasm,/wasm-unsafe-eval/);
 for(const mutant of [withoutWasm,built.replace("'wasm-unsafe-eval'","'unsafe-eval'"),built.replace("connect-src 'self';","connect-src *;"),built.replace("frame-ancestors 'none'","frame-ancestors *"),built.replace("object-src 'none'","object-src *")]){
  assert.throws(()=>assertV2StaticHeaders(mutant));assert.throws(()=>guideCandidateHeaders(mutant));
 }
 const candidate=guideCandidateHeaders(built);
 assert.equal(candidate,built.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";"));
 assert.equal(rootStaticPolicy(candidate),V2_STATIC_CSP.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";"));
 assert.throws(()=>guideCandidateHeaders(candidate));
});

test('standalone Python verifier is byte-reproducible, inspectable and bound to exact source',async()=>{
 const archive=resolve(app,'dist/sutra-proof-verifier.pyz'),pin=archive+'.sha256';
 const bytes=await readFile(archive),expected=await readFile(pin,'ascii');assert.equal(expected,'sha256:'+sha(bytes)+'\n');
 const html=await readFile(resolve(app,'dist/index.html'),'utf8');assert.match(html,/href="\.\/sutra-proof-verifier\.pyz" download/);assert.match(html,/href="\.\/sutra-proof-verifier\.pyz\.sha256" download/);
 const checked=spawnSync('python3',[resolve(app,'../../packages/sutra-knowledge/reference/test_offline_verifier.py'),'--build-only',archive,pin],{encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr||String(checked.error));assert.match(checked.stdout,/exact source manifest and deterministic rebuild verified/);
});

test('canonical V2 build publishes its own portable investigation graph',async()=>{const {compileNetwork}=await import('../../../packages/sutra-runtime/index.js');const manifest=JSON.parse(await readFile(resolve(app,'dist/agents/agent-manifest.json'),'utf8'));assert.equal(manifest.networks.length,1);const entry=manifest.networks[0];assert.equal(entry.name,'investigation');assert.equal(entry.front_man,'planner');const definition=JSON.parse(await readFile(resolve(app,'dist/agents',entry.hocon),'utf8'));assert.equal(definition.tools.length,2);assert.deepEqual(definition.tools[0].tools,['critic']);assert.equal(compileNetwork(definition,{name:entry.name,frontMan:entry.front_man}).frontMan,'planner');});

test('CORS is restricted to the two public data artifacts, never private API or wildcard',async()=>{const headers=await readFile(resolve(app,'dist/_headers'),'utf8');assertV2StaticHeaders(headers);for(const path of ['/agents/agent-manifest.json','/agents/investigation.network.json'])assert.ok(headers.includes(path+'\n  Access-Control-Allow-Origin: *'));for(const changed of [headers.replace('/agents/agent-manifest.json\n  Access-Control-Allow-Origin: *','/api/*\n  Access-Control-Allow-Origin: *'),headers.replace('/agents/investigation.network.json\n  Access-Control-Allow-Origin: *','/agents/*\n  Access-Control-Allow-Origin: *'),headers.replace('Access-Control-Allow-Origin: *','Access-Control-Allow-Credentials: true'),headers.replace('  Access-Control-Allow-Origin: *\n','')])assert.throws(()=>assertV2StaticHeaders(changed));});
