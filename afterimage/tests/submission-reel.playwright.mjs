import { chromium } from 'playwright';
import { mkdir, rename, writeFile } from 'node:fs/promises';

const baseURL = process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease = process.env.AFTERIMAGE_RELEASE || 'a01a62fa5ef8c75850d285656254bb741bd31061';
const expectedVersion = process.env.AFTERIMAGE_VERSION || '0.3.10-control-fit';
const artifactDir = new URL('../artifacts/submission/', import.meta.url);
await mkdir(artifactDir, { recursive: true });

const report = {
  url: baseURL,
  expectedRelease,
  expectedVersion,
  purpose: 'judge-facing AFTERIMAGE submission evidence with accessibility closure',
  checks: {},
  sequence: [],
  screenshots: [],
};
const check = (name, pass, detail = null) => {
  report.checks[name] = { pass: Boolean(pass), detail };
  if (!pass) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : ''));
};
const hold = async (page, label, ms) => {
  report.sequence.push({ label, ms });
  await page.waitForTimeout(ms);
};
const shot = async (locatorOrPage, name, options = {}) => {
  const path = new URL(name, artifactDir).pathname;
  await locatorOrPage.screenshot({ path, ...options });
  report.screenshots.push(name);
};
const activeCaptionState = page => page.evaluate(() => {
  const { player, video } = window.__AFTERIMAGE_RELEASE__;
  const track = [...video.textTracks].find(item => item.kind === 'captions');
  const mirror = player.querySelector('.afterimage-comparison-caption');
  const span = mirror?.querySelector('span');
  const rect = span?.getBoundingClientRect();
  const stage = player.querySelector('.afterimage-stage')?.getBoundingClientRect();
  return {
    mode: track?.mode || null,
    activeCue: track?.activeCues?.[0]?.text || null,
    mirrorHidden: mirror?.hidden ?? true,
    mirrorText: span?.textContent?.trim() || '',
    comparisonOpen: player.querySelector('.afterimage')?.hasAttribute('data-comparison-open') || false,
    mirrorRect: rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
    stageRect: stage ? { left: stage.left, right: stage.right, top: stage.top, bottom: stage.bottom, width: stage.width, height: stage.height } : null,
  };
});

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
  recordVideo: { dir: artifactDir.pathname, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const recordedVideo = page.video();

try {
  const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  const headers = response?.headers() || {};
  const releaseHeader = headers['x-afterimage-release'] || null;
  const accessibilityHeader = headers['x-afterimage-accessibility'] || null;
  check('exact-release-header', releaseHeader === expectedRelease, { releaseHeader });
  check('accessibility-release-header', accessibilityHeader === 'comparison-captions', { accessibilityHeader });

  await page.waitForFunction(() => {
    const release = window.__AFTERIMAGE_RELEASE__;
    return release?.video?.readyState >= 1 && Number.isFinite(release.video.duration);
  }, null, { timeout: 30000 });

  const boot = await page.evaluate(() => ({
    version: window.__AFTERIMAGE_RELEASE__.version,
    duration: window.__AFTERIMAGE_RELEASE__.video.duration,
    width: window.__AFTERIMAGE_RELEASE__.video.videoWidth,
    height: window.__AFTERIMAGE_RELEASE__.video.videoHeight,
    comparisonCaptionPresent: Boolean(window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-comparison-caption')),
  }));
  check('exact-runtime-version', boot.version === expectedVersion, boot);
  check('waterline-media', Math.abs(boot.duration - 18.013) < 0.2 && boot.width === 1280 && boot.height === 720, boot);
  check('comparison-caption-layer-present', boot.comparisonCaptionPresent, boot);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await hold(page, 'identity and visual premise', 2200);

  const playerSection = page.locator('#afterimage-player');
  await playerSection.scrollIntoViewIfNeeded();
  await hold(page, 'player establishes', 900);

  await page.locator('media-play-button').click();
  await page.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.video.paused);
  await hold(page, 'ordinary Video.js playback', 1700);

  await page.locator('media-captions-button').click();
  await page.waitForFunction(() => {
    const track = [...window.__AFTERIMAGE_RELEASE__.video.textTracks].find(item => item.kind === 'captions');
    return track?.mode === 'showing' && (track.cues?.length || 0) > 0;
  }, null, { timeout: 5000 });
  await hold(page, 'real WebVTT captions enabled', 1500);

  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    const button = player.querySelector('[data-afterimage-example]');
    const mirror = player.querySelector('.afterimage-comparison-caption');
    return !player.querySelector('.afterimage-reference')?.hidden &&
      !button?.disabled &&
      video.currentTime > 12.6 && video.currentTime < 13.8 &&
      mirror && !mirror.hidden && mirror.textContent.trim().length > 0;
  }, null, { timeout: 8000 });

  const accessiblePair = await activeCaptionState(page);
  check(
    'comparison-caption-mirrors-active-real-cue',
    accessiblePair.mode === 'showing' &&
      accessiblePair.comparisonOpen &&
      !accessiblePair.mirrorHidden &&
      accessiblePair.mirrorText === accessiblePair.activeCue &&
      accessiblePair.mirrorRect?.width > 0 &&
      accessiblePair.mirrorRect?.height > 0 &&
      accessiblePair.mirrorRect.left >= accessiblePair.stageRect.left - 1 &&
      accessiblePair.mirrorRect.right <= accessiblePair.stageRect.right + 1 &&
      accessiblePair.mirrorRect.top >= accessiblePair.stageRect.top - 1 &&
      accessiblePair.mirrorRect.bottom <= accessiblePair.stageRect.bottom + 1,
    accessiblePair,
  );
  await hold(page, 'captions remain readable over the temporal comparison', 2600);
  await shot(playerSection, 'afterimage-accessibility-comparison.png');

  const seam = page.locator('.afterimage-seam-control');
  const box = await seam.boundingBox();
  if (!box) throw new Error('Seam control has no geometry');
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    const ratio = 0.5 - (0.23 * step / 12);
    await page.mouse.move(box.x + box.width * ratio, box.y + box.height * 0.5);
    await page.waitForTimeout(55);
  }
  await page.mouse.up();
  const pointerValue = Number(await seam.inputValue());
  check('real-pointer-seam-drag', pointerValue >= 24 && pointerValue <= 30, { pointerValue });
  await hold(page, 'dragged reveal changes only presentation', 1700);

  for (const label of ['Pinned', 'Now', 'Split']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await hold(page, label + ' preset', 1050);
  }

  const fullscreen = page.locator('media-fullscreen-button');
  await fullscreen.click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
  await page.waitForTimeout(350);
  const fullscreenState = await page.evaluate(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    const wrapper = player.querySelector('.afterimage');
    const stage = player.querySelector('.afterimage-stage').getBoundingClientRect();
    const deck = player.querySelector('.afterimage-deck').getBoundingClientRect();
    const mirror = player.querySelector('.afterimage-comparison-caption');
    const track = [...video.textTracks].find(item => item.kind === 'captions');
    return {
      wrapperFullscreen: document.fullscreenElement === wrapper,
      stage: { width: stage.width, height: stage.height },
      deckBottom: deck.bottom,
      viewportHeight: innerHeight,
      comparisonOpen: wrapper.hasAttribute('data-comparison-open'),
      mirrorHidden: mirror.hidden,
      mirrorText: mirror.textContent.trim(),
      activeCue: track?.activeCues?.[0]?.text || null,
      trackMode: track?.mode || null,
    };
  });
  check(
    'fullscreen-comparison-captions',
    fullscreenState.wrapperFullscreen &&
      fullscreenState.stage.width > 0 &&
      fullscreenState.stage.height > 0 &&
      fullscreenState.deckBottom <= fullscreenState.viewportHeight + 1 &&
      fullscreenState.comparisonOpen &&
      !fullscreenState.mirrorHidden &&
      fullscreenState.trackMode === 'showing' &&
      fullscreenState.mirrorText === fullscreenState.activeCue,
    fullscreenState,
  );
  await hold(page, 'real fullscreen keeps comparison and captions together', 2400);
  await shot(page, 'afterimage-accessibility-fullscreen.png');

  await fullscreen.focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  await hold(page, 'fullscreen exit returns to the same player state', 1200);

  await seam.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  const seamFocus = await page.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const el = player.querySelector('.afterimage-seam-control');
    const style = getComputedStyle(el);
    return {
      focused: document.activeElement === el,
      ariaValueText: el.getAttribute('aria-valuetext'),
      outlineWidth: style.outlineWidth,
    };
  });
  check('keyboard-seam-focus', seamFocus.focused && /pinned frame/.test(seamFocus.ariaValueText || ''), seamFocus);
  await shot(playerSection, 'afterimage-keyboard-focus.png');
  await hold(page, 'keyboard reveal focus', 1400);

  const close = page.getByRole('button', { name: 'Close comparison', exact: true });
  await close.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-reference')?.hidden === true);
  const closeState = await page.evaluate(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    return {
      compareFocused: document.activeElement === player.querySelector('[data-afterimage-compare]'),
      trackMode: [...video.textTracks].find(item => item.kind === 'captions')?.mode || null,
      mirrorHidden: player.querySelector('.afterimage-comparison-caption')?.hidden,
      comparisonOpen: player.querySelector('.afterimage')?.hasAttribute('data-comparison-open') || false,
    };
  });
  check('close-restores-native-caption-state', closeState.compareFocused && closeState.trackMode === 'showing' && closeState.mirrorHidden && !closeState.comparisonOpen, closeState);
  await hold(page, 'close retains the pin and restores native caption rendering', 1300);

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-reference')?.hidden === false);
  await hold(page, 'compare reopens from keyboard', 1300);

  await page.getByRole('button', { name: 'Clear pin', exact: true }).click();
  await hold(page, 'clear returns to ordinary playback', 1200);

  if (await page.evaluate(() => [...window.__AFTERIMAGE_RELEASE__.video.textTracks].some(track => track.kind === 'captions' && track.mode === 'showing'))) {
    await page.locator('media-captions-button').click();
    await page.waitForFunction(() => ![...window.__AFTERIMAGE_RELEASE__.video.textTracks].some(track => track.kind === 'captions' && track.mode === 'showing'));
  }

  if (!await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.paused)) {
    await page.locator('media-play-button').click();
    await page.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.paused);
  }

  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    return !player.querySelector('[data-afterimage-example]')?.disabled &&
      video.currentTime > 12.6 && video.currentTime < 13.8 &&
      !player.querySelector('.afterimage-reference')?.hidden;
  }, null, { timeout: 8000 });
  if (!await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.paused)) {
    await page.locator('media-play-button').click();
    await page.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.paused);
  }
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await hold(page, 'clean final matched pair', 3600);

  await shot(playerSection, 'afterimage-primary-still.png');
  await shot(page, 'afterimage-submission-page.png', { fullPage: false });

  const finalState = await page.evaluate(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    return {
      paused: video.paused,
      pinned: player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      now: player.querySelector('[data-afterimage-now]')?.textContent?.trim(),
      delta: player.querySelector('[data-afterimage-delta]')?.textContent?.trim(),
      seam: player.querySelector('.afterimage-seam-control')?.value,
      captionsShowing: [...video.textTracks].some(track => track.kind === 'captions' && track.mode === 'showing'),
      comparisonCaptionHidden: player.querySelector('.afterimage-comparison-caption')?.hidden,
    };
  });
  const normalizedPinned = finalState.pinned?.replace(/^≈/, '');
  check(
    'final-primary-visual',
    normalizedPinned === '00:05' &&
      finalState.now === '00:13' &&
      finalState.delta === '+00:08' &&
      finalState.seam === '50' &&
      finalState.paused &&
      !finalState.captionsShowing &&
      finalState.comparisonCaptionHidden,
    finalState,
  );
  report.finalState = { ...finalState, approximatePin: finalState.pinned?.startsWith('≈') || false };
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
try {
  const mobileResponse = await mobilePage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  const mobileHeaders = mobileResponse?.headers() || {};
  check('mobile-release-header', mobileHeaders['x-afterimage-release'] === expectedRelease, { release: mobileHeaders['x-afterimage-release'] });
  await mobilePage.waitForFunction(() => window.__AFTERIMAGE_RELEASE__?.video?.readyState >= 1, null, { timeout: 30000 });
  await mobilePage.locator('media-play-button').click();
  await mobilePage.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.video.paused);
  await mobilePage.locator('media-captions-button').click();
  await mobilePage.waitForFunction(() => [...window.__AFTERIMAGE_RELEASE__.video.textTracks].some(track => track.kind === 'captions' && track.mode === 'showing'));
  await mobilePage.locator('[data-afterimage-example]').click();
  await mobilePage.waitForFunction(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    const mirror = player.querySelector('.afterimage-comparison-caption');
    return !player.querySelector('[data-afterimage-example]')?.disabled &&
      video.currentTime > 12.6 && video.currentTime < 13.8 &&
      mirror && !mirror.hidden && mirror.textContent.trim().length > 0;
  }, null, { timeout: 8000 });
  if (!await mobilePage.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.paused)) {
    await mobilePage.locator('media-play-button').click();
    await mobilePage.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.paused);
  }
  await mobilePage.locator('#afterimage-player').scrollIntoViewIfNeeded();
  const mobileState = await mobilePage.evaluate(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    const rect = player.querySelector('.afterimage').getBoundingClientRect();
    const mirror = player.querySelector('.afterimage-comparison-caption');
    return {
      width: rect.width,
      viewportWidth: innerWidth,
      overflow: document.documentElement.scrollWidth - innerWidth,
      mirrorHidden: mirror.hidden,
      mirrorText: mirror.textContent.trim(),
      activeCue: [...video.textTracks].find(track => track.kind === 'captions')?.activeCues?.[0]?.text || null,
    };
  });
  check('mobile-captioned-comparison', mobileState.width <= mobileState.viewportWidth + 1 && mobileState.overflow <= 1 && !mobileState.mirrorHidden && mobileState.mirrorText === mobileState.activeCue, mobileState);
  await shot(mobilePage, 'afterimage-mobile-390.png', { fullPage: false });
} finally {
  await mobileContext.close();
  await mobile.close();
  await writeFile(new URL('capture-report.json', artifactDir), JSON.stringify(report, null, 2) + '\n');
}
