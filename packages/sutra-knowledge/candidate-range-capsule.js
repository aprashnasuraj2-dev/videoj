import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {projectCandidateComputation, replayCandidateCone} from './candidate-capsule.js';
import {evaluateQuantityConeIntervals, reviewedRangeContains} from './reviewed-interval.js';

export const RANGE_CAPSULE_VERSION = 'sutra-candidate-range-capsule/v1';
const PIN = /^sha256:[a-f0-9]{64}$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const parse = text => parseUniqueJson(text, {maxChars: 65536, maxDepth: 12});
const keys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const fail = code => { throw new TypeError('RANGE_CAPSULE_' + code); };

function boundsFor(nodes) {
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > 64) fail('GRAPH');
  const intervals = new Map();
  const point = nodes.map(node => {
    if (node?.kind !== 'bounded_input') return node;
    if (!keys(node, ['id', 'kind', 'lower', 'upper', 'dimension', 'basis']) ||
        !reviewedRangeContains(node.lower, node.upper, node.lower, {requireWidth: true}) ||
        intervals.has(node.id)) fail('RANGE');
    intervals.set(node.id, {lower: node.lower, upper: node.upper});
    return {id: node.id, kind: 'input', value: node.lower, dimension: node.dimension, basis: node.basis};
  });
  if (intervals.size < 1 || intervals.size > 8) fail('RANGE_COUNT');
  return {point, intervals};
}

async function replay(nodes, target) {
  const {point, intervals} = boundsFor(nodes);
  const actual = await replayCandidateCone(point, target);
  const state = evaluateQuantityConeIntervals(point, target, intervals);
  if (state === 'HOLDS_FOR_ALL_DECLARED_VALUES' && actual === 'CONDITIONALLY_SATISFIED') return actual;
  if (state === 'REFUTED_FOR_ALL_DECLARED_VALUES' && actual === 'CONDITIONALLY_REFUTED') return actual;
  fail('OUTCOME_NOT_INVARIANT');
}

export async function exportCandidateRangeCapsule(versionText, versionPin, candidateId, requested) {
  if (!Array.isArray(requested) || requested.length < 1 || requested.length > 8) fail('RANGE_COUNT');
  const declarations = new Map();
  for (const range of requested) {
    if (!keys(range, ['nodeId', 'lower', 'upper']) || typeof range.nodeId !== 'string' ||
        declarations.has(range.nodeId) || typeof range.lower !== 'string' || typeof range.upper !== 'string') fail('RANGE');
    declarations.set(range.nodeId, {lower: range.lower, upper: range.upper});
  }
  const {nodes, target, outcome, bindings} = await projectCandidateComputation(versionText, versionPin, candidateId);
  const byBinding = new Map();
  for (const [nodeId, {lower, upper}] of declarations) {
    const binding = bindings.get(nodeId);
    if (!binding) fail('UNKNOWN_INPUT');
    const prior = byBinding.get(binding);
    if (prior && (prior.lower !== lower || prior.upper !== upper)) fail('CONFLICTING_ALIAS_RANGE');
    byBinding.set(binding, {lower, upper});
  }
  const hidden = nodes.map(node => {
    const declared = byBinding.get(bindings.get(node.id));
    if (!declared) return node;
    const {lower, upper} = declared;
    if (!reviewedRangeContains(lower, upper, node.value, {requireWidth: true})) fail('POINT_OUTSIDE_RANGE');
    return {id: node.id, kind: 'bounded_input', lower, upper, dimension: node.dimension, basis: node.basis};
  });
  if (await replay(hidden, target) !== outcome) fail('REPLAY_MISMATCH');
  const text = JSON.stringify({version: RANGE_CAPSULE_VERSION, versionPin, candidateId, nodes: hidden, target, outcome});
  return Object.freeze({text, pin: await casePin(text)});
}

export async function openCandidateRangeCapsule(text, retainedPin) {
  if (typeof retainedPin !== 'string' || !PIN.test(retainedPin) || await casePin(text) !== retainedPin) fail('PIN');
  const wire = parse(text);
  if (!keys(wire, ['version', 'versionPin', 'candidateId', 'nodes', 'target', 'outcome']) ||
      wire.version !== RANGE_CAPSULE_VERSION || typeof wire.versionPin !== 'string' || !PIN.test(wire.versionPin) ||
      typeof wire.candidateId !== 'string' || !ID.test(wire.candidateId)) fail('SHAPE');
  const outcome = await replay(wire.nodes, wire.target);
  if (outcome !== wire.outcome) fail('REPLAY_MISMATCH');
  return Object.freeze({
    versionPin: wire.versionPin, candidateId: wire.candidateId, outcome,
    boundedQuantities: wire.nodes.filter(node => node.kind === 'bounded_input').length,
    suppliedQuantities: wire.nodes.filter(node => node.kind === 'input').length,
    sourceCorrespondence: 'PUBLISHER_DECLARATION', decisionAuthority: 'NONE'
  });
}
