import {exportCandidateRevisionNotice, openCandidateRevisionNotice} from '../../../packages/sutra-knowledge/candidate-revision-notice.js';

const fileLimit = 65536;
async function read(file) {
  if (!file?.size || file.size > fileLimit) throw new Error('NOTICE_SIZE');
  return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await file.arrayBuffer());
}

export function connectCandidateRevision({by, download}) {
  const select = by('notice-candidate');
  const prepare = by('notice-prepare');
  const save = by('notice-download');
  const preview = by('notice-preview');
  const noticePin = by('notice-preview-pin');
  const status = by('notice-status');
  let baseline, current, busy, generating = false, generation = 0, notice = null;

  function controls() {
    select.disabled = busy || !baseline || current?.report.previousDigest !== baseline.digest;
    prepare.disabled = select.disabled || !select.value || generating;
    save.disabled = select.disabled || !notice;
  }
  function clear() {
    generation++;
    notice = null;
    preview.textContent = '';
    noticePin.textContent = '';
    status.textContent = '';
    controls();
  }

  select.addEventListener('change', clear);
  prepare.addEventListener('click', async () => {
    if (prepare.disabled) return;
    clear();
    const ticket = generation;
    generating = true;
    controls();
    try {
      const result = await exportCandidateRevisionNotice(baseline, current, select.value);
      if (ticket !== generation) return;
      notice = result;
      preview.textContent = result.text;
      noticePin.textContent = result.pin;
      status.textContent = 'Review the notice bytes and share the digest separately.';
    } catch {
      if (ticket === generation) status.textContent = 'This version pair does not support a revision notice for the selected candidate.';
    } finally {
      generating = false;
      controls();
    }
  });
  save.addEventListener('click', () => {
    if (!save.disabled) download(notice.text, 'sutra-calculation-revision.json', 'application/json');
  });

  const incoming = by('notice-file');
  const incomingPin = by('notice-pin');
  const previous = by('notice-previous');
  const previousPin = by('notice-previous-pin');
  const verdict = by('notice-verdict');
  let request = 0;
  for (const field of [incoming, incomingPin, previous, previousPin]) field.addEventListener('input', () => {
    request++;
    verdict.textContent = '';
  });
  by('notice-check').addEventListener('click', async () => {
    const ticket = ++request;
    const pin = incomingPin.value.trim(), priorPin = previousPin.value.trim();
    verdict.textContent = 'Checking revision…';
    try {
      const [text, priorText] = await Promise.all([read(incoming.files[0]), read(previous.files[0])]);
      const result = await openCandidateRevisionNotice(text, pin, priorText, priorPin);
      if (ticket !== request) return;
      const category = {
        REVERSED: 'Conditional result reversed',
        WITHDRAWN: 'Publisher withdrew the prior conditional result',
        REVIEW_AGAIN: 'Conditional outcome survived and needs review',
        SAME_SCOPED_RESULT: 'Conditional outcome survived in the declared scope'
      }[result.change];
      verdict.textContent = result.candidateId + ' · ' + category + '. Private revision scope is a publisher declaration.';
    } catch {
      if (ticket === request) verdict.textContent = 'Revision notice refused. Check the retained capsule and both digests.';
    }
  });

  return (prior, version, workbenchBusy) => {
    busy = workbenchBusy;
    if (baseline !== prior || current !== version) {
      baseline = prior;
      current = version;
      select.length = 1;
      for (const candidate of prior?.report.investigation.candidates ?? []) {
        if (['CONDITIONALLY_SATISFIED', 'CONDITIONALLY_REFUTED'].includes(candidate.computation?.status)) {
          select.add(new Option(candidate.id, candidate.id));
        }
      }
      clear();
    }
    controls();
  };
}
