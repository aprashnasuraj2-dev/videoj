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

test('essential controls and a caption-safe settings panel at desktop and compact widths', { timeout: 30000 }, async t => {
  for (const width of [320, 768]) {
    const page = await player(t, width + 32);
    await page.locator('.demo').evaluate((demo, size) => { demo.style.width = `${size}px`; }, width);
    await seek(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seek(page, 18);
    await page.locator('media-captions-button').click();
    await page.waitForFunction(() => document.querySelector('video').textTracks[0].activeCues?.[0]?.text.split('\n').length === 2);
    for (const selector of ['media-play-button', '.detour-clock', 'media-mute-button', 'media-fullscreen-button', 'media-time-slider', '.detour-return']) {
      assert.ok(await page.locator(selector).isVisible(), `Missing ${selector} at ${width}px`);
    }
    const settings = page.getByRole('button', { name: 'Playback settings' });
    const menu = page.getByRole('group', { name: 'Playback speed' });
    await settings.focus();
    await page.keyboard.press('Enter');
    assert.ok(await menu.isVisible());
    const screen = await page.locator('.detour-screen').boundingBox();
    const box = await menu.boundingBox();
    assert.ok(box.y > screen.y + screen.height, 'Settings must not cover the caption area');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.rate), '0.75');
    await page.keyboard.press('Escape');
    assert.equal(await menu.isVisible(), false);
    assert.equal(await settings.evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('video').playbackRate === 0.75);
    assert.equal(await menu.isVisible(), false);
    assert.equal(await settings.evaluate(el => document.activeElement === el), true);

    if (width === 768) {
      await page.locator('media-fullscreen-button').click();
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      await settings.focus();
      await page.keyboard.press('Enter');
      await menu.waitFor();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
      assert.equal(await menu.isVisible(), false);
      assert.equal(await settings.evaluate(el => document.activeElement === el), true);
      if (await page.evaluate(() => Boolean(document.fullscreenElement))) {
        await page.locator('media-fullscreen-button').click();
        await page.waitForFunction(() => !document.fullscreenElement);
      }
    }

    await page.locator('.detour').evaluate(skin => {
      skin.dir = 'rtl';
      skin.querySelector('.detour-return').textContent = 'العودة إلى نقطة التشغيل المحفوظة عند 00:42';
      skin.querySelector('.detour-stay').textContent = 'الاستمرار في المشاهدة من الموضع الحالي';
    });
    for (const selector of ['.detour-return', '.detour-stay', 'media-fullscreen-button']) {
      const bounds = await page.locator(selector).boundingBox();
      const skin = await page.locator('.detour').boundingBox();
      assert.ok(bounds.x >= skin.x && bounds.x + bounds.width <= skin.x + skin.width + 1);
    }
    assert.equal(await page.locator('.detour-rail').evaluate(el => getComputedStyle(el).direction), 'ltr');
    assert.equal(await page.locator('media-time-slider .detour-thumb').getAttribute('aria-label'), 'Seek');
  }
});

test('keyboard Home and End, natural end, and return without autoplay', { timeout: 20000 }, async t => {
  const page = await player(t);
  const slider = page.getByRole('slider', { name: 'Seek' });
  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await slider.press('Home');
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v.currentTime === 0 && !v.seeking;
  });
  await slider.press('End');
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v.currentTime >= v.duration - 0.05 && !v.seeking;
  });
  await seek(page, 63.55);
  await page.locator('media-play-button').click();
  await page.waitForFunction(() => document.querySelector('video').ended);
  assert.ok(await page.locator('.detour-ended').isVisible());
  assert.ok(await page.locator('.detour-replay').isVisible());
  const back = page.getByRole('button', { name: 'Return to 00:42' });
  await back.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v.paused && !v.ended && Math.abs(v.currentTime - 42.35) < 0.1;
  });
  const hold = page.locator('.detour-hold');
  await hold.waitFor();
  assert.equal(await hold.evaluate(el => document.activeElement === el), true);

  await page.locator('video').evaluate(video => {
    const ranges = [[0, 4], [16, 20]];
    Object.defineProperty(video, 'buffered', { configurable: true, value: {
      length: ranges.length, start: index => ranges[index][0], end: index => ranges[index][1],
    } });
    video.dispatchEvent(new Event('progress'));
  });
  const segments = await page.locator('.detour-buffered > span').evaluateAll(els =>
    els.map(el => [parseFloat(el.style.insetInlineStart), parseFloat(el.style.inlineSize)]));
  assert.deepEqual(segments, [[0, 6.25], [25, 6.25]], 'The empty interval must stay unpainted');
});

