import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { chromium } from 'playwright';

const release = JSON.parse(readFileSync(new URL('../mux-release-origin.json', import.meta.url), 'utf8'));
const captureDir = process.env.DETOUR_PHASE9_CAPTURES;
if (captureDir) mkdirSync(captureDir, { recursive: true });

async function capture(page, name) {
  if (!captureDir) return;
  await page.screenshot({ path: `${captureDir}/${name}.png`, fullPage: true });
}

function writeCaptureMetrics(name, value) {
  if (!captureDir) return;
  writeFileSync(`${captureDir}/${name}.json`, JSON.stringify(value, null, 2) + '\n');
}

async function waitForSeekable(page, timeout = 45000) {
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video?.readyState >= 2 && video.seekable.length > 0;
  }, null, { timeout });
}

async function seekPlayer(page, seconds) {
  await page.locator('video-player').evaluate((node, time) => node.store.seek(time), seconds);
  await page.waitForFunction(time => Math.abs(document.querySelector('video').currentTime - time) < 0.5, seconds, { timeout: 10000 });
}

test('076/077 frozen public Mux release is signed-out, seekable and has an independent fallback', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  try {
    const response = await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(new URL(page.url()).protocol, 'https:');
    assert.equal(response?.status(), 200);
    assert.equal(response?.headers()['x-detour-source-sha'], release.sourceSha);
    assert.equal(response?.headers()['x-detour-dist-branch'], release.distBranch);
    assert.equal(response?.headers()['x-detour-release'], release.releaseTag);

    await waitForSeekable(page);
    await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
    const media = await page.locator('video').evaluate(video => ({
      src: video.currentSrc,
      paused: video.paused,
      provider: video.dataset.provider,
      track: video.querySelector('track')?.src,
    }));
    assert.equal(media.src, release.staticMp4Url);
    assert.equal(media.provider, 'mux');
    assert.equal(media.paused, true);
    assert.match(media.track || '', /\/showcase\/detour-showcase-v1\.vtt$/);
    await capture(page, '375-cold');

    await seekPlayer(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seekPlayer(page, 18);
    await page.getByRole('button', { name: 'Return to 00:42' }).focus();
    await capture(page, '375-held-focused');
    const compact = await page.evaluate(() => {
      const player = document.querySelector('.detour')?.getBoundingClientRect();
      const returnButton = document.querySelector('.detour-return')?.getBoundingClientRect();
      const stay = document.querySelector('.detour-stay')?.getBoundingClientRect();
      const settings = document.querySelector('.detour-settings')?.getBoundingClientRect();
      const rail = document.querySelector('.detour-rail')?.getBoundingClientRect();
      const marker = document.querySelector('.detour-origin')?.getBoundingClientRect();
      const heading = document.querySelector('.demo-heading')?.getBoundingClientRect();
      const sourcePanel = document.querySelector('.mux-panel')?.getBoundingClientRect();
      const clock = document.querySelector('.detour-clock')?.textContent?.trim();
      return { player, returnButton, stay, settings, rail, marker, heading, sourcePanel, clock, bodyText: document.body.innerText };
    });
    writeCaptureMetrics('375-held-focused', compact);
    await page.getByRole('button', { name: 'Return to 00:42' }).click();
    await page.getByRole('button', { name: 'Keep my place' }).waitFor({ timeout: 10000 });
    const returned = await page.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    assert.ok(Math.abs(returned.time - 42.35) < 0.5, `Public Mux Return landed at ${returned.time}`);
    assert.equal(returned.paused, true);
    await capture(page, '375-returned');

    const fallback = await page.evaluate(async () => {
      const url = new URL('../showcase/detour-showcase-v1.mp4', document.baseURI);
      const response = await fetch(url, { headers: { Range: 'bytes=0-1023' }, cache: 'no-store' });
      return {
        status: response.status,
        bytes: (await response.arrayBuffer()).byteLength,
        type: response.headers.get('content-type'),
        range: response.headers.get('content-range'),
        accepts: response.headers.get('accept-ranges'),
        source: response.headers.get('x-detour-source-sha'),
      };
    });
    assert.equal(fallback.status, 206);
    assert.equal(fallback.bytes, 1024);
    assert.equal(fallback.type, 'video/mp4');
    assert.equal(fallback.accepts, 'bytes');
    assert.match(fallback.range || '', /^bytes 0-1023\/\d+$/);
    assert.equal(fallback.source, release.sourceSha);
    t.diagnostic(`Public Mux release: HTTPS 200, Hold → 18s → ${returned.time.toFixed(3)}s Return; fallback range 206 / ${fallback.bytes} B.`);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('077 frozen public Mux release recovers from a blocked provider without stale state', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  try {
    await page.route('https://stream.mux.com/**', route => route.abort('failed'));
    const response = await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(response?.status(), 200);
    await page.waitForFunction(() => document.querySelector('[data-detour-source-status]')?.dataset.state === 'error', null, { timeout: 20000 });
    assert.equal(await page.locator('[data-detour-fallback]').isVisible(), true);
    await page.locator('[data-detour-fallback]').click();
    await page.waitForFunction(() => document.querySelector('video')?.dataset.provider === 'fallback', null, { timeout: 10000 });
    await waitForSeekable(page);
    const media = await page.locator('video').evaluate(video => ({
      src: video.currentSrc,
      provider: video.dataset.provider,
      paused: video.paused,
    }));
    assert.equal(media.provider, 'fallback');
    assert.match(media.src, /\/showcase\/detour-showcase-v1\.mp4$/);
    assert.equal(media.paused, true);
    assert.equal(await page.locator('.detour-held').isVisible(), false);
    await seekPlayer(page, 18);
    t.diagnostic('Public blocked-Mux route exposed recovery controls; same-origin fallback became seekable with no stale held place.');
  } finally {
    await context.close();
    await browser.close();
  }
});

test('080 frozen public Mux release is immediately usable at desktop width', { timeout: 60000 }, async t => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    const response = await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(response?.status(), 200);
    assert.equal(response?.headers()['x-detour-source-sha'], release.sourceSha);
    await waitForSeekable(page);
    const player = await page.locator('.detour').boundingBox();
    assert.ok(player && player.width > 600 && player.y < 140, `Unexpected desktop player geometry: ${JSON.stringify(player)}`);
    assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    assert.equal(await page.locator('video').evaluate(video => video.currentSrc), release.staticMp4Url);
    assert.equal(await page.getByRole('button', { name: 'Keep my place' }).isVisible(), true);
    assert.equal(await page.locator('[data-detour-fallback]').isVisible(), true);
    await capture(page, '1280-cold');
    const desktop = await page.evaluate(() => ({
      player: document.querySelector('.detour')?.getBoundingClientRect(),
      heading: document.querySelector('.demo-heading')?.getBoundingClientRect(),
      sourcePanel: document.querySelector('.mux-panel')?.getBoundingClientRect(),
      clock: document.querySelector('.detour-clock')?.textContent?.trim(),
      bodyText: document.body.innerText,
    }));
    writeCaptureMetrics('1280-cold', desktop);
    t.diagnostic(`Desktop public freeze smoke: 1280×900, player ${Math.round(player.width)}×${Math.round(player.height)}, Mux source seekable and fallback exposed.`);
  } finally {
    await context.close();
    await browser.close();
  }
});
