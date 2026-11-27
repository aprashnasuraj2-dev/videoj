import assert from 'node:assert/strict';
import test from 'node:test';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {exportCandidateCapsule, openCandidateCapsule, verifyCandidateCapsuleAgainstVersion} from '../candidate-capsule.js';

test('one candidate replays without disclosing the question, source texts, prose, or other candidate', async () => {
  const version = await livingFixture();
  const capsule = await exportCandidateCapsule(version.versionText, version.digest, 'primary_view');
  assert.deepEqual(await openCandidateCapsule(capsule.text, capsule.pin), {
    versionPin: version.digest, candidateId: 'primary_view', outcome: 'CONDITIONALLY_SATISFIED',
    suppliedQuantities: 2, sourceCorrespondence: 'PUBLISHER_DECLARATION', decisionAuthority: 'NONE'
  });
  assert.ok(await verifyCandidateCapsuleAgainstVersion(capsule.text, capsule.pin, version.versionText, version.digest));
  for (const privateText of ['Did performance improve?', 'Revenue before:', 'secondary_view', 'Cash before:', 'Revenue growth', 'same_company_periods']) {
    assert.ok(!capsule.text.includes(privateText));
  }
  assert.ok(Buffer.byteLength(capsule.text) < Buffer.byteLength(version.versionText) / 2);
});

test('a freshly repinned forgery or extra unreachable quantity fails replay', async () => {
  const version = await livingFixture();
  const {text, pin} = await exportCandidateCapsule(version.versionText, version.digest, 'primary_view');
  await assert.rejects(openCandidateCapsule(text + ' ', pin), /CAPSULE_PIN/);
  const forged = JSON.parse(text);
  forged.outcome = 'CONDITIONALLY_REFUTED';
  const changed = JSON.stringify(forged);
  await assert.rejects(openCandidateCapsule(changed, await casePin(changed)), /REPLAY_MISMATCH/);
  forged.nodes.push({...forged.nodes[0], id: 'n4'});
  const extra = JSON.stringify(forged);
  await assert.rejects(openCandidateCapsule(extra, await casePin(extra)), /CAPSULE_GRAPH/);
});

test('plausible arithmetic alone cannot establish correspondence to the original version', async () => {
  const version = await livingFixture();
  const {text} = await exportCandidateCapsule(version.versionText, version.digest, 'primary_view');
  const substitute = JSON.parse(text);
  substitute.nodes[0].value = '121/1';
  substitute.outcome = 'CONDITIONALLY_SATISFIED';
  const replaced = JSON.stringify(substitute);
  const repin = await casePin(replaced);
  await openCandidateCapsule(replaced, repin);
  await assert.rejects(verifyCandidateCapsuleAgainstVersion(replaced, repin, version.versionText, version.digest), /VERSION_CORRESPONDENCE/);
});

test('a withdrawn unresolved candidate cannot be exported as a decisive exhibit', async () => {
  const version = await livingFixture('finance', {withdraw: true});
  await assert.rejects(exportCandidateCapsule(version.versionText, version.digest, 'secondary_view'), /NOT_DECISIVE/);
});
