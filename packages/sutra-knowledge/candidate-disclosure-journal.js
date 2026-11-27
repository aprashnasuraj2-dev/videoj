import {casePin} from './pinned-investigation.js';
import {exportCandidateCapsule, projectCandidateComputation} from './candidate-capsule.js';
import {exportCandidateRangeCapsule} from './candidate-range-capsule.js';
import {intersectReviewedRanges} from './reviewed-interval.js';

const CAP = 64;
const fail = cause => { throw new TypeError('CANDIDATE_DISCLOSURE_' + cause); };

async function disclosures(version, candidate, capsule) {
  const {provenance} = await projectCandidateComputation(version.versionText, version.digest, candidate);
  const entries = [];
  for (const node of JSON.parse(capsule.text).nodes) {
    if (node.kind !== 'input' && node.kind !== 'bounded_input') continue;
    const {span} = provenance.get(node.id);
    // Match repeated use of identical source coordinates even after an
    // unrelated revision, without treating different documents as equivalent.
    const identity = await casePin(JSON.stringify([span.sourceDigest, span.start, span.end]));
    entries.push({
      identity, nodeId: node.id, hidden: node.kind === 'bounded_input',
      lower: node.lower ?? node.value, upper: node.upper ?? node.value
    });
  }
  return entries;
}

export function createCandidateDisclosureJournal() {
  const recorded = new Set(), prepared = new WeakMap();
  let knowledge = new Map(), generation = 0;

  async function prepare(version, candidate, spec) {
    const capsule = spec === undefined
      ? await exportCandidateCapsule(version.versionText, version.digest, candidate)
      : await exportCandidateRangeCapsule(version.versionText, version.digest, candidate, spec);
    const rows = await disclosures(version, candidate, capsule);
    const next = new Map(knowledge);
    const exposed = new Set();
    for (const row of rows) {
      const prior = next.get(row.identity);
      const overlap = prior ? intersectReviewedRanges(prior, row) : intersectReviewedRanges(row, row);
      if (!overlap) fail('INCONSISTENT');
      if (row.hidden && overlap.singleton) exposed.add(row.nodeId);
      next.set(row.identity, overlap);
    }
    // Check hidden rows again after exact aliases later in the same wire.
    for (const row of rows) if (row.hidden && next.get(row.identity).singleton) exposed.add(row.nodeId);
    const blocked = exposed.size > 0;
    const handle = Object.freeze({
      capsule: blocked ? null : capsule,
      determinedHiddenNodes: Object.freeze([...exposed].sort()),
      recordedDownloads: recorded.size
    });
    if (!blocked) prepared.set(handle, {generation, next, pin: capsule.pin});
    return handle;
  }

  return Object.freeze({
    prepare,
    recordDownload(handle) {
      const staged = prepared.get(handle);
      if (!staged || staged.generation !== generation) fail('STALE_OR_REFUSED');
      prepared.delete(handle);
      if (recorded.has(staged.pin)) return;
      if (recorded.size >= CAP) fail('CAPACITY');
      recorded.add(staged.pin);
      knowledge = staged.next;
      generation++;
    }
  });
}
