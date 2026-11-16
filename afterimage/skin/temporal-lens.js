import { formatAfterimageDelta, formatAfterimageTime } from './format-time.js';

const CAP_PIXELS = 920000;
const CAP_LONG_EDGE = 1280;
const CALLBACK_TIMEOUT_MS = 320;

function seekability(video) {
  return video.seekable?.length > 0 ? 'available' : 'empty';
}

function captureState(video, player) {
  if (video.error) {
    return {
      kind: 'source-error',
      reason: 'source-error',
      seekability: seekability(video),
      ready: false,
      message: 'This video cannot provide a frame for Temporal Lens.',
    };
  }

  const hasDeclaredSource = Boolean(
    video.currentSrc || video.getAttribute('src') || video.querySelector('source[src]')
  );
  if (!hasDeclaredSource) {
    return {
      kind: 'timeline-unavailable',
      reason: 'source-missing',
      seekability: seekability(video),
      ready: false,
      message: 'Temporal Lens needs a stable on-demand video timeline.',
    };
  }

  // Metadata readiness is evaluated before duration semantics. A newly attached
  // source normally reports duration=NaN until metadata arrives; that is a
  // waiting state, not evidence that the source is an unsupported timeline.
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    return {
      kind: 'metadata-pending',
      reason: 'metadata-pending',
      seekability: seekability(video),
      ready: false,
      message: 'Wait for video metadata to load, then try again.',
    };
  }

  const streamType = String(player.store?.streamType || '').toLowerCase();
  const rangeState = seekability(video);
  if (streamType.startsWith('live')) {
    return {
      kind: 'timeline-unavailable',
      reason: rangeState === 'available' ? 'live-dvr' : 'live-stream',
      seekability: rangeState,
      ready: false,
      message: 'Temporal Lens needs a stable on-demand video timeline.',
    };
  }

  if (Number.isNaN(video.duration)) {
    return {
      kind: 'timeline-unavailable',
      reason: 'duration-unknown',
      seekability: rangeState,
      ready: false,
      message: 'Temporal Lens needs a stable on-demand video timeline.',
    };
  }
  if (video.duration === Infinity) {
    return {
      kind: 'timeline-unavailable',
      reason: 'duration-infinite',
      seekability: rangeState,
      ready: false,
      message: 'Temporal Lens needs a stable on-demand video timeline.',
    };
  }
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return {
      kind: 'timeline-unavailable',
      reason: video.duration === 0 ? 'duration-zero' : 'duration-invalid',
      seekability: rangeState,
      ready: false,
      message: 'Temporal Lens needs a stable on-demand video timeline.',
    };
  }
  if (video.seeking) {
    return {
      kind: 'seeking',
      reason: 'seeking',
      seekability: rangeState,
      ready: false,
      message: 'Wait for seeking to finish, then try again.',
    };
  }
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return {
      kind: 'frame-pending',
      reason: 'frame-pending',
      seekability: rangeState,
      ready: false,
      message: 'Wait for the frame to load, then try again.',
    };
  }
  if (!captureSize(video)) {
    return {
      kind: 'frame-unavailable',
      reason: 'picture-unavailable',
      seekability: rangeState,
      ready: false,
      message: 'The current video does not expose a capturable picture.',
    };
  }

  // Manual Pin captures the already-rendered current frame and never seeks.
  // An empty native seekable range therefore does not make capture dishonest;
  // expose it as evidence while preserving ordinary host playback semantics.
  return {
    kind: video.ended ? 'ended-ready' : 'ready',
    reason: video.ended ? 'ended-capturable' : 'vod-ready',
    seekability: rangeState,
    ready: true,
    message: '',
  };
}

function captureSize(video) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return null;
  const longScale = Math.min(1, CAP_LONG_EDGE / Math.max(sourceWidth, sourceHeight));
  const pixelScale = Math.min(1, Math.sqrt(CAP_PIXELS / (sourceWidth * sourceHeight)));
  const scale = Math.min(longScale, pixelScale);
  return { width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) };
}

function safePercent(time, duration) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return null;
  return Math.max(0, Math.min(100, time / duration * 100));
}

