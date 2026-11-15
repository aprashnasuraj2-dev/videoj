import { formatDetourTime as timeLabel } from './format-time.js';

const arrivalTolerance = 0.5;
const duplicateTolerance = 0.75;
const deadlineMs = 8000;
const outOfRangeNotice = 'The saved time is temporarily outside the seekable range.';
const multiOutOfRangeNotice = 'One or more saved times are temporarily outside the seekable range.';

function containsTime(ranges, time) {
  for (let i = 0; i < ranges.length; i += 1) {
    if (time >= ranges.start(i) && time <= ranges.end(i)) return true;
  }
  return false;
}

function clampProgress(time, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return Math.min(100, Math.max(0, time / duration * 100));
}

class DetourPlace extends HTMLElement {
  #disconnect;
  #attempt;
  #marks = [];
  #layer;
  #ready = false;
  #sourceEpoch = 0;
  #viewKey;

  connectedCallback() {
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;
    const container = this.closest('media-container');
    const player = this.closest('video-player');
    const video = container.querySelector('video, audio');
    const origin = container.querySelector('.detour-origin');
    const rail = container.querySelector('.detour-rail');
    const slider = container.querySelector('media-time-slider');
    const live = container.querySelector('.detour-live');
    const hold = this.querySelector('.detour-hold');
    const count = this.querySelector('.detour-place-count');
    const clearSaved = this.querySelector('.detour-clear');
    const held = this.querySelector('.detour-held');
    const back = this.querySelector('.detour-return');
    const returnLabel = back.querySelector('.detour-return-label');
    const returnTime = back.querySelector('.detour-return-time');
    const returning = back.querySelector('.detour-return-pending');
    const stay = this.querySelector('.detour-stay');
    const notice = container.querySelector('.detour-notice');
    const maxPlaces = Math.max(1, Math.min(4, Number.parseInt(this.dataset.maxPlaces || '1', 10) || 1));
    const markerMode = this.dataset.returnUi === 'marker';
    const sourceKey = () => `${this.#sourceEpoch}\n${video.getAttribute('src') ?? ''}\n${video.currentSrc}`;
    const seekable = time =>
      this.#ready && !video.srcObject && player.store?.streamType !== 'live'
      && Number.isFinite(video.duration) && video.duration > 0
      && Number.isFinite(time) && time >= 0 && time <= video.duration
      && containsTime(video.seekable, time);
    const accessible = () =>
      this.hasAttribute('data-vod') && seekable(video.currentTime) && typeof player.store?.seek === 'function';

    this.#layer?.remove();
    this.#layer = undefined;
    if (markerMode) {
      this.#layer = document.createElement('div');
      this.#layer.className = 'detour-checkpoints';
      this.#layer.hidden = true;
      this.#layer.setAttribute('aria-label', 'Saved places');
      rail.append(this.#layer);
    }

    const showNotice = text => {
      notice.textContent = text;
      notice.hidden = !text;
    };

    const activeMarks = () => this.#marks
      .filter(mark => mark.source === sourceKey())
      .sort((a, b) => a.slot - b.slot);

    const findMark = slot => activeMarks().find(mark => mark.slot === slot);

    const focusMarker = slot => {
      const marker = this.#layer?.querySelector(`[data-slot="${slot}"]`);
      if (marker && !marker.disabled) marker.focus();
      else if (!hold.disabled && !this.hidden) hold.focus();
    };

    const markerButton = mark => {
      const progress = clampProgress(mark.time, video.duration);
      if (progress === null) return null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'detour-checkpoint';
      button.dataset.slot = String(mark.slot);
      button.style.insetInlineStart = `${progress}%`;
      button.toggleAttribute('data-edge-start', progress <= 8);
      button.toggleAttribute('data-edge-end', progress >= 92);
      const label = `C${mark.slot}`;
      const formatted = timeLabel(mark.time);
      button.setAttribute('aria-label', `Return to ${formatted} — checkpoint ${label}`);
      button.disabled = Boolean(this.#attempt) || !seekable(mark.time);

      const tag = document.createElement('span');
      tag.className = 'detour-checkpoint-tag';
      tag.setAttribute('aria-hidden', 'true');

      const key = document.createElement('span');
      key.className = 'detour-checkpoint-key';
      key.textContent = label;

      const detail = document.createElement('span');
      detail.className = 'detour-checkpoint-detail';
      detail.textContent = `${formatted} ↩`;

      tag.append(key, detail);
      button.append(tag);
      if (this.#attempt?.mark === mark) button.dataset.returning = '';
      return button;
    };

    const renderMarkers = marks => {
      if (!this.#layer) return;
      const focusedSlot = this.#layer.contains(document.activeElement)
        ? document.activeElement?.closest?.('.detour-checkpoint')?.dataset.slot
        : null;
      this.#layer.replaceChildren();
      this.#layer.hidden = marks.length === 0;
      for (const mark of marks) {
        const button = markerButton(mark);
        if (button) this.#layer.append(button);
      }
      if (focusedSlot) {
        this.#layer.querySelector(`[data-slot="${focusedSlot}"]`)?.focus({ preventScroll: true });
      }
    };

    const render = () => {
      const allowed = accessible();
      const marks = activeMarks();
      const mark = marks[0] ?? null;
      const singleProgress = mark ? clampProgress(mark.time, video.duration) : null;
      this.hidden = !this.hasAttribute('data-vod');
      if (this.hidden) {
        this.#layer.hidden = true;
        return;
      }

      const unavailable = marks.some(item => !seekable(item.time));
      const rangeMessage = markerMode ? multiOutOfRangeNotice : outOfRangeNotice;
      if (unavailable && notice.textContent !== rangeMessage) {
        showNotice(rangeMessage);
        live.textContent = rangeMessage;
      } else if (!unavailable && (notice.textContent === outOfRangeNotice || notice.textContent === multiOutOfRangeNotice)) {
        showNotice('');
      }

      const canReturn = Boolean(mark && seekable(mark.time) && !this.#attempt);
      const markState = marks.map(item => [item.slot, item.time, clampProgress(item.time, video.duration), seekable(item.time)]);
      const viewKey = JSON.stringify([
        markerMode, maxPlaces, allowed, Boolean(video.seeking), markState,
        this.#attempt?.mark?.slot ?? null, canReturn, video.duration,
      ]);
      if (viewKey === this.#viewKey) return;
      this.#viewKey = viewKey;

      this.dataset.count = String(marks.length);
      count.hidden = !markerMode;
      if (markerMode) count.textContent = `${marks.length}/${maxPlaces}`;

      if (markerMode) {
        hold.hidden = false;
        hold.disabled = !allowed || video.seeking || marks.length >= maxPlaces || Boolean(this.#attempt);
        clearSaved.hidden = marks.length === 0;
        clearSaved.disabled = Boolean(this.#attempt);
        held.hidden = true;
        origin.hidden = true;
        renderMarkers(marks);
        return;
      }

      clearSaved.hidden = true;
      count.hidden = true;
      hold.hidden = Boolean(mark);
      hold.disabled = !allowed || video.seeking;
      held.hidden = !mark;
      back.setAttribute('aria-disabled', String(!canReturn));
      stay.disabled = Boolean(this.#attempt);
      origin.hidden = singleProgress === null;
      renderMarkers([]);
      if (singleProgress !== null) {
        origin.style.insetInlineStart = `${singleProgress}%`;
        origin.toggleAttribute('data-edge-end', singleProgress >= 96);
        returning.hidden = !this.#attempt;
        returnLabel.hidden = Boolean(this.#attempt);
        if (!this.#attempt) returnTime.textContent = timeLabel(mark.time);
      }
    };

    const clearAttempt = () => {
      clearTimeout(this.#attempt?.timer);
      this.#attempt = undefined;
    };

    const clearAll = (message, restoreFocus) => {
      this.#marks = [];
      clearAttempt();
      showNotice('');
      if (message) live.textContent = message;
      this.#viewKey = undefined;
      render();
      if (restoreFocus) {
        if (!hold.disabled && !this.hidden) hold.focus();
        else container.querySelector('media-play-button').focus();
      }
    };

    const nextSlot = () => {
      const used = new Set(activeMarks().map(mark => mark.slot));
      for (let slot = 1; slot <= maxPlaces; slot += 1) {
        if (!used.has(slot)) return slot;
      }
      return null;
    };

    const removeMark = (mark, message, restoreFocus = true) => {
      this.#marks = this.#marks.filter(item => item !== mark);
      if (this.#attempt?.mark === mark) clearAttempt();
      showNotice('');
      if (message) live.textContent = message;
      this.#viewKey = undefined;
      render();
      if (restoreFocus) {
        const remaining = activeMarks();
        if (remaining.length) focusMarker(remaining[0].slot);
        else if (!hold.disabled) hold.focus();
      }
    };

    const returnTo = async (mark, { consume, restoreTarget } = {}) => {
      if (!mark || this.#attempt || mark.source !== sourceKey() || !seekable(mark.time)
        || typeof player.store?.seek !== 'function') return;

      const formatted = timeLabel(mark.time);
      if (!video.seeking && Math.abs(video.currentTime - mark.time) < 0.05) {
        if (consume) clearAll(`At ${formatted}.`, true);
        else {
          live.textContent = `At checkpoint C${mark.slot}, ${formatted}.`;
          focusMarker(mark.slot);
        }
        return;
      }

      const finish = arrived => {
        if (signal.aborted || this.#attempt !== attempt || !this.#marks.includes(mark) || sourceKey() !== mark.source) return;
        const activeCheckpoint = document.activeElement?.closest?.('.detour-checkpoint');
        const shouldRestore = restoreTarget === 'back'
          ? document.activeElement === back || document.activeElement === document.body
          : restoreTarget === 'marker'
            ? document.activeElement === document.body || activeCheckpoint?.dataset.slot === String(mark.slot)
            : false;
        clearAttempt();

        if (arrived) {
          if (consume) clearAll(`Returned to ${formatted}.`, shouldRestore);
          else {
            showNotice('');
            live.textContent = `Returned to checkpoint C${mark.slot} at ${formatted}.`;
            this.#viewKey = undefined;
            render();
            if (shouldRestore) focusMarker(mark.slot);
          }
        } else {
          const message = markerMode
            ? `Could not return to checkpoint C${mark.slot}. It is still saved.`
            : 'Could not return. Your place is still kept.';
          showNotice(message);
          live.textContent = message;
          this.#viewKey = undefined;
          render();
          if (shouldRestore) {
            if (markerMode) focusMarker(mark.slot);
            else if (back.getAttribute('aria-disabled') === 'false') back.focus();
          }
        }
      };

      const attempt = { mark, timer: setTimeout(() => finish(false), deadlineMs) };
      this.#attempt = attempt;
      showNotice('');
      live.textContent = markerMode
        ? `Returning to checkpoint C${mark.slot} at ${formatted}.`
        : `Returning to ${formatted}.`;
      this.#viewKey = undefined;
      render();

      try {
        const result = await player.store.seek(mark.time);
        finish(Number.isFinite(result) && Math.abs(result - mark.time) <= arrivalTolerance
          && Math.abs(video.currentTime - mark.time) <= arrivalTolerance);
      } catch {
        finish(false);
      }
    };

    hold.addEventListener('click', () => {
      if (!accessible() || video.seeking || this.#attempt) return;
      const marks = activeMarks();

      if (markerMode) {
        const existing = marks.find(mark => Math.abs(mark.time - video.currentTime) <= duplicateTolerance);
        if (existing) {
          live.textContent = `Checkpoint C${existing.slot} is already kept at ${timeLabel(existing.time)}.`;
          focusMarker(existing.slot);
          return;
        }
        const slot = nextSlot();
        if (slot === null) {
          live.textContent = `${maxPlaces} places are already kept. Clear saved places to add another.`;
          return;
        }
        const mark = { slot, time: video.currentTime, source: sourceKey() };
        this.#marks.push(mark);
        showNotice('');
        live.textContent = `Checkpoint C${slot} kept at ${timeLabel(mark.time)}.`;
        this.#viewKey = undefined;
        render();
        focusMarker(slot);
        return;
      }

      this.#marks = [{ slot: 1, time: video.currentTime, source: sourceKey() }];
      showNotice('');
      live.textContent = `Place kept at ${timeLabel(this.#marks[0].time)}.`;
      this.#viewKey = undefined;
      render();
      back.focus();
    }, { signal });

    clearSaved.addEventListener('click', () => {
      if (!markerMode || this.#attempt || activeMarks().length === 0) return;
      clearAll('Saved places cleared.', true);
    }, { signal });

    stay.addEventListener('click', () => clearAll('Kept watching here.', true), { signal });

    back.addEventListener('click', () => {
      const mark = activeMarks()[0];
      returnTo(mark, { consume: true, restoreTarget: 'back' });
    }, { signal });

    if (this.#layer) {
      this.#layer.addEventListener('click', event => {
        const button = event.target.closest('.detour-checkpoint');
        if (!button || button.disabled) return;
        const mark = findMark(Number(button.dataset.slot));
        returnTo(mark, { consume: false, restoreTarget: 'marker' });
      }, { signal });

      this.#layer.addEventListener('keydown', event => {
        if (!/^(Delete|Backspace)$/.test(event.key)) return;
        const button = event.target.closest('.detour-checkpoint');
        if (!button || this.#attempt) return;
        const mark = findMark(Number(button.dataset.slot));
        if (!mark) return;
        event.preventDefault();
        removeMark(mark, `Checkpoint C${mark.slot} cleared.`);
      }, { signal });
    }

    const manualSeek = () => {
      if (!this.#attempt) return;
      const mark = this.#attempt.mark;
      clearAttempt();
      showNotice('');
      live.textContent = markerMode
        ? `The new seek took precedence. Checkpoint C${mark.slot} is still saved.`
        : 'The new seek took precedence. Your place is still kept.';
      this.#viewKey = undefined;
      render();
    };

    slider.addEventListener('detour-manual-seek', manualSeek, { signal });
    slider.addEventListener('pointerdown', event => {
      if (event.isPrimary && event.button === 0) manualSeek();
    }, { signal, capture: true });
    slider.addEventListener('keydown', event => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey
        && /^(Arrow(Left|Right|Up|Down)|Home|End|PageUp|PageDown)$/.test(event.key)) manualSeek();
    }, { signal, capture: true });

    for (const event of ['emptied', 'loadstart']) {
      video.addEventListener(event, () => {
        this.#ready = false;
        this.#sourceEpoch += 1;
        const hadMarks = this.#marks.length > 0;
        clearAll(hadMarks
          ? markerMode ? 'Saved places were cleared because the video changed.' : 'Your place was cleared because the video changed.'
          : '', this.contains(document.activeElement) && hadMarks);
      }, { signal });
    }

    for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange', 'progress', 'seeking', 'seeked', 'ended', 'playing', 'suspend']) {
      video.addEventListener(event, () => {
        this.#ready = video.readyState >= HTMLMediaElement.HAVE_METADATA;
        this.#viewKey = undefined;
        render();
      }, { signal });
    }

    video.addEventListener('error', () => {
      this.#ready = false;
      this.#sourceEpoch += 1;
      clearAll('This video could not load.', this.contains(document.activeElement));
    }, { signal });

    this.#ready = video.readyState >= HTMLMediaElement.HAVE_METADATA;
    this.#viewKey = undefined;
    render();
  }

  disconnectedCallback() {
    this.#disconnect?.abort();
    clearTimeout(this.#attempt?.timer);
    this.#attempt = undefined;
    this.#marks = [];
    this.#layer?.remove();
    this.#layer = undefined;
  }
}

if (!customElements.get('detour-place')) {
  customElements.define('detour-place', DetourPlace);
}