test('source capability and seekable interval guards control the held place', { timeout: 22000 }, async t => {
  const page = await player(t);
  await seek(page, 42.35);
  const hold = page.getByRole('button', { name: 'Keep my place' });
  await hold.click();
  await seek(page, 18);
  const back = page.getByRole('button', { name: 'Return to 00:42' });
  const ranges = async pair => page.locator('video').evaluate((video, bounds) => {
    Object.defineProperty(video, 'seekable', { configurable: true, value: {
      length: bounds ? 1 : 0, start: () => bounds[0], end: () => bounds[1],
    } });
    video.dispatchEvent(new Event('progress'));
  }, pair);
  await ranges([0, 30]);
  assert.equal(await back.getAttribute('aria-disabled'), 'true');
  assert.ok(await page.getByRole('button', { name: 'Stay here' }).isEnabled());
  await ranges([0, 64]);
  assert.equal(await back.getAttribute('aria-disabled'), 'false');
  await page.getByRole('button', { name: 'Stay here' }).click();

  for (const value of [NaN, Infinity]) {
    await page.locator('video').evaluate((video, duration) => {
      Object.defineProperty(video, 'duration', { configurable: true, value: duration });
      video.dispatchEvent(new Event('durationchange'));
    }, value);
    assert.ok(await hold.isDisabled());
  }
  await page.locator('video').evaluate(video => {
    delete video.duration;
    video.dispatchEvent(new Event('durationchange'));
  });
  await ranges(null);
  assert.ok(await hold.isDisabled());
  await ranges([0, 64]);
  assert.ok(await hold.isEnabled());
  await page.locator('video-player').evaluate(player => {
    const liveStore = Object.create(player.store, { streamType: { value: 'live' } });
    Object.defineProperty(player, 'store', { configurable: true, value: liveStore });
    player.querySelector('video').dispatchEvent(new Event('durationchange'));
  });
  assert.ok(await hold.isDisabled(), 'A finite duration must not qualify a provider reporting live');
  await page.locator('video-player').evaluate(player => {
    delete player.store;
    player.querySelector('video').dispatchEvent(new Event('durationchange'));
  });
  assert.ok(await hold.isEnabled());

  await page.locator('video').evaluate(video => {
    video.querySelector('track').remove();
  });
  await page.locator('media-captions-button').waitFor({ state: 'hidden' });
  await page.locator('video').evaluate(video => {
    video.removeAttribute('src');
    video.load();
  });
  await page.waitForFunction(() => document.querySelector('video').readyState === 0);
  assert.ok(await hold.isDisabled(), 'The empty source must have disabled place keeping');
});

