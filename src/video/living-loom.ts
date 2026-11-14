const WEAVE_STAGES = [
  'raw-fibre',
  'preparing-fibre',
  'thread-warp',
  'warp-weft',
] as const;

/** Render truthful media state without taking ownership of the Video.js controls. */
export function connectLivingLoom(media: HTMLMediaElement, container: HTMLElement) {
  let started = false;
  let loading = false;
  let seeking = false;
  let interruption: 'waiting' | 'stalled' | undefined;
  let state = 'idle';
  let progress = '';
  let weaveStage = '';

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
        if (!media.paused && !media.seeking && media.readyState >= 3) {
          started = true;
          interruption = undefined;
        }
        break;
      case 'timeupdate':
        if (!media.paused && !media.seeking && media.readyState >= 3) {
          started = true;
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
    const ratio = finite ? Math.min(1, Math.max(0, time / duration)) : 0;
    const nextProgress = finite ? `${(100 * ratio).toFixed(3)}%` : '';
    if (nextProgress !== progress) {
      progress = nextProgress;
      if (progress) container.style.setProperty('--dhago-progress', progress);
      else container.style.removeProperty('--dhago-progress');
    }

    if (finite) {
      const stageIndex = Math.min(WEAVE_STAGES.length - 1, Math.floor(Math.min(.999999, ratio) * WEAVE_STAGES.length));
      const stageStart = stageIndex / WEAVE_STAGES.length;
      const stagePhase = Math.min(1, Math.max(0, (ratio - stageStart) * WEAVE_STAGES.length));
      const nextStage = WEAVE_STAGES[stageIndex];
      container.style.setProperty('--dhago-time-ratio', ratio.toFixed(5));
      container.style.setProperty('--dhago-stage-index', String(stageIndex));
      container.style.setProperty('--dhago-stage-phase', stagePhase.toFixed(5));
      if (nextStage !== weaveStage) {
        weaveStage = nextStage;
        container.dataset.weaveStage = weaveStage;
      }
    } else {
      weaveStage = '';
      delete container.dataset.weaveStage;
      container.style.removeProperty('--dhago-time-ratio');
      container.style.removeProperty('--dhago-stage-index');
      container.style.removeProperty('--dhago-stage-phase');
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
