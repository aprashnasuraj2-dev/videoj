import './place.js';
import { createPlayerShell } from './shell.js';

const placeMarkup = `
<detour-place hidden>
  <button type="button" class="detour-hold">
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M13 3H6v12h7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
    <span>Keep my place</span>
    <span class="detour-place-count" aria-hidden="true" hidden></span>
  </button>
  <button type="button" class="detour-clear" aria-label="Clear all saved places" hidden>Clear</button>
  <div class="detour-held" hidden>
    <button type="button" class="detour-return"><span class="detour-return-label">Return to <bdi class="detour-return-time"></bdi></span><span class="detour-return-pending" hidden>Returning…</span></button>
    <button type="button" class="detour-stay">Stay here</button>
  </div>
</detour-place>`;

const validReturnUis = new Set(['button', 'marker']);

/**
 * Mount one host-owned native video or audio element in a Video.js player.
 * Declare sourceKind 'vod' to opt a native video into the place-holding flow.
 *
 * maxPlaces defaults to 1 and is intentionally capped at 4 so the seek rail
 * stays legible. Multiple places use marker return UI by default.
 */
export function createDetourPlayer(media, { sourceKind, maxPlaces = 1, returnUi } = {}) {
  if (!Number.isInteger(maxPlaces) || maxPlaces < 1 || maxPlaces > 4) {
    throw new RangeError('maxPlaces must be an integer from 1 to 4.');
  }
  const resolvedReturnUi = returnUi ?? (maxPlaces > 1 ? 'marker' : 'button');
  if (!validReturnUis.has(resolvedReturnUi)) {
    throw new TypeError("returnUi must be 'button' or 'marker'.");
  }
  if (maxPlaces > 1 && resolvedReturnUi !== 'marker') {
    throw new RangeError("Multiple saved places require returnUi: 'marker'.");
  }

  const player = createPlayerShell(media, placeMarkup);
  const place = player.querySelector('detour-place');
  place.toggleAttribute('data-vod', sourceKind === 'vod' && media instanceof HTMLVideoElement);
  place.dataset.maxPlaces = String(maxPlaces);
  place.dataset.returnUi = resolvedReturnUi;
  return player;
}
