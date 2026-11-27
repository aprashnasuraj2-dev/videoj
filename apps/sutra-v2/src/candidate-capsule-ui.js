import {createCandidateDisclosureJournal} from '../../../packages/sutra-knowledge/candidate-disclosure-journal.js';
import {analyzeCandidateRangeCounterfactual, openCandidateRangeCapsule, RANGE_CAPSULE_VERSION} from '../../../packages/sutra-knowledge/candidate-range-capsule.js';
import {openCandidateCapsule} from '../../../packages/sutra-knowledge/candidate-capsule.js';

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
  const journal = createCandidateDisclosureJournal();
  let current, capsule, pending, pointCapsule, versionEpoch = 0, generating = false, busy = false;

  function updateControls() {
    candidate.disabled = busy || !current;
    prepare.disabled = busy || generating || !current || !candidate.value;
    save.disabled = busy || generating || !capsule;
    mask.disabled = busy || generating || !pointCapsule;
    range.disabled = mask.disabled || !mask.value || !lower.value.trim() || !upper.value.trim();
  }
  function clearPreview() {
    versionEpoch++;
    capsule = pending = pointCapsule = null;
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
      const staged = await journal.prepare(current, candidate.value);
      if (epoch !== versionEpoch) return;
      pending = staged;
      const result = capsule = pointCapsule = staged.capsule;
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
    capsule = pending = null;
    preview.textContent = '';
    pin.textContent = '';
    status.textContent = 'Range changed. Preview the bytes before downloading.';
    updateControls();
  });
  range.addEventListener('click', async () => {
    if (range.disabled) return;
    const epoch = ++versionEpoch;
    generating = true;
    capsule = pending = null;
    preview.textContent = '';
    pin.textContent = '';
    updateControls();
    try {
      const staged = await journal.prepare(current, candidate.value, [
        {nodeId: mask.value, lower: lower.value.trim(), upper: upper.value.trim()}
      ]);
      if (epoch !== versionEpoch) return;
      if (!staged.capsule) {
        status.textContent = 'Earlier downloads from this tab, combined with this range, expose an exact hidden quantity.';
        return;
      }
      pending = staged;
      const result = capsule = staged.capsule;
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
    if (save.disabled) return;
    try {
      journal.recordDownload(pending);
      download(capsule.text, 'sutra-calculation-capsule.json', 'application/json');
      save.disabled = true;
      capsule = pending = null;
      status.textContent = 'Download requested and recorded in this tab.';
    } catch {
      capsule = pending = null;
      status.textContent = 'Could not record this disclosure. Preview again before downloading.';
      updateControls();
    }
  });

  const fileInput = by('capsule-file');
  const receivedPin = by('capsule-retained-pin');
  const replay = by('capsule-replay');
  const thresholdPanel = by('capsule-threshold-panel');
  const thresholdNode = by('capsule-threshold-node');
  const thresholdResult = by('capsule-threshold-result');
  let importEpoch = 0, thresholdEpoch = 0, admittedRange = null;
  const clearThreshold = () => {
    admittedRange = null;
    thresholdEpoch++;
    thresholdPanel.hidden = true;
    thresholdNode.replaceChildren();
    thresholdResult.textContent = '';
  };
  thresholdNode.addEventListener('change', () => { thresholdEpoch++; thresholdResult.textContent = ''; });
  by('capsule-threshold').addEventListener('click', async () => {
    if (!admittedRange || !thresholdNode.value) return;
    const ticket = ++thresholdEpoch;
    try {
      const result = await analyzeCandidateRangeCounterfactual(admittedRange.text, admittedRange.pin, thresholdNode.value);
      if (ticket !== thresholdEpoch) return;
      const labels = {
        HOLDS_FOR_ALL_DECLARED_VALUES: 'Holds across all other bounds',
        REFUTED_FOR_ALL_DECLARED_VALUES: 'Refuted across all other bounds',
        NOT_RESOLVED_BY_INTERVAL_ENCLOSURE: 'Depends on the other quantities'
      };
      thresholdResult.textContent = result.regions?.map(row =>
        (row.includeFrom ? '[' : '(') + (row.from ?? '−∞') + ', ' + (row.to ?? '∞') +
        (row.includeTo ? ']' : ')') + ' · ' + labels[row.status]
      ).join('\n') ?? 'This calculation is outside the exact affine profile.';
    } catch {
      if (ticket === thresholdEpoch) thresholdResult.textContent = 'The calculation threshold could not be verified.';
    }
  });
  for (const input of [fileInput, receivedPin]) input.addEventListener('input', () => {
    importEpoch++;
    clearThreshold();
    replay.textContent = '';
  });
  by('capsule-open').addEventListener('click', async () => {
    const epoch = ++importEpoch;
    clearThreshold();
    const file = fileInput.files[0];
    const expected = receivedPin.value.trim();
    replay.textContent = 'Replaying calculation…';
    try {
      if (!file?.size || file.size > 65536) throw new Error('CAPSULE_FILE_SIZE');
      const text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await file.arrayBuffer());
      const wire = JSON.parse(text);
      const result = wire?.version === RANGE_CAPSULE_VERSION
        ? await openCandidateRangeCapsule(text, expected)
        : await openCandidateCapsule(text, expected);
      if (epoch === importEpoch) {
        if (wire.version === RANGE_CAPSULE_VERSION) {
          admittedRange = {text, pin: expected};
          for (const node of wire.nodes.filter(node => node.kind === 'bounded_input')) {
            thresholdNode.add(new Option(node.id + ' · ' + node.lower + ' to ' + node.upper, node.id));
          }
          thresholdPanel.hidden = false;
        }
        replay.textContent = result.candidateId + ' · ' + result.outcome.replaceAll('_', ' ') +
          ' across ' + result.suppliedQuantities + ' supplied and ' + (result.boundedQuantities ?? 0) + ' bounded quantities.' +
          (result.analysis === 'EXACT_AFFINE_DIFFERENCE' ? ' Shared-input cancellation was checked using exact affine arithmetic.' : '') +
          ' Source correspondence is a publisher declaration.';
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
