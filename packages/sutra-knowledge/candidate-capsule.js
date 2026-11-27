import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createVerifier} from './index.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';

export const CANDIDATE_CAPSULE_VERSION = 'sutra-candidate-capsule/v1';
const HASH = /^sha256:[a-f0-9]{64}$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const BASIS = 'Publisher-declared reviewed quantity';
const STATE = Object.freeze({constraint_satisfied: 'CONDITIONALLY_SATISFIED', constraint_refuted: 'CONDITIONALLY_REFUTED'});
const parse = text => parseUniqueJson(text, {maxChars: 262144, maxDepth: 12});
const keys = (obj, names) => obj && typeof obj === 'object' && !Array.isArray(obj) &&
  Object.keys(obj).length === names.length && names.every(name => Object.hasOwn(obj, name));
const fail = code => { throw new TypeError('CANDIDATE_CAPSULE_' + code); };

function cone(nodes, target) {
  const byId = new Map(nodes.map(node => [node?.id, node]));
  if (nodes.length !== byId.size || byId.get(target)?.kind !== 'constraint') fail('GRAPH');
  const seen = new Set();
  const stack = [target];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    const node = byId.get(id);
    if (!node || (node.args !== undefined && (!Array.isArray(node.args) || node.args.length !== 2))) fail('GRAPH');
    seen.add(id);
    if (node.args) stack.push(...node.args);
  }
  return nodes.filter(node => seen.has(node.id));
}

// An exact, admitted target and its transitive inputs. IDs here are local to
// the projection so labels, binding names, and unrelated nodes never travel.
export async function projectCandidateComputation(versionText, versionPin, candidateId) {
  const version = await replayInvestigationVersion(versionText, versionPin);
  const candidate = version.investigation.candidates.find(item => item.id === candidateId);
  if (!candidate || !Object.values(STATE).includes(candidate.computation?.status)) fail('NOT_DECISIVE');
  const {contractText, contractPin, batchText} = parse(versionText);
  const {proposalText} = parse(batchText).proposals.find(item => item.id === candidateId);
  const compiled = await compileReviewedProposal(contractText, contractPin, proposalText);
  const relevant = cone(parse(compiled.graphText).nodes, compiled.target.id);
  const labels = new Map(relevant.map((node, index) => [node.id, 'n' + (index + 1)]));
  const bindings = new Map(compiled.nodes.filter(node => node.kind === 'input' && labels.has(node.id))
    .map(node => [labels.get(node.id), node.bindingId]));
  const nodes = relevant.map(node => node.kind === 'input'
    ? {id: labels.get(node.id), kind: node.kind, value: node.value, dimension: node.dimension, basis: BASIS}
    : {id: labels.get(node.id), kind: node.kind, op: node.op, args: node.args.map(id => labels.get(id))});
  return {nodes, target: labels.get(compiled.target.id), outcome: compiled.target.status, bindings};
}

export async function replayCandidateCone(nodes, target) {
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > 64 ||
      !nodes.every((node, i) => node?.id === 'n' + (i + 1) && (node.kind !== 'input' || node.basis === BASIS)) ||
      cone(nodes, target).length !== nodes.length) fail('GRAPH');
  const {report} = await createVerifier().evaluate(JSON.stringify({schemaVersion: 1, nodes}));
  const state = STATE[report.receipts.find(receipt => receipt.id === target)?.outcome.status];
  if (!state) fail('NOT_DECISIVE');
  return state;
}

export async function exportCandidateCapsule(versionText, versionPin, candidateId) {
  const {nodes, target, outcome} = await projectCandidateComputation(versionText, versionPin, candidateId);
  if (await replayCandidateCone(nodes, target) !== outcome) fail('REPLAY_MISMATCH');
  const text = JSON.stringify({version: CANDIDATE_CAPSULE_VERSION, versionPin, candidateId, nodes, target, outcome});
  return Object.freeze({text, pin: await casePin(text)});
}

export async function openCandidateCapsule(text, retainedPin) {
  if (typeof retainedPin !== 'string' || !HASH.test(retainedPin) || await casePin(text) !== retainedPin) fail('PIN');
  const wire = parse(text);
  if (!keys(wire, ['version', 'versionPin', 'candidateId', 'nodes', 'target', 'outcome']) ||
      wire.version !== CANDIDATE_CAPSULE_VERSION || typeof wire.versionPin !== 'string' || !HASH.test(wire.versionPin) ||
      typeof wire.candidateId !== 'string' || !ID.test(wire.candidateId)) fail('SHAPE');
  const outcome = await replayCandidateCone(wire.nodes, wire.target);
  if (outcome !== wire.outcome) fail('REPLAY_MISMATCH');
  return Object.freeze({
    versionPin: wire.versionPin, candidateId: wire.candidateId, outcome,
    suppliedQuantities: wire.nodes.filter(node => node.kind === 'input').length,
    sourceCorrespondence: 'PUBLISHER_DECLARATION', decisionAuthority: 'NONE'
  });
}

// The party retaining the private source version can check its correspondence
// locally. A recipient with only the capsule can verify conditional arithmetic.
export async function verifyCandidateCapsuleAgainstVersion(text, retainedPin, versionText, versionPin) {
  const {candidateId, versionPin: advertisedPin} = await openCandidateCapsule(text, retainedPin);
  if (advertisedPin !== versionPin) fail('VERSION_PIN');
  const rebuilt = await exportCandidateCapsule(versionText, versionPin, candidateId);
  if (rebuilt.text !== text) fail('VERSION_CORRESPONDENCE');
  return true;
}