class AfterimageTemporalLens extends HTMLElement {
  #disconnect;
  #sourceEpoch = 0;
  #requestId = 0;
  #pendingFrameCallback = null;
  #pendingTimer = null;
  #reference = null;
  #presentation = 'closed';
  #seam = 50;
  #cancelPending = () => {};

  connectedCallback() {
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;
    const container = this.closest('.afterimage');
    const player = this.closest('video-player');
    const video = container.querySelector('video');
    const referenceLayer = container.querySelector('.afterimage-reference');
    const referenceCanvas = referenceLayer.querySelector('canvas');
    const seamLine = container.querySelector('.afterimage-seam');
    const seamControl = container.querySelector('.afterimage-seam-control');
    const relation = container.querySelector('.afterimage-relation');
    const pinnedOutput = container.querySelector('[data-afterimage-pinned]');
    const nowOutput = container.querySelector('[data-afterimage-now]');
    const deltaOutput = container.querySelector('[data-afterimage-delta]');
    const pinMark = container.querySelector('.afterimage-pin');
    const interval = container.querySelector('.afterimage-interval');
    const status = container.querySelector('.afterimage-status');
    const pinButton = this.querySelector('[data-afterimage-pin]');
    const compareButton = this.querySelector('[data-afterimage-compare]');
    const closeButton = this.querySelector('[data-afterimage-close]');
    const clearButton = this.querySelector('[data-afterimage-clear]');
    const presetButtons = [...this.querySelectorAll('[data-afterimage-preset]')];

    // A custom element may be detached while a frame request has temporarily
    // disabled Pin. Reconnection is a fresh lifecycle epoch; never inherit that
    // transient disabled state from the previous mount.
    pinButton.disabled = false;

    const updateCaptureState = () => {
      const state = captureState(video, player);
      this.dataset.captureState = state.kind;
      this.dataset.captureReason = state.reason;
      this.dataset.captureSeekability = state.seekability;
      pinButton.title = state.ready ? '' : state.message;
      return state;
    };

    const announce = message => {
      status.textContent = '';
      queueMicrotask(() => { if (!signal.aborted) status.textContent = message; });
    };

    const cancelPending = () => {
      if (this.#pendingTimer !== null) {
        clearTimeout(this.#pendingTimer);
        this.#pendingTimer = null;
      }
      if (this.#pendingFrameCallback !== null && typeof video.cancelVideoFrameCallback === 'function') {
        video.cancelVideoFrameCallback(this.#pendingFrameCallback);
      }
      this.#pendingFrameCallback = null;
    };
    this.#cancelPending = cancelPending;

    const invalidatePending = () => {
      cancelPending();
      ++this.#requestId;
      if (pinButton.disabled) pinButton.disabled = false;
    };

    const updateSeam = value => {
      this.#seam = Math.max(0, Math.min(100, Number(value) || 0));
      referenceLayer.style.clipPath = 'inset(0 ' + (100 - this.#seam) + '% 0 0)';
      seamLine.style.insetInlineStart = this.#seam + '%';
      seamControl.value = String(this.#seam);
      seamControl.setAttribute('aria-valuetext', Math.round(this.#seam) + '% pinned frame');
    };

    const updateRelation = () => {
      if (!this.#reference) return;
      pinnedOutput.textContent = (this.#reference.approximate ? '≈' : '') + formatAfterimageTime(this.#reference.time);
      nowOutput.textContent = formatAfterimageTime(video.currentTime);
      deltaOutput.textContent = formatAfterimageDelta(video.currentTime - this.#reference.time);
      const pinPercent = safePercent(this.#reference.time, video.duration);
      const nowPercent = safePercent(video.currentTime, video.duration);
      if (pinPercent === null || nowPercent === null) {
        pinMark.hidden = true;
        interval.hidden = true;
        return;
      }
      pinMark.hidden = false;
      interval.hidden = false;
      pinMark.style.insetInlineStart = pinPercent + '%';
      interval.style.insetInlineStart = Math.min(pinPercent, nowPercent) + '%';
      interval.style.width = Math.abs(nowPercent - pinPercent) + '%';
      pinMark.toggleAttribute('data-edge-start', pinPercent < 3);
      pinMark.toggleAttribute('data-edge-end', pinPercent > 97);
    };

    const render = () => {
      const hasReference = Boolean(this.#reference);
      const open = hasReference && this.#presentation === 'open';
      referenceLayer.hidden = !open;
      seamLine.hidden = !open;
      seamControl.hidden = !open;
      relation.hidden = !hasReference;
      pinMark.hidden = !hasReference;
      interval.hidden = !hasReference;
      compareButton.hidden = !hasReference || open;
      closeButton.hidden = !open;
      clearButton.hidden = !hasReference;
      for (const button of presetButtons) button.hidden = !open;
      pinButton.querySelector('span').textContent = hasReference ? 'Pin current frame' : 'Pin moment';
      updateSeam(this.#seam);
      updateRelation();
    };

    const commitCandidate = (candidate, time, approximate, requestId, sourceEpoch) => {
      if (signal.aborted || requestId !== this.#requestId || sourceEpoch !== this.#sourceEpoch) return false;
      referenceCanvas.width = candidate.width;
      referenceCanvas.height = candidate.height;
      const context = referenceCanvas.getContext('2d', { alpha: false });
      context.drawImage(candidate, 0, 0);
      this.#reference = { time, approximate, sourceEpoch };
      this.#presentation = 'open';
      this.#seam = 50;
      render();
      announce((approximate ? 'Pinned approximately at ' : 'Pinned at ') + formatAfterimageTime(time) + '. Comparison opened.');
      this.dispatchEvent(new CustomEvent('afterimage:pin-complete', { bubbles: true, detail: { time, approximate } }));
      return true;
    };

    const drawCandidate = (reportedTime, approximate, requestId, sourceEpoch) => {
      const size = captureSize(video);
      if (!size || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) throw new Error('Wait for the frame to load, then try again.');
      const candidate = document.createElement('canvas');
      candidate.width = size.width;
      candidate.height = size.height;
      const context = candidate.getContext('2d', { alpha: false });
      if (!context) throw new Error('This browser cannot capture the current frame.');
      context.drawImage(video, 0, 0, size.width, size.height);
      const time = Number.isFinite(reportedTime) ? reportedTime : video.currentTime;
      if (!Number.isFinite(time)) throw new Error('The current frame time is unavailable.');
      return commitCandidate(candidate, time, approximate, requestId, sourceEpoch);
    };

    const capture = () => {
      const state = updateCaptureState();
      if (!state.ready) {
        announce(state.message);
        this.dispatchEvent(new CustomEvent('afterimage:pin-failed', {
          bubbles: true,
          detail: { message: state.message, state: state.kind },
        }));
        return;
      }
      cancelPending();
      const requestId = ++this.#requestId;
      const sourceEpoch = this.#sourceEpoch;
      pinButton.disabled = true;
      pinButton.querySelector('span').textContent = 'Pinning…';

      const finish = (reportedTime, approximate) => {
        cancelPending();
        try {
          drawCandidate(reportedTime, approximate, requestId, sourceEpoch);
        } catch (error) {
          if (requestId === this.#requestId && sourceEpoch === this.#sourceEpoch) {
            const message = error instanceof Error ? error.message : 'Could not pin this frame.';
            announce(message);
            this.dispatchEvent(new CustomEvent('afterimage:pin-failed', { bubbles: true, detail: { message } }));
          }
        } finally {
          if (!signal.aborted && requestId === this.#requestId) {
            pinButton.disabled = false;
            render();
          }
        }
      };

      if (!video.paused && typeof video.requestVideoFrameCallback === 'function') {
        this.#pendingFrameCallback = video.requestVideoFrameCallback((_now, metadata) => {
          this.#pendingFrameCallback = null;
          finish(Number.isFinite(metadata.mediaTime) ? metadata.mediaTime : video.currentTime, !Number.isFinite(metadata.mediaTime));
        });
        this.#pendingTimer = setTimeout(() => {
          this.#pendingTimer = null;
          if (requestId === this.#requestId && sourceEpoch === this.#sourceEpoch) finish(video.currentTime, true);
        }, CALLBACK_TIMEOUT_MS);
      } else {
        finish(video.currentTime, true);
      }
    };

    const closeComparison = restoreFocus => {
      if (!this.#reference) return;
      invalidatePending();
      this.#presentation = 'closed';
      render();
      announce('Comparison closed. The pinned frame remains on the timeline.');
      if (restoreFocus) compareButton.focus({ preventScroll: true });
    };

    const clearReference = () => {
      invalidatePending();
      this.#reference = null;
      this.#presentation = 'closed';
      referenceCanvas.width = 1;
      referenceCanvas.height = 1;
      render();
      announce('Pinned frame cleared.');
      if (!pinButton.disabled) pinButton.focus({ preventScroll: true });
    };

    pinButton.addEventListener('click', capture, { signal });
    compareButton.addEventListener('click', () => {
      if (!this.#reference) return;
      this.#presentation = 'open';
      render();
      announce('Comparison opened.');
      seamControl.focus({ preventScroll: true });
    }, { signal });
    closeButton.addEventListener('click', () => closeComparison(true), { signal });
    clearButton.addEventListener('click', clearReference, { signal });
    seamControl.addEventListener('input', () => updateSeam(seamControl.value), { signal });
    seamControl.addEventListener('change', () => announce('Pinned frame reveal set to ' + Math.round(this.#seam) + ' percent.'), { signal });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchDragging = false;
    let touchVertical = false;
    const seamFromClientX = clientX => {
      const rect = seamControl.getBoundingClientRect();
      if (!rect.width) return this.#seam;
      return Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100));
    };
    const resetTouch = () => {
      touchDragging = false;
      touchVertical = false;
    };
    seamControl.addEventListener('touchstart', event => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      resetTouch();
    }, { signal, passive: true });
    seamControl.addEventListener('touchmove', event => {
      const touch = event.touches[0];
      if (!touch || touchVertical) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (!touchDragging && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (!touchDragging && Math.abs(dy) > Math.abs(dx)) {
        touchVertical = true;
        return;
      }
      touchDragging = true;
      updateSeam(seamFromClientX(touch.clientX));
      event.preventDefault();
    }, { signal, passive: false });
    seamControl.addEventListener('touchend', event => {
      const touch = event.changedTouches[0];
      if (!touchVertical && touch) {
        if (!touchDragging) updateSeam(seamFromClientX(touch.clientX));
        announce('Pinned frame reveal set to ' + Math.round(this.#seam) + ' percent.');
      }
      resetTouch();
    }, { signal, passive: true });
    seamControl.addEventListener('touchcancel', resetTouch, { signal, passive: true });

    for (const button of presetButtons) {
      button.addEventListener('click', () => {
        updateSeam(Number(button.dataset.afterimagePreset));
        announce(button.textContent.trim() + ' view selected.');
        seamControl.focus({ preventScroll: true });
      }, { signal });
    }

    video.addEventListener('timeupdate', updateRelation, { signal });
    video.addEventListener('durationchange', updateRelation, { signal });
    video.addEventListener('loadedmetadata', updateRelation, { signal });
    for (const eventName of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange', 'progress', 'seeking', 'seeked', 'waiting', 'playing', 'ended', 'error']) {
      video.addEventListener(eventName, updateCaptureState, { signal });
    }

    for (const eventName of ['loadstart', 'emptied']) {
      video.addEventListener(eventName, () => {
        invalidatePending();
        ++this.#sourceEpoch;
        this.#reference = null;
        this.#presentation = 'closed';
        render();
        updateCaptureState();
      }, { signal });
    }

    player.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.#presentation === 'open') {
        event.preventDefault();
        closeComparison(true);
      }
    }, { signal });

    render();
    updateCaptureState();
  }

  disconnectedCallback() {
    this.#cancelPending();
    this.#disconnect?.abort();
    ++this.#requestId;
    this.#reference = null;
  }
}

if (!customElements.get('afterimage-temporal-lens')) {
  customElements.define('afterimage-temporal-lens', AfterimageTemporalLens);
}
