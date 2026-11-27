import assert from 'node:assert/strict';
import test from 'node:test';
import {livingFixture} from '../examples/living-investigation.mjs';
import {exportCandidateCapsule} from '../candidate-capsule.js';
import {prepareCandidateSourceWitness, verifyCandidateSourceWitness} from '../candidate-source-witness.js';

test('discloses exactly one admitted source span and verifies it against an independently retained root', async () => {
  const v = await livingFixture();
  const capsule = await exportCandidateCapsule(v.versionText, v.digest, 'primary_view');
  const issue = () => prepareCandidateSourceWitness(v.versionText, v.digest, 'primary_view');
  const proof = await issue();
  assert.notEqual((await issue()).root, proof.root);
  const data = proof.reveal('n1'), parsed = JSON.parse(data);
  assert.equal(parsed.row.quote, '120');
  assert.equal(parsed.path.length, 1);
  assert.ok(!data.includes('Revenue before:'));
  assert.equal((await verifyCandidateSourceWitness(data, proof.root, capsule.text, capsule.pin)).commitment, 'MATCHES_RETAINED_ROOT');
  parsed.row.start++;
  parsed.row.end++;
  await assert.rejects(verifyCandidateSourceWitness(JSON.stringify(parsed), proof.root, capsule.text, capsule.pin), /ROOT_MISMATCH/);
});

test('refuses mixing openings across independent roots and candidate capsules', async () => {
  const v = await livingFixture();
  const primary = await exportCandidateCapsule(v.versionText, v.digest, 'primary_view');
  const secondary = await exportCandidateCapsule(v.versionText, v.digest, 'secondary_view');
  const left = await prepareCandidateSourceWitness(v.versionText, v.digest, 'primary_view');
  const right = await prepareCandidateSourceWitness(v.versionText, v.digest, 'primary_view');
  await assert.rejects(verifyCandidateSourceWitness(left.reveal('n1'), right.root, primary.text, primary.pin), /ROOT_MISMATCH/);
  await assert.rejects(verifyCandidateSourceWitness(left.reveal('n1'), left.root, secondary.text, secondary.pin), /CAPSULE_SCOPE/);
});
