import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { createServer, preview } from 'vite';

const engines = { chromium, firefox, webkit };
const engineName = process.env.DETOUR_ENGINE ?? 'chromium';
let server;
let browser;
let baseURL;

before(async () => {
  assert.ok(engines[engineName], `Unsupported engine: ${engineName}`);
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  baseURL = server.resolvedUrls.local[0];
  browser = await engines[engineName].launch({
    executablePath: process.env.DETOUR_BROWSER || undefined,
    args: engineName === 'chromium' ? ['--no-sandbox'] : [],
  });
});
after(async () => {
  await browser?.close();
  await server?.close();
});

async function player(t, width = 1000) {
  const page = await browser.newPage({ viewport: { width, height: 780 } });
  t.after(() => page.close());
  await page.goto(baseURL);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video.readyState >= 2 && video.seekable.length > 0;
  });
  await page.locator('.detour-hold:enabled').waitFor();
  return page;
}

async function seek(page, seconds) {
  const arrived = await page.locator('video-player').evaluate((element, time) => element.store.seek(time), seconds);
  assert.ok(Math.abs(arrived - seconds) < 0.1, `Ended seek at ${arrived}s, expected ${seconds}s`);
}

const current = page => page.locator('video').evaluate(video => video.currentTime);

test('paused return lands ten times and the held rail marker survives two real seeks', { timeout: 35000 }, async t => {
  const page = await player(t);
  const hold = page.getByRole('button', { name: 'Keep my place' });
  const back = page.getByRole('button', { name: 'Return to 00:42' });
  const observed = [];
  for (let i = 0; i < 10; i += 1) {
    await seek(page, 42.35);
    const before = await current(page);
    await hold.click();
    assert.equal(await current(page), before, 'Keep must not seek');
    const position = await page.locator('.detour-origin').evaluate(el => el.style.insetInlineStart);
    await seek(page, 18);
    await seek(page, 24);
    assert.equal(await page.locator('.detour-origin').evaluate(el => el.style.insetInlineStart), position);
    assert.equal(await page.locator('video').evaluate(video => video.paused), true);
    if (i === 0 && process.env.DETOUR_SCREENSHOT) {
      await page.locator('.detour').screenshot({ path: process.env.DETOUR_SCREENSHOT });
    }
    await page.locator('video').evaluate(video => {
      video.dataset.seekEvents = '0';
      video.onseeking = () => {
        video.dataset.seekEvents = String(Number(video.dataset.seekEvents) + 1);
      };
    });
    await back.click();
    await hold.waitFor();
    const arrived = await current(page);
    assert.ok(Math.abs(arrived - before) <= 0.5, `Return landed at ${arrived}`);
    assert.equal(await page.locator('video').getAttribute('data-seek-events'), '1');
    assert.equal(await page.locator('video').evaluate(video => video.paused), true);
    observed.push(Number(arrived.toFixed(3)));
  }
  t.diagnostic(`10 arrivals (seconds): ${observed.join(', ')}`);
});

test('the familiar seek slider and Stay work by keyboard at 240 and 375 px', { timeout: 30000 }, async t => {
  for (const width of [240, 375]) {
    const page = await player(t, width);
    await seek(page, 42);
    const hold = page.getByRole('button', { name: 'Keep my place' });
    const slider = page.getByRole('slider', { name: 'Seek' });
    const stay = page.getByRole('button', { name: 'Stay here' });
    await hold.focus();
    await page.keyboard.press('Enter');
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video.currentTime < 42 && !video.seeking;
    });
    const before = await current(page);
    await stay.focus();
    await page.keyboard.press('Enter');
    assert.equal(await current(page), before);
    assert.equal(await hold.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('.detour-origin').isVisible(), false);
    const overflow = await page.locator('.detour').evaluate(el => [el.scrollWidth, el.clientWidth]);
    assert.ok(overflow[0] <= overflow[1], `Content overflow at ${width}: ${overflow}`);
    const targets = await hold.boundingBox();
    assert.ok(targets.width >= 44 && targets.height >= 44);
  }
});

test('real playback advances, captions and mute toggle, and returning while playing keeps playing', { timeout: 30000 }, async t => {
  const page = await player(t);
  const play = page.locator('media-play-button');
  const mute = page.locator('media-mute-button');
  await play.click();
  await page.waitForFunction(() => document.querySelector('video').currentTime > 0.15);
  await mute.click();
  assert.equal(await page.locator('video').evaluate(video => video.muted), true);
  await page.locator('media-captions-button').click();
  await page.waitForFunction(() => document.querySelector('video').textTracks[0].mode === 'showing');
  await seek(page, 42);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await seek(page, 18);
  await page.getByRole('button', { name: 'Return to 00:42' }).click();
  await page.getByRole('button', { name: 'Keep my place' }).waitFor();
  const result = await page.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
  assert.equal(result.paused, false);
  assert.ok(result.time >= 42 && result.time < 43.5, `Playing returned to ${result.time}`);
  await play.click();
  assert.equal(await page.locator('video').evaluate(video => video.paused), true);
  await page.locator('media-fullscreen-button').click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  await page.locator('media-fullscreen-button').click();
  await page.waitForFunction(() => !document.fullscreenElement);
});

