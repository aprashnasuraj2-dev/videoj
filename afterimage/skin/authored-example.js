import { formatAfterimageTime } from './format-time.js';

const SEEK_TIMEOUT_MS = 3000;
const PIN_TIMEOUT_MS = 1800;

function finiteExampleVod(video) {
  return Number.isFinite(video.duration) && video.duration > 0;
}

function waitForMetadata(video, signal) {
  if (finiteExampleVod(video)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('The example is not ready yet.')), SEEK_TIMEOUT_MS);
    const onLoaded = () => finish();
    const onError = () => finish(new Error('The example video could not be loaded.'));
    const onAbort = () => finish(new DOMException('Aborted', 'AbortError'));
    const finish = error => {
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
      error ? reject(error) : resolve();
    };
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function seekTo(video, seconds, signal) {
  const target = Math.max(0, Math.min(video.duration, seconds));
  if (!video.seeking && Math.abs(video.currentTime - target) < 0.04) return Promise.resolve(target);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('The example seek took too long.')), SEEK_TIMEOUT_MS);
    const onSeeked = () => finish();
    const onError = () => finish(new Error('The example seek failed.'));
    const onAbort = () => finish(new DOMException('Aborted', 'AbortError'));
    const finish = error => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
      error ? reject(error) : resolve(target);
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
    video.currentTime = target;
  });
}

function waitForPin(lens, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('The pinned frame did not arrive in time.')), PIN_TIMEOUT_MS);
    const onComplete = event => finish(null, event.detail);
    const onFailed = event => finish(new Error(event.detail?.message || 'The pinned frame could not be created.'));
    const onAbort = () => finish(new DOMException('Aborted', 'AbortError'));
    const finish = (error, detail) => {
      clearTimeout(timer);
      lens.removeEventListener('afterimage:pin-complete', onComplete);
      lens.removeEventListener('afterimage:pin-failed', onFailed);
      signal?.removeEventListener('abort', onAbort);
      error ? reject(error) : resolve(detail);
    };
    lens.addEventListener('afterimage:pin-complete', onComplete, { once: true });
    lens.addEventListener('afterimage:pin-failed', onFailed, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function bindAfterimageExample(player, video, example) {
  const button = player.querySelector('[data-afterimage-example]');
  const lens = player.querySelector('afterimage-temporal-lens');
  const pinButton = player.querySelector('[data-afterimage-pin]');
  const status = player.querySelector('.afterimage-status');
  if (!button || !lens || !pinButton) return () => {};

  const controller = new AbortController();
  const { signal } = controller;
  let busy = false;

  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    const wasPaused = video.paused;
    try {
      await waitForMetadata(video, signal);
      if (!finiteExampleVod(video) || example.pinnedSeconds >= video.duration || example.currentSeconds > video.duration) {
        throw new Error('The authored comparison is outside this video.');
      }
      await seekTo(video, example.pinnedSeconds, signal);
      const pinResult = waitForPin(lens, signal);
      pinButton.click();
      const reference = await pinResult;
      await seekTo(video, example.currentSeconds, signal);
      const playbackIntentPreserved = video.paused === wasPaused;
      status.textContent = 'Example opened: pinned ' + formatAfterimageTime(reference.time) +
        ', now ' + formatAfterimageTime(video.currentTime) +
        (playbackIntentPreserved ? '.' : '. Playback state changed during the browser seek.');
      lens.querySelector('.afterimage-seam-control')?.focus({ preventScroll: true });
    } catch (error) {
      if (error?.name !== 'AbortError') status.textContent = error instanceof Error ? error.message : 'The example could not be opened.';
    } finally {
      busy = false;
      button.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}
