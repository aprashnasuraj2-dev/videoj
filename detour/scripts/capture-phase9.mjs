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

async function heldState(page) {
  await seek(page, 42.35);
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await seek(page, 18);
  await page.waitForFunction(() => document.querySelector('[data-detour-clock-current]')?.textContent === '00:18');
  assert.equal((await page.locator('.detour-clock-visual').innerText()).replace(/\s+/g, ' ').trim(), '00:18 / 00:55');
  await page.getByRole('button', { name: 'Return to 00:42' }).waitFor();
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await heldState(page);
    await page.locator('.detour').screenshot({ path: join(output, 'hero-1280-held.png') });
    await page.locator('.detour-shelf').screenshot({ path: join(output, 'detail-1280-held.png') });
    const hero = await page.evaluate(() => ({
      current: document.querySelector('[data-detour-clock-current]')?.textContent,
      duration: document.querySelector('[data-detour-clock-duration]')?.textContent,
      returnText: document.querySelector('.detour-return')?.textContent?.replace(/\s+/g, ' ').trim(),
      player: document.querySelector('.detour')?.getBoundingClientRect(),
      pageTitle: document.title,
      tagline: document.querySelector('.demo-heading p')?.textContent,
    }));
    assert.equal(hero.current, '00:18');
    assert.match(hero.returnText || '', /Return to 00:42/);
    writeFileSync(join(output, 'hero-1280-held.json'), JSON.stringify(hero, null, 2) + '\n');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.goto(release.origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await seek(page, 18);
    const cc = page.locator('media-captions-button');
    await cc.click();
    await page.waitForTimeout(250);
    await page.locator('.detour').screenshot({ path: join(output, 'compact-375-captions.png') });
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
    await page.locator('.demo').screenshot({ path: join(output, 'recovery-375.png') });
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 960, height: 760 } });
    const page = await context.newPage();
    const integration = new URL('../integration/', release.origin).href;
    await page.goto(integration, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await heldState(page);
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
    for (let i = 0; i < 4; i += 1) { await page.keyboard.press('PageUp'); await page.waitForTimeout(90); }
    for (let i = 0; i < 2; i += 1) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(90); }
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 42) < 1);
    await page.getByRole('button', { name: 'Keep my place' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(650);
    await slider.focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(150);
    for (let i = 0; i < 18; i += 1) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(55); }
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 18) < 1);
    const back = page.getByRole('button', { name: /Return to 00:4[12]/ });
    await back.focus();
    await page.waitForTimeout(650);
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Keep my place' }).waitFor({ timeout: 10000 });
    const returned = await page.locator('video').evaluate(video => video.currentTime);
    assert.ok(Math.abs(returned - 42) < 1, `Recorded Return landed at ${returned}`);
    await page.waitForTimeout(1200);
    await context.close();
    const rawPath = await videoHandle.path();
    const finalPath = join(output, 'interaction-960x720.webm');
    copyFileSync(rawPath, finalPath);
    const probe = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_format','-of','json',finalPath], { encoding: 'utf8' }));
    const duration = Number(probe.format.duration);
    assert.ok(duration >= 6 && duration <= 10, `Interaction clip must be 6-10s, got ${duration}s`);
    writeFileSync(join(output, 'interaction-960x720.json'), JSON.stringify({ durationSeconds: duration, returnedSeconds: returned }, null, 2) + '\n');
  }
} finally {
  await browser.close();
}

console.log(`Phase 9 evidence captured from ${release.origin} into ${output}`);