test('source reload clears the held place and re-enables the next video', { timeout: 25000 }, async t => {
  const page = await player(t);
  await seek(page, 42);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await page.locator('video').evaluate(video => {
    const replacement = new URL(video.currentSrc);
    replacement.searchParams.set('reload', '1');
    video.src = replacement.href;
  });
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video.currentSrc.includes('reload=1') && video.readyState >= 2;
  });
  await page.locator('.detour-hold:enabled').waitFor();
  assert.equal(await page.locator('.detour-origin').isVisible(), false);
  assert.equal(await page.locator('.detour-return').isVisible(), false);
});


test('the held bracket and playhead stay separate at 320 and 768 pixels', { timeout: 25000 }, async t => {
  const directory = process.env.DETOUR_PHASE2_CAPTURES;
  if (directory) mkdirSync(directory, { recursive: true });
  for (const width of [320, 768]) {
    const page = await player(t, width + 32);
    await page.locator('.demo').evaluate((demo, target) => {
      demo.style.width = `${target}px`;
    }, width);
    await seek(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seek(page, 18);
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());

    const skin = page.locator('.detour');
    const mark = page.locator('.detour-origin');
    const thumb = page.locator('media-time-slider .detour-thumb');
    const ticket = page.getByRole('button', { name: 'Return to 00:42' });
    assert.equal((await skin.boundingBox()).width, width);
    assert.ok(await ticket.isVisible());
    assert.equal(await mark.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    const position = await mark.boundingBox();
    const currentPosition = await thumb.boundingBox();
    assert.ok(position.x > currentPosition.x + currentPosition.width);
    assert.ok(position.y + position.height < currentPosition.y);

    if (directory) {
      await skin.screenshot({ path: join(directory, `bracket-${width}.png`) });
      await mark.evaluate(el => { el.hidden = true; });
      await skin.screenshot({ path: join(directory, `text-only-${width}.png`) });
      await mark.evaluate(el => { el.hidden = false; });
    }

    await seek(page, 42.35);
    const overlap = await thumb.boundingBox();
    const fixed = await mark.boundingBox();
    assert.ok(Math.abs(overlap.x - fixed.x) < 4, 'Both markers should refer to the same time');
    assert.ok(fixed.y + fixed.height < overlap.y, 'Both shapes remain distinct at the same timestamp');
  }
});

test('Pausepoint pauses once on playback and skips over sought points', { timeout: 40000 }, async t => {
  const dev = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  t.after(() => dev.close());
  await dev.listen();
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.goto(new URL('design/pausepoint/', dev.resolvedUrls.local[0]).href);
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
  const target = page.getByRole('spinbutton', { name: 'Pause at (seconds)' });
  const status = page.locator('#summary');
  const transport = page.locator('media-play-button');
  const mark = page.locator('.pausepoint-mark');
  const wait = condition => page.waitForFunction(condition);

  const arm = async time => {
    await target.fill(String(time));
    await target.press('Enter');
    assert.match(await status.textContent(), /Pause armed/);
    assert.ok(await mark.isVisible());
  };

  await seek(page, 17.4);
  await arm(18.3);
  await page.locator('video').evaluate(video => {
    video.addEventListener('pause', () => {
      video.dataset.pauseEvents = String(Number(video.dataset.pauseEvents ?? 0) + 1);
    });
  });
  await transport.click();
  await wait(() => document.querySelector('#summary').textContent.startsWith('Paused after'));
  await wait(() => document.querySelector('video').paused);
  const arrived = await current(page);
  assert.ok(arrived >= 18.3 && arrived <= 18.9, `Pause landed at ${arrived}`);
  assert.equal(await mark.isVisible(), false);
  assert.equal(await page.locator('video').getAttribute('data-pause-events'), '1');
  await transport.click();
  await wait(() => document.querySelector('video').currentTime > 19);
  assert.equal(await page.locator('video').getAttribute('data-pause-events'), '1');
  await transport.click();

  await seek(page, 18);
  await arm(19);
  await seek(page, 20);
  assert.equal(await status.textContent(), 'Pause point skipped by seeking.');
  assert.equal(await mark.isVisible(), false);

  await seek(page, 18);
  await arm(22);
  await transport.click();
  await wait(() => document.querySelector('video').currentTime > 18.1);
  const priorPauseCount = await page.locator('video').getAttribute('data-pause-events');
  await page.getByRole('slider', { name: 'Seek' }).press('PageUp');
  await wait(() => document.querySelector('video').currentTime > 28.1);
  assert.equal(await status.textContent(), 'Pause point skipped by seeking.');
  assert.equal(await page.locator('video').evaluate(video => video.paused), false);
  assert.equal(await page.locator('video').getAttribute('data-pause-events'), priorPauseCount);
  t.diagnostic(`Armed at 18.3s, paused at ${arrived.toFixed(3)}s, then resumed. Paused seek and playing PageUp seek skipped the armed points.`);
});
