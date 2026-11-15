import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { preview } from 'vite';

const config = JSON.parse(readFileSync(new URL('../public/mux-public.json', import.meta.url), 'utf8'));
let server;
let browser;

before(async () => {
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  browser = await chromium.launch({ args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); await server?.close(); });

async function waitForSeekable(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video?.readyState >= 2 && video.seekable.length > 0;
  }, { timeout: 30000 });
}

async function seekPlayer(page, seconds) {
  await page.locator('video-player').evaluate((node, time) => node.store.seek(time), seconds);
  await page.waitForFunction(time => Math.abs(document.querySelector('video').currentTime - time) < 0.5, seconds);
}

test('076 public Mux rendition is anonymously range-readable', { timeout: 30000 }, async t => {
  assert.match(config.playbackId, /^[A-Za-z0-9_-]+$/);
  assert.equal(config.sourceSha256, 'fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1');
  assert.equal(config.sourceBytes, 871570);
  const response = await fetch(config.staticMp4Url, {
    headers: { Range: 'bytes=0-1023' }, redirect: 'follow', signal: AbortSignal.timeout(20000),
  });
  const bytes = (await response.arrayBuffer()).byteLength;
  assert.equal(response.status, 206);
  assert.equal(bytes, 1024);
  assert.match(response.headers.get('content-type') || '', /^video\/mp4(?:;|$)/);
  assert.match(response.headers.get('content-range') || '', /^bytes 0-1023\/\d+$/);
  assert.match(config.posterUrl, /thumbnail\.jpg\?time=0$/);
  const poster = await fetch(config.posterUrl, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
  const posterBytes = (await poster.arrayBuffer()).byteLength;
  assert.equal(poster.status, 200);
  assert.match(poster.headers.get('content-type') || '', /^image\/jpeg(?:;|$)/);
  assert.ok(posterBytes > 1000);
  t.diagnostic(`Mux public range: 206 / ${bytes} B; matching time-zero poster ${posterBytes} B; playback ID ${config.playbackId}`);
});

test('076 production Mux host executes real Hold → seek → Return', { timeout: 45000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  try {
    await page.goto(new URL('mux/', server.resolvedUrls.local[0]).href, { waitUntil: 'domcontentloaded' });
    await waitForSeekable(page);
    await page.locator('.detour-hold:enabled').waitFor();
    const media = await page.locator('video').evaluate(video => ({ src: video.currentSrc, paused: video.paused, tracks: [...video.textTracks].map(track => track.kind) }));
    assert.equal(media.src, config.staticMp4Url);
    assert.equal(media.paused, true);
    assert.ok(media.tracks.includes('captions'));
    assert.equal(await page.locator('.mux-panel').isVisible(), false, 'Healthy playback should not lead with infrastructure/recovery UI');
    assert.match(await page.locator('.demo-heading p').textContent(), /Keep your place\. Explore another moment\. Return in one action\./);
    assert.doesNotMatch(await page.locator('body').innerText(), /Mux-hosted|independent fallback/i);
    await seekPlayer(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seekPlayer(page, 18);
    await page.waitForFunction(() => document.querySelector('[data-detour-clock-current]')?.textContent === '00:18');
    assert.equal((await page.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' ').trim(), '00:18 / 00:55');
    await page.getByRole('button', { name: 'Return to 00:42' }).click();
    await page.getByRole('button', { name: 'Keep my place' }).waitFor();
    const returned = await page.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    assert.ok(Math.abs(returned.time - 42.35) < 0.5, `Mux Return landed at ${returned.time}`);
    assert.equal(returned.paused, true);
    t.diagnostic(`Mux host returned to ${returned.time.toFixed(3)}s from an 18s detour.`);
  } finally { await page.close(); }
});

test('077 Mux outage exposes fallback and source replacement clears a held place', { timeout: 45000 }, async t => {
  const base = server.resolvedUrls.local[0];
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  try {
    await page.goto(new URL('mux/', base).href, { waitUntil: 'domcontentloaded' });
    await waitForSeekable(page);
    await seekPlayer(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await page.getByRole('button', { name: 'Return to 00:42' }).waitFor();
    await page.locator('video').evaluate(video => video.dispatchEvent(new Event('error')));
    await page.waitForFunction(() => !document.querySelector('.mux-panel')?.hidden);
    assert.equal(await page.locator('[data-detour-fallback]').isVisible(), true);
    assert.equal(await page.locator('.detour-error').isVisible(), false, 'Mux host must not show a duplicate player-level recovery surface');
    assert.equal(await page.getByRole('button', { name: 'Try video again' }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Use backup video' }).isVisible(), true);
    await page.locator('[data-detour-fallback]').click();
    await page.waitForFunction(() => document.querySelector('video')?.currentSrc.includes('/showcase/detour-showcase-v1.mp4'));
    await waitForSeekable(page);
    assert.equal(await page.locator('.detour-held').isVisible(), false, 'source replacement must clear stale held place');
    assert.match(await page.locator('[data-detour-source-status]').textContent(), /Playing the backup video/);
    await seekPlayer(page, 18);
  } finally { await page.close(); }

  const blocked = await browser.newPage({ viewport: { width: 375, height: 667 } });
  try {
    await blocked.route('https://stream.mux.com/**', route => route.abort('failed'));
    await blocked.goto(new URL('mux/', base).href, { waitUntil: 'domcontentloaded' });
    await blocked.waitForFunction(() => document.querySelector('[data-detour-source-status]')?.dataset.state === 'error', { timeout: 15000 });
    assert.equal(await blocked.locator('[data-detour-fallback]').isVisible(), true);
    assert.equal(await blocked.locator('.detour-error').isVisible(), false, 'Blocked Mux should expose exactly the host recovery surface');
    await blocked.locator('[data-detour-fallback]').click();
    await blocked.waitForFunction(() => document.querySelector('video')?.currentSrc.includes('/showcase/detour-showcase-v1.mp4'));
    await waitForSeekable(blocked);
    t.diagnostic('Blocked Mux request surfaced recovery controls; local/R2-compatible fallback became seekable and carried no stale mark.');
  } finally { await blocked.close(); }
});
