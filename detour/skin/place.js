const arrivalTolerance = 0.5;
const deadlineMs = 8000;

function timeLabel(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function containsTime(ranges, time) {
  for (let i = 0; i < ranges.length; i += 1) {
    if (time >= ranges.start(i) && time <= ranges.end(i)) return true;
  }
  return false;
}

class DetourPlace extends HTMLElement {
  #disconnect;
  #attempt;
  #mark;
  #ready = false;
  #viewKey;
  #bufferKey;

  connectedCallback() {
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;
    const container = this.closest('media-container');
    const player = this.closest('video-player');
    const video = container.querySelector('video, audio');
    const origin = container.querySelector('.detour-origin');
    const slider = container.querySelector('media-time-slider');
    const buffered = container.querySelector('.detour-buffered');
    const live = container.querySelector('.detour-live');
    const hold = this.querySelector('.detour-hold');
    const held = this.querySelector('.detour-held');
    const back = this.querySelector('.detour-return');
    const stay = this.querySelector('.detour-stay');
    const error = container.querySelector('.detour-error');
    const sourceKey = () => `${video.getAttribute('src') ?? ''}\n${video.currentSrc}`;
    const seekable = time =>
      this.#ready && Number.isFinite(video.duration) && video.duration > 0
      && Number.isFinite(time) && containsTime(video.seekable, time);
    const accessible = () =>
      this.hasAttribute('data-vod') && seekable(video.currentTime) && Boolean(player.store?.seek);

    const render = () => {
      const allowed = accessible();
      const mark = this.#mark?.source === sourceKey() ? this.#mark : null;
      const progress = mark && Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(100, Math.max(0, mark.time / video.duration * 100))
        : null;
      this.hidden = !this.hasAttribute('data-vod');
      if (this.hidden) return;
      const canReturn = Boolean(mark && seekable(mark.time) && !this.#attempt);
      const viewKey = JSON.stringify([allowed, Boolean(video.seeking), mark?.time, progress, Boolean(this.#attempt), canReturn]);
      if (viewKey === this.#viewKey) return;
      this.#viewKey = viewKey;
      hold.hidden = Boolean(mark);
      hold.disabled = !allowed || video.seeking;
      held.hidden = !mark;
      back.setAttribute('aria-disabled', String(!canReturn));
      stay.disabled = Boolean(this.#attempt);
      origin.hidden = progress === null;
      if (progress !== null) {
        origin.style.insetInlineStart = `${progress}%`;
        back.textContent = this.#attempt ? 'Returning…' : `Return to ${timeLabel(mark.time)}`;
      }
    };

    const renderBuffer = () => {
      const duration = video.duration;
      const spans = [];
      if (Number.isFinite(duration) && duration > 0) {
        for (let i = 0; i < video.buffered.length; i += 1) {
          spans.push([video.buffered.start(i) / duration * 100, video.buffered.end(i) / duration * 100]);
        }
      }
      const key = JSON.stringify(spans);
      if (key === this.#bufferKey) return;
      this.#bufferKey = key;
      buffered.replaceChildren(...spans.map(([start, end]) => {
        const segment = document.createElement('span');
        segment.style.insetInlineStart = `${start}%`;
        segment.style.inlineSize = `${end - start}%`;
        return segment;
      }));
    };

    const clearAttempt = () => {
      clearTimeout(this.#attempt?.timer);
      this.#attempt = undefined;
    };
    const clear = (notice, restoreFocus) => {
      this.#mark = undefined;
      clearAttempt();
      live.textContent = notice;
      render();
      if (restoreFocus) {
        if (!hold.disabled && !this.hidden) hold.focus();
        else container.querySelector('media-play-button').focus();
      }
    };

    hold.addEventListener('click', () => {
      if (!accessible() || video.seeking) return;
      this.#mark = { time: video.currentTime, source: sourceKey() };
      live.textContent = `Place kept at ${timeLabel(this.#mark.time)}.`;
      render();
      back.focus();
    }, { signal });

    stay.addEventListener('click', () => clear('Kept watching here.', true), { signal });

    back.addEventListener('click', async () => {
      const mark = this.#mark;
      if (!mark || this.#attempt || mark.source !== sourceKey() || !seekable(mark.time)) return;
      if (!video.seeking && Math.abs(video.currentTime - mark.time) < 0.05) {
        clear(`At ${timeLabel(mark.time)}.`, true);
        return;
      }
      const attempt = { timer: setTimeout(() => finish(false), deadlineMs) };
      const finish = arrived => {
        if (signal.aborted || this.#attempt !== attempt || this.#mark !== mark || sourceKey() !== mark.source) return;
        const restoreFocus = document.activeElement === back || document.activeElement === document.body;
        clearAttempt();
        if (arrived) clear(`Returned to ${timeLabel(mark.time)}.`, restoreFocus);
        else {
          live.textContent = 'Could not return. Your place is still kept.';
          render();
          if (restoreFocus && back.getAttribute('aria-disabled') === 'false') back.focus();
        }
      };
      this.#attempt = attempt;
      live.textContent = `Returning to ${timeLabel(mark.time)}.`;
      render();
      try {
        const result = await player.store.seek(mark.time);
        finish(Number.isFinite(result) && Math.abs(result - mark.time) <= arrivalTolerance
          && Math.abs(video.currentTime - mark.time) <= arrivalTolerance);
      } catch {
        finish(false);
      }
    }, { signal });

    const manualSeek = () => {
      if (!this.#attempt) return;
      clearAttempt();
      live.textContent = 'The new seek took precedence. Your place is still kept.';
      render();
    };
    slider.addEventListener('pointerdown', manualSeek, { signal, capture: true });
    slider.addEventListener('keydown', event => {
      if (/^(Arrow(Left|Right|Up|Down)|Home|End|PageUp|PageDown)$/.test(event.key)) manualSeek();
    }, { signal, capture: true });

    for (const event of ['emptied', 'loadstart']) {
      video.addEventListener(event, () => {
        this.#ready = false;
        const wasHeld = Boolean(this.#mark);
        clear(wasHeld ? 'Your place was cleared because the video changed.' : '', this.contains(document.activeElement) && wasHeld);
        error.hidden = true;
        renderBuffer();
      }, { signal });
    }
    for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange', 'progress', 'seeking', 'seeked']) {
      video.addEventListener(event, () => {
        this.#ready = video.readyState >= HTMLMediaElement.HAVE_METADATA;
        render();
        renderBuffer();
      }, { signal });
    }
    video.addEventListener('error', () => {
      this.#ready = false;
      clear('', this.contains(document.activeElement));
      error.hidden = false;
    }, { signal });
    error.querySelector('button').addEventListener('click', () => {
      error.hidden = true;
      video.load();
      container.querySelector('media-play-button').focus();
    }, { signal });
    this.#ready = video.readyState >= HTMLMediaElement.HAVE_METADATA;
    this.#viewKey = undefined;
    this.#bufferKey = undefined;
    render();
    renderBuffer();
  }

  disconnectedCallback() {
    this.#disconnect?.abort();
    clearTimeout(this.#attempt?.timer);
    this.#attempt = undefined;
    this.#mark = undefined;
  }
}

customElements.define('detour-place', DetourPlace);
