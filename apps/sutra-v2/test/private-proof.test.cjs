// Exercise the downloaded proof against a fresh WebAssembly verifier in a
// separate Node process, with no version text, source, or witness values.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');

test('actual packaged WASM proves a reviewed candidate and rejects repinned tampering',async()=>{
  const {livingFixture}=await import('../../../packages/sutra-knowledge/examples/living-investigation.mjs');
  const {casePin}=await import('../../../packages/sutra-knowledge/pinned-investigation.js');
  const {instantiatePrivateEngine}=await import('../src/private-wasm.js');
  const {provePrivateCandidate,verifyPrivateCandidate}=await import('../src/candidate-private-proof.js');
  const module=await fs.readFile(__dirname+'/../dist/private-affine.wasm');
  const v=await livingFixture();
  const engine=await instantiatePrivateEngine(module);
  const proof=await provePrivateCandidate(v.versionText,v.digest,'primary_view',engine);
  const independentVerifier=await instantiatePrivateEngine(module);
  assert.equal((await verifyPrivateCandidate(proof.text,proof.pin,independentVerifier)).hiddenQuantities,2);
  const repeated=await provePrivateCandidate(v.versionText,v.digest,'primary_view',engine);
  assert.notEqual(repeated.text,proof.text);
  assert.ok(!proof.text.includes('120/1'));
  assert.ok(!proof.text.includes('Revenue'));
  const attacked=JSON.parse(proof.text);
  attacked.proof=(attacked.proof[0]==='0'?'f':'0')+attacked.proof.slice(1);
  const altered=JSON.stringify(attacked);
  await assert.rejects(verifyPrivateCandidate(altered,await casePin(altered),independentVerifier),/INVALID_PROOF/);
  const substituted=JSON.parse(proof.text),statement=JSON.parse(substituted.statementText);
  statement.candidateId='other';
  substituted.statementText=JSON.stringify(statement);
  const relabeled=JSON.stringify(substituted);
  await assert.rejects(verifyPrivateCandidate(relabeled,await casePin(relabeled),independentVerifier),/INVALID_PROOF/);
  await assert.rejects(instantiatePrivateEngine(module.subarray(0,-1)),/PRIVATE_MODULE_PIN/);
});
