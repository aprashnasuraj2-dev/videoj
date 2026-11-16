import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifactDir = join(root, 'artifacts', 'hardening');
let server;
let browser;
let baseURL;
const report = {
  gate: 'judge-first-use',
  browser: 'Chromium Playwright fresh context',
  viewport: { width: 1280, height: 900 },
  checks: {},
  observations: {},
  limitations: [
    'Elapsed time is an automation metric only, not a human discoverability or usability claim.',
    'No uncoached participant evidence is claimed by this gate.',
  ],
};

function check(name, pass, detail = null) {
  report.checks[name] = { pass: Boolean(pass), detail };
  assert.ok(pass, `${name}: ${JSON.stringify(detail)}`);
}

function fixtureURL() {
  const url = new URL(baseURL);
  url.searchParams.set('fixture', 'navigation-study');
  return url.href;
}

async function ready(page) {
  await page.goto(fixtureURL(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video?.readyState >= 2 && video.seekable.length > 0;
  }, null, { timeout: 20000 });
  await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
}

async function seek(page, seconds) {
  const arrived = await page.locator('video-player').evaluate((p, time) => p.store.seek(time), seconds);
  assert.ok(Math.abs(arrived - seconds) < 0.5);
  await page.waitForFunction(time => {
    const v = document.querySelector('video');
    return !v.seeking && Math.abs(v.currentTime - time) < 0.5;
  }, seconds, { timeout: 10000 });
}

before(async () => {
  mkdirSync(artifactDir, { recursive: true });
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  baseURL = server.resolvedUrls.local[0];
  browser = await chromium.launch({ args: ['--no-sandbox'] });
});

after(async () => {
  report.pass = Object.values(report.checks).every(entry => entry.pass);
  writeFileSync(join(artifactDir, 'judge-first-use.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
});

test('judge-first-use: fresh session exposes ordinary transport and the signature action without prefocus', { timeout: 30000 }, async () => {
  const context = await browser.newContext({ viewport: report.viewport });
  const page = await context.newPage();
  try {
    const started = performance.now();
    await ready(page);
    const first = await page.evaluate(() => {
      const p = document.querySelector('.detour');
      const rect = el => {
        const r = el?.getBoundingClientRect();
        return { width: r?.width || 0, height: r?.height || 0 };
      };
      return {
        activeTag: document.activeElement?.tagName?.toLowerCase(),
        play: rect(p.querySelector('media-play-button')),
        seek: rect(p.querySelector('media-time-slider')),
        hold: rect(p.querySelector('.detour-hold')),
        holdText: p.querySelector('.detour-hold')?.textContent?.trim(),
        fullscreen: rect(p.querySelector('media-fullscreen-button')),
        settings: rect(p.querySelector('.detour-settings')),
      };
    });
    const elapsedMs = performance.now() - started;
    report.observations.freshLoad = { ...first, elapsedMs: Number(elapsedMs.toFixed(1)) };
    check('fresh-no-prefocus', first.activeTag === 'body', first);
    check('fresh-play-visible', first.play.width >= 44 && first.play.height >= 44, first.play);
    check('fresh-seek-visible', first.seek.width > 200 && first.seek.height >= 44, first.seek);
    check('fresh-keep-visible', first.hold.width >= 44 && first.hold.height >= 44 && /Keep my place/.test(first.holdText), first.hold);
  } finally {
    await context.close();
  }
});

test('judge-first-use: 00:42 hold → 00:18 → second exploration seek → Return → 00:42 is visibly truthful', { timeout: 40000 }, async () => {
  const context = await browser.newContext({ viewport: report.viewport });
  const page = await context.newPage();
  try {
    await ready(page);
    const started = performance.now();
    await seek(page, 42.35);
    const heldAt = await page.locator('video').evaluate(v => v.currentTime);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await page.getByRole('button', { name: 'Return to 00:42' }).waitFor();

    const markerAtHold = await page.evaluate(() => {
      const mark = document.querySelector('.detour-origin').getBoundingClientRect();
      const thumb = document.querySelector('media-time-slider .detour-thumb').getBoundingClientRect();
      return {
        mark: { x: mark.x, y: mark.y, width: mark.width, height: mark.height },
        playhead: { x: thumb.x, y: thumb.y, width: thumb.width, height: thumb.height },
      };
    });
    check('held-marker-distinct-from-playhead-at-same-time',
      markerAtHold.mark.height > 0 && markerAtHold.playhead.height > 0
      && markerAtHold.mark.y + markerAtHold.mark.height < markerAtHold.playhead.y,
      markerAtHold);

    await seek(page, 18);
    await seek(page, 24);
    const explored = await page.locator('video').evaluate(v => v.currentTime);
    const heldUI = await page.evaluate(() => ({
      originVisible: !document.querySelector('.detour-origin').hidden,
      returnText: document.querySelector('.detour-return')?.textContent?.trim(),
      stayVisible: document.querySelector('.detour-stay')?.getBoundingClientRect().width > 0,
    }));
    check('held-state-survives-two-ordinary-seeks',
      heldUI.originVisible && /Return to 00:42/.test(heldUI.returnText) && heldUI.stayVisible,
      { explored, heldUI });

    await page.locator('.detour').screenshot({ path: join(artifactDir, 'judge-first-use-held.png') });
    await page.getByRole('button', { name: 'Return to 00:42' }).click();
    await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
    const returned = await page.locator('video').evaluate(v => v.currentTime);
    const elapsedMs = performance.now() - started;
    check('return-to-held-position', Math.abs(returned - heldAt) < 0.55, { heldAt, explored, returned });
    report.observations.returnWalkthrough = {
      heldAt,
      firstExplore: 18,
      secondExplore: explored,
      returned,
      elapsedAutomatedMs: Number(elapsedMs.toFixed(1)),
    };
  } finally {
    await context.close();
  }
});

test('judge-first-use: hold → explore → Stay here clears only the held place', { timeout: 35000 }, async () => {
  const context = await browser.newContext({ viewport: report.viewport });
  const page = await context.newPage();
  try {
    await ready(page);
    const started = performance.now();
    await seek(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seek(page, 18);
    const beforeStay = await page.locator('video').evaluate(v => ({ time: v.currentTime, paused: v.paused }));
    await page.getByRole('button', { name: 'Stay here' }).click();
    await page.locator('.detour-hold:enabled').waitFor();
    const afterStay = await page.locator('video').evaluate(v => ({ time: v.currentTime, paused: v.paused }));
    const state = await page.evaluate(() => ({
      originVisible: !document.querySelector('.detour-origin').hidden,
      returnVisible: document.querySelector('.detour-return')?.getBoundingClientRect().width > 0,
      keepVisible: document.querySelector('.detour-hold')?.getBoundingClientRect().width > 0,
    }));
    check('stay-clears-without-seek-or-playback-mutation',
      Math.abs(afterStay.time - beforeStay.time) < 0.08
      && afterStay.paused === beforeStay.paused
      && !state.originVisible && !state.returnVisible && state.keepVisible,
      { beforeStay, afterStay, state });
    report.observations.stayWalkthrough = {
      beforeStay,
      afterStay,
      elapsedAutomatedMs: Number((performance.now() - started).toFixed(1)),
    };
  } finally {
    await context.close();
  }
});
