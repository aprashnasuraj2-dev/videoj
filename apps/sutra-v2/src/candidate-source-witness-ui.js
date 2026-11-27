import {prepareCandidateSourceWitness, verifyCandidateSourceWitness} from '../../../packages/sutra-knowledge/candidate-source-witness.js';

function read(file) {
  if (!file?.size || file.size > 65536) throw new Error('SOURCE_WITNESS_SIZE');
  return file.arrayBuffer().then(bytes => new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes));
}

export function connectCandidateSourceWitness({by, download}) {
  const candidate = by('capsule-candidate');
  const prepare = by('witness-prepare');
  const select = by('witness-node');
  const save = by('witness-download');
  const root = by('witness-root');
  const bytes = by('witness-bytes');
  const status = by('witness-status');
  let version, witness, wire, generation = 0, generating = false, busy = false;

  function controls() {
    prepare.disabled = busy || generating || !candidate.value || !version;
    select.disabled = busy || generating || !witness;
    save.disabled = select.disabled || !wire;
  }
  function reset() {
    generation++;
    witness = wire = null;
    select.length = 1;
    select.value = '';
    root.textContent = bytes.textContent = status.textContent = '';
    controls();
  }
  candidate.addEventListener('change', reset);
  prepare.addEventListener('click', async () => {
    if (prepare.disabled) return;
    reset();
    const ticket = generation;
    generating = true;
    controls();
    try {
      const result = await prepareCandidateSourceWitness(version.versionText, version.digest, candidate.value);
      if (ticket !== generation) return;
      witness = result;
      root.textContent = result.root;
      for (const id of result.nodeIds) select.add(new Option(id, id));
      status.textContent = 'Retain this root separately. Choose a quantity to open.';
    } catch {
      if (ticket === generation) status.textContent = 'Could not commit the selected candidate’s source spans.';
    } finally {
      generating = false;
      controls();
    }
  });
  select.addEventListener('change', () => {
    wire = witness && select.value ? witness.reveal(select.value) : null;
    bytes.textContent = wire ?? '';
    controls();
  });
  save.addEventListener('click', () => {
    if (!save.disabled) download(wire, 'sutra-calculation-source-witness.json', 'application/json');
  });

  const file = by('witness-file');
  const retained = by('witness-retained-root');
  const capsule = by('capsule-file');
  const capsulePin = by('capsule-retained-pin');
  const result = by('witness-result');
  let replay = 0;
  for (const field of [file, retained, capsule, capsulePin]) field.addEventListener('input', () => {
    replay++;
    result.textContent = '';
  });
  by('witness-open').addEventListener('click', async () => {
    const ticket = ++replay;
    const expected = retained.value.trim(), pin = capsulePin.value.trim();
    result.textContent = 'Checking the span commitment…';
    try {
      const [text, capsuleText] = await Promise.all([read(file.files[0]), read(capsule.files[0])]);
      const opened = await verifyCandidateSourceWitness(text, expected, capsuleText, pin);
      if (ticket === replay) result.textContent = opened.nodeId + ' · ' + opened.quote + ' · bytes ' +
        opened.start + '–' + opened.end + ' match the retained root. Original document authenticity remains unverified.';
    } catch {
      if (ticket === replay) result.textContent = 'Source opening refused.';
    }
  });

  return (current, workbenchBusy) => {
    busy = workbenchBusy;
    if (version !== current) {
      version = current;
      reset();
    }
    controls();
  };
}
