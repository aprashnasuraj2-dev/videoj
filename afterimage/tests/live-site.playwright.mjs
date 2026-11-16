import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const liveURL = process.env.AFTERIMAGE_LIVE_SITE_URL || 'https://aafnaipatro.com/on-this-day/afterimage/apollo-11/';
const expectedRelease = process.env.AFTERIMAGE_RELEASE || '6f271470a76161a55a423e5a67e7c5fb1cdb2f63';
const expectedVersion = process.env.AFTERIMAGE_VERSION || '0.3.9-touch-events';
const expectedPlaybackId = process.env.MUX_PLAYBACK_ID || 'kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U';
const artifactDir = new URL('../artifacts/live-site/', import.meta.url);
await mkdir(artifactDir, { recursive: true });

const report = { liveURL, expectedRelease, expectedVersion, expectedPlaybackId, checks: {}, observations: {} };
const check = (name, pass, detail = null) => {
  report.checks[name] = { pass: Boolean(pass), detail };
  if (!pass) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : ''));
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
const page = await context.newPage();

try {
  const response = await page.goto(liveURL, { waitUntil: 'networkidle', timeout: 60000 });
  check('http-ok', response?.ok(), { status: response?.status() });
  check('route-release-header', response?.headers()?.['x-afterimage-release'] === expectedRelease, {
    header: response?.headers()?.['x-afterimage-release'] || null,
  });
  check('route-mux-header', response?.headers()?.['x-mux-playback-id'] === expectedPlaybackId, {
    header: response?.headers()?.['x-mux-playback-id'] || null,
  });

  await page.waitForFunction(() => {
    const site = window.__AFTERIMAGE_LIVE_SITE__;
    return site?.video?.readyState >= 1 && Number.isFinite(site.video.duration);
  }, null, { timeout: 30000 });

  const boot = await page.evaluate(() => {
    const site = window.__AFTERIMAGE_LIVE_SITE__;
    const computed = getComputedStyle(site.player.querySelector('.afterimage'));
    const tracks = [...site.video.querySelectorAll('track')].map(t => ({ kind: t.kind, label: t.label, src: t.src }));
    return {
      release: site.release,
      version: site.version,
      playbackId: site.playbackId,
      currentSrc: site.video.currentSrc,
      duration: site.video.duration,
      width: site.video.videoWidth,
      height: site.video.videoHeight,
      copper: computed.getPropertyValue('--afterimage-copper').trim(),
      tracks,
      poster: site.video.poster,
      examplePresent: Boolean(site.player.querySelector('[data-afterimage-example]')),
      pinPresent: Boolean(site.player.querySelector('[data-afterimage-pin]')),
      navLinks: [...document.querySelectorAll('.sitebar a')].map(a => ({ text: a.textContent?.trim() || '', href: a.href })),
      nasaAttribution: /NASA Scientific Visualization Studio/i.test(document.body.innerText),
      packageHasWaterlineAssetPath: [...document.scripts].some(script => /the-waterline-v1/i.test(script.textContent || '')),
      pageTitle: document.title,
    };
  });
  report.observations.boot = boot;

  check('exact-skin-release', boot.release === expectedRelease && boot.version === expectedVersion, boot);
  check('public-mux-id', boot.playbackId === expectedPlaybackId, boot);
  check('direct-mux-current-src',
    boot.currentSrc.includes('stream.mux.com/' + expectedPlaybackId + '/highest.mp4'),
    { currentSrc: boot.currentSrc });
  check('alternate-media-ready', boot.duration > 40 && boot.width > 0 && boot.height > 0, boot);
  check('host-theme', boot.copper === '#d9ff4a' || boot.copper === 'rgb(217, 255, 74)', { copper: boot.copper });
  check('host-tracks',
    boot.tracks.some(t => t.kind === 'captions') && boot.tracks.some(t => t.kind === 'chapters'),
    boot.tracks);
  check('alternate-host-poster',
    /image\.mux\.com\/kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U\/thumbnail\.jpg/.test(boot.poster),
    { poster: boot.poster });
  check('aafnai-navigation',
    boot.navLinks.some(link => link.href === 'https://aafnaipatro.com/') &&
      boot.navLinks.some(link => /\/on-this-day\/?$/.test(link.href)),
    boot.navLinks);
  check('nasa-editorial-attribution', boot.nasaAttribution, { title: boot.pageTitle });
  check('manual-only-host', !boot.examplePresent && boot.pinPresent, { examplePresent: boot.examplePresent, pinPresent: boot.pinPresent });
  check('reusable-package-no-waterline-asset-path', !boot.packageHasWaterlineAssetPath, { packageHasWaterlineAssetPath: boot.packageHasWaterlineAssetPath });

  await page.locator('media-play-button').click();
  await page.waitForFunction(() => {
    const v = window.__AFTERIMAGE_LIVE_SITE__.video;
    return !v.paused && v.currentTime > 0.6;
  }, null, { timeout: 10000 });

  const beforePin = await page.evaluate(() => ({
    time: window.__AFTERIMAGE_LIVE_SITE__.video.currentTime,
    paused: window.__AFTERIMAGE_LIVE_SITE__.video.paused,
  }));

  await page.locator('[data-afterimage-pin]').click();
  await page.waitForFunction(() => {
    const p = window.__AFTERIMAGE_LIVE_SITE__.player;
    return !p.querySelector('.afterimage-reference')?.hidden &&
      Boolean(p.querySelector('[data-afterimage-pinned]')?.textContent?.trim());
  }, null, { timeout: 8000 });
  await page.waitForTimeout(1200);

  const afterPin = await page.evaluate(() => {
    const { player, video } = window.__AFTERIMAGE_LIVE_SITE__;
    return {
      time: video.currentTime,
      paused: video.paused,
      pinned: player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      now: player.querySelector('[data-afterimage-now]')?.textContent?.trim(),
      delta: player.querySelector('[data-afterimage-delta]')?.textContent?.trim(),
      seam: player.querySelector('.afterimage-seam-control')?.value,
    };
  });
  report.observations.beforePin = beforePin;
  report.observations.afterPin = afterPin;

  check('manual-pin-on-mux',
    !afterPin.paused && afterPin.time > beforePin.time + 0.5 && Boolean(afterPin.pinned),
    { beforePin, afterPin });

  await page.getByRole('button', { name: 'Pinned', exact: true }).click();
  check('preset-pinned', Number(await page.locator('.afterimage-seam-control').inputValue()) === 100);
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  check('preset-split', Number(await page.locator('.afterimage-seam-control').inputValue()) === 50);
  await page.getByRole('button', { name: 'Now', exact: true }).click();
  check('preset-now', Number(await page.locator('.afterimage-seam-control').inputValue()) === 0);

  const captionsButton = page.locator('media-captions-button');
  if (await captionsButton.count()) {
    await captionsButton.click();
    await page.waitForFunction(() => window.__AFTERIMAGE_LIVE_SITE__.video.textTracks?.[0]?.mode === 'showing', null, { timeout: 5000 });
  }
  const captionState = await page.evaluate(() => ({
    mode: window.__AFTERIMAGE_LIVE_SITE__.video.textTracks?.[0]?.mode || null,
    textTrackCount: window.__AFTERIMAGE_LIVE_SITE__.video.textTracks?.length || 0,
  }));
  report.observations.captionState = captionState;
  check('host-captions-operable', captionState.mode === 'showing' && captionState.textTrackCount >= 2, captionState);

  await page.screenshot({ path: new URL('apollo11-afterimage-live-site.png', artifactDir).pathname, fullPage: true });
  report.pass = true;
} catch (error) {
  report.pass = false;
  report.error = String(error?.stack || error);
  throw error;
} finally {
  await writeFile(new URL('report.json', artifactDir), JSON.stringify(report, null, 2) + '\n');
  await context.close();
  await browser.close();
}
