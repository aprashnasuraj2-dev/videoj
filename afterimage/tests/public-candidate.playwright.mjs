import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browserName = process.env.BROWSER || 'chromium';
const baseURL = process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const engines = { chromium, firefox, webkit };
const engine = engines[browserName];
if (!engine) throw new Error('Unsupported browser: ' + browserName);

const artifactDir = new URL('../artifacts/' + browserName + '/', import.meta.url);
await mkdir(artifactDir, { recursive: true });
const report = { browser: browserName, url: baseURL, checks: {}, issues: [] };
const check = (name, value, detail = null) => {
  report.checks[name] = { pass: Boolean(value), detail };
  if (!value) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : ''));
};

const browser = await engine.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1080, height: 810 },
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});
const page = await context.newPage();

try {
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.__AFTERIMAGE_RELEASE__), null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const video = window.__AFTERIMAGE_RELEASE__?.video;
    return video && Number.isFinite(video.duration) && video.readyState >= 1;
  }, null, { timeout: 30000 });

  const boot = await page.evaluate(() => {
    const { video, player, version } = window.__AFTERIMAGE_RELEASE__;
    const q = s => player.querySelector(s);
    return {
      version,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      error: video.error ? { code: video.error.code, message: video.error.message } : null,
      play: q('media-play-button')?.getAttribute('aria-label'),
      tryVisible: q('[data-afterimage-example]')?.getBoundingClientRect().width > 0,
      pinVisible: q('[data-afterimage-pin]')?.getBoundingClientRect().width > 0,
    };
  });
  check('boots-final-waterline', Math.abs(boot.duration - 18) < 0.1 && !boot.error && boot.tryVisible && boot.pinVisible, boot);

  await page.locator('media-play-button').click();
  await page.waitForTimeout(900);
  const playing = await page.evaluate(() => {
    const { video } = window.__AFTERIMAGE_RELEASE__;
    return { currentTime: video.currentTime, paused: video.paused };
  });
  check('playback-advances', playing.currentTime > 0.35 && !playing.paused, playing);

  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(() => {
    const p = window.__AFTERIMAGE_RELEASE__?.player;
    return p && !p.querySelector('.afterimage-reference')?.hidden;
  }, null, { timeout: 8000 });
  await page.waitForTimeout(300);
  const example = await page.evaluate(() => {
    const { video, player } = window.__AFTERIMAGE_RELEASE__;
    const text = s => player.querySelector(s)?.textContent?.trim() || '';
    return {
      pinned: text('[data-afterimage-pinned]'),
      now: text('[data-afterimage-now]'),
      delta: text('[data-afterimage-delta]'),
      currentTime: video.currentTime,
      paused: video.paused,
      status: text('.afterimage-status'),
    };
  });
  check('authored-pair', example.pinned === '00:05' && example.currentTime > 12.6 && example.currentTime < 13.8 && !example.paused, example);

  await page.screenshot({
    path: new URL('primary-1080x810.png', artifactDir).pathname,
    clip: { x: 0, y: 0, width: 1080, height: 810 },
  });
  await page.locator('#afterimage-player').screenshot({
    path: new URL('matched-pair-player.png', artifactDir).pathname,
  });

  const seam = page.locator('.afterimage-seam-control');
  await seam.focus();
  await page.keyboard.press('Home');
  const home = await seam.inputValue();
  await page.keyboard.press('End');
  const end = await seam.inputValue();
  await page.keyboard.press('ArrowLeft');
  const left = await seam.inputValue();
  check('seam-keyboard', home === '0' && end === '100' && Number(left) < 100, { home, end, left });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const escaped = await page.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const compare = player.querySelector('[data-afterimage-compare]');
    return {
      closed: player.querySelector('.afterimage-reference')?.hidden === true,
      compareVisible: compare?.hidden === false,
      focusRestored: document.activeElement === compare,
    };
  });
  check('escape-focus-restoration', escaped.closed && escaped.compareVisible && escaped.focusRestored, escaped);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const reopened = await page.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    return {
      open: player.querySelector('.afterimage-reference')?.hidden === false,
      seamFocused: document.activeElement === player.querySelector('.afterimage-seam-control'),
    };
  });
  check('keyboard-reopen', reopened.open && reopened.seamFocused, reopened);

  await page.locator('media-captions-button').click();
  await page.waitForFunction(() => {
    const v = window.__AFTERIMAGE_RELEASE__?.video;
    return Boolean(v?.textTracks?.[0]?.cues?.length);
  }, null, { timeout: 5000 });
  const captions = await page.evaluate(() => {
    const v = window.__AFTERIMAGE_RELEASE__.video;
    const track = v.textTracks[0];
    return { mode: track.mode, cues: track.cues?.length || 0, active: track.activeCues?.[0]?.text || null };
  });
  check('captions-load', captions.mode === 'showing' && captions.cues === 3, captions);

  await page.setViewportSize({ width: 240, height: 640 });
  await page.waitForTimeout(100);
  const narrow = await page.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const primary = [...player.querySelectorAll('button,media-play-button,media-mute-button,media-captions-button,media-fullscreen-button')]
      .filter(el => !el.hidden && el.getBoundingClientRect().width > 0)
      .map(el => ({ name: el.getAttribute('aria-label') || el.textContent.trim(), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
    return {
      viewport: innerWidth,
      playerWidth: Math.round(player.getBoundingClientRect().width),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      minTarget: Math.min(...primary.map(x => Math.min(x.w, x.h))),
      primary,
    };
  });
  check('240px-fallback', !narrow.overflow && narrow.minTarget >= 44, narrow);
  await page.screenshot({ path: new URL('narrow-240.png', artifactDir).pathname, fullPage: true });

  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForTimeout(100);
  const landscape = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    width: innerWidth,
    playerWidth: Math.round(window.__AFTERIMAGE_RELEASE__.player.getBoundingClientRect().width),
  }));
  check('mobile-landscape', !landscape.overflow, landscape);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedMotion = await page.evaluate(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    transition: getComputedStyle(window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-reference')).transitionDuration,
  }));
  check('reduced-motion-query', reducedMotion.matches, reducedMotion);

  const failurePage = await context.newPage();
  await failurePage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  await failurePage.waitForFunction(() => Boolean(window.__AFTERIMAGE_RELEASE__), null, { timeout: 30000 });
  await failurePage.evaluate(() => {
    const v = window.__AFTERIMAGE_RELEASE__.video;
    v.src = '/media/definitely-missing-afterimage.mp4';
    v.load();
  });
  await failurePage.waitForTimeout(700);
  await failurePage.locator('[data-afterimage-pin]').click();
  await failurePage.waitForTimeout(100);
  const failure = await failurePage.evaluate(() => {
    const { video, player } = window.__AFTERIMAGE_RELEASE__;
    return {
      mediaError: video.error?.code || null,
      status: player.querySelector('.afterimage-status')?.textContent?.trim() || '',
      playVisible: player.querySelector('media-play-button')?.getBoundingClientRect().width > 0,
      pinVisible: player.querySelector('[data-afterimage-pin]')?.getBoundingClientRect().width > 0,
    };
  });
  check('failed-media-preserves-ui', failure.playVisible && failure.pinVisible && /wait|load|frame/i.test(failure.status), failure);
  await failurePage.close();

  report.pass = true;
} catch (error) {
  report.pass = false;
  report.issues.push(String(error?.stack || error));
  throw error;
} finally {
  await writeFile(new URL('report.json', artifactDir), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
