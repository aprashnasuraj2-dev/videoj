import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../../docs/sutra-v2/evaluation/',import.meta.url);
test('research register preserves all mandated references, evidence scope and falsification targets',async()=>{
 const r=JSON.parse(await readFile(new URL('prior-art.json',root),'utf8')),md=await readFile(new URL('PRIOR_ART.md',root),'utf8');
 assert.equal(r.schemaVersion,1);assert.match(r.scope,/not exhaustive/);assert.match(r.claimPolicy,/No comparative superiority/);
 assert.ok(r.sources.length>=9);assert.ok(r.uncovered.length>0);
 assert.equal(new Set(r.sources.map(s=>s.id)).size,r.sources.length);assert.equal(new Set(r.sources.map(s=>s.url)).size,r.sources.length);
 const required=['https://aclanthology.org/2025.findings-acl.863/','https://aclanthology.org/2023.emnlp-main.425/','https://aclanthology.org/2022.findings-acl.28/','https://aclanthology.org/Q15-1041/'];
 for(const url of required)assert.ok(r.sources.some(s=>s.url===url));
 for(const s of r.sources){
  assert.match(s.id,/^PA\d\d$/);assert.equal(new URL(s.url).protocol,'https:');
  for(const field of ['title','authors','level','known','sutra','test','gap'])assert.ok(typeof s[field]==='string'&&s[field].trim().length>(field==='authors'?0:10),s.id+' '+field);
  assert.ok(md.includes(s.url),s.id);assert.ok(md.includes(s.test),s.id);assert.ok(md.includes(s.gap),s.id);
 }
});
