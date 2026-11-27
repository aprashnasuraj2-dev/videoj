import assert from 'node:assert/strict';
import test from 'node:test';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {evaluateQuantityConeIntervals} from '../reviewed-interval.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {exportCandidateCapsule} from '../candidate-capsule.js';
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

async function expressionVersion(expression) {
  const {versionText} = await livingFixture();
  const original = JSON.parse(versionText);
  const batch = JSON.parse(original.batchText);
  const proposal = await compileReviewedExpression(original.contractText, original.contractPin, expression);
  batch.proposals[0].proposalText = proposal.proposalText;
  const batchText = JSON.stringify(batch);
  const annotation = JSON.parse(original.annotationText);
  annotation.batchDigest = await casePin(batchText);
  const annotationText = JSON.stringify(annotation);
  return sealInvestigationVersion({...original, batchText, annotationText, annotationPin: await casePin(annotationText)});
}

test('affine difference cancels a shared hidden input when interval subtraction cannot', async () => {
  const v = await expressionVersion('([second]+[first]) > ([second]+[baseline])');
  const point = JSON.parse((await exportCandidateCapsule(v.versionText, v.digest, 'primary_view')).text);
  const input = point.nodes.find(node => node.value === '40/1');
  const capsule = await exportCandidateRangeCapsule(v.versionText, v.digest, 'primary_view', [
    {nodeId: input.id, lower: '-1000/1', upper: '1000/1'}
  ]);
  const wire = JSON.parse(capsule.text);
  assert.ok(!capsule.text.includes('40/1'));
  const pointGraph = wire.nodes.map(node => node.kind === 'bounded_input'
    ? {id: node.id, kind: 'input', basis: node.basis, dimension: node.dimension, value: node.lower}
    : node);
  assert.equal(evaluateQuantityConeIntervals(pointGraph, wire.target, new Map([[input.id, wire.nodes.find(node => node.id === input.id)]])),
    'NOT_RESOLVED_BY_INTERVAL_ENCLOSURE');
  assert.equal((await openCandidateRangeCapsule(capsule.text, capsule.pin)).analysis, 'EXACT_AFFINE_DIFFERENCE');
});

test('an affine cancellation cannot legitimize a potentially undefined nonlinear branch', async () => {
  const v = await expressionVersion('(([second]/[second])*[first]) > (([second]/[second])*[baseline])');
  const point = JSON.parse((await exportCandidateCapsule(v.versionText, v.digest, 'primary_view')).text);
  const input = point.nodes.find(node => node.value === '40/1');
  await assert.rejects(exportCandidateRangeCapsule(v.versionText, v.digest, 'primary_view', [
    {nodeId: input.id, lower: '-1000/1', upper: '1000/1'}
  ]), /OUTCOME_NOT_INVARIANT/);
});
