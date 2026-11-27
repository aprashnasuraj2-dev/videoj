import assert from 'node:assert/strict';
import test from 'node:test';
import {livingFixture} from '../examples/living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {exportCandidateRangeCapsule, openCandidateRangeCapsule} from '../candidate-range-capsule.js';

test('a recipient replays a decisive comparison while the actual reviewed point stays local', async () => {
  const v = await livingFixture();
  const capsule = await exportCandidateRangeCapsule(v.versionText, v.digest, 'primary_view', [
    {nodeId: 'n1', lower: '110/1', upper: '150/1'}
  ]);
  const checked = await openCandidateRangeCapsule(capsule.text, capsule.pin);
  assert.equal(checked.outcome, 'CONDITIONALLY_SATISFIED');
  assert.equal(checked.boundedQuantities, 1);
  assert.equal(checked.suppliedQuantities, 1);
  assert.ok(!capsule.text.includes('120/1'));
  assert.ok(!capsule.text.includes('Revenue'));
});

test('honest replay rejects narrowly failing bounds, exact points, and a re-pinned policy crossing', async () => {
  const v = await livingFixture();
  const seal = (lower, upper) => exportCandidateRangeCapsule(v.versionText, v.digest, 'primary_view', [{nodeId: 'n1', lower, upper}]);
  await assert.rejects(seal('100/1', '150/1'), /OUTCOME_NOT_INVARIANT/);
  await assert.rejects(seal('125/1', '150/1'), /POINT_OUTSIDE_RANGE/);
  await assert.rejects(seal('120/1', '120/1'), /POINT_OUTSIDE_RANGE/);
  const valid = JSON.parse((await seal('110/1', '150/1')).text);
  valid.nodes[0].lower = '90/1';
  const text = JSON.stringify(valid);
  await assert.rejects(openCandidateRangeCapsule(text, await casePin(text)), /OUTCOME_NOT_INVARIANT/);
});
