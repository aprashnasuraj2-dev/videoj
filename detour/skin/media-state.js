class DetourMediaState extends HTMLElement {
  #disconnect;
  #ready = false;
  #bufferKey;

  connectedCallback() {
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;
    const container = this.closest('media-container');
    const player = this.closest('video-player');
    const media = container.querySelector('video, audio');
    const buffered = container.querySelector('.detour-buffered');
    const error = container.querySelector('.detour-error');
    const settings = container.querySelector('.detour-settings');
    const menu = container.querySelector('.detour-menu');
    const rates = [...menu.querySelectorAll('[data-rate]')];
    const inDisclosure = node => node === settings || (node && menu.contains(node));
    // Native WebKit can leave End at 0 on the v10 time-slider keyboard path.
    // Normalize only boundary keys, never remap ordinary arrow-key seeking.
    const timeline = container.querySelector('media-time-slider');
    document.addEventListener('keydown', event => {
      if (!['Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!event.composedPath().includes(timeline)) return; // this player's seek slider only
      if (!this.#ready || !Number.isFinite(media.duration) || media.duration <= 0 || !media.seekable.length) return;
      const first = media.seekable.start(0);
      const last = Math.min(media.seekable.end(media.seekable.length - 1), media.duration);
      // Some WebKit decoders reset to time zero on an exact-duration seek.
      // The final decodable-frame boundary is within 50 ms of duration.
      const edge = event.key === 'Home' ? first : Math.max(first, last - 0.05);
      if (!Number.isFinite(edge) || typeof player.store?.seek !== 'function') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      timeline.dispatchEvent(new Event('detour-manual-seek'));
      try { Promise.resolve(player.store.seek(edge)).catch(() => {}); } catch { /* retain the native clock */ }
    }, { signal, capture: true });


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
      for (const button of rates) {
        button.setAttribute('aria-pressed', String(Number(button.dataset.rate) === media.playbackRate));
      }
    };

    const renderMedia = () => {
      const timeKnown = this.#ready && Number.isFinite(media.duration) && media.duration > 0;
      container.toggleAttribute('data-time-known', timeKnown);
      const loading = !this.#ready && media.networkState === HTMLMediaElement.NETWORK_LOADING;
      const state = media.error ? 'error' : media.ended ? 'ended' : loading ? 'loading' : timeKnown ? 'ready' : 'unavailable';
      if (container.dataset.mediaState !== state) container.dataset.mediaState = state;
    };

    const renderBuffer = () => {
      const duration = media.duration;
      const spans = [];
      if (Number.isFinite(duration) && duration > 0) {
        for (let i = 0; i < media.buffered.length; i += 1) {
          spans.push([media.buffered.start(i) / duration * 100, media.buffered.end(i) / duration * 100]);
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

    settings.addEventListener('click', () => setSettingsOpen(menu.hidden), { signal });
    const bar = settings.parentElement;
    // Firefox may consume Escape to exit native fullscreen before the bubbled
    // keydown reaches the control shelf. Resolve an open disclosure first.
    // Scope to the focused disclosure so independent player instances cannot
    // steal each other's Escape events.
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || menu.hidden || !inDisclosure(document.activeElement)) return;
      event.preventDefault();
      event.stopPropagation();
      setSettingsOpen(false);
      settings.focus();
    }, { signal, capture: true });
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
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && !menu.hidden) {
        setSettingsOpen(false);
        settings.focus();
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
    media.addEventListener('ratechange', renderSettings, { signal });

    for (const event of ['emptied', 'loadstart']) {
      media.addEventListener(event, () => {
        this.#ready = false;
        error.hidden = true;
        renderMedia();
        renderBuffer();
        renderSettings();
      }, { signal });
    }
    for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange', 'progress', 'ended', 'playing', 'suspend']) {
      media.addEventListener(event, () => {
        this.#ready = media.readyState >= HTMLMediaElement.HAVE_METADATA;
        renderMedia();
        renderBuffer();
        if (event === 'loadedmetadata' || event === 'canplay') renderSettings();
      }, { signal });
    }
    media.addEventListener('error', () => {
      this.#ready = false;
      error.hidden = false;
      renderMedia();
      renderSettings();
    }, { signal });
    error.querySelector('button').addEventListener('click', () => {
      error.hidden = true;
      media.load();
      container.querySelector('media-play-button').focus();
    }, { signal });

    this.#ready = media.readyState >= HTMLMediaElement.HAVE_METADATA;
    this.#bufferKey = undefined;
    renderMedia();
    renderBuffer();
    renderSettings();
  }

  disconnectedCallback() {
    this.#disconnect?.abort();
  }
}

if (!customElements.get('detour-media-state')) {
  customElements.define('detour-media-state', DetourMediaState);
}
