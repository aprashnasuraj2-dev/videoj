import { chromium } from 'playwright';
import { mkdir, rename, writeFile } from 'node:fs/promises';

const baseURL = process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease = process.env.AFTERIMAGE_RELEASE || 'f0bed46afe912b43af657841b0a2897742e9f4ff';
const expectedVersion = process.env.AFTERIMAGE_VERSION || '0.3.3-webkit-handoff';
const artifactDir = new URL('../artifacts/submission/', import.meta.url);
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
  recordVideo: { dir: artifactDir, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const recordedVideo = page.video();
const report = { url: baseURL, expectedRelease, expectedVersion, checks: {}, sequence: [] };
const check = (name, pass, detail = null) => {
  report.checks[name] = { pass: Boolean(pass), detail };
  if (!pass) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : ''));
};
const hold = async (label, ms) => {
  report.sequence.push({ label, ms });
  await page.waitForTimeout(ms);
};

try {
  const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  const releaseHeader = response?.headers()?.['x-afterimage-release'] || null;
  check('exact-release-header', releaseHeader === expectedRelease, { releaseHeader });

  await page.waitForFunction(() => {
    const release = window.__AFTERIMAGE_RELEASE__;
    return release?.video?.readyState >= 1 && Number.isFinite(release.video.duration);
  }, null, { timeout: 30000 });

  const boot = await page.evaluate(() => ({
    version: window.__AFTERIMAGE_RELEASE__.version,
    duration: window.__AFTERIMAGE_RELEASE__.video.duration,
    width: window.__AFTERIMAGE_RELEASE__.video.videoWidth,
    height: window.__AFTERIMAGE_RELEASE__.video.videoHeight,
  }));
  check('exact-runtime-version', boot.version === expectedVersion, boot);
  check('waterline-media', Math.abs(boot.duration - 18.013) < 0.2 && boot.width === 1280 && boot.height === 720, boot);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await hold('opening identity', 3200);

  const player = page.locator('#afterimage-player');
  await player.scrollIntoViewIfNeeded();
  await hold('player establishes', 2200);

  await page.locator('media-play-button').click();
  await page.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.video.paused);
  await hold('ordinary playback', 2600);

  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    const button = player.querySelector('[data-afterimage-example]');
    return !player.querySelector('.afterimage-reference')?.hidden &&
      !button?.disabled &&
      video.currentTime > 12.6 &&
      video.currentTime < 13.8 &&
      (player.querySelector('.afterimage-status')?.textContent || '').startsWith('Example opened:');
  }, null, { timeout: 8000 });
  await hold('matched dry wet pair while time advances', 2200);

  await page.locator('media-play-button').click();
  await page.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.paused);
  await page.locator('#afterimage-player').screenshot({ path: new URL('afterimage-primary-still.png', artifactDir).pathname });
  await hold('split paused for inspection', 2800);

  const seam = page.locator('.afterimage-seam-control');
  const box = await seam.boundingBox();
  if (!box) throw new Error('Seam control has no geometry');
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let step = 1; step <= 14; step += 1) {
    const ratio = 0.5 - (0.25 * step / 14);
    await page.mouse.move(box.x + box.width * ratio, box.y + box.height * 0.5);
    await page.waitForTimeout(70);
  }
  await page.mouse.up();
  const pointerValue = Number(await seam.inputValue());
  check('real-pointer-seam-drag', pointerValue >= 20 && pointerValue <= 30, { pointerValue });
  await hold('dragged reveal', 2600);

  for (const label of ['Pinned', 'Now', 'Split']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await hold(label + ' preset', 2200);
  }

  await page.locator('media-captions-button').click();
  await page.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.textTracks?.[0]?.mode === 'showing');
  await hold('captions enabled', 2200);

  await page.getByRole('button', { name: 'Close comparison', exact: true }).click();
  await hold('comparison closed but pin retained', 2200);
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await hold('comparison reopened', 2200);

  await page.locator('media-play-button').click();
  await page.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.video.paused);
  await hold('resume preserves comparison', 2500);
  await page.locator('media-play-button').click().catch(() => {});
  await page.waitForTimeout(200);

  await page.getByRole('button', { name: 'Clear pin', exact: true }).click();
  await hold('clear returns ordinary player', 2200);

  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    const button = player.querySelector('[data-afterimage-example]');
    return !button?.disabled && video.currentTime > 12.6 && video.currentTime < 13.8 &&
      !player.querySelector('.afterimage-reference')?.hidden;
  }, null, { timeout: 8000 });
  await hold('final matched pair', 3200);

  await page.screenshot({ path: new URL('afterimage-submission-page.png', artifactDir).pathname, fullPage: false });

  const finalState = await page.evaluate(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    return {
      paused: video.paused,
      pinned: player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      now: player.querySelector('[data-afterimage-now]')?.textContent?.trim(),
      delta: player.querySelector('[data-afterimage-delta]')?.textContent?.trim(),
      seam: player.querySelector('.afterimage-seam-control')?.value,
    };
  });
  check('final-pair-readable', finalState.pinned === '00:05' && finalState.now === '00:13', finalState);
  report.finalState = finalState;
} finally {
  await writeFile(new URL('capture-report.json', artifactDir), JSON.stringify(report, null, 2) + '\n');
  await context.close();
  if (recordedVideo) {
    const source = await recordedVideo.path();
    await rename(source, new URL('afterimage-submission-reel.webm', artifactDir));
  }
  await browser.close();
}

const mobile = await chromium.launch({ headless: true });
const mobileContext = await mobile.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
const mobilePage = await mobileContext.newPage();
const mobileResponse = await mobilePage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
if ((mobileResponse?.headers()?.['x-afterimage-release'] || null) !== expectedRelease) throw new Error('Mobile capture release mismatch');
await mobilePage.waitForFunction(() => window.__AFTERIMAGE_RELEASE__?.video?.readyState >= 1, null, { timeout: 30000 });
await mobilePage.locator('[data-afterimage-example]').click();
await mobilePage.waitForFunction(() => {
  const { player, video } = window.__AFTERIMAGE_RELEASE__;
  return !player.querySelector('[data-afterimage-example]')?.disabled && video.currentTime > 12.6 && video.currentTime < 13.8;
}, null, { timeout: 8000 });
await mobilePage.locator('#afterimage-player').scrollIntoViewIfNeeded();
await mobilePage.screenshot({ path: new URL('afterimage-mobile-390.png', artifactDir).pathname, fullPage: false });
await mobileContext.close();
await mobile.close();