test('failed and stale provider results preserve the active hold', { timeout: 25000 }, async t => {
  const page = await player(t);
  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await seek(page, 18);
  await page.locator('video-player').evaluate(player => {
    const store = player.store;
    let outcome = 'fail';
    const controlled = Object.create(store, {
      seek: { value(time) {
        if (outcome === 'fail') return Promise.reject(new Error('Controlled provider failure'));
        if (outcome === 'delay') return new Promise(resolve => { player.resolveReturn = resolve; });
        return store.seek(time);
      } },
    });
    Object.defineProperty(player, 'store', { configurable: true, value: controlled });
    player.setReturnOutcome = value => { outcome = value; };
  });
  const back = page.getByRole('button', { name: 'Return to 00:42' });
  await back.click();
  await page.locator('.detour-notice').waitFor();
  assert.ok(await back.isEnabled());
  assert.ok(await back.isVisible(), 'A failed seek must keep the labeled place visible');
  assert.equal(await current(page), 18);
  await page.locator('video-player').evaluate(player => player.setReturnOutcome('delay'));
  await back.click();
  await page.getByRole('button', { name: 'Returning…' }).waitFor();
  const slider = page.getByRole('slider', { name: 'Seek' });
  await slider.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('video').currentTime === 19);
  await back.waitFor();
  await page.getByRole('button', { name: 'Stay here' }).click();
  await page.getByRole('button', { name: 'Keep my place' }).waitFor();
  assert.equal(await page.locator('.detour-origin').isVisible(), false);
  await page.locator('video-player').evaluate(player => player.resolveReturn(42.35));
  assert.equal(await page.locator('.detour-origin').isVisible(), false,
    'A stale completion must not reopen a dismissed detour.');
  assert.equal(await back.isVisible(), false);
  assert.equal(await current(page), 19);

  await page.locator('video-player').evaluate(player => player.setReturnOutcome('real'));
  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await seek(page, 18);
  await back.click();
  await page.getByRole('button', { name: 'Keep my place' }).waitFor();
  assert.ok(Math.abs(await current(page) - 42.35) < 0.1);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await seek(page, 18);
  await page.locator('video-player').evaluate(player => player.setReturnOutcome('delay'));
  await back.click();
  await page.getByRole('button', { name: 'Returning…' }).waitFor();
  await page.locator('video').evaluate(video => new Promise(resolve => {
    video.addEventListener('loadeddata', resolve, { once: true });
    video.load();
  }));
  await page.locator('.detour-hold:enabled').waitFor();
  await page.locator('video-player').evaluate(player => player.setReturnOutcome('real'));
  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await page.locator('video-player').evaluate(player => player.resolveReturn(42.35));
  assert.ok(await back.isEnabled(), 'An old completion must not consume a new hold at the same time');
});

test('emulated tap can seek and return without dragging', { timeout: 18000 }, async t => {
  const page = await browser.newPage({ hasTouch: true, viewport: { width: 360, height: 760 } });
  t.after(() => page.close());
  await page.goto(baseURL);
  await page.locator('.detour-hold:enabled').waitFor();
  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).tap();
  const slider = page.locator('media-time-slider');
  const box = await slider.boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.30, box.y + box.height / 2);
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v.currentTime >= 18 && v.currentTime <= 21 && !v.seeking;
  });
  await page.getByRole('button', { name: 'Return to 00:42' }).tap();
  await page.getByRole('button', { name: 'Keep my place' }).waitFor();
  assert.ok(Math.abs(await current(page) - 42.35) < 0.1);
});

