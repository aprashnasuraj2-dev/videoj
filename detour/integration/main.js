import { createDetourPlayer } from '../skin/index.js';

// Media selection belongs to the host. No fixture or Mux URL is imported by the skin.
const options = new URLSearchParams(location.search);
const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.crossOrigin = 'anonymous';
video.src = options.get('src') || new URL('../fixtures/navigation-study.mp4', location.href).href;
const captionsUrl = options.get('captions');
if (captionsUrl) {
  const track = document.createElement('track');
  track.kind = 'captions';
  track.srclang = 'en';
  track.label = 'Host captions';
  track.src = captionsUrl;
  video.append(track);
}
const player = createDetourPlayer(video, { sourceKind: 'vod' });
document.querySelector('#mount').append(player);
// Give hosts a disposal path; removing the player invokes custom-element cleanup.
window.addEventListener('pagehide', () => player.remove(), { once: true });
