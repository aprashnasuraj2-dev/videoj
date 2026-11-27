import assert from 'node:assert/strict';
import test from 'node:test';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {evaluateQuantityConeIntervals} from '../reviewed-interval.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {exportCandidateCapsule} from '../candidate-capsule.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {analyzeCandidateRangeCounterfactual, exportCandidateRangeCapsule, openCandidateRangeCapsule} from '../candidate-range-capsule.js';

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

test('a recipient can derive exact contingent and guaranteed decision thresholds across the other ranges', async () => {
  const v = await expressionVersion('([second]+[first]) > ([baseline]+[other])');
  const point = JSON.parse((await exportCandidateCapsule(v.versionText, v.digest, 'primary_view')).text);
  const targetId = point.nodes.find(node => node.value === '40/1').id;
  const otherId = point.nodes.find(node => node.value === '30/1').id;
  const capsule = await exportCandidateRangeCapsule(v.versionText, v.digest, 'primary_view', [
    {nodeId: targetId, lower: '30/1', upper: '50/1'}, {nodeId: otherId, lower: '20/1', upper: '35/1'}
  ]);
  const result = await analyzeCandidateRangeCounterfactual(capsule.text, capsule.pin, targetId);
  assert.deepEqual(result.regions.map(row => [row.from, row.to, row.includeFrom, row.status]), [
    [null,'0/1',false,'REFUTED_FOR_ALL_DECLARED_VALUES'],
    ['0/1','0/1',true,'REFUTED_FOR_ALL_DECLARED_VALUES'],
    ['0/1','15/1',false,'NOT_RESOLVED_BY_INTERVAL_ENCLOSURE'],
    ['15/1','15/1',true,'NOT_RESOLVED_BY_INTERVAL_ENCLOSURE'],
    ['15/1',null,false,'HOLDS_FOR_ALL_DECLARED_VALUES']
  ]);
  assert.ok(!JSON.stringify(result).includes('40/1'));
  assert.equal(result.empiricalAuthority, 'NONE');
});

test('a variable with identical contributions on both sides has one universal affine region', async () => {
  const v = await expressionVersion('([second]+[first]) >= ([second]+[baseline])');
  const wire = JSON.parse((await exportCandidateCapsule(v.versionText, v.digest, 'primary_view')).text);
  const id = wire.nodes.find(node => node.value === '40/1').id;
  const capsule = await exportCandidateRangeCapsule(v.versionText, v.digest, 'primary_view', [{nodeId:id, lower:'0/1', upper:'100/1'}]);
  const result = await analyzeCandidateRangeCounterfactual(capsule.text, capsule.pin, id);
  assert.deepEqual(result.regions, [{from:null,to:null,includeFrom:false,includeTo:false,status:'HOLDS_FOR_ALL_DECLARED_VALUES'}]);
  const publicId = wire.nodes.find(node => node.value === '120/1').id;
  await assert.rejects(analyzeCandidateRangeCounterfactual(capsule.text, capsule.pin, publicId), /UNKNOWN_INPUT/);
});
