import assert from 'node:assert/strict';
import test from 'node:test';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {exportCandidateCapsule} from '../candidate-capsule.js';
import {exportCandidateRevisionNotice, openCandidateRevisionNotice} from '../candidate-revision-notice.js';

test('a holder can replay a reversal or preserve an unaffected scoped result without receiving the revised source', async () => {
  const a = await livingFixture();
  const b = await livingFixture('finance', {revised: true, previousDigest: a.digest});
  for (const [candidateId, expected] of [['secondary_view', 'REVERSED'], ['primary_view', 'SAME_SCOPED_RESULT']]) {
    const old = await exportCandidateCapsule(a.versionText, a.digest, candidateId);
    const notice = await exportCandidateRevisionNotice(a, b, candidateId);
    const verified = await openCandidateRevisionNotice(notice.text, notice.pin, old.text, old.pin);
    assert.equal(verified.change, expected);
    assert.equal(verified.before, 'CONDITIONALLY_SATISFIED');
    assert.equal(verified.after, expected === 'REVERSED' ? 'CONDITIONALLY_REFUTED' : verified.before);
    assert.equal(verified.privateRevisionScope, 'PUBLISHER_DECLARATION');
    assert.ok(!notice.text.includes('Cash after:'));
  }
});

test('withdrawal produces an unresolved current verdict and refuses a sibling or contradictory replacement', async () => {
  const a = await livingFixture();
  const b = await livingFixture('finance', {withdraw: true, previousDigest: a.digest});
  const unrelated = await livingFixture('finance', {revised: true});
  const old = await exportCandidateCapsule(a.versionText, a.digest, 'secondary_view');
  const notice = await exportCandidateRevisionNotice(a, b, 'secondary_view');
  const checked = await openCandidateRevisionNotice(notice.text, notice.pin, old.text, old.pin);
  assert.equal(checked.change, 'WITHDRAWN');
  assert.equal(checked.after, null);
  await assert.rejects(exportCandidateRevisionNotice(a, unrelated, 'secondary_view'), /REVISION_PARENT/);
  const forged = JSON.parse(notice.text);
  forged.change = 'SAME_SCOPED_RESULT';
  const text = JSON.stringify(forged);
  await assert.rejects(openCandidateRevisionNotice(text, await casePin(text), old.text, old.pin), /REVISION_STATE/);
});
