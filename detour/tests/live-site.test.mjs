import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';

const LIVE_SITE = 'https://aafnaipatro.com/on-this-day/video/apollo-11/';

async function ready(page, timeout = 45000) {
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video?.readyState >= 2 && video.seekable.length > 0;
  }, null, { timeout });
  await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
}

async function seek(page, seconds) {
  await page.locator('video-player').evaluate((node, time) => node.store.seek(time), seconds);
  await page.waitForFunction(
    time => {
      const video = document.querySelector('video');
      return Math.abs(video.currentTime - time) < 0.5 && !video.seeking;
    },
    seconds,
    { timeout: 15000 },
  );
}

test('078 Aafnai Patro editorial history page uses the reusable DETOUR skin on independent video', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    const response = await page.goto(LIVE_SITE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(response?.status(), 200);
    assert.equal(new URL(page.url()).protocol, 'https:');
    assert.equal(new URL(page.url()).host, 'aafnaipatro.com');
    assert.equal(new URL(page.url()).pathname, '/on-this-day/video/apollo-11/');
    assert.equal(response?.headers()['x-aafnai-feature'], 'on-this-day-video');
    assert.equal(response?.headers()['x-player-skin'], 'detour-a3b43f74c765');
    assert.equal(response?.headers()['x-live-site-use'], 'editorial-history');

    assert.equal(await page.locator('a.brand').getAttribute('href'), 'https://aafnaipatro.com/');
    assert.match(await page.title(), /Apollo 11 Landing Site — Visual History/);
    assert.equal(await page.getByRole('heading', { name: 'Apollo 11 Landing Site' }).isVisible(), true);
    assert.equal(await page.getByText('DETOUR.', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('link', { name: /NASA Scientific Visualization Studio/ }).count(), 1);
    assert.equal(await page.locator('input[type="password"]').count(), 0);

    await ready(page);

    const media = await page.locator('video').evaluate(video => ({
      src: video.currentSrc,
      paused: video.paused,
      duration: video.duration,
      captions: video.querySelector('track')?.src,
    }));
    assert.equal(new URL(media.src).host, 'aafnaipatro.com');
    assert.equal(new URL(media.src).host, 'aafnaipatro.com');
    assert.equal(new URL(media.src).pathname, '/on-this-day/video/apollo-11/media/apollo11.mp4');
    assert.equal(new URL(media.captions).pathname, '/on-this-day/video/apollo-11/media/apollo11.vtt');
    assert.equal(media.paused, true);
    assert.ok(media.duration > 30, `expected historical visualization duration >30s, got ${media.duration}`);

    for (const selector of [
      'media-play-button',
      'media-time-slider',
      '.detour-clock',
      'media-mute-button',
      'media-fullscreen-button',
    ]) {
      assert.equal(await page.locator(selector).isVisible(), true, `live site missing ${selector}`);
    }

    await seek(page, 12);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await page.waitForFunction(() => document.querySelector('.detour-return-time')?.textContent === '00:12');
    await seek(page, 2);
    await page.getByRole('button', { name: 'Return to 00:12' }).click();
    await page.getByRole('button', { name: 'Keep my place' }).waitFor({ timeout: 10000 });

    const returned = await page.locator('video').evaluate(video => ({
      time: video.currentTime,
      paused: video.paused,
    }));
    assert.ok(Math.abs(returned.time - 12) < 0.5, `live-site Return landed at ${returned.time}`);
    assert.equal(returned.paused, true);

    await page.locator('media-play-button').click();
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.locator('media-play-button').click();
    await page.waitForFunction(() => document.querySelector('video').paused);

    await page.locator('media-mute-button').click();
    assert.equal(await page.locator('video').evaluate(video => video.muted), true);

    t.diagnostic(
      `Aafnai Patro live-site bonus: signed-out editorial history page, independent NASA video through the Aafnai Patro origin, five required controls visible, 12 → 2 → ${returned.time.toFixed(3)}s Return.`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
