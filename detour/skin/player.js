import './place.js';
import { createPlayerShell } from './shell.js';

const placeMarkup = `
<detour-place hidden>
  <button type="button" class="detour-hold"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M13 3H6v12h7" fill="none" stroke="currentColor" stroke-width="2"/></svg>Keep my place</button>
  <div class="detour-held" hidden>
    <button type="button" class="detour-return"><span class="detour-return-label">Return to <bdi class="detour-return-time"></bdi></span><span class="detour-return-pending" hidden>Returning…</span></button>
    <button type="button" class="detour-stay">Stay here</button>
  </div>
</detour-place>`;

/**
 * Mount one host-owned native video or audio element in a Video.js player.
 * Declare sourceKind 'vod' to opt a native video into the place-holding flow.
 */
export function createDetourPlayer(media, { sourceKind } = {}) {
  const player = createPlayerShell(media, placeMarkup);
  const place = player.querySelector('detour-place');
  place.toggleAttribute('data-vod', sourceKind === 'vod' && media instanceof HTMLVideoElement);
  return player;
}
