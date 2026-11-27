import {verifyPrivateCandidate} from './candidate-private-proof.js';
import {loadPrivateEngine} from './private-wasm.js';
import {discoverPeerCalculations, readPeerCalculation} from '../../../packages/sutra-knowledge/candidate-peer-catalog.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {GUIDE_ORIGIN} from '../static-headers.mjs';
import {externalConsentDialog} from './external-consent-dialog.js';

const loopback = new Set(['127.0.0.1', 'localhost', '[::1]']);
function allowedOrigin(value) {
  const origin = new URL(value);
  if (value === GUIDE_ORIGIN ||
      value === origin.origin && origin.protocol === 'http:' && loopback.has(location.hostname) && loopback.has(origin.hostname)) return value;
  throw new Error('PEER_ORIGIN');
}

export function connectCandidatePeer({by, receive}) {
  const origin = by('peer-calculation-origin');
  const pin = by('peer-calculation-pin');
  const discover = by('peer-calculation-discover');
  const fetch = by('peer-calculation-fetch');
  const pick = by('peer-calculation-item');
  const state = by('peer-calculation-state');
  const cancel = by('peer-calculation-cancel');
  const decide = externalConsentDialog({
    dialog:by('peer-calculation-consent'), purpose:by('peer-calculation-purpose'), url:by('peer-calculation-resource'),
    approve:by('peer-calculation-allow'), deny:by('peer-calculation-deny')
  });
  const inspector = createConsentInspector({decide});
  origin.value = GUIDE_ORIGIN;
  let catalog, request = null;

  function controls() {
    discover.disabled = Boolean(request);
    pick.disabled = Boolean(request) || !catalog;
    fetch.disabled = pick.disabled || !pick.value;
    cancel.disabled = !request;
  }
  function reset() {
    request?.abort();
    request = null;
    catalog = null;
    pick.length = 1;
    pick.value = '';
    state.textContent = '';
    controls();
  }

  cancel.addEventListener('click', () => { reset(); state.textContent = 'Peer request cancelled.'; });
  for (const field of [origin, pin]) field.addEventListener('input',reset);
  pick.addEventListener('change',controls);
  async function work(action) {
    if (request) return;
    const active = request = new AbortController();
    controls();
    try {
      await action(active);
    } catch (error) {
      if (request === active) state.textContent = error.code === 'CONSENT_DENIED'
        ? 'Contact denied.' : 'Peer calculation refused or unavailable.';
    } finally {
      if (request === active) {
        request = null;
        controls();
      }
    }
  }
  discover.addEventListener('click', () => {
    if (discover.disabled) return;
    reset();
    void work(async active => {
      const admitted = await discoverPeerCalculations({
        origin:allowedOrigin(origin.value.trim()), expectedPin:pin.value.trim(), inspector, signal:active.signal
      });
      if (request !== active) return;
      catalog = admitted;
      for (const item of admitted.entries) pick.add(new Option(item.id + ' · ' + item.bytes + ' bytes',item.id));
      state.textContent = 'Catalog verified against the retained digest.';
    });
  });
  fetch.addEventListener('click', () => {
    if (fetch.disabled) return;
    void work(async active => {
      const result = await readPeerCalculation({
        catalog,id:pick.value,inspector,signal:active.signal,
        verifyPrivate:async (text, pin) => verifyPrivateCandidate(text,pin,await loadPrivateEngine())
      });
      if (request !== active) return;
      if (!('hiddenQuantities' in result.replay)) receive(result);
      state.textContent = result.replay.candidateId + ' · ' + result.replay.outcome.replaceAll('_',' ') + ('hiddenQuantities' in result.replay ? '. Verified private proof in this browser.' : '. Replayed in this browser.');
    });
  });
  controls();
}
