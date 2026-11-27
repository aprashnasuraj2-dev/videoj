import assert from 'node:assert/strict';
import test from 'node:test';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createCandidateDisclosureJournal} from '../candidate-disclosure-journal.js';

const range = (lower, upper) => [{nodeId: 'n1', lower: lower + '/1', upper: upper + '/1'}];
const candidate = 'primary_view';

test('two individually safe downloads would jointly disclose the exact point, even across unchanged source revisions', async () => {
  const initial = await livingFixture();
  const revised = await livingFixture('finance', {irrelevant: true, previousDigest: initial.digest});
  const journal = createCandidateDisclosureJournal();
  const left = await journal.prepare(initial, candidate, range(110, 120));
  const opposite = await journal.prepare(revised, candidate, range(120, 140));
  assert.ok(left.capsule && opposite.capsule);
  journal.recordDownload(left);
  assert.throws(() => journal.recordDownload(opposite), /STALE_OR_REFUSED/);
  const refused = await journal.prepare(revised, candidate, range(120, 140));
  assert.equal(refused.capsule, null);
  assert.deepEqual(refused.determinedHiddenNodes, ['n1']);
  assert.ok((await journal.prepare(revised, candidate, range(115, 140))).capsule);
});

test('a prior exact download remains visible to the disclosure audit and cannot be made private by a new range', async () => {
  const v = await livingFixture();
  const journal = createCandidateDisclosureJournal();
  journal.recordDownload(await journal.prepare(v, candidate));
  const refused = await journal.prepare(v, candidate, range(110, 130));
  assert.equal(refused.capsule, null);
  assert.deepEqual(refused.determinedHiddenNodes, ['n1']);
  const independentTab = createCandidateDisclosureJournal();
  assert.ok((await independentTab.prepare(v, candidate, range(110, 130))).capsule);
});
