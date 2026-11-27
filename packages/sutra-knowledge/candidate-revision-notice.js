import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {compareInvestigationVersions} from './investigation-revision.js';
import {exportCandidateCapsule, openCandidateCapsule} from './candidate-capsule.js';

export const CANDIDATE_REVISION_VERSION = 'sutra-candidate-revision-notice/v1';
const PIN = /^sha256:[a-f0-9]{64}$/;
const CHANGE = new Set(['WITHDRAWN', 'REVERSED', 'REVIEW_AGAIN', 'SAME_SCOPED_RESULT']);
const DECISIVE = new Set(['CONDITIONALLY_SATISFIED', 'CONDITIONALLY_REFUTED']);
const isPin = value => typeof value === 'string' && PIN.test(value);
const keys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const fail = reason => { throw new TypeError('CANDIDATE_REVISION_' + reason); };

export async function exportCandidateRevisionNotice(before, after, candidateId) {
  const impact = await compareInvestigationVersions(before.versionText, before.digest, after.versionText, after.digest);
  const row = impact.candidates.find(candidate => candidate.id === candidateId);
  if (!row || !DECISIVE.has(row.before)) fail('NO_ORIGINAL_VERDICT');
  const old = await exportCandidateCapsule(before.versionText, before.digest, candidateId);
  const next = DECISIVE.has(row.after) ? await exportCandidateCapsule(after.versionText, after.digest, candidateId) : null;
  const change = next === null ? 'WITHDRAWN' :
    row.before !== row.after ? 'REVERSED' : row.reviewRequired ? 'REVIEW_AGAIN' : 'SAME_SCOPED_RESULT';
  const text = JSON.stringify({
    version: CANDIDATE_REVISION_VERSION, previousCapsulePin: old.pin, nextVersionPin: after.digest, change, next
  });
  return Object.freeze({text, pin: await casePin(text)});
}

// Open against the recipient's previously retained exhibit and an independently
// obtained notice pin. Only arithmetic is replayed without the private sources.
export async function openCandidateRevisionNotice(text, noticePin, previousText, previousPin) {
  if (!isPin(noticePin) || await casePin(text) !== noticePin) fail('PIN');
  const data = parseUniqueJson(text, {maxChars: 65536, maxDepth: 6});
  if (!keys(data, ['version', 'previousCapsulePin', 'nextVersionPin', 'change', 'next']) ||
      data.version !== CANDIDATE_REVISION_VERSION || data.previousCapsulePin !== previousPin ||
      !isPin(data.nextVersionPin) || !CHANGE.has(data.change)) fail('SCOPE');
  const before = await openCandidateCapsule(previousText, previousPin);
  if (data.nextVersionPin === before.versionPin) fail('SAME_VERSION');
  if ((data.next === null) !== (data.change === 'WITHDRAWN')) fail('STATE');
  let after = null;
  if (data.next !== null) {
    if (!keys(data.next, ['text', 'pin'])) fail('NEXT');
    after = await openCandidateCapsule(data.next.text, data.next.pin);
    if (after.versionPin !== data.nextVersionPin || after.candidateId !== before.candidateId ||
        (before.outcome !== after.outcome) !== (data.change === 'REVERSED')) fail('REPLAY_MISMATCH');
    if (data.change === 'SAME_SCOPED_RESULT') {
      const oldGraph = JSON.parse(previousText), newGraph = JSON.parse(data.next.text);
      if (oldGraph.target !== newGraph.target || JSON.stringify(oldGraph.nodes) !== JSON.stringify(newGraph.nodes)) {
        fail('CHANGED_PUBLIC_GRAPH');
      }
    }
  }
  return Object.freeze({
    candidateId: before.candidateId, previousVersionPin: before.versionPin, nextVersionPin: data.nextVersionPin,
    change: data.change, before: before.outcome, after: after?.outcome ?? null,
    privateRevisionScope: 'PUBLISHER_DECLARATION', decisionAuthority: 'NONE'
  });
}
