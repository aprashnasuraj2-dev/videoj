import {provePrivateCandidate, verifyPrivateCandidate} from './candidate-private-proof.js';
import {loadPrivateEngine} from './private-wasm.js';

export function connectPrivateCandidate({by, download}) {
  const candidate = by('capsule-candidate');
  const prepare = by('private-prepare'), save = by('private-download');
  const pin = by('private-pin'), preview = by('private-preview'), status = by('private-status');
  let version, proof, epoch = 0, generating = false, busy = false;
  function controls() {
    prepare.disabled = busy || generating || !version || !candidate.value;
    save.disabled = busy || generating || !proof;
  }
  function clear() {
    epoch++;
    proof = null;
    pin.textContent = preview.textContent = status.textContent = '';
    controls();
  }
  candidate.addEventListener('change',clear);
  prepare.addEventListener('click',async () => {
    if (prepare.disabled) return;
    clear();
    const ticket = epoch, source = version, id = candidate.value;
    generating = true;
    controls();
    status.textContent = 'Building private proof…';
    try {
      const result = await provePrivateCandidate(source.versionText,source.digest,id,await loadPrivateEngine());
      if (ticket !== epoch) return;
      proof = result;
      pin.textContent = result.pin;
      preview.textContent = result.text;
      status.textContent = 'Proof ready. Share this digest separately.';
    } catch {
      if (ticket === epoch) status.textContent = 'The proof is unavailable for this calculation or outside the supported affine profile.';
    } finally {
      generating = false;
      controls();
    }
  });
  save.addEventListener('click',() => {
    if (!save.disabled) download(proof.text,'sutra-private-calculation-proof.json','application/json');
  });
  const file = by('private-file'), retained = by('private-retained-pin'), verdict = by('private-result');
  let importEpoch = 0;
  for (const input of [file,retained]) input.addEventListener('input',() => {importEpoch++;verdict.textContent='';});
  by('private-open').addEventListener('click',async () => {
    const ticket = ++importEpoch, input = file.files[0], expected = retained.value.trim();
    verdict.textContent = 'Verifying proof…';
    try {
      if (!input?.size || input.size > 16384) throw new Error('PRIVATE_PROOF_SIZE');
      const text = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await input.arrayBuffer());
      const result = await verifyPrivateCandidate(text,expected,await loadPrivateEngine());
      if (ticket === importEpoch) verdict.textContent = result.candidateId + ' · ' + result.outcome.replaceAll('_',' ') +
        ' · cryptographic proof verified for ' + result.hiddenQuantities + ' committed input(s).';
    } catch {
      if (ticket === importEpoch) verdict.textContent = 'Private proof refused.';
    }
  });
  return (current,workbenchBusy) => {
    busy = workbenchBusy;
    if (version !== current) { version = current; clear(); }
    controls();
  };
}
