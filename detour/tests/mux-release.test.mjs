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
      poster: video.poster,
    }));
    assert.equal(media.src, release.staticMp4Url);
    assert.equal(media.provider, 'mux');
    assert.equal(media.paused, true);
    assert.match(media.track || '', /\/showcase\/detour-showcase-v1\.vtt$/);
    assert.equal(media.poster, release.posterUrl);
    assert.equal(await page.locator('.mux-panel').isVisible(), false);
    assert.equal(await page.locator('[data-detour-fallback]').isVisible(), false);
    assert.match(await page.locator('.demo-heading p').textContent(), /Keep up to four places\. Explore freely\. Return from the rail\./);
    assert.doesNotMatch(await page.locator('body').innerText(), /Mux-hosted|independent fallback/i);
    await page.waitForFunction(() => document.querySelector('[data-detour-clock-current]')?.textContent === '00:00');
    assert.equal((await page.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' ').trim(), '00:00 / 00:55');
    await capture(page, '375-cold');

    await seekPlayer(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seekPlayer(page, 18);
    await page.waitForFunction(() => document.querySelector('[data-detour-clock-current]')?.textContent === '00:18');
    assert.equal((await page.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' ').trim(), '00:18 / 00:55');
    const c1 = page.getByRole('button', { name: 'Return to 00:42 — checkpoint C1' });
    await c1.focus();
    await capture(page, '375-checkpoint-focused');
    const compact = await page.evaluate(() => ({
      player: document.querySelector('.detour')?.getBoundingClientRect(),
      checkpoint: document.querySelector('.detour-checkpoint[data-slot="1"]')?.getBoundingClientRect(),
      settings: document.querySelector('.detour-settings')?.getBoundingClientRect(),
      rail: document.querySelector('.detour-rail')?.getBoundingClientRect(),
      heading: document.querySelector('.demo-heading')?.getBoundingClientRect(),
      sourcePanel: document.querySelector('.mux-panel')?.getBoundingClientRect(),
      clock: document.querySelector('.detour-clock')?.textContent?.trim(),
      bodyText: document.body.innerText,
    }));
    writeCaptureMetrics('375-checkpoint-focused', compact);
    await c1.click();
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 42.35) < 0.5, null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const checkpoint = document.querySelector('.detour-checkpoint[data-slot="1"]');
      return checkpoint && !checkpoint.disabled;
    }, null, { timeout: 10000 });
    const returned = await page.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    assert.ok(Math.abs(returned.time - 42.35) < 0.5, `Public Mux checkpoint Return landed at ${returned.time}`);
    assert.equal(returned.paused, true);
    assert.equal(await page.locator('.detour-checkpoint').count(), 1, 'Return must keep C1 available');
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
    t.diagnostic(`Public Mux release: HTTPS 200, C1 at 42s → 18s → ${returned.time.toFixed(3)}s checkpoint Return with persistence; fallback range 206 / ${fallback.bytes} B.`);
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
    assert.equal(await page.locator('.detour-checkpoint').count(), 0);
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
    assert.equal(await page.locator('.mux-panel').isVisible(), false);
    assert.equal(await page.locator('[data-detour-fallback]').isVisible(), false);
    assert.ok(player.y < 90, `Polished player should start near the heading, got y=${player.y}`);
    assert.ok(player.y + player.height <= 900, `Desktop cold flow should fit the 900px viewport, bottom=${player.y + player.height}`);
    assert.match(await page.locator('.demo-heading p').textContent(), /Keep up to four places\. Explore freely\. Return from the rail\./);
    assert.doesNotMatch(await page.locator('body').innerText(), /Mux-hosted|independent fallback/i);
    await capture(page, '1280-cold');

    for (const seconds of [42.35, 30, 18, 8]) {
      await seekPlayer(page, seconds);
      await page.getByRole('button', { name: 'Keep my place' }).click();
    }
    await seekPlayer(page, 15);
    const desktopC1 = page.getByRole('button', { name: 'Return to 00:42 — checkpoint C1' });
    await desktopC1.hover();
    assert.equal(await page.locator('.detour-checkpoint').count(), 4);
    await capture(page, '1280-checkpoints-hovered');
    writeCaptureMetrics('1280-checkpoints-hovered', await page.evaluate(() => ({
      player: document.querySelector('.detour')?.getBoundingClientRect(),
      rail: document.querySelector('.detour-rail')?.getBoundingClientRect(),
      checkpoints: [...document.querySelectorAll('.detour-checkpoint')].map(button => ({
        slot: button.dataset.slot,
        label: button.getAttribute('aria-label'),
        rect: button.getBoundingClientRect(),
      })),
      clock: document.querySelector('.detour-clock')?.textContent?.trim(),
      bodyText: document.body.innerText,
    })));

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

test('088 public creative routes use viewer-facing language only', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 960, height: 760 } });
  const page = await context.newPage();
  const internal = /\b(?:Mux|R2|workflow|GitHub|Actions|fixture|debug|source\s*sha|detour-dist|Independent host|developer)\b/i;
  try {
    const primary = await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(primary?.status(), 200);
    await waitForSeekable(page);
    assert.equal(await page.title(), 'DETOUR — Keep your place');
    const primaryText = await page.locator('body').innerText();
    assert.doesNotMatch(primaryText, internal);
    assert.match(primaryText, /Keep up to four places\. Explore freely\. Return from the rail\./);
    assert.equal(await page.locator('.mux-panel').isVisible(), false);

    const integration = new URL('../integration/', release.origin).href;
    const alternate = await page.goto(integration, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(alternate?.status(), 200);
    await waitForSeekable(page);
    assert.equal(await page.title(), 'DETOUR — Another video');
    const alternateText = await page.locator('body').innerText();
    assert.doesNotMatch(alternateText, internal);
    assert.match(alternateText, /Same interaction\. Different video\./);
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    assert.equal(await page.locator('dialog').count(), 0);

    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.route('https://stream.mux.com/**', route => route.abort('failed'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('[data-detour-source-status]')?.dataset.state === 'error', null, { timeout: 20000 });
    const recoveryText = await page.locator('body').innerText();
    assert.doesNotMatch(recoveryText, internal);
    assert.equal(await page.locator('.detour-error').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Try video again' }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Use backup video' }).isVisible(), true);
    t.diagnostic('Creative-route audit: primary, alternate and recovery surfaces contain viewer-facing copy only; technical public config remains a machine resource, not creative UI.');
  } finally {
    await context.close();
    await browser.close();
  }
});
