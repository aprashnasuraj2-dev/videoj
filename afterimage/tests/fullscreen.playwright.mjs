import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease = process.env.AFTERIMAGE_RELEASE || '428e337d9918dcba1db50d01ea1b22a5b470c1ac';
const expectedVersion = process.env.AFTERIMAGE_VERSION || '0.3.5-fullscreen-fit';
const artifactDir = new URL('../artifacts/fullscreen/', import.meta.url);
await mkdir(artifactDir, { recursive: true });
const report = { url: baseURL, expectedRelease, expectedVersion, checks: {}, observations: {} };
const check = (name, pass, detail = null) => {
  report.checks[name] = { pass: Boolean(pass), detail };
  if (!pass) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : ''));
};

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

try {
  const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  const releaseHeader = response?.headers()?.['x-afterimage-release'] || null;
  check('exact-release', releaseHeader === expectedRelease, { releaseHeader, expectedRelease });
  await page.waitForFunction(() => {
    const release = window.__AFTERIMAGE_RELEASE__;
    return release?.video?.readyState >= 1 && Number.isFinite(release.video.duration);
  }, null, { timeout: 30000 });

  const support = await page.evaluate(() => {
    const { player, version } = window.__AFTERIMAGE_RELEASE__;
    const button = player.querySelector('media-fullscreen-button');
    return {
      version,
      fullscreenEnabled: document.fullscreenEnabled,
      buttonName: button?.getAttribute('aria-label') || null,
      buttonWidth: button?.getBoundingClientRect().width || 0,
      buttonHeight: button?.getBoundingClientRect().height || 0,
    };
  });
  check('runtime-version', support.version === expectedVersion, support);
  check('fullscreen-api-and-control', support.fullscreenEnabled && Boolean(support.buttonName) && support.buttonWidth >= 44 && support.buttonHeight >= 44, support);

  const fullscreenControl = page.locator('media-fullscreen-button');
  await fullscreenControl.click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
  await page.waitForTimeout(200);
  const entered = await page.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const bar = player.querySelector('.afterimage-bar')?.getBoundingClientRect();
    const deck = player.querySelector('.afterimage-deck')?.getBoundingClientRect();
    const stage = player.querySelector('.afterimage-stage')?.getBoundingClientRect();
    const fullscreenButton = player.querySelector('media-fullscreen-button');
    return {
      active: Boolean(document.fullscreenElement),
      tag: document.fullscreenElement?.tagName || null,
      buttonName: fullscreenButton?.getAttribute('aria-label') || null,
      viewportHeight: innerHeight,
      barBottom: bar?.bottom || 0,
      deckBottom: deck?.bottom || 0,
      stageBottom: stage?.bottom || 0,
      deckTop: deck?.top || 0,
      playVisible: player.querySelector('media-play-button')?.getBoundingClientRect().width > 0,
    };
  });
  check(
    'enter-fullscreen',
    entered.active &&
      entered.playVisible &&
      entered.barBottom <= entered.viewportHeight + 1 &&
      entered.deckBottom <= entered.viewportHeight + 1 &&
      entered.stageBottom <= entered.deckTop + 1,
    entered,
  );
  await page.screenshot({ path: new URL('fullscreen-entered.png', artifactDir).pathname });

  await fullscreenControl.click();
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  await page.waitForFunction(() =>
    window.__AFTERIMAGE_RELEASE__.player.querySelector('media-fullscreen-button')?.getAttribute('aria-label') === 'Enter fullscreen',
    null,
    { timeout: 2000 },
  );
  const exited = await page.evaluate(() => ({
    active: Boolean(document.fullscreenElement),
    buttonName: window.__AFTERIMAGE_RELEASE__.player.querySelector('media-fullscreen-button')?.getAttribute('aria-label') || null,
    playVisible: window.__AFTERIMAGE_RELEASE__.player.querySelector('media-play-button')?.getBoundingClientRect().width > 0,
  }));
  check('exit-fullscreen-control', !exited.active && exited.playVisible && exited.buttonName === 'Enter fullscreen', exited);
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
