import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {openCandidateCapsule, projectCandidateComputation, sealCandidateProjection} from './candidate-capsule.js';
import {readReviewedNumericToken} from './reviewed-claim-compiler.js';

export const SOURCE_WITNESS_VERSION = 'sutra-candidate-source-witness/v1';
const HASH = /^sha256:[a-f0-9]{64}$/;
const SALT = /^[a-f0-9]{64}$/;
const parse = text => parseUniqueJson(text, {maxChars: 65536, maxDepth: 12});
const keys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const isPin = value => typeof value === 'string' && HASH.test(value);
const fail = reason => { throw new TypeError('CANDIDATE_SOURCE_WITNESS_' + reason); };
const salt = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
const digest = (...items) => casePin(JSON.stringify([SOURCE_WITNESS_VERSION, ...items]));
const leafDigest = (capsulePin, row) => digest('leaf', capsulePin, row.nodeId, row.sourceDigest, row.start, row.end,
  row.quote, row.percentAllowed, row.salt);
const parent = (left, right) => digest('parent', left, right);

export async function prepareCandidateSourceWitness(versionText, versionPin, candidateId) {
  const projection = await projectCandidateComputation(versionText, versionPin, candidateId);
  const {nodes, provenance} = projection;
  const capsule = await sealCandidateProjection(versionPin, candidateId, projection);
  const leaves = nodes.filter(node => node.kind === 'input').map(node => {
    const value = provenance.get(node.id);
    const {sourceDigest, start, end, quote} = value.span;
    return {nodeId: node.id, sourceDigest, start, end, quote, percentAllowed: value.type.kind === 'ratio', salt: salt()};
  });
  const size = 2 ** Math.ceil(Math.log2(leaves.length));
  const levels = [await Promise.all([
    ...leaves.map(row => leafDigest(capsule.pin, row)),
    ...Array.from({length: size - leaves.length}, () => digest('empty', salt()))
  ])];
  while (levels.at(-1).length > 1) {
    const prior = levels.at(-1);
    levels.push(await Promise.all(prior.filter((_, i) => i % 2 === 0).map((hash, i) => parent(hash, prior[i * 2 + 1]))));
  }
  const root = levels.at(-1)[0];
  return Object.freeze({
    root, capsulePin: capsule.pin,
    nodeIds: Object.freeze(leaves.map(row => row.nodeId)),
    reveal(nodeId) {
      let index = leaves.findIndex(row => row.nodeId === nodeId);
      if (index < 0) fail('NODE');
      const row = leaves[index];
      const path = levels.slice(0, -1).map(level => {
        const sibling = level[index ^ 1];
        index >>= 1;
        return sibling;
      });
      return JSON.stringify({version: SOURCE_WITNESS_VERSION, capsulePin: capsule.pin, row, path});
    }
  });
}

export async function verifyCandidateSourceWitness(text, retainedRoot, capsuleText, retainedCapsulePin) {
  if (!isPin(retainedRoot)) fail('ROOT');
  await openCandidateCapsule(capsuleText, retainedCapsulePin);
  const data = parse(text), capsule = parse(capsuleText);
  if (!keys(data, ['version', 'capsulePin', 'row', 'path']) || data.version !== SOURCE_WITNESS_VERSION ||
      data.capsulePin !== retainedCapsulePin) fail('CAPSULE_SCOPE');
  const {row, path} = data;
  if (!keys(row, ['nodeId', 'sourceDigest', 'start', 'end', 'quote', 'percentAllowed', 'salt']) ||
      !isPin(row.sourceDigest) || typeof row.quote !== 'string' || row.quote.length > 50 ||
      typeof row.percentAllowed !== 'boolean' || typeof row.salt !== 'string' || !SALT.test(row.salt) ||
      !Number.isSafeInteger(row.start) || row.start < 0 || !Number.isSafeInteger(row.end) ||
      row.end > 65536 || row.end <= row.start || new TextEncoder().encode(row.quote).length !== row.end - row.start) fail('SPAN');
  const inputs = capsule.nodes.filter(node => node.kind === 'input');
  let index = inputs.findIndex(node => node.id === row.nodeId);
  if (index < 0 || readReviewedNumericToken(row.quote, row.percentAllowed) !== inputs[index].value) fail('QUANTITY');
  if (!Array.isArray(path) || path.length !== Math.ceil(Math.log2(inputs.length)) || !path.every(isPin)) fail('PATH');
  let hash = await leafDigest(retainedCapsulePin, row);
  for (const sibling of path) {
    hash = index % 2 === 0 ? await parent(hash, sibling) : await parent(sibling, hash);
    index >>= 1;
  }
  if (hash !== retainedRoot) fail('ROOT_MISMATCH');
  return Object.freeze({
    capsulePin: retainedCapsulePin, nodeId: row.nodeId, sourceDigest: row.sourceDigest,
    start: row.start, end: row.end, quote: row.quote,
    commitment: 'MATCHES_RETAINED_ROOT', documentAuthenticity: 'UNVERIFIED', decisionAuthority: 'NONE'
  });
}
