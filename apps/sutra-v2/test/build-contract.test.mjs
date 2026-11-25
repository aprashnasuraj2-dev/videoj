import test from 'node:test';
import {assertV2StaticHeaders,guideCandidateHeaders,rootStaticPolicy,V2_STATIC_CSP,GUIDE_ORIGIN} from '../static-headers.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),app=resolve(here,'..'),legacy=resolve(app,'../sutra');
const sha=b=>createHash('sha256').update(b).digest('hex');
test('canonical built entry is SUTRA v2',async()=>{const html=await readFile(resolve(app,'dist/index.html'),'utf8');assert.match(html,/SUTRA/);assert.match(html,/Investigative Learning/);assert.match(html,/KNOWLEDGE COMPILER/);});
test('V2 stages explicit legacy fixture inputs byte-identically',async()=>{for(const rel of ['content/content-profile.json','content/source-catalog.json','transcripts/synthetic-timing.txt','media/timing-fixture.mp4']){const [a,b]=await Promise.all([readFile(resolve(app,'dist',rel)),readFile(resolve(legacy,'public',rel))]);assert.equal(sha(a),sha(b),rel);}});
test('support wasm matches generated pin and default CSP stays self-only',async()=>{const pin=(await readFile(resolve(app,'src/generated-support-pin.js'),'utf8')).match(/[a-f0-9]{64}/)?.[0];assert.ok(pin);assert.equal(sha(await readFile(resolve(app,'dist/support-lattice.wasm'))),pin);const headers=await readFile(resolve(app,'dist/_headers'),'utf8');assert.equal(rootStaticPolicy(assertV2StaticHeaders(headers)),V2_STATIC_CSP);assert.match(headers,/connect-src 'self';/);assert.doesNotMatch(headers,/sutra-guide\.aafnaipatro\.com/);});

test('V2 policy differs from legacy only by WASM permission; packaged drift fails closed',async()=>{
 const [built,source,v1]=await Promise.all([readFile(resolve(app,'dist/_headers'),'utf8'),readFile(resolve(app,'_headers'),'utf8'),readFile(resolve(legacy,'public/_headers'),'utf8')]);
 assert.equal(built,source);
 assert.equal(built,v1.replace("script-src 'self';","script-src 'self' 'wasm-unsafe-eval';"));
 assert.doesNotMatch(v1,/wasm-unsafe-eval/);
 for(const mutant of [v1,built.replace("'wasm-unsafe-eval'","'unsafe-eval'"),built.replace("connect-src 'self';","connect-src *;"),built.replace("frame-ancestors 'none'","frame-ancestors *"),built.replace("object-src 'none'","object-src *")]){
  assert.throws(()=>assertV2StaticHeaders(mutant));assert.throws(()=>guideCandidateHeaders(mutant));
 }
 const candidate=guideCandidateHeaders(built);
 assert.equal(candidate,built.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";"));
 assert.equal(rootStaticPolicy(candidate),V2_STATIC_CSP.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";"));
 assert.throws(()=>guideCandidateHeaders(candidate));
});
