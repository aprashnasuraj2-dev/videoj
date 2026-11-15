import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { chromium } from 'playwright';

const release = JSON.parse(readFileSync(new URL('../mux-release-origin.json', import.meta.url), 'utf8'));
const output = process.env.DETOUR_PHASE9_OUTPUT || 'phase9-evidence';
mkdirSync(output, { recursive: true });

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

async function singleHeldState(page, expectedDuration) {
  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await seek(page, 18);
  await page.waitForFunction(() => document.querySelector('[data-detour-clock-current]')?.textContent === '00:18');
  const clock = (await page.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' ').trim();
  assert.equal(clock, `00:18 / ${expectedDuration}`);
  await page.getByRole('button', { name: 'Return to 00:42' }).waitFor();
}

async function checkpointState(page, expectedDuration) {
  for (const seconds of [42.35, 30, 18, 8]) {
    await seek(page, seconds);
    await page.getByRole('button', { name: 'Keep my place' }).click();
  }
  await seek(page, 15);
  await page.waitForFunction(() => document.querySelector('[data-detour-clock-current]')?.textContent === '00:15');
  const clock = (await page.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' ').trim();
  assert.equal(clock, `00:15 / ${expectedDuration}`);
  assert.equal(await page.locator('.detour-checkpoint').count(), 4);
  const c1 = page.getByRole('button', { name: 'Return to 00:42 — checkpoint C1' });
  await c1.focus();
  return c1;
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await checkpointState(page, '00:55');
    await page.locator('.detour').screenshot({ path: join(output, 'hero-1280-checkpoints.png') });
    const detailBounds = await page.locator('.detour-shelf').boundingBox();
    assert.ok(detailBounds, 'Missing shelf bounds for signature detail capture');
    await page.screenshot({
      path: join(output, 'detail-1280-checkpoints.png'),
      clip: {
        x: detailBounds.x,
        y: Math.max(0, detailBounds.y - 34),
        width: detailBounds.width,
        height: detailBounds.height + 34,
      },
    });
    const hero = await page.evaluate(() => ({
      current: document.querySelector('[data-detour-clock-current]')?.textContent,
      duration: document.querySelector('[data-detour-clock-duration]')?.textContent,
      checkpoints: [...document.querySelectorAll('.detour-checkpoint')].map(button => ({
        slot: button.dataset.slot,
        label: button.getAttribute('aria-label'),
      })),
      focused: document.activeElement?.getAttribute?.('aria-label') || null,
      player: document.querySelector('.detour')?.getBoundingClientRect(),
      pageTitle: document.title,
      tagline: document.querySelector('.demo-heading p')?.textContent,
    }));
    assert.equal(hero.current, '00:15');
    assert.deepEqual(hero.checkpoints.map(item => item.slot), ['1', '2', '3', '4']);
    assert.match(hero.focused || '', /Return to 00:42 — checkpoint C1/);
    writeFileSync(join(output, 'hero-1280-checkpoints.json'), JSON.stringify(hero, null, 2) + '\n');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await checkpointState(page, '00:55');
    const cc = page.locator('media-captions-button');
    await cc.click();
    await page.waitForFunction(() => {
      const track = document.querySelector('video')?.textTracks?.[0];
      return track?.mode === 'showing' && (track.activeCues?.length ?? 0) > 0;
    }, null, { timeout: 5000 });
    await page.locator('.detour').screenshot({ path: join(output, 'compact-375-checkpoints-captions.png') });
    assert.equal(await cc.getAttribute('data-active') !== null, true, 'Captions did not become active');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.route('https://stream.mux.com/**', route => route.abort('failed'));
    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('[data-detour-source-status]')?.dataset.state === 'error', null, { timeout: 20000 });
    assert.equal(await page.locator('[data-detour-fallback]').isVisible(), true);
    assert.equal(await page.locator('.detour-error').isVisible(), false, 'Recovery capture contains duplicate error UI');
    await page.locator('.demo').screenshot({ path: join(output, 'recovery-375.png') });
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 960, height: 760 } });
    const page = await context.newPage();
    const integration = new URL('../integration/', release.origin).href;
    await page.goto(integration, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await singleHeldState(page, '01:04');
    assert.match(await page.locator('video').getAttribute('src'), /fixtures\/daylight-study\.mp4$/);
    await page.locator('.detour').screenshot({ path: join(output, 'alternate-960-held.png') });
    writeFileSync(join(output, 'alternate-960-held.json'), JSON.stringify({
      url: integration,
      media: await page.locator('video').getAttribute('src'),
      current: await page.locator('[data-detour-clock-current]').textContent(),
      returnText: (await page.locator('.detour-return').innerText()).replace(/\s+/g, ' ').trim(),
    }, null, 2) + '\n');
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 960, height: 720 },
      recordVideo: { dir: output, size: { width: 960, height: 720 } },
    });
    const page = await context.newPage();
    const videoHandle = page.video();
    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await page.waitForTimeout(500);
    const slider = page.getByRole('slider', { name: 'Seek' });
    await slider.focus();
    for (let i = 0; i < 4; i += 1) { await page.keyboard.press('PageUp'); await page.waitForTimeout(70); }
    for (let i = 0; i < 2; i += 1) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(70); }
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 42) < 1);
    await page.getByRole('button', { name: 'Keep my place' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);

    await slider.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 18; i += 1) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40); }
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 18) < 1);
    await page.getByRole('button', { name: 'Keep my place' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);

    await slider.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 8; i += 1) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40); }
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 8) < 1);

    const c1 = page.getByRole('button', { name: /Return to 00:4[12] — checkpoint C1/ });
    await c1.focus();
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 42) < 1, null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const checkpoint = document.querySelector('.detour-checkpoint[data-slot="2"]');
      return checkpoint && !checkpoint.disabled;
    }, null, { timeout: 10000 });
    const returned = await page.locator('video').evaluate(video => video.currentTime);
    assert.ok(Math.abs(returned - 42) < 1, `Recorded checkpoint Return landed at ${returned}`);

    const c2 = page.getByRole('button', { name: /checkpoint C2/ });
    await c2.focus();
    await page.waitForTimeout(450);
    await page.keyboard.press('Delete');
    await page.waitForFunction(() => !document.querySelector('.detour-checkpoint[data-slot="2"]'));
    assert.equal(await page.locator('.detour-checkpoint').count(), 1);
    await page.waitForTimeout(1000);
    await context.close();
    const rawPath = await videoHandle.path();
    const finalPath = join(output, 'interaction-960x720.webm');
    copyFileSync(rawPath, finalPath);
    const probe = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_format','-of','json',finalPath], { encoding: 'utf8' }));
    const duration = Number(probe.format.duration);
    assert.ok(duration >= 6 && duration <= 14, `Interaction clip must be 6-14s, got ${duration}s`);
    writeFileSync(join(output, 'interaction-960x720.json'), JSON.stringify({ durationSeconds: duration, returnedSeconds: returned }, null, 2) + '\n');
  }
} finally {
  await browser.close();
}

console.log(`Phase 9 evidence captured from ${release.origin} into ${output}`);
