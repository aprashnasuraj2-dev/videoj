import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { formatAfterimageTime } from '../skin/format-time.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = join(root, 'public');
const artifactDir = join(root, 'artifacts', 'hardening');
const fixtures = [
  { name: 'hardening-4x3.mp4', size: '640x480' },
  { name: 'hardening-9x16.mp4', size: '360x640' },
];
let server;
let browser;
let baseURL;
const report = { gate: 'difficult-media', checks: {}, observations: {}, limitations: [] };

function check(name, pass, detail = null) {
  report.checks[name] = { pass: Boolean(pass), detail };
  assert.ok(pass, `${name}: ${JSON.stringify(detail)}`);
}

function makeFixtures() {
  for (const fixture of fixtures) {
    const out = join(publicDir, fixture.name);
    const result = spawnSync('ffmpeg', [
      '-nostdin', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `testsrc2=size=${fixture.size}:rate=24:duration=8`,
      '-t', '8', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '31',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out,
    ], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || `Could not create ${fixture.name}`);
  }
}

async function ready(page) {
  await page.goto(new URL('tests/hardening-host.html', baseURL).href);
  await page.waitForFunction(() => {
    const h = window.__AFTERIMAGE_HARDENING__;
    return h?.a?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }, null, { timeout: 20000 });
}

async function geometry(page, selector = '#player-a') {
  return page.locator(selector).evaluate(player => {
    const box = player.getBoundingClientRect();
    const visible = [...player.querySelectorAll(
      'media-play-button,media-time-slider,media-mute-button,media-volume-slider,media-captions-button,media-fullscreen-button,[data-afterimage-pin],[data-afterimage-compare],[data-afterimage-close],[data-afterimage-clear]'
    )].filter(el => {
      const r = el.getBoundingClientRect();
      return !el.hidden && r.width > 0 && r.height > 0;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        name: el.getAttribute('aria-label') || el.textContent?.trim() || '',
        width: r.width,
        height: r.height,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      };
    });
    return {
      player: { width: box.width, left: box.left, right: box.right },
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      visible,
    };
  });
}

before(async () => {
  mkdirSync(artifactDir, { recursive: true });
  makeFixtures();
  server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  baseURL = server.resolvedUrls.local[0];
  browser = await chromium.launch({ args: ['--no-sandbox'] });
});

