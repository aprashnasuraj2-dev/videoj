import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {build,verify,scan} from './build.mjs';
test('candidate builds twice with deterministic inventory and rejects tampering',async t=>{
 const root=await mkdtemp(join(tmpdir(),'sutra-kit-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const a=join(root,'a'),b=join(root,'b'),m=await build(a),n=await build(b);
 assert.equal(m.candidate,n.candidate);assert.deepEqual(m.files,n.files);assert.equal(m.artifacts.length,3);
 assert.deepEqual(await verify(a),m);
 for(const item of ['publisher-starter/packages/sutra-runtime/vendor/nsdeploy/LICENSE.txt','publisher-starter/packages/sutra-runtime/vendor/nsdeploy/NOTICE.md','evidence-validator/LICENSE','evidence-validator/annotation.js','consent-inspector/LICENSE'])assert.ok(m.files.some(f=>f.path===item),item);
 await writeFile(join(a,'unexpected.txt'),'unexpected');await assert.rejects(verify(a),/inventory mismatch/);await rm(join(a,'unexpected.txt'));
 const file=join(a,'evidence-validator/index.js');await writeFile(file,Buffer.concat([await readFile(file),Buffer.from('\n// mutation\n')]));await assert.rejects(verify(a),/inventory mismatch/);
});
test('secret pattern canaries and forbidden paths fail closed',()=>{
 assert.throws(()=>scan('.env',Buffer.from('not a secret')),/Unsafe/);
 assert.throws(()=>scan('sample.txt',Buffer.from('ghp_'+'A'.repeat(40))),/rejected/);
 assert.throws(()=>scan('sample.txt',Buffer.from('-----BEGIN '+'PRIVATE KEY-----')),/rejected/);
 assert.doesNotThrow(()=>scan('example.json',Buffer.from('{"verification":"unverified"}')));
});

test('neutral caller consumes the extracted evidence kit without source checkout imports or credentials',async t=>{
 const root=await mkdtemp(join(tmpdir(),'sutra-kit-consumer-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const kit=join(root,'kit');await build(kit);
 const caller=join(root,'consumer.mjs');
 await writeFile(caller,`import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateReceipt,validateEvidenceClaim} from './kit/evidence-validator/index.js';
const read=async name=>JSON.parse(await readFile(new URL('./kit/evidence-validator/examples/'+name,import.meta.url),'utf8'));
const receipt=await read('receipt.json'),sources=await read('sources.json');
assert.deepEqual(validateReceipt(receipt,{sources}),{valid:true,level:'catalog_matched',errors:[]});
assert.equal(validateReceipt(receipt).level,'shape_only');
const claim={version:1,kind:'source_excerpt',text:receipt.excerpt,receipt};
const valid=validateEvidenceClaim(claim,{sources});
assert.equal(valid.state,'source_backed_unverified');
assert.equal(valid.truthStatus,'unverified');
assert.equal(validateEvidenceClaim(claim).valid,false);
assert.equal(validateReceipt({...receipt,excerpt:'invented'},{sources}).errors[0].code,'QUOTE_MISMATCH');
assert.equal(validateReceipt(receipt,{sources:[...sources,...sources]}).errors[0].code,'AMBIGUOUS_SOURCE');
assert.equal(validateEvidenceClaim({...claim,text:'invented'},{sources}).valid,false);
assert.equal(validateReceipt({...receipt,verification:'verified'},{sources}).errors[0].code,'SELF_VERIFICATION');
console.log('PASS detached neutral evidence consumer: nine assertions; no external calls or truth claim.');
`);
 const {execFileSync}=await import('node:child_process');
 const output=execFileSync(process.execPath,[caller],{cwd:root,env:{},encoding:'utf8',timeout:15000});
 assert.match(output,/PASS detached neutral evidence consumer/);
});
