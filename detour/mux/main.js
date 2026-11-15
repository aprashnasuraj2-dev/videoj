import { createDetourPlayer } from '../skin/player.js';
import { muxStaticMp4Url } from '../skin/mux.js';
import '../demo/page.css';
import './page.css';

const panel = document.querySelector('.mux-panel');
const status = document.querySelector('[data-detour-source-status]');
const retry = document.querySelector('[data-detour-retry]');
const fallback = document.querySelector('[data-detour-fallback]');
const configUrl = new URL('../mux-public.json', document.baseURI);
const configResponse = await fetch(configUrl, { cache: 'no-store' });
if (!configResponse.ok) throw new Error(`Could not load public Mux configuration (${configResponse.status})`);
const config = await configResponse.json();

const primaryUrl = muxStaticMp4Url(config.playbackId, { rendition: config.staticRendition });
if (primaryUrl !== config.staticMp4Url) throw new Error('Public Mux configuration does not match the URL helper');
const fallbackUrl = new URL('../showcase/detour-showcase-v1.mp4', document.baseURI).href;
const captionsUrl = new URL('../showcase/detour-showcase-v1.vtt', document.baseURI).href;

const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.poster = config.posterUrl;

const captions = document.createElement('track');
captions.kind = 'captions';
captions.srclang = 'en';
captions.label = 'English';
captions.src = captionsUrl;
video.append(captions);

const player = createDetourPlayer(video, { sourceKind: 'vod' });
document.querySelector('#example').append(player);
const playerError = player.querySelector('.detour-error');

function markIsActive() {
  const held = player.querySelector('.detour-held');
  return Boolean(held && !held.hidden);
}

function setSource(kind) {
  const hadMark = markIsActive();
  playerError.hidden = true;
  video.pause();
  video.dataset.provider = kind;
  video.src = kind === 'mux' ? primaryUrl : fallbackUrl;
  video.load();
  status.dataset.state = kind;
  if (kind === 'mux') {
    panel.hidden = true;
    retry.hidden = true;
    fallback.hidden = true;
    status.textContent = '';
  } else {
    panel.hidden = false;
    retry.hidden = false;
    fallback.hidden = true;
    status.textContent = hadMark
      ? 'Playing the backup video. Your saved place was cleared because the video changed.'
      : 'Playing the backup video.';
  }
}

video.addEventListener('error', () => {
  if (video.dataset.provider !== 'mux') return;
  playerError.hidden = true;
  panel.hidden = false;
  status.dataset.state = 'error';
  status.textContent = markIsActive()
    ? 'This video source is unavailable. Using the backup will clear your saved place.'
    : 'This video source is unavailable. Try again or use the backup video.';
  retry.hidden = false;
  fallback.hidden = false;
});

retry.addEventListener('click', () => setSource('mux'));
fallback.addEventListener('click', () => setSource('fallback'));
window.addEventListener('pagehide', () => player.remove(), { once: true });

setSource('mux');
