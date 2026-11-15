import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { chromium } from 'playwright';

const release = JSON.parse(readFileSync(new URL('../release-origin.json', import.meta.url), 'utf8'));

test('072 public HTTPS release serves seekable media and the DETOUR signature signed out', { timeout: 45000 }, async t => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  try {
    const response = await page.goto(release.origin, { waitUntil: 'domcontentloaded' });
    assert.equal(new URL(page.url()).protocol, 'https:');
    assert.equal(response?.status(), 200);
    assert.equal(response?.headers()['x-detour-source-sha'], release.sourceSha);
    assert.equal(response?.headers()['x-detour-dist-branch'], release.distBranch);
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video?.readyState >= 2 && video.seekable.length > 0;
    });
    const media = await page.locator('video').evaluate(video => ({
      src: video.currentSrc,
      poster: video.poster,
      track: video.querySelector('track')?.src,
      paused: video.paused,
    }));
    assert.equal(media.paused, true, 'Public release must not autoplay');
    assert.match(media.src, /\/showcase\/detour-showcase-v1\.mp4$/);
    assert.match(media.poster, /\/showcase\/detour-showcase-v1-poster\.jpg$/);
    assert.match(media.track, /\/showcase\/detour-showcase-v1\.vtt$/);

    const resources = await page.evaluate(async ({ src, poster, track }) => {
      const range = await fetch(src, { headers: { Range: 'bytes=0-1023' }, cache: 'no-store' });
      const rangeBytes = (await range.arrayBuffer()).byteLength;
      const posterResponse = await fetch(poster, { cache: 'no-store' });
      const posterBytes = (await posterResponse.arrayBuffer()).byteLength;
      const captions = await fetch(track, { cache: 'no-store' });
      const captionText = await captions.text();
      return {
        range: { status: range.status, bytes: rangeBytes, type: range.headers.get('content-type'),
          contentRange: range.headers.get('content-range'), accepts: range.headers.get('accept-ranges') },
        poster: { status: posterResponse.status, bytes: posterBytes, type: posterResponse.headers.get('content-type') },
        captions: { status: captions.status, type: captions.headers.get('content-type'), body: captionText },
      };
    }, media);
    assert.deepEqual([resources.range.status, resources.range.bytes, resources.range.type, resources.range.accepts], [206, 1024, 'video/mp4', 'bytes']);
    assert.match(resources.range.contentRange ?? '', /^bytes 0-1023\/\d+$/);
    assert.equal(resources.poster.status, 200);
    assert.equal(resources.poster.type, 'image/jpeg');
    assert.ok(resources.poster.bytes > 1000);
    assert.equal(resources.captions.status, 200);
    assert.match(resources.captions.type ?? '', /^text\/vtt/);
    assert.match(resources.captions.body, /^WEBVTT/);

    const player = page.locator('video-player');
    await page.locator('.detour-hold:enabled').waitFor();
    await player.evaluate(node => node.store.seek(42.35));
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await player.evaluate(node => node.store.seek(18));
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 18) < 0.5);
    await page.getByRole('button', { name: 'Return to 00:42' }).click();
    await page.getByRole('button', { name: 'Keep my place' }).waitFor();
    const returned = await page.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    assert.ok(Math.abs(returned.time - 42.35) < 0.5, `HTTPS Return landed at ${returned.time}`);
    assert.equal(returned.paused, true);
    t.diagnostic(`HTTPS ${release.origin}: 206 range, poster/VTT and signed-out Hold → 18s → ${returned.time.toFixed(3)}s Return.`);
  } finally {
    await context.close();
    await browser.close();
  }
});
