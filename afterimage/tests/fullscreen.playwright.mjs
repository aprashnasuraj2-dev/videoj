import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease = process.env.AFTERIMAGE_RELEASE || 'f0bed46afe912b43af657841b0a2897742e9f4ff';
const expectedVersion = process.env.AFTERIMAGE_VERSION || '0.3.3-webkit-handoff';
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

  await page.locator('media-fullscreen-button').click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
  const entered = await page.evaluate(() => ({
    active: Boolean(document.fullscreenElement),
    tag: document.fullscreenElement?.tagName || null,
    buttonName: window.__AFTERIMAGE_RELEASE__.player.querySelector('media-fullscreen-button')?.getAttribute('aria-label') || null,
  }));
  check('enter-fullscreen', entered.active, entered);
  await page.screenshot({ path: new URL('fullscreen-entered.png', artifactDir).pathname });

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  const exited = await page.evaluate(() => ({
    active: Boolean(document.fullscreenElement),
    buttonName: window.__AFTERIMAGE_RELEASE__.player.querySelector('media-fullscreen-button')?.getAttribute('aria-label') || null,
    playVisible: window.__AFTERIMAGE_RELEASE__.player.querySelector('media-play-button')?.getBoundingClientRect().width > 0,
  }));
  check('escape-fullscreen', !exited.active && exited.playVisible, exited);
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
