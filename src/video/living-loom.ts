/** Render media state without taking ownership of the Video.js controls. */
export function connectLivingLoom(media: HTMLMediaElement, container: HTMLElement) {
  let started = false;
  let loading = false;
  let seeking = false;
  let interruption: 'waiting' | 'stalled' | undefined;
  let state = 'idle';
  let progress = '';

  function sync(event?: Event) {
    if (event && !media.isConnected) return;
    switch (event?.type) {
      case 'loadstart':
      case 'emptied':
        loading = event.type === 'loadstart';
        started = false;
        seeking = false;
        interruption = undefined;
        break;
      case 'playing':
      case 'timeupdate':
        if (!media.paused && !media.seeking && media.readyState >= 3) {
          started = true;
          interruption = undefined;
        }
        break;
      case 'waiting':
      case 'stalled':
        if (!media.paused && !media.ended && !media.error) {
          interruption = event.type;
        }
        break;
      case 'seeking':
        seeking = true;
        if (interruption === 'stalled') interruption = 'waiting';
        break;
      case 'seeked':
        seeking = false;
        if (media.readyState >= 3) interruption = undefined;
        break;
      case 'canplay':
      case 'pause':
      case 'ended':
      case 'error':
        interruption = undefined;
        break;
    }

    const duration = media.duration;
    const time = media.currentTime;
    const finite = Number.isFinite(duration) && duration > 0 && Number.isFinite(time);
    const activeSeek = !media.error && (seeking || media.seeking);
    const complete = finite && !activeSeek && !media.error && media.ended && time >= duration - .05;
    const blocked = Boolean(interruption && !media.paused && !complete && !media.error);
    const nextProgress = finite ? `${(100 * Math.min(1, Math.max(0, time / duration))).toFixed(3)}%` : '';
    if (nextProgress !== progress) {
      progress = nextProgress;
      if (progress) container.style.setProperty('--dhago-progress', progress);
      else container.style.removeProperty('--dhago-progress');
    }

    container.toggleAttribute('data-weave-finite', finite);
    container.toggleAttribute('data-weave-complete', complete);
    container.toggleAttribute('data-thread-seeking', activeSeek);
    container.toggleAttribute('data-thread-buffering', blocked);
    container.toggleAttribute('data-thread-stalled', blocked && !activeSeek && interruption === 'stalled');

    let nextState: string;
    if (media.error) nextState = 'error';
    else if (activeSeek) nextState = 'seeking';
    else if (complete || media.ended) nextState = 'ended';
    else if (blocked && interruption) nextState = interruption;
    else if (!media.paused) nextState = started && media.readyState >= 3 ? 'playing' : 'loading';
    else if (started || time > 0) nextState = 'paused';
    else if (media.readyState > 0) nextState = 'ready';
    else nextState = loading ? 'loading' : 'idle';

    if (nextState !== state) {
      state = nextState;
      container.dataset.playbackState = state;
    }
  }

  container.dataset.playbackState = state;
  for (const type of [
    'loadstart', 'emptied', 'loadedmetadata', 'durationchange', 'canplay',
    'play', 'playing', 'pause', 'timeupdate', 'seeking', 'seeked',
    'waiting', 'stalled', 'ended', 'error',
  ]) media.addEventListener(type, sync);
}
