import { createDetourPlayer } from '../../skin/player.js';

const video = document.createElement('video');
video.preload = 'metadata';
video.playsInline = true;
video.src = new URL('../../fixtures/navigation-study.mp4', document.baseURI).href;

const player = createDetourPlayer(video);
const picker = document.querySelector('#picker');
const target = document.querySelector('#target');
const cancel = document.querySelector('#cancel');
const summary = document.querySelector('#summary');
const marker = document.createElement('span');
marker.className = 'pausepoint-mark';
marker.hidden = true;
marker.setAttribute('aria-hidden', 'true');
player.querySelector('.detour-rail').append(marker);
document.querySelector('#player').append(player);

let armedTime;
let previousTime;
let seeking = false;

function clear(notice) {
  armedTime = undefined;
  marker.hidden = true;
  cancel.disabled = true;
  summary.textContent = notice;
}

function setLimit() {
  if (Number.isFinite(video.duration)) target.max = String(video.duration);
}

picker.addEventListener('submit', event => {
  event.preventDefault();
  const time = target.valueAsNumber;
  if (!Number.isFinite(time) || !Number.isFinite(video.duration)
    || video.seeking || time <= video.currentTime || time >= video.duration) {
    summary.textContent = 'Choose a time between the playhead and the end.';
    return;
  }
  armedTime = time;
  previousTime = video.currentTime;
  marker.style.left = `${time / video.duration * 100}%`;
  marker.hidden = false;
  cancel.disabled = false;
  summary.textContent = `Pause armed at ${time.toFixed(1)} seconds.`;
});

cancel.addEventListener('click', () => {
  clear('Pause cleared.');
  target.focus();
});
video.addEventListener('loadedmetadata', setLimit);
video.addEventListener('emptied', () => {
  previousTime = undefined;
  seeking = false;
  clear('Choose a time ahead of the playhead.');
});
video.addEventListener('seeking', () => { seeking = true; });
video.addEventListener('seeked', () => {
  previousTime = video.currentTime;
  seeking = false;
  if (armedTime !== undefined && video.currentTime >= armedTime) {
    clear('Pause point skipped by seeking.');
  }
});
video.addEventListener('timeupdate', () => {
  if (seeking || video.seeking) return;
  const now = video.currentTime;
  if (armedTime !== undefined && !video.paused && previousTime < armedTime && now >= armedTime) {
    const time = armedTime;
    clear(`Paused after crossing ${time.toFixed(1)} seconds.`);
    player.store.pause();
  }
  previousTime = now;
});
