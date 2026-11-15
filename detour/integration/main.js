import { createDetourPlayer } from '../skin/index.js';

// This page is an independent host example: media selection stays outside the skin.
// Its default is deliberately different from the public showcase and QA fixture.
const options = new URLSearchParams(location.search);
const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.crossOrigin = 'anonymous';
video.src = options.get('src') || new URL('../fixtures/daylight-study.mp4', location.href).href;

const captionsUrl = options.get('captions') || new URL('../fixtures/daylight-study.vtt', location.href).href;
const track = document.createElement('track');
track.kind = 'captions';
track.srclang = 'en';
track.label = 'Host captions';
track.src = captionsUrl;
video.append(track);

const player = createDetourPlayer(video, { sourceKind: 'vod' });
document.querySelector('#mount').append(player);
window.addEventListener('pagehide', () => player.remove(), { once: true });
