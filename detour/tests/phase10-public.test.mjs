import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { chromium } from 'playwright';

const release = JSON.parse(readFileSync(new URL('../mux-release-origin.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

async function ready(page, timeout = 45000) {
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video?.readyState >= 2 && video.seekable.length > 0;
  }, null, { timeout });
  await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
}

async function seek(page, seconds) {
  await page.locator('video-player').evaluate((node, time) => node.store.seek(time), seconds);
  await page.waitForFunction(time => Math.abs(document.querySelector('video').currentTime - time) < 0.5, seconds, { timeout: 10000 });
}

test('092 exact submitted URL is a signed-out Video.js v10 release with real media, captions, return and backup', { timeout: 90000 }, async t => {
  assert.equal(lock.packages['node_modules/@videojs/html']?.version, '10.4.0');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    const response = await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(response?.status(), 200);
    assert.equal(new URL(page.url()).protocol, 'https:');
    assert.equal(response?.headers()['x-detour-source-sha'], release.sourceSha);
    assert.equal(response?.headers()['x-detour-dist-branch'], release.distBranch);
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    assert.equal(await page.locator('dialog').count(), 0);
    await ready(page);

    const media = await page.locator('video').evaluate(video => ({
      src: video.currentSrc,
      paused: video.paused,
      duration: video.duration,
      trackMode: video.textTracks[0]?.mode,
    }));
    assert.equal(media.src, release.staticMp4Url);
    assert.equal(media.paused, true);
    assert.ok(media.duration > 55 && media.duration < 56.1);

    await page.locator('media-captions-button').click();
    await page.waitForFunction(() => document.querySelector('video')?.textTracks?.[0]?.mode === 'showing');
    await seek(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seek(page, 18);
    const c1 = page.getByRole('button', { name: 'Return to 00:42 — checkpoint C1' });
    await c1.click();
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 42.35) < 0.5, null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const checkpoint = document.querySelector('.detour-checkpoint[data-slot="1"]');
      return checkpoint && !checkpoint.disabled;
    }, null, { timeout: 10000 });
    const returned = await page.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    assert.ok(Math.abs(returned.time - 42.35) < 0.5);
    assert.equal(returned.paused, true);
    assert.equal(await page.locator('.detour-checkpoint').count(), 1, 'checkpoint remains reusable after Return');

    const backup = await page.evaluate(async () => {
      const url = new URL('../showcase/detour-showcase-v1.mp4', document.baseURI);
      const response = await fetch(url, { headers: { Range: 'bytes=0-1023' }, cache: 'no-store' });
      return {
        status: response.status,
        bytes: (await response.arrayBuffer()).byteLength,
        type: response.headers.get('content-type'),
        accepts: response.headers.get('accept-ranges'),
      };
    });
    assert.deepEqual([backup.status, backup.bytes, backup.type, backup.accepts], [206, 1024, 'video/mp4', 'bytes']);
    t.diagnostic(`Remote signed-out public gate: Video.js @videojs/html 10.4.0 source, HTTPS 200, captions showing, C1 42s → 18s → ${returned.time.toFixed(3)}s Return with persistence, backup 206/1024 B.`);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('093 all five mandatory controls work on the deployed player with keyboard and touch-shaped input', { timeout: 120000 }, async t => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await desktop.newPage();
    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);

    const required = ['media-play-button', 'media-time-slider', '.detour-clock', 'media-mute-button', 'media-fullscreen-button'];
    for (const selector of required) assert.equal(await page.locator(selector).isVisible(), true, `desktop missing ${selector}`);

    const play = page.locator('media-play-button');
    await play.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('video').paused && document.querySelector('video').currentTime > 0.05);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('video').paused);

    const slider = page.getByRole('slider', { name: 'Seek' });
    await slider.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('video').currentTime < 0.5);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('video').currentTime >= 0.8);
    assert.match((await page.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' '), /^00:0[01] \/ 00:55$/);

    const mute = page.locator('media-mute-button');
    await mute.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('video').evaluate(video => video.muted), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('video').evaluate(video => video.muted), false);

    const fullscreen = page.locator('media-fullscreen-button');
    await fullscreen.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await fullscreen.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.fullscreenElement);

    const settings = page.locator('.detour-settings');
    await settings.focus();
    await page.keyboard.press('Enter');
    await page.locator('.detour-menu [data-rate="1.25"]').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.detour-menu').isVisible(), false);
    assert.equal(await settings.evaluate(el => el === document.activeElement), true);

    const bright = new URL('../integration/', release.origin).href;
    await page.goto(bright, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    for (const selector of required) assert.equal(await page.locator(selector).isVisible(), true, `bright-media host missing ${selector}`);
    await desktop.close();

    const touch = await browser.newContext({
      viewport: { width: 375, height: 667 },
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const mobile = await touch.newPage();
    await mobile.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(mobile);
    for (const selector of required) assert.equal(await mobile.locator(selector).isVisible(), true, `375px touch layout missing ${selector}`);

    await mobile.locator('media-play-button').tap();
    await mobile.waitForFunction(() => !document.querySelector('video').paused && document.querySelector('video').currentTime > 0.05);
    await mobile.locator('media-play-button').tap();
    await mobile.waitForFunction(() => document.querySelector('video').paused);

    const rail = await mobile.locator('media-time-slider').boundingBox();
    assert.ok(rail && rail.width > 150);
    await mobile.locator('media-time-slider').tap({ position: { x: rail.width * 0.34, y: rail.height / 2 } });
    await mobile.waitForFunction(() => {
      const v = document.querySelector('video');
      return v.currentTime > 15 && v.currentTime < 23;
    });

    await mobile.locator('media-mute-button').tap();
    assert.equal(await mobile.locator('video').evaluate(video => video.muted), true);
    assert.match((await mobile.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' '), /^00:(?:1[5-9]|2[0-3]) \/ 00:55$/);

    await mobile.locator('media-fullscreen-button').tap();
    await mobile.waitForFunction(() => Boolean(document.fullscreenElement));
    await mobile.evaluate(() => document.exitFullscreen());
    await mobile.waitForFunction(() => !document.fullscreenElement);
    await touch.close();

    t.diagnostic('Mandatory controls: desktop keyboard exercised play/pause, seek/time, mute, fullscreen and menu Escape; 375px touch exercised play/pause, real seek, time, mute and fullscreen; bright alternate media retains all five controls.');
  } finally {
    await browser.close();
  }
});
