const arrivalTolerance = 0.5;
const deadlineMs = 8000;
const outOfRangeNotice = 'The saved time is temporarily outside the seekable range.';

function timeLabel(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(whole / 60) % 60).padStart(2, '0');
  const remainder = String(whole % 60).padStart(2, '0');
  const clock = `${minutes}:${remainder}`;
  return whole >= 3600 ? `${Math.floor(whole / 3600)}:${clock}` : clock;
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
  #sourceEpoch = 0;
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
    const notice = container.querySelector('.detour-notice');
    const settings = container.querySelector('.detour-settings');
    const menu = container.querySelector('.detour-menu');
    const rates = [...menu.querySelectorAll('[data-rate]')];
    const inDisclosure = node => node === settings || (node && menu.contains(node));
    const sourceKey = () => `${this.#sourceEpoch}\n${video.getAttribute('src') ?? ''}\n${video.currentSrc}`;
    const seekable = time =>
      this.#ready && !video.srcObject && player.store?.streamType !== 'live'
      && Number.isFinite(video.duration) && video.duration > 0
      && Number.isFinite(time) && time >= 0 && time <= video.duration
      && containsTime(video.seekable, time);
    const accessible = () =>
      this.hasAttribute('data-vod') && seekable(video.currentTime) && typeof player.store?.seek === 'function';

    const showNotice = text => {
      notice.textContent = text;
      notice.hidden = !text;
    };
    const setSettingsOpen = open => {
      settings.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    };
    const renderSettings = () => {
      const unavailable = !this.#ready || player.store?.playbackRateAvailability !== 'available'
        || typeof player.store?.setPlaybackRate !== 'function';
      if (unavailable && inDisclosure(document.activeElement)) {
        container.querySelector('media-play-button').focus();
      }
      if (unavailable) setSettingsOpen(false);
      settings.hidden = unavailable;
      for (const button of rates) button.setAttribute('aria-pressed', String(Number(button.dataset.rate) === video.playbackRate));
    };

    const render = () => {
      const allowed = accessible();
      const mark = this.#mark?.source === sourceKey() ? this.#mark : null;
      const progress = mark && Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(100, Math.max(0, mark.time / video.duration * 100))
        : null;
      this.hidden = !this.hasAttribute('data-vod');
      if (this.hidden) return;
      const heldTimeAvailable = Boolean(mark && seekable(mark.time));
      if (mark && !heldTimeAvailable && notice.textContent !== outOfRangeNotice) {
        showNotice(outOfRangeNotice);
        live.textContent = outOfRangeNotice;
      } else if (heldTimeAvailable && notice.textContent === outOfRangeNotice) {
        showNotice('');
      }
      const canReturn = heldTimeAvailable && !this.#attempt;
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
    const clear = (message, restoreFocus) => {
      this.#mark = undefined;
      clearAttempt();
      showNotice('');
      if (message) live.textContent = message;
      render();
      if (restoreFocus) {
        if (!hold.disabled && !this.hidden) hold.focus();
        else container.querySelector('media-play-button').focus();
      }
    };

    hold.addEventListener('click', () => {
      if (!accessible() || video.seeking) return;
      this.#mark = { time: video.currentTime, source: sourceKey() };
      showNotice('');
      live.textContent = `Place kept at ${timeLabel(this.#mark.time)}.`;
      render();
      back.focus();
    }, { signal });

    stay.addEventListener('click', () => clear('Kept watching here.', true), { signal });

    back.addEventListener('click', async () => {
      const mark = this.#mark;
      if (!mark || this.#attempt || mark.source !== sourceKey() || !seekable(mark.time)
        || typeof player.store?.seek !== 'function') return;
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
          const message = 'Could not return. Your place is still kept.';
          showNotice(message);
          live.textContent = message;
          render();
          if (restoreFocus && back.getAttribute('aria-disabled') === 'false') back.focus();
        }
      };
      this.#attempt = attempt;
      showNotice('');
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
      showNotice('');
      live.textContent = 'The new seek took precedence. Your place is still kept.';
      render();
    };
    slider.addEventListener('pointerdown', event => {
      if (event.isPrimary && event.button === 0) manualSeek();
    }, { signal, capture: true });
    slider.addEventListener('keydown', event => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey
        && /^(Arrow(Left|Right|Up|Down)|Home|End|PageUp|PageDown)$/.test(event.key)) manualSeek();
    }, { signal, capture: true });
    const bar = settings.parentElement;
    settings.addEventListener('click', () => setSettingsOpen(menu.hidden), { signal });
    bar.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || menu.hidden || !inDisclosure(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      setSettingsOpen(false);
      settings.focus();
    }, { signal });
    bar.addEventListener('focusout', event => {
      if (inDisclosure(event.target) && event.relatedTarget && !inDisclosure(event.relatedTarget)) {
        setSettingsOpen(false);
      }
    }, { signal });
    menu.addEventListener('click', event => {
      const button = event.target.closest('[data-rate]');
      if (!button) return;
      player.store.setPlaybackRate(Number(button.dataset.rate));
      renderSettings();
      setSettingsOpen(false);
      settings.focus();
    }, { signal });
    video.addEventListener('ratechange', renderSettings, { signal });

    for (const event of ['emptied', 'loadstart']) {
      video.addEventListener(event, () => {
        this.#ready = false;
        this.#sourceEpoch += 1;
        const wasHeld = Boolean(this.#mark);
        clear(wasHeld ? 'Your place was cleared because the video changed.' : '', this.contains(document.activeElement) && wasHeld);
        error.hidden = true;
        renderBuffer();
        renderSettings();
      }, { signal });
    }
    for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange', 'progress', 'seeking', 'seeked']) {
      video.addEventListener(event, () => {
        this.#ready = video.readyState >= HTMLMediaElement.HAVE_METADATA;
        render();
        renderBuffer();
        if (event === 'loadedmetadata' || event === 'canplay') renderSettings();
      }, { signal });
    }
    video.addEventListener('error', () => {
      this.#ready = false;
      this.#sourceEpoch += 1;
      clear('This video could not load.', this.contains(document.activeElement));
      error.hidden = false;
      renderSettings();
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
    renderSettings();
  }

  disconnectedCallback() {
    this.#disconnect?.abort();
    clearTimeout(this.#attempt?.timer);
    this.#attempt = undefined;
    this.#mark = undefined;
  }
}

customElements.define('detour-place', DetourPlace);
