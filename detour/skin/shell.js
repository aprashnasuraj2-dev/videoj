import '@videojs/html/video/player';
import '@videojs/html/i18n';
import '@videojs/html/ui/container';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/time-slider';
import '@videojs/html/ui/slider-track';
import '@videojs/html/ui/slider-fill';
import '@videojs/html/ui/slider-thumb';
import '@videojs/html/ui/time';
import '@videojs/html/ui/mute-button';
import '@videojs/html/ui/volume-slider';
import '@videojs/html/ui/captions-button';
import '@videojs/html/ui/fullscreen-button';
import '@videojs/html/ui/buffering-indicator';
import './media-state.js';
import './player.css';

function interfaceMarkup(enhancement = '') {
  return `
  <media-container class="detour" lang="en" tabindex="-1">
    <div class="detour-screen"></div>
    <div class="detour-shelf">
      <div class="detour-rail">
        <media-time-slider label="Seek" step="1" large-step="10">
          <media-slider-track class="detour-track">
            <span class="detour-buffered" aria-hidden="true"></span>
            <media-slider-fill class="detour-fill"></media-slider-fill>
          </media-slider-track>
          <media-slider-thumb class="detour-thumb" tabindex="0"></media-slider-thumb>
        </media-time-slider>
        <span class="detour-origin" hidden aria-hidden="true"></span>
      </div>
      <div class="detour-bar">
        <div class="detour-transport">
          <media-play-button class="detour-icon">
            <svg class="detour-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.7v14.6L19 12z" fill="currentColor"/></svg>
            <svg class="detour-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor"/></svg>
            <svg class="detour-replay" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 10a7 7 0 1 1 1 6M5 5v5h5"/></svg>
          </media-play-button>
          <div class="detour-clock">
            <div class="detour-clock-values">
              <span class="detour-clock-visual" aria-hidden="true">
                <span data-detour-clock-current>00:00</span>
                <span>/</span>
                <span data-detour-clock-duration>00:00</span>
              </span>
              <span class="detour-clock-semantic">
                <media-time type="current"></media-time>
                <span aria-hidden="true">/</span>
                <media-time type="duration"></media-time>
              </span>
            </div>
            <span class="detour-clock-empty"><span aria-hidden="true">— / —</span><span class="detour-sr-only">Time unavailable</span></span>
          </div>
        </div>
        <div class="detour-options">
          <media-mute-button class="detour-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="detour-sound" d="M16 8c4 2 4 6 0 8m2-10c6 3 6 9 0 12"/><path class="detour-muted" d="m16 9 5 6m0-6-5 6"/></svg>
          </media-mute-button>
          <media-volume-slider label="Volume" class="detour-volume">
            <media-slider-track class="detour-track">
              <media-slider-fill class="detour-fill"></media-slider-fill>
            </media-slider-track>
            <media-slider-thumb class="detour-thumb"></media-slider-thumb>
          </media-volume-slider>
          <media-captions-button class="detour-icon detour-cc"><span aria-hidden="true">CC</span></media-captions-button>
          <media-fullscreen-button class="detour-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path class="detour-expand" d="M9 5H5v4m10-4h4v4M5 15v4h4m10-4v4h-4"/><path class="detour-contract" d="M5 9h4V5m10 4h-4V5M5 15h4v4m10-4h-4v4"/></svg>
          </media-fullscreen-button>
        </div>
        ${enhancement}
        <button type="button" class="detour-icon detour-settings" aria-label="Playback settings" aria-expanded="false" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16M8 4v6m8-1v6m-5-1v6"/></svg>
        </button>
        <div class="detour-menu" role="group" aria-label="Playback speed" hidden>
          <span>Playback speed</span>
          <button type="button" data-rate="0.75">0.75×</button>
          <button type="button" data-rate="1">1×</button>
          <button type="button" data-rate="1.25">1.25×</button>
        </div>
      </div>
      <div class="detour-media-status">
        <span class="detour-loading">Loading video…</span>
        <media-buffering-indicator class="detour-buffer">Buffering…</media-buffering-indicator>
        <span class="detour-ended">Video ended</span>
      </div>
      <p class="detour-notice" hidden></p>
      <p class="detour-sr-only detour-live" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="detour-error" hidden><span>This video could not load.</span> <button type="button">Try again</button></div>
      <detour-media-state hidden></detour-media-state>
    </div>
  </media-container>
`;
}

export function createPlayerShell(media, enhancement = '') {
  if (!(media instanceof HTMLVideoElement) && !(media instanceof HTMLAudioElement)) {
    throw new TypeError('A host-owned video or audio element is required.');
  }
  const player = document.createElement('video-player');
  player.innerHTML = interfaceMarkup(enhancement);
  const container = player.firstElementChild;
  container.querySelector('.detour-screen').prepend(media);
  if (media instanceof HTMLAudioElement) container.dataset.audio = '';
  return player;
}

export function createBasePlayer(media) {
  return createPlayerShell(media);
}
