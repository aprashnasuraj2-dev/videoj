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
import './player.css';

function interfaceMarkup(enhancement = '') {
  return '<media-container class="afterimage" lang="en">' +
    '<div class="afterimage-stage">' +
      '<div class="afterimage-screen"></div>' +
      '<div class="afterimage-reference" hidden aria-hidden="true"><canvas></canvas></div>' +
      '<div class="afterimage-seam" hidden aria-hidden="true"><span></span></div>' +
      '<input class="afterimage-seam-control" type="range" min="0" max="100" value="50" step="1" aria-label="Pinned frame reveal" hidden>' +
    '</div>' +
    '<div class="afterimage-deck">' +
      '<div class="afterimage-relation" hidden>' +
        '<span><b>Pinned</b> <output data-afterimage-pinned>—:——</output></span>' +
        '<span><b>Now</b> <output data-afterimage-now>—:——</output></span>' +
        '<span class="afterimage-delta"><b>Interval</b> <output data-afterimage-delta>—</output></span>' +
      '</div>' +
      '<div class="afterimage-rail">' +
        '<media-time-slider label="Seek" step="1" large-step="10">' +
          '<media-slider-track class="afterimage-track"><media-slider-fill class="afterimage-fill"></media-slider-fill></media-slider-track>' +
          '<media-slider-thumb class="afterimage-thumb"></media-slider-thumb>' +
        '</media-time-slider>' +
        '<span class="afterimage-interval" hidden aria-hidden="true"></span>' +
        '<span class="afterimage-pin" hidden aria-hidden="true"><i></i></span>' +
      '</div>' +
      '<div class="afterimage-bar">' +
        '<div class="afterimage-transport">' +
          '<media-play-button class="afterimage-icon afterimage-play-button">' +
            '<svg class="afterimage-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.6v14.8L19 12z" fill="currentColor"/></svg>' +
            '<svg class="afterimage-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor"/></svg>' +
          '</media-play-button>' +
          '<span class="afterimage-clock" aria-label="Playback time"><media-time type="current"></media-time><span aria-hidden="true"> / </span><media-time type="duration"></media-time></span>' +
        '</div>' +
        '<div class="afterimage-options">' +
          '<media-mute-button class="afterimage-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8c4 2 4 6 0 8"/></svg></media-mute-button>' +
          '<media-volume-slider label="Volume" class="afterimage-volume"><media-slider-track class="afterimage-track"><media-slider-fill class="afterimage-fill"></media-slider-fill></media-slider-track><media-slider-thumb class="afterimage-thumb"></media-slider-thumb></media-volume-slider>' +
          '<media-captions-button class="afterimage-icon afterimage-cc"><span aria-hidden="true">CC</span></media-captions-button>' +
          '<media-fullscreen-button class="afterimage-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 5H5v4m10-4h4v4M5 15v4h4m10-4v4h-4"/></svg></media-fullscreen-button>' +
        '</div>' +
        enhancement +
      '</div>' +
      '<media-buffering-indicator class="afterimage-buffering">Buffering…</media-buffering-indicator>' +
      '<p class="afterimage-status" role="status" aria-live="polite" aria-atomic="true"></p>' +
    '</div>' +
  '</media-container>';
}

export function createAfterimageShell(media, enhancement = '') {
  if (!(media instanceof HTMLVideoElement)) throw new TypeError('AFTERIMAGE requires a host-owned HTMLVideoElement.');
  const player = document.createElement('video-player');
  player.innerHTML = interfaceMarkup(enhancement);
  player.firstElementChild.querySelector('.afterimage-screen').append(media);
  return player;
}

export function createBasePlayer(media) {
  return createAfterimageShell(media);
}
