import {exportCandidateRangeCapsule, openCandidateRangeCapsule, RANGE_CAPSULE_VERSION} from '../../../packages/sutra-knowledge/candidate-range-capsule.js';
import {exportCandidateCapsule, openCandidateCapsule} from '../../../packages/sutra-knowledge/candidate-capsule.js';

export function connectCandidateCapsule({by, download}) {
  const candidate = by('capsule-candidate');
  const prepare = by('capsule-prepare');
  const save = by('capsule-export');
  const preview = by('capsule-preview');
  const pin = by('capsule-pin');
  const status = by('capsule-status');
  const mask = by('capsule-mask');
  const lower = by('capsule-lower');
  const upper = by('capsule-upper');
  const range = by('capsule-range');
  let current, capsule, pointCapsule, versionEpoch = 0, generating = false, busy = false;

  function updateControls() {
    candidate.disabled = busy || !current;
    prepare.disabled = busy || generating || !current || !candidate.value;
    save.disabled = busy || generating || !capsule;
    mask.disabled = busy || generating || !pointCapsule;
    range.disabled = mask.disabled || !mask.value || !lower.value.trim() || !upper.value.trim();
  }
  function clearPreview() {
    versionEpoch++;
    capsule = pointCapsule = null;
    mask.length = 1;
    lower.value = upper.value = '';
    preview.textContent = '';
    pin.textContent = '';
    status.textContent = '';
    updateControls();
  }
  candidate.addEventListener('change', clearPreview);
  prepare.addEventListener('click', async () => {
    if (prepare.disabled) return;
    clearPreview();
    const epoch = versionEpoch;
    generating = true;
    updateControls();
    try {
      const result = await exportCandidateCapsule(current.versionText, current.digest, candidate.value);
      if (epoch !== versionEpoch) return;
      capsule = pointCapsule = result;
      for (const node of JSON.parse(result.text).nodes) {
        if (node.kind === 'input') mask.add(new Option(node.id + ' · ' + node.value, node.id));
      }
      preview.textContent = result.text;
      pin.textContent = result.pin;
      status.textContent = 'Ready to download. Share the digest separately.';
    } catch {
      if (epoch === versionEpoch) status.textContent = 'This candidate has no replayable decisive calculation.';
    } finally {
      generating = false;
      updateControls();
    }
  });
  for (const input of [mask, lower, upper]) input.addEventListener('input', () => {
    versionEpoch++;
    capsule = null;
    preview.textContent = '';
    pin.textContent = '';
    status.textContent = 'Range changed. Preview the bytes before downloading.';
    updateControls();
  });
  range.addEventListener('click', async () => {
    if (range.disabled) return;
    const epoch = ++versionEpoch;
    generating = true;
    capsule = null;
    preview.textContent = '';
    pin.textContent = '';
    updateControls();
    try {
      const result = await exportCandidateRangeCapsule(current.versionText, current.digest, candidate.value, [
        {nodeId: mask.value, lower: lower.value.trim(), upper: upper.value.trim()}
      ]);
      if (epoch !== versionEpoch) return;
      capsule = result;
      preview.textContent = result.text;
      pin.textContent = result.pin;
      status.textContent = 'Ready to download the range capsule. Share the digest separately.';
    } catch {
      if (epoch === versionEpoch) status.textContent = 'Range refused. Check that it contains the quantity and preserves the result throughout.';
    } finally {
      generating = false;
      updateControls();
    }
  });
  save.addEventListener('click', () => {
    if (!save.disabled) download(capsule.text, 'sutra-calculation-capsule.json', 'application/json');
  });

  const fileInput = by('capsule-file');
  const receivedPin = by('capsule-retained-pin');
  const replay = by('capsule-replay');
  let importEpoch = 0;
  for (const input of [fileInput, receivedPin]) input.addEventListener('input', () => {
    importEpoch++;
    replay.textContent = '';
  });
  by('capsule-open').addEventListener('click', async () => {
    const epoch = ++importEpoch;
    const file = fileInput.files[0];
    const expected = receivedPin.value.trim();
    replay.textContent = 'Replaying calculation…';
    try {
      if (!file?.size || file.size > 65536) throw new Error('CAPSULE_FILE_SIZE');
      const text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await file.arrayBuffer());
      const result = JSON.parse(text)?.version === RANGE_CAPSULE_VERSION
        ? await openCandidateRangeCapsule(text, expected)
        : await openCandidateCapsule(text, expected);
      if (epoch === importEpoch) {
        replay.textContent = result.candidateId + ' · ' + result.outcome.replaceAll('_', ' ') +
          ' across ' + result.suppliedQuantities + ' supplied and ' + (result.boundedQuantities ?? 0) + ' bounded quantities. Source correspondence is a publisher declaration.';
      }
    } catch {
      if (epoch === importEpoch) replay.textContent = 'Capsule refused. Check the file and separately received digest.';
    }
  });

  return (version, workspaceBusy) => {
    busy = workspaceBusy;
    if (current !== version) {
      current = version;
      candidate.length = 1;
      for (const item of version?.report.investigation.candidates ?? []) {
        if (['CONDITIONALLY_SATISFIED', 'CONDITIONALLY_REFUTED'].includes(item.computation?.status)) {
          candidate.add(new Option(item.id, item.id));
        }
      }
      clearPreview();
    }
    updateControls();
  };
}