test('visual layout preserves the essential controls, targets and focus across embed widths', { timeout: 40000 }, async t => {
  for (const width of [240, 320, 375, 600, 768, 1100]) {
    const page = await player(t, width + 32);
    const skin = page.locator('.detour');
    await page.locator('.demo').evaluate((demo, size) => { demo.style.width = size + 'px'; }, width);
    await seek(page, 42.35);

    const essentials = ['media-time-slider', 'media-play-button', '.detour-clock', 'media-mute-button', 'media-fullscreen-button'];
    const playerBox = async locator => {
      const origin = await skin.boundingBox();
      const box = await locator.boundingBox();
      return { ...box, x: box.x - origin.x, y: box.y - origin.y };
    };
    const geometry = async () => Promise.all(essentials.map(selector => playerBox(page.locator(selector))));
    const before = await geometry();
    const hold = page.getByRole('button', { name: 'Keep my place' });
    await hold.click();
    const back = page.getByRole('button', { name: 'Return to 00:42' });
    const stay = page.getByRole('button', { name: 'Stay here' });
    const returnBox = await playerBox(back);
    const stayBox = await playerBox(stay);
    const afterHold = await geometry();
    for (let i = 0; i < before.length; i += 1) {
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(afterHold[i][key] - before[i][key]) <= 0.05,
          `Holding a place moved essential control ${i} ${key} at ${width}px: ${before[i][key]} → ${afterHold[i][key]}`);
      }
    }
    for (const box of [returnBox, stayBox]) {
      assert.ok(box.width >= 44 && box.height >= 44, `Target under 44px at ${width}px`);
    }
    assert.ok(returnBox.x + returnBox.width <= stayBox.x + 0.1);
    const skinBox = await skin.boundingBox();
    assert.equal(skinBox.width, width);
    const boxes = [...before, returnBox, stayBox];
    for (const [i, box] of boxes.entries()) {
      assert.ok(box.x >= 0 && box.x + box.width <= skinBox.width);
      for (const other of boxes.slice(i + 1)) {
        const overlapX = Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x);
        const overlapY = Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y);
        assert.ok(overlapX <= 0.1 || overlapY <= 0.1, `Controls overlap at ${width}px`);
      }
    }
    if (width >= 600) assert.ok(Math.abs(returnBox.y - before[1].y) < 2);
    else assert.ok(returnBox.y >= before[1].y + before[1].height);
    const thumb = page.getByRole('slider', { name: 'Seek' });
    await thumb.focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video.currentTime < 42 && !video.seeking;
    });
    const ring = await page.locator('media-time-slider').evaluate(el => {
      const style = getComputedStyle(el);
      return [style.outlineStyle, style.outlineWidth, style.outlineOffset];
    });
    assert.deepEqual(ring, ['solid', '2px', '-2px']);

    if (width === 240) {
      await skin.evaluate(el => { el.dir = 'rtl'; });
      await back.evaluate(button => {
        button.querySelector('span').firstChild.textContent = 'العودة إلى موضع المشاهدة المحفوظ سابقًا عند ';
        button.querySelector('bdi').textContent = '100:59:59';
      });
      await stay.evaluate(button => { button.textContent = 'استمر في المشاهدة هنا'; });
      for (const selector of ['.detour-return', '.detour-stay']) {
        assert.ok(await page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      }
      assert.match(await page.locator('.detour-return').textContent(), /100:59:59/);
    }
    assert.ok(await skin.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Overflow at ${width}px`);
    await page.close();
  }
});

test('rail endpoints keep the bracket stem anchored and motion respects reduced mode', { timeout: 20000 }, async t => {
  const page = await player(t, 272);
  await page.locator('.demo').evaluate(el => { el.style.width = '240px'; });
  const rail = page.locator('.detour-rail');
  const mark = page.locator('.detour-origin');
  const hold = page.getByRole('button', { name: 'Keep my place' });
  const stay = page.getByRole('button', { name: 'Stay here' });
  for (const time of [0, 63.8]) {
    await seek(page, time);
    const before = await rail.boundingBox();
    await hold.click();
    const p = await mark.evaluate(el => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { left: box.left, right: box.right, start: parseFloat(style.borderInlineStartWidth),
        end: parseFloat(style.borderInlineEndWidth), duration: parseFloat(style.animationDuration),
        pointer: style.pointerEvents, tab: el.tabIndex };
    });
    const stem = time ? p.right - 1 : p.left + 1;
    assert.ok(Math.abs(stem - (before.x + before.width * time / 64)) < 1.5);
    assert.equal(p.start, time ? 0 : 2);
    assert.equal(p.end, time ? 2 : 0);
    assert.equal(p.duration, 0.14);
    assert.equal(p.pointer, 'none');
    assert.equal(p.tab, -1);
    await seek(page, time ? 62.8 : 1);
    assert.deepEqual(await rail.boundingBox(), before);
    await stay.click();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await hold.click();
  assert.equal(await mark.evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.getByRole('slider', { name: 'Seek' }).focus();
  await page.keyboard.press('ArrowLeft');
  assert.ok(await page.evaluate(() => matchMedia('(forced-colors: active)').matches));
  assert.ok(parseFloat(await page.locator('media-time-slider').evaluate(el => getComputedStyle(el).outlineWidth)) >= 2,
    'Forced-colors seek focus indicator must remain visible.');
  assert.ok(parseFloat(await mark.evaluate(el => getComputedStyle(el).borderInlineEndWidth)) >= 2,
    'Forced-colors held marker boundary must remain visible.');
  if (process.env.DETOUR_PHASE4_CAPTURES) {
    const directory = process.env.DETOUR_PHASE4_CAPTURES;
    mkdirSync(directory, { recursive: true });
    await page.locator('.detour').screenshot({ path: join(directory, 'forced-colors.jpg'), quality: 89 });
  }
});

test('media status shows measured loading, provider waiting, error and retry', { timeout: 28000 }, async t => {
  const page = await browser.newPage();
  t.after(() => page.close());
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  t.after(release);
  const fixture = /navigation-study\.mp4$/;
  await page.route(fixture, async route => { await pending; await route.continue(); });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('.detour-loading').waitFor();
  assert.ok(await page.locator('.detour-clock-empty').isVisible());
  assert.equal(await page.locator('.detour-screen video').getAttribute('poster'), null);
  release();
  await page.locator('.detour-hold:enabled').waitFor();
  assert.equal(await page.locator('.detour-loading').isVisible(), false);
  assert.ok(await page.locator('.detour-clock-values').isVisible());
  await page.locator('media-play-button').click();
  await page.waitForFunction(() => document.querySelector('video').currentTime > 0);
  await page.locator('video').evaluate(video => {
    Object.defineProperties(video, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      currentTime: { configurable: true, value: video.currentTime },
    });
    video.dispatchEvent(new Event('waiting'));
  });
  const buffer = page.locator('.detour-buffer');
  await buffer.waitFor({ timeout: 5000 });
  const picture = await page.locator('.detour-screen').boundingBox();
  assert.ok((await buffer.boundingBox()).y > picture.y + picture.height);
  await page.locator('video').evaluate(video => {
    delete video.readyState;
    delete video.currentTime;
    video.dispatchEvent(new Event('playing'));
  });
  await page.locator('media-play-button').click();
  await buffer.waitFor({ state: 'hidden' });
  const broken = /navigation-study\.mp4\?broken=1$/;
  await page.route(broken, route => route.fulfill({ status: 404 }));
  await page.locator('video').evaluate(video => {
    const source = new URL(video.currentSrc);
    source.searchParams.set('broken', '1');
    video.src = source.href;
  });
  const retry = page.getByRole('button', { name: 'Try again' });
  await retry.waitFor();
  assert.ok(await page.locator('.detour-clock-empty').isVisible());
  await page.unroute(broken);
  await retry.click();
  await page.locator('.detour-hold:enabled').waitFor();
  assert.equal(await retry.isVisible(), false);
});

test('player-only treatments keep captions and held place readable on dark, mixed and bright media', { timeout: 36000 }, async t => {
  const directory = process.env.DETOUR_PHASE4_CAPTURES;
  if (directory) mkdirSync(directory, { recursive: true });
  const boards = [
    { key: 'wide-dark', width: 900, time: 2 },
    { key: 'narrow-mixed', width: 320, time: 18 },
    { key: 'wide-bright', width: 768, time: 18, source: 'daylight-study' },
  ];
  for (const { key, width, time, source } of boards) {
    const page = await player(t, width + 32);
    await page.locator('.demo').evaluate((el, size) => { el.style.width = size + 'px'; }, width);
    if (source) {
      await page.locator('video').evaluate((video, name) => new Promise(resolve => {
        video.addEventListener('loadeddata', resolve, { once: true });
        const track = video.querySelector('track');
        track.src = new URL(`fixtures/${name}.vtt`, document.baseURI).href;
        video.src = new URL(`fixtures/${name}.mp4`, document.baseURI).href;
      }), source);
    }
    const skin = page.locator('.detour');
    if (source) {
      const pair = await skin.evaluate(el => {
        const style = getComputedStyle(el);
        const tokens = ['ink', 'secondary', 'shelf', 'edge', 'panel', 'signal-ink', 'signal', 'focus'];
        const linearize = n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
        const light = name => {
          const hex = style.getPropertyValue(`--detour-${name}`).trim().slice(1);
          return [0, 2, 4].map(i => linearize(parseInt(hex.slice(i, i + 2), 16) / 255))
            .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
        };
        return Object.fromEntries(tokens.map(name => [name, light(name)]));
      });
      for (const [a, b, minimum] of [['ink', 'shelf', 4.5], ['secondary', 'shelf', 4.5],
        ['signal-ink', 'signal', 4.5], ['edge', 'shelf', 3], ['edge', 'panel', 3], ['focus', 'shelf', 3]]) {
        const [low, high] = [pair[a], pair[b]].sort((x, y) => x - y);
        assert.ok((high + .05) / (low + .05) >= minimum, `Contrast for ${a}/${b}`);
      }
    }
    const take = async state => {
      if (directory) await skin.screenshot({ path: join(directory, `${key}-${state}.jpg`), quality: 89, animations: 'disabled' });
    };
    await seek(page, time);
    await page.locator('media-captions-button').click();
    await page.waitForFunction(() => document.querySelector('video').textTracks[0].activeCues?.length > 0);
    assert.equal(await page.locator('media-captions-button[data-active] span').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(241, 244, 236)');
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    await take('idle');
    await seek(page, 42.35);
    await page.getByRole('button', { name: 'Keep my place' }).click();
    await seek(page, time);
    await page.waitForFunction(() => document.querySelector('video').textTracks[0].activeCues?.length > 0);
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    assert.ok(await page.getByRole('button', { name: 'Return to 00:42' }).isVisible());
    assert.ok(await page.locator('.detour-origin').isVisible());
    await take('held');
    await page.close();
  }
});


test('representative portrait, dense-chapter and long-duration fixtures preserve DETOUR behavior', { timeout: 32000 }, async t => {
  const page = await player(t, 520);
  const video = page.locator('video');
  assert.equal(await video.getAttribute('poster'), null, 'Baseline fixture intentionally has no poster.');
  assert.equal(await video.evaluate(media => [...media.textTracks].some(track => track.kind === 'chapters')), false,
    'Baseline VOD is intentionally chapterless.');

  await video.evaluate(media => new Promise(resolve => {
    media.addEventListener('loadeddata', resolve, { once: true });
    const captions = media.querySelector('track[kind="captions"]');
    captions.src = new URL('fixtures/portrait-study.vtt', document.baseURI).href;
    media.src = new URL('fixtures/portrait-study.mp4', document.baseURI).href;
  }));
  await page.locator('.detour-hold:enabled').waitFor();
  const dimensions = await video.evaluate(media => [media.videoWidth, media.videoHeight]);
  assert.ok(dimensions[1] > dimensions[0], `Expected portrait media, got ${dimensions.join('×')}`);

  const chapters = await video.evaluate(media => {
    const track = document.createElement('track');
    track.kind = 'chapters';
    track.label = 'Dense synthetic chapters';
    track.src = new URL('fixtures/dense-chapters.vtt', document.baseURI).href;
    media.append(track);
    track.track.mode = 'hidden';
    return track.label;
  });
  assert.equal(chapters, 'Dense synthetic chapters');
  await page.waitForFunction(() => {
    const track = [...document.querySelector('video').textTracks].find(item => item.kind === 'chapters');
    return track?.cues?.length === 64;
  });
  assert.equal(await page.locator('.detour-rail > *').count(), 2,
    'Dense chapter metadata must not create cosmetic rail markers.');

  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await seek(page, 18);
  await page.getByRole('button', { name: 'Return to 00:42' }).click();
  await page.getByRole('button', { name: 'Keep my place' }).waitFor();
  assert.ok(Math.abs(await current(page) - 42.35) < 0.1);

  await video.evaluate(media => {
    Object.defineProperties(media, {
      currentTime: { configurable: true, writable: true, value: 36042.35 },
      duration: { configurable: true, value: 40000 },
      seekable: { configurable: true, value: {
        length: 1,
        start: () => 0,
        end: () => 40000,
      } },
    });
    media.dispatchEvent(new Event('durationchange'));
    media.dispatchEvent(new Event('seeked'));
  });
  await page.locator('.detour-hold:enabled').waitFor();
  await page.getByRole('button', { name: 'Keep my place' }).click();
  assert.ok(await page.getByRole('button', { name: 'Return to 10:00:42' }).isVisible());
  await page.getByRole('button', { name: 'Stay here' }).click();
});


test('twenty pending-return remounts clear timers, stale completions and duplicate handlers', { timeout: 50000 }, async t => {
  const page = await player(t);
  const playerNode = page.locator('video-player');
  const hold = page.getByRole('button', { name: 'Keep my place' });

  await page.evaluate(() => {
    const nativeSet = window.setTimeout.bind(window);
    const nativeClear = window.clearTimeout.bind(window);
    const tracked = new Set();
    window.__detourTimerAudit = { tracked, nativeSet, nativeClear };
    window.setTimeout = (callback, delay, ...args) => {
      const id = nativeSet(callback, delay, ...args);
      if (delay === 8000) tracked.add(id);
      return id;
    };
    window.clearTimeout = id => {
      tracked.delete(id);
      return nativeClear(id);
    };
  });

  for (let cycle = 0; cycle < 20; cycle += 1) {
    await seek(page, 42.35);
    await hold.click();
    await seek(page, 18);
    await playerNode.evaluate(player => {
      player.__cycleRealStore = player.store;
      const delayed = Object.create(player.store, {
        seek: { value: () => new Promise(resolve => { player.__cycleResolve = resolve; }) },
      });
      Object.defineProperty(player, 'store', { configurable: true, value: delayed });
    });
    await page.getByRole('button', { name: 'Return to 00:42' }).click();
    await page.getByRole('button', { name: 'Returning…' }).waitFor();
    await playerNode.evaluate(player => {
      const place = player.querySelector('detour-place');
      const settings = player.querySelector('.detour-settings');
      const resolve = player.__cycleResolve;
      place.remove();
      settings.before(place);
      Object.defineProperty(player, 'store', { configurable: true, value: player.__cycleRealStore });
      resolve(42.35);
      delete player.__cycleResolve;
      delete player.__cycleRealStore;
    });
    await page.locator('.detour-hold:enabled').waitFor();
    assert.equal(await page.locator('.detour-origin').isVisible(), false, `Leaked marker on remount ${cycle + 1}`);
    assert.equal(await page.evaluate(() => window.__detourTimerAudit.tracked.size), 0,
      `Leaked Return deadline on remount ${cycle + 1}`);
  }

  await seek(page, 42.35);
  await hold.click();
  await seek(page, 18);
  await playerNode.evaluate(player => {
    const real = player.store;
    player.__countedStore = real;
    player.__returnDispatches = 0;
    const counted = Object.create(real, {
      seek: { value(time) {
        player.__returnDispatches += 1;
        return real.seek(time);
      } },
    });
    Object.defineProperty(player, 'store', { configurable: true, value: counted });
  });
  await page.getByRole('button', { name: 'Return to 00:42' }).click();
  await hold.waitFor();
  assert.equal(await playerNode.evaluate(player => player.__returnDispatches), 1,
    'Repeated remounts created duplicate Return dispatchers.');
  assert.equal(await page.evaluate(() => window.__detourTimerAudit.tracked.size), 0);

  await playerNode.evaluate(player => {
    Object.defineProperty(player, 'store', { configurable: true, value: player.__countedStore });
    delete player.__countedStore;
    delete player.__returnDispatches;
  });
  await page.evaluate(() => {
    const audit = window.__detourTimerAudit;
    window.setTimeout = audit.nativeSet;
    window.clearTimeout = audit.nativeClear;
    delete window.__detourTimerAudit;
  });
  t.diagnostic('20/20 pending-return remounts cleared the held mark, one-shot deadline and stale completion.');
});
