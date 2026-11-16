import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifactDir = join(root, 'artifacts', 'hardening');
const engines = { chromium, firefox, webkit };
const engineName = process.env.AFTERIMAGE_HARDENING_ENGINE || 'chromium';
let server;
let browser;
let baseURL;
const report = {
  gate: 'source-lifecycle',
  browser: engineName,
  checks: {
    twoInstances: false,
    remountStress: false,
    staleWorkRaces: false,
    captureStates: false,
    failedRepinRetention: false,
  },
  observations: {},
  limitations: [],
};

before(async () => {
  mkdirSync(artifactDir, { recursive: true });
  server = await createServer({
    root,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  baseURL = server.resolvedUrls.local[0];
  assert.ok(engines[engineName], `Unsupported engine: ${engineName}`);
  browser = await engines[engineName].launch({
    args: engineName === 'chromium' ? ['--no-sandbox'] : [],
  });
});

after(async () => {
  report.pass = Object.values(report.checks).every(Boolean);
  writeFileSync(join(artifactDir, `source-lifecycle-${engineName}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
});

async function freshPage(t) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  t.after(() => page.close());
  await page.goto(new URL('tests/hardening-host.html', baseURL).href);
  await page.waitForFunction(() => {
    const h = window.__AFTERIMAGE_HARDENING__;
    return h?.a?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && h?.b?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && Number.isFinite(h.a.video.duration) && h.a.video.duration > 0
      && Number.isFinite(h.b.video.duration) && h.b.video.duration > 0;
  }, null, { timeout: 20000 });
  return page;
}

async function seek(page, selector, time) {
  const result = await page.locator(selector).evaluate(async (player, seconds) => {
    const video = player.querySelector('video');
    const arrived = await player.store.seek(seconds);
    if (Number.isFinite(arrived) && Math.abs(arrived - seconds) < 0.5) {
      return { mode: 'videojs-store', arrived, seekable: video.seekable.length, duration: video.duration };
    }
    // This lifecycle suite is testing Temporal Lens isolation, not transport.
    // Desktop WebKit can expose decoded current data before a native seekable
    // range materializes. A host-owned native seek is therefore an acceptable
    // fixture fallback and never enters the Temporal Lens implementation.
    video.currentTime = seconds;
    return { mode: 'host-native-fixture', arrived, seekable: video.seekable.length, duration: video.duration };
  }, time);
  await page.waitForFunction(({ selector, time }) => {
    const video = document.querySelector(selector)?.querySelector('video');
    return video && !video.seeking && Math.abs(video.currentTime - time) < 0.5;
  }, { selector, time }, { timeout: 12000 });
  report.observations.seekModes ??= [];
  report.observations.seekModes.push({ selector, time, ...result });
  return result;
}

async function pin(page, selector) {
  const player = page.locator(selector);
  await player.locator('[data-afterimage-pin]').click();
  await page.waitForFunction(selector => {
    const p = document.querySelector(selector);
    return p && p.querySelector('.afterimage-reference')?.hidden === false;
  }, selector);
}

test('source-lifecycle: two simultaneous players keep independent references', { timeout: 30000 }, async t => {
  const page = await freshPage(t);
  await seek(page, '#player-a', 5);
  await pin(page, '#player-a');

  assert.equal(await page.locator('#player-b .afterimage-reference').isVisible(), false);
  assert.equal(await page.locator('#player-b .afterimage-relation').isVisible(), false);

  await seek(page, '#player-b', 11);
  await pin(page, '#player-b');

  const values = await page.evaluate(() => ({
    a: document.querySelector('#player-a [data-afterimage-pinned]')?.textContent?.trim(),
    b: document.querySelector('#player-b [data-afterimage-pinned]')?.textContent?.trim(),
    aCanvas: document.querySelector('#player-a .afterimage-reference canvas')?.width,
    bCanvas: document.querySelector('#player-b .afterimage-reference canvas')?.width,
  }));
  assert.match(values.a, /00:0?5/);
  assert.match(values.b, /00:11/);
  assert.ok(values.aCanvas > 1 && values.bCanvas > 1);
  assert.notEqual(values.a, values.b);
  report.observations.twoInstances = values;
  report.checks.twoInstances = true;
});

test('source-lifecycle: 20 remove/reinsert cycles do not duplicate handlers or inherit old state', { timeout: 70000 }, async t => {
  const page = await freshPage(t);
  await page.evaluate(() => {
    const h = window.__AFTERIMAGE_HARDENING__;
    const cycle = h.create('cycle-player');
    h.scratch.append(cycle.player);
    window.__cycle = cycle;
    window.__cyclePinCompletions = 0;
    cycle.player.addEventListener('afterimage:pin-complete', () => { window.__cyclePinCompletions += 1; });
  });
  await page.waitForFunction(() => window.__cycle?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
  await page.locator('#cycle-player media-play-button').click();
  await page.waitForFunction(() => !window.__cycle.video.paused);
  await page.evaluate(() => {
    const v = window.__cycle.video;
    window.__cycleOriginalRVFC = typeof v.requestVideoFrameCallback === 'function'
      ? v.requestVideoFrameCallback.bind(v) : null;
    window.__cycleOriginalCancelRVFC = typeof v.cancelVideoFrameCallback === 'function'
      ? v.cancelVideoFrameCallback.bind(v) : null;
  });

  for (let i = 0; i < 20; i += 1) {
    const pendingCycle = i % 5 === 4;
    if (pendingCycle) {
      await page.evaluate(index => {
        const v = window.__cycle.video;
        window.__cyclePendingCallback = null;
        v.requestVideoFrameCallback = cb => {
          window.__cyclePendingCallback = cb;
          return 8000 + index;
        };
        v.cancelVideoFrameCallback = () => {};
      }, i);
      await page.locator('#cycle-player [data-afterimage-pin]').click();
      await page.waitForFunction(() => window.__cycle.player.querySelector('[data-afterimage-pin]').disabled);
    }

    await page.evaluate(pending => {
      const { player, video } = window.__cycle;
      const parent = document.querySelector('#scratch');
      player.remove();
      if (pending) {
        window.__cyclePendingCallback?.(performance.now(), { mediaTime: video.currentTime });
      }
      parent.append(player);
      if (window.__cycleOriginalRVFC) video.requestVideoFrameCallback = window.__cycleOriginalRVFC;
      else delete video.requestVideoFrameCallback;
      if (window.__cycleOriginalCancelRVFC) video.cancelVideoFrameCallback = window.__cycleOriginalCancelRVFC;
      else delete video.cancelVideoFrameCallback;
    }, pendingCycle);
    await page.waitForFunction(() => !window.__cycle.player.querySelector('[data-afterimage-pin]').disabled);
    assert.equal(await page.locator('#cycle-player .afterimage-reference').isVisible(), false);
  }

  const afterCycles = await page.evaluate(() => ({
    lensCount: window.__cycle.player.querySelectorAll('afterimage-temporal-lens').length,
    referenceHidden: window.__cycle.player.querySelector('.afterimage-reference')?.hidden,
    relationHidden: window.__cycle.player.querySelector('.afterimage-relation')?.hidden,
  }));
  assert.deepEqual(afterCycles, { lensCount: 1, referenceHidden: true, relationHidden: true });

  await seek(page, '#cycle-player', 7);
  await page.locator('#cycle-player [data-afterimage-pin]').click();
  await page.waitForFunction(() => window.__cyclePinCompletions === 1);
  assert.equal(await page.evaluate(() => window.__cyclePinCompletions), 1);

  await page.locator('#cycle-player [data-afterimage-clear]').click();
  await page.locator('#cycle-player media-play-button').click();
  await page.waitForFunction(() => !window.__cycle.video.paused);
  await page.evaluate(() => {
    const v = window.__cycle.video;
    window.__disposedFrameCallback = null;
    v.requestVideoFrameCallback = cb => {
      window.__disposedFrameCallback = cb;
      return 901;
    };
    v.cancelVideoFrameCallback = () => {};
  });
  await page.locator('#cycle-player [data-afterimage-pin]').click();
  await page.waitForFunction(() => window.__cycle.player.querySelector('[data-afterimage-pin]').disabled);
  await page.evaluate(() => {
    window.__cycle.player.remove();
    window.__disposedFrameCallback?.(performance.now(), { mediaTime: window.__cycle.video.currentTime });
    document.querySelector('#scratch').append(window.__cycle.player);
  });
  await page.waitForTimeout(100);

  const disposed = await page.evaluate(() => ({
    completions: window.__cyclePinCompletions,
    referenceHidden: window.__cycle.player.querySelector('.afterimage-reference')?.hidden,
    relationHidden: window.__cycle.player.querySelector('.afterimage-relation')?.hidden,
    pinDisabled: window.__cycle.player.querySelector('[data-afterimage-pin]')?.disabled,
  }));
  assert.equal(disposed.completions, 1, 'Disposed callback committed a stale reference.');
  assert.equal(disposed.referenceHidden, true);
  assert.equal(disposed.relationHidden, true);
  assert.equal(disposed.pinDisabled, false);
  report.observations.remountStress = { cycles: 20, pendingCycles: [5, 10, 15, 20], afterCycles, disposed };
  report.checks.remountStress = true;
});

test('source-lifecycle: stale callback cannot win after Close, Clear or source epoch replacement', { timeout: 40000 }, async t => {
  const page = await freshPage(t);
  await seek(page, '#player-a', 5);
  await pin(page, '#player-a');
  const first = await page.locator('#player-a [data-afterimage-pinned]').textContent();

  await page.locator('#player-a media-play-button').click();
  await page.waitForFunction(() => !window.__AFTERIMAGE_HARDENING__.a.video.paused);
  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    window.__heldClose = null;
    v.requestVideoFrameCallback = cb => { window.__heldClose = cb; return 1001; };
    v.cancelVideoFrameCallback = () => {};
  });
  await page.locator('#player-a [data-afterimage-pin]').click();
  await page.waitForFunction(() => document.querySelector('#player-a [data-afterimage-pin]').disabled);
  await page.locator('#player-a [data-afterimage-close]').click();
  assert.equal(await page.locator('#player-a [data-afterimage-pinned]').textContent(), first);
  assert.equal(await page.locator('#player-a .afterimage-reference').isVisible(), false);

  // Close invalidated the older request. Complete a newer same-source pin first,
  // then deliver the old callback: latest-request-wins must preserve the newer pin.
  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    v.requestVideoFrameCallback = cb => {
      queueMicrotask(() => cb(performance.now(), { mediaTime: v.currentTime }));
      return 10011;
    };
    v.cancelVideoFrameCallback = () => {};
  });
  await seek(page, '#player-a', 8);
  await page.locator('#player-a [data-afterimage-pin]').click();
  await page.waitForFunction(() => /00:0?8/.test(document.querySelector('#player-a [data-afterimage-pinned]')?.textContent || ''));
  const sameSourceNewest = await page.locator('#player-a [data-afterimage-pinned]').textContent();
  await page.evaluate(() => window.__heldClose?.(performance.now(), { mediaTime: 13 }));
  await page.waitForTimeout(80);
  assert.equal(await page.locator('#player-a [data-afterimage-pinned]').textContent(), sameSourceNewest);

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    window.__heldClear = null;
    v.requestVideoFrameCallback = cb => { window.__heldClear = cb; return 1002; };
  });
  await page.locator('#player-a [data-afterimage-pin]').click();
  await page.waitForFunction(() => document.querySelector('#player-a [data-afterimage-pin]').disabled);
  await page.locator('#player-a [data-afterimage-clear]').click();
  await page.evaluate(() => window.__heldClear?.(performance.now(), { mediaTime: 14 }));
  await page.waitForTimeout(80);
  assert.equal(await page.locator('#player-a .afterimage-reference').isVisible(), false);
  assert.equal(await page.locator('#player-a .afterimage-relation').isVisible(), false);

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    window.__oldSourceCallback = null;
    v.requestVideoFrameCallback = cb => { window.__oldSourceCallback = cb; return 1003; };
  });
  await page.locator('#player-a [data-afterimage-pin]').click();
  await page.waitForFunction(() => document.querySelector('#player-a [data-afterimage-pin]').disabled);
  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    v.pause();
    const url = new URL(v.currentSrc);
    url.searchParams.set('source-epoch', '2');
    v.src = url.href;
    v.load();
  });
  await page.waitForFunction(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    return v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && v.currentSrc.includes('source-epoch=2');
  }, null, { timeout: 15000 });
  await seek(page, '#player-a', 10);
  await page.locator('#player-a [data-afterimage-pin]').click();
  await page.waitForFunction(() => document.querySelector('#player-a .afterimage-reference')?.hidden === false);
  const newest = await page.locator('#player-a [data-afterimage-pinned]').textContent();
  await page.evaluate(() => window.__oldSourceCallback?.(performance.now(), { mediaTime: 1 }));
  await page.waitForTimeout(80);
  assert.equal(await page.locator('#player-a [data-afterimage-pinned]').textContent(), newest);
  assert.match(newest, /00:10/);

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    const same = v.currentSrc;
    v.src = same;
    v.load();
  });
  await page.waitForFunction(() => window.__AFTERIMAGE_HARDENING__.a.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
  assert.equal(await page.locator('#player-a .afterimage-reference').isVisible(), false, 'Same-URL reload retained old reference.');
  report.observations.staleWorkRaces = {
    first,
    sameSourceNewest,
    oldClosedRequestIgnoredAfterNewerPin: true,
    newest,
    sameUrlReloadCleared: true,
  };
  report.checks.staleWorkRaces = true;
});

test('source-lifecycle: capture-state matrix is truthful and recovery never autoplays', { timeout: 40000 }, async t => {
  const page = await freshPage(t);
  const pin = page.locator('#player-a [data-afterimage-pin]');
  const lens = page.locator('#player-a afterimage-temporal-lens');
  const status = page.locator('#player-a .afterimage-status');

  // A freshly attached source naturally exposes duration=NaN before metadata.
  // That must be classified as waiting for metadata, not as a live/invalid timeline.
  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'readyState', { configurable: true, value: HTMLMediaElement.HAVE_NOTHING });
    Object.defineProperty(v, 'duration', { configurable: true, value: Number.NaN });
    v.dispatchEvent(new Event('loadstart'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'metadata-pending');
  assert.equal(await lens.getAttribute('data-capture-reason'), 'metadata-pending');
  await pin.click();
  await page.waitForFunction(() => /metadata to load/.test(document.querySelector('#player-a .afterimage-status')?.textContent || ''));

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'readyState', { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA });
    Object.defineProperty(v, 'duration', { configurable: true, value: Number.NaN });
    v.dispatchEvent(new Event('durationchange'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'timeline-unavailable');
  assert.equal(await lens.getAttribute('data-capture-reason'), 'duration-unknown');
  await pin.click();
  await page.waitForFunction(() => /stable on-demand/.test(document.querySelector('#player-a .afterimage-status')?.textContent || ''));

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'duration', { configurable: true, value: Infinity });
    v.dispatchEvent(new Event('durationchange'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'timeline-unavailable');
  assert.equal(await lens.getAttribute('data-capture-reason'), 'duration-infinite');

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'duration', { configurable: true, value: 0 });
    v.dispatchEvent(new Event('durationchange'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'timeline-unavailable');
  assert.equal(await lens.getAttribute('data-capture-reason'), 'duration-zero');

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'duration', { configurable: true, value: 24 });
    Object.defineProperty(v, 'readyState', { configurable: true, value: HTMLMediaElement.HAVE_METADATA });
    v.dispatchEvent(new Event('waiting'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'frame-pending');
  await pin.click();
  await page.waitForFunction(() => /frame to load/.test(document.querySelector('#player-a .afterimage-status')?.textContent || ''));

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'readyState', { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA });
    Object.defineProperty(v, 'seeking', { configurable: true, value: true });
    v.dispatchEvent(new Event('seeking'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'seeking');
  await pin.click();
  await page.waitForFunction(() => /seeking to finish/.test(document.querySelector('#player-a .afterimage-status')?.textContent || ''));

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    delete v.seeking;
    Object.defineProperty(v, 'videoWidth', { configurable: true, value: 0 });
    Object.defineProperty(v, 'videoHeight', { configurable: true, value: 0 });
    v.dispatchEvent(new Event('loadeddata'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'frame-unavailable');
  await pin.click();
  await page.waitForFunction(() => /capturable picture/.test(document.querySelector('#player-a .afterimage-status')?.textContent || ''));

  // Empty seekable ranges do not invalidate an already-rendered current frame:
  // manual Pin never seeks. Record the capability rather than disabling playback.
  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    delete v.videoWidth;
    delete v.videoHeight;
    delete v.readyState;
    Object.defineProperty(v, 'seekable', {
      configurable: true,
      value: { length: 0, start() { throw new DOMException('IndexSizeError'); }, end() { throw new DOMException('IndexSizeError'); } },
    });
    v.dispatchEvent(new Event('durationchange'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'ready');
  assert.equal(await lens.getAttribute('data-capture-seekability'), 'empty');
  await page.evaluate(() => { delete window.__AFTERIMAGE_HARDENING__.a.video.seekable; });

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'ended', { configurable: true, value: true });
    v.dispatchEvent(new Event('ended'));
  });
  await page.waitForFunction(() => document.querySelector('#player-a afterimage-temporal-lens')?.dataset.captureState === 'ended-ready');
  assert.equal(await lens.getAttribute('data-capture-state'), 'ended-ready');
  assert.equal(await lens.getAttribute('data-capture-reason'), 'ended-capturable');
  await page.evaluate(() => { delete window.__AFTERIMAGE_HARDENING__.a.video.ended; });

  await page.evaluate(() => {
    const p = window.__AFTERIMAGE_HARDENING__.a.player;
    p.__realStore = p.store;
    Object.defineProperty(p, 'store', {
      configurable: true,
      value: Object.create(p.store, { streamType: { value: 'live-dvr' } }),
    });
    window.__AFTERIMAGE_HARDENING__.a.video.dispatchEvent(new Event('durationchange'));
  });
  assert.equal(await lens.getAttribute('data-capture-state'), 'timeline-unavailable');
  assert.match(await lens.getAttribute('data-capture-reason'), /^live-/);
  await page.evaluate(() => {
    const p = window.__AFTERIMAGE_HARDENING__.a.player;
    Object.defineProperty(p, 'store', { configurable: true, value: p.__realStore });
    window.__AFTERIMAGE_HARDENING__.a.video.dispatchEvent(new Event('durationchange'));
  });

  const play = page.locator('#player-a media-play-button');
  await play.click();
  await page.waitForFunction(() => !window.__AFTERIMAGE_HARDENING__.a.video.paused);
  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'readyState', { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA });
    v.dispatchEvent(new Event('waiting'));
  });
  await play.click();
  assert.equal(await page.evaluate(() => window.__AFTERIMAGE_HARDENING__.a.video.paused), true);
  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    delete v.readyState;
    v.dispatchEvent(new Event('canplay'));
    v.dispatchEvent(new Event('playing'));
  });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__AFTERIMAGE_HARDENING__.a.video.paused), true, 'Recovery unexpectedly autoplayed.');

  const text = await page.locator('#player-a').textContent();
  assert.doesNotMatch(text, /NaN|Infinity/);
  report.observations.captureStates = {
    metadataPending: true,
    durationUnknown: true,
    durationInfinite: true,
    durationZero: true,
    framePending: true,
    seeking: true,
    frameUnavailable: true,
    emptySeekableCapturable: true,
    endedReady: true,
    liveTimelineUnavailable: true,
    waitPauseRecoveryRemainedPaused: true,
  };
  report.checks.captureStates = true;
});


test('source-lifecycle: failed re-pin retains the previous valid reference', { timeout: 30000 }, async t => {
  const page = await freshPage(t);
  await seek(page, '#player-a', 6);
  await pin(page, '#player-a');

  const before = await page.locator('#player-a').evaluate(player => {
    const canvas = player.querySelector('.afterimage-reference canvas');
    return {
      pinned: player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      width: canvas?.width || 0,
      height: canvas?.height || 0,
      referenceHidden: player.querySelector('.afterimage-reference')?.hidden,
    };
  });
  assert.ok(before.width > 1 && before.height > 1);
  assert.equal(before.referenceHidden, false);

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    Object.defineProperty(v, 'videoWidth', { configurable: true, value: 0 });
    Object.defineProperty(v, 'videoHeight', { configurable: true, value: 0 });
    v.dispatchEvent(new Event('loadeddata'));
  });
  await page.waitForFunction(() =>
    document.querySelector('#player-a afterimage-temporal-lens')?.dataset.captureState === 'frame-unavailable');
  await page.locator('#player-a [data-afterimage-pin]').click();
  await page.waitForFunction(() =>
    /capturable picture/.test(document.querySelector('#player-a .afterimage-status')?.textContent || ''));

  const afterInvalidFrame = await page.locator('#player-a').evaluate(player => {
    const canvas = player.querySelector('.afterimage-reference canvas');
    return {
      pinned: player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      width: canvas?.width || 0,
      height: canvas?.height || 0,
      referenceHidden: player.querySelector('.afterimage-reference')?.hidden,
    };
  });
  assert.deepEqual(afterInvalidFrame, before, 'Invalid-frame re-pin replaced or cleared the valid reference.');

  await page.evaluate(() => {
    const v = window.__AFTERIMAGE_HARDENING__.a.video;
    delete v.videoWidth;
    delete v.videoHeight;
    Object.defineProperty(v, 'error', { configurable: true, value: { code: 3 } });
    v.dispatchEvent(new Event('error'));
  });
  await page.waitForFunction(() =>
    document.querySelector('#player-a afterimage-temporal-lens')?.dataset.captureState === 'source-error');
  await page.locator('#player-a [data-afterimage-pin]').click();
  await page.waitForFunction(() =>
    /cannot provide a frame/.test(document.querySelector('#player-a .afterimage-status')?.textContent || ''));

  const afterSourceError = await page.locator('#player-a').evaluate(player => {
    const canvas = player.querySelector('.afterimage-reference canvas');
    return {
      pinned: player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      width: canvas?.width || 0,
      height: canvas?.height || 0,
      referenceHidden: player.querySelector('.afterimage-reference')?.hidden,
    };
  });
  assert.deepEqual(afterSourceError, before, 'Source-error re-pin replaced or cleared the valid reference.');
  report.observations.failedRepinRetention = { before, afterInvalidFrame, afterSourceError };
  report.checks.failedRepinRetention = true;
});