after(async () => {
  report.pass = Object.values(report.checks).every(entry => entry.pass);
  writeFileSync(join(artifactDir, 'difficult-media.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
  for (const fixture of fixtures) rmSync(join(publicDir, fixture.name), { force: true });
});

test('difficult-media: responsive widths and mobile landscape retain controls and targets', { timeout: 35000 }, async () => {
  for (const viewport of [
    { width: 240, height: 700, label: '240px' },
    { width: 320, height: 740, label: '320px' },
    { width: 390, height: 844, label: '390px' },
    { width: 768, height: 900, label: '768px' },
    { width: 1280, height: 900, label: '1280px' },
    { width: 667, height: 375, label: 'mobile-landscape' },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      await ready(page);
      const g = await geometry(page);
      const primary = g.visible.filter(item =>
        /media-play-button|media-time-slider|media-mute-button|media-fullscreen-button/.test(item.tag)
        || /Pin moment/.test(item.name)
      );
      const inside = g.visible.every(item => item.left >= -1 && item.right <= viewport.width + 1);
      const primaryTargets = primary.every(item => item.height >= 44 && (item.tag === 'media-time-slider' || item.width >= 44));
      check(`responsive-${viewport.label}`,
        g.documentWidth <= g.clientWidth + 1 && inside && primary.length >= 5 && primaryTargets,
        { documentWidth: g.documentWidth, clientWidth: g.clientWidth, primary, visibleCount: g.visible.length });
    } finally {
      await page.close();
    }
  }
});

test('difficult-media: portrait and 4:3 host media stay registered and produce bounded reference canvases', { timeout: 35000 }, async () => {
  for (const fixture of fixtures) {
    const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
    try {
      await ready(page);
      await page.evaluate(src => {
        const h = window.__AFTERIMAGE_HARDENING__;
        h.a.video.pause();
        h.a.video.removeAttribute('poster');
        h.a.video.src = src;
        h.a.video.load();
      }, '/' + fixture.name);
      await page.waitForFunction(() => {
        const v = window.__AFTERIMAGE_HARDENING__.a.video;
        return v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && v.videoWidth > 0 && v.videoHeight > 0;
      }, null, { timeout: 15000 });
      await page.locator('#player-a [data-afterimage-pin]').click();
      await page.waitForFunction(() => document.querySelector('#player-a .afterimage-reference')?.hidden === false);
      const observed = await page.evaluate(() => {
        const h = window.__AFTERIMAGE_HARDENING__;
        const c = h.a.player.querySelector('.afterimage-reference canvas');
        const v = h.a.video;
        return {
          source: [v.videoWidth, v.videoHeight],
          canvas: [c.width, c.height],
          pixels: c.width * c.height,
          fit: getComputedStyle(v).objectFit,
        };
      });
      const sourceRatio = observed.source[0] / observed.source[1];
      const canvasRatio = observed.canvas[0] / observed.canvas[1];
      check(`aspect-${fixture.name}`,
        observed.canvas[0] > 1 && observed.canvas[1] > 1
        && observed.pixels <= 920000
        && Math.abs(sourceRatio - canvasRatio) < 0.01
        && observed.fit === 'contain',
        observed);
    } finally {
      await page.close();
    }
  }
});

test('difficult-media: RTL, long localized controls and ~10-hour clock values do not overflow', { timeout: 25000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await ready(page);
    const tenHour = formatAfterimageTime(35999);
    assert.equal(tenHour, '9:59:59');
    await page.evaluate(label => {
      document.documentElement.dir = 'rtl';
      const p = window.__AFTERIMAGE_HARDENING__.a.player;
      p.querySelector('[data-afterimage-pin] span').textContent =
        'ثبت هذه اللحظة الحالية للمقارنة البصرية طويلة الوصف';
      const relation = p.querySelector('.afterimage-relation');
      relation.hidden = false;
      p.querySelector('[data-afterimage-pinned]').textContent = label;
      p.querySelector('[data-afterimage-now]').textContent = '10:00:04';
      p.querySelector('[data-afterimage-delta]').textContent = '+00:05';
    }, tenHour);
    const g = await geometry(page);
    check('rtl-long-localized-clock',
      g.documentWidth <= g.clientWidth + 1 && g.visible.every(item => item.left >= -1 && item.right <= 391),
      { tenHour, documentWidth: g.documentWidth, clientWidth: g.clientWidth, visible: g.visible });
  } finally {
    await page.close();
  }
});

test('difficult-media: no captions/no poster and long real cue preserve ordinary controls', { timeout: 25000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
  try {
    await ready(page);
    const noMetadata = await page.evaluate(() => {
      const h = window.__AFTERIMAGE_HARDENING__;
      h.a.video.removeAttribute('poster');
      for (const track of [...h.a.video.querySelectorAll('track')]) track.remove();
      return {
        poster: h.a.video.getAttribute('poster'),
        textTracks: h.a.video.textTracks.length,
      };
    });
    assert.equal(noMetadata.poster, null);
    assert.equal(noMetadata.textTracks, 0);
    for (const selector of ['media-play-button', 'media-time-slider', 'media-mute-button', 'media-fullscreen-button', '[data-afterimage-pin]']) {
      check(`metadata-independent-${selector.replace(/[^a-z]/gi, '')}`,
        await page.locator('#player-a').locator(selector).isVisible(),
        { selector });
    }

    const cue = await page.evaluate(() => {
      const v = window.__AFTERIMAGE_HARDENING__.b.video;
      for (const track of [...v.querySelectorAll('track')]) track.remove();
      const t = v.addTextTrack('captions', 'Long localized captions', 'en');
      t.mode = 'showing';
      t.addCue(new VTTCue(0, 20,
        'A deliberately unusually long caption cue remains a host-owned text track and does not become part of the Temporal Lens reference state or transport model.'));
      return { mode: t.mode, cueCount: t.cues?.length || 0, text: t.cues?.[0]?.text || '' };
    });
    check('long-real-caption-cue', cue.mode === 'showing' && cue.cueCount === 1 && cue.text.length > 100, cue);
  } finally {
    await page.close();
  }
});

test('difficult-media: displayed buffered extent is derived from native media ranges', { timeout: 25000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
  try {
    await ready(page);
    await page.waitForTimeout(300);
    const observed = await page.locator('#player-a').evaluate(player => {
      const video = player.querySelector('video');
      const slider = player.querySelector('media-time-slider');
      const ranges = [];
      for (let i = 0; i < video.buffered.length; i += 1) {
        ranges.push([video.buffered.start(i), video.buffered.end(i)]);
      }
      const rendered = parseFloat(
        slider.style.getPropertyValue('--media-slider-buffer')
        || getComputedStyle(slider).getPropertyValue('--media-slider-buffer')
        || '0'
      );
      const expected = ranges.length && Number.isFinite(video.duration) && video.duration > 0
        ? Math.max(0, Math.min(100, ranges[ranges.length - 1][1] / video.duration * 100))
        : 0;
      return { duration: video.duration, ranges, rendered, expected };
    });
    check('native-buffer-range-derived',
      Number.isFinite(observed.rendered)
      && Math.abs(observed.rendered - observed.expected) <= 2,
      observed);
  } finally {
    await page.close();
  }
});

test('difficult-media: >1-hour duration and seekable-range mutation stay truthful', { timeout: 25000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
  try {
    await ready(page);
    const observation = await page.evaluate(() => {
      const h = window.__AFTERIMAGE_HARDENING__;
      const v = h.a.video;
      const lens = h.a.player.querySelector('afterimage-temporal-lens');
      Object.defineProperty(v, 'duration', { configurable: true, value: 3665 });
      Object.defineProperty(v, 'readyState', { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA });
      Object.defineProperty(v, 'seekable', {
        configurable: true,
        value: { length: 1, start: () => 0, end: () => 3665 },
      });
      v.dispatchEvent(new Event('durationchange'));
      const longVod = {
        state: lens.dataset.captureState,
        reason: lens.dataset.captureReason,
        seekability: lens.dataset.captureSeekability,
      };

      Object.defineProperty(v, 'seekable', {
        configurable: true,
        value: { length: 0, start() { throw new DOMException('IndexSizeError'); }, end() { throw new DOMException('IndexSizeError'); } },
      });
      v.dispatchEvent(new Event('progress'));
      const emptyRange = {
        state: lens.dataset.captureState,
        reason: lens.dataset.captureReason,
        seekability: lens.dataset.captureSeekability,
      };

      Object.defineProperty(v, 'duration', { configurable: true, value: 0 });
      v.dispatchEvent(new Event('durationchange'));
      const zeroDuration = {
        state: lens.dataset.captureState,
        reason: lens.dataset.captureReason,
        seekability: lens.dataset.captureSeekability,
        playWidth: h.a.player.querySelector('media-play-button').getBoundingClientRect().width,
        text: h.a.player.textContent,
      };
      return { longVod, emptyRange, zeroDuration };
    });
    check('long-duration-range-mutation',
      observation.longVod.state === 'ready'
      && observation.longVod.seekability === 'available'
      && observation.emptyRange.state === 'ready'
      && observation.emptyRange.seekability === 'empty'
      && observation.zeroDuration.state === 'timeline-unavailable'
      && observation.zeroDuration.reason === 'duration-zero'
      && observation.zeroDuration.playWidth >= 44
      && !/NaN|Infinity/.test(observation.zeroDuration.text),
      observation);
  } finally {
    await page.close();
  }
});

test('difficult-media: ended media can still truthfully pin; unavailable source keeps base controls usable', { timeout: 35000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
  try {
    await ready(page);
    await page.evaluate(() => {
      const v = window.__AFTERIMAGE_HARDENING__.a.video;
      Object.defineProperty(v, 'ended', { configurable: true, value: true });
      v.dispatchEvent(new Event('ended'));
    });
    await page.waitForFunction(() =>
      document.querySelector('#player-a afterimage-temporal-lens')?.dataset.captureState === 'ended-ready',
      null, { timeout: 5000 });
    await page.locator('#player-a [data-afterimage-pin]').click({ timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#player-a .afterimage-reference')?.hidden === false,
      null, { timeout: 5000 });
    check('ended-ready-pin',
      await page.locator('#player-a afterimage-temporal-lens').getAttribute('data-capture-state') === 'ended-ready',
      { pinned: await page.locator('#player-a [data-afterimage-pinned]').textContent() });
    await page.evaluate(() => { delete window.__AFTERIMAGE_HARDENING__.a.video.ended; });

    await page.evaluate(() => {
      const h = window.__AFTERIMAGE_HARDENING__;
      h.b.video.pause();
      h.b.video.removeAttribute('src');
      h.b.video.load();
    });
    await page.waitForFunction(() =>
      document.querySelector('#player-b afterimage-temporal-lens')?.dataset.captureState === 'timeline-unavailable',
      null, { timeout: 5000 });
    await page.locator('#player-b [data-afterimage-pin]').click({ timeout: 5000 });
    await page.waitForFunction(() =>
      /stable on-demand/.test(document.querySelector('#player-b .afterimage-status')?.textContent || ''),
      null, { timeout: 5000 });
    const ordinary = await page.locator('#player-b').evaluate(player => ({
      play: player.querySelector('media-play-button').getBoundingClientRect().width,
      seek: player.querySelector('media-time-slider').getBoundingClientRect().width,
      mute: player.querySelector('media-mute-button').getBoundingClientRect().width,
      fullscreen: player.querySelector('media-fullscreen-button').getBoundingClientRect().width,
      relationHidden: player.querySelector('.afterimage-relation').hidden,
      referenceHidden: player.querySelector('.afterimage-reference').hidden,
      state: player.querySelector('afterimage-temporal-lens').dataset.captureState,
      text: player.textContent,
    }));
    check('unavailable-enhancement-preserves-player',
      ordinary.play >= 44 && ordinary.seek > 0 && ordinary.mute >= 44 && ordinary.fullscreen >= 44
      && ordinary.relationHidden && ordinary.referenceHidden && ordinary.state === 'timeline-unavailable'
      && !/NaN|Infinity/.test(ordinary.text),
      ordinary);
  } finally {
    await page.close();
  }
});
