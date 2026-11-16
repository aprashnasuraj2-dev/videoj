import { chromium, firefox, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const browserName = process.env.BROWSER || 'chromium';
const baseURL = process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease = process.env.AFTERIMAGE_RELEASE || null;
const expectedVersion = process.env.AFTERIMAGE_VERSION || null;
const engines = { chromium, firefox, webkit };
const engine = engines[browserName];
if (!engine) throw new Error('Unsupported browser: ' + browserName);

const artifactDir = new URL('../artifacts/' + browserName + '/', import.meta.url);
await mkdir(artifactDir, { recursive: true });
const report = { browser: browserName, url: baseURL, checks: {}, notes: {}, issues: [] };
const check = (name, value, detail = null) => {
  report.checks[name] = { pass: Boolean(value), detail };
  if (!value) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : ''));
};

async function tabUntil(page, selector, max = 40) {
  for (let i = 1; i <= max; i += 1) {
    await page.keyboard.press('Tab');
    const matches = await page.evaluate(sel => document.activeElement?.matches?.(sel) || false, selector);
    if (matches) return i;
  }
  return null;
}

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)/i);
  return match ? match.slice(1, 4).map(Number) : null;
}
function luminance(color) {
  const values = color.map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const browser = await engine.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1080, height: 810 },
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});
const page = await context.newPage();

try {
  const initialResponse = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  const releaseHeader = initialResponse?.headers()?.['x-afterimage-release'] || null;
  if (expectedRelease) check('serving-release', releaseHeader === expectedRelease, { releaseHeader, expectedRelease });
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
      currentSrc: video.currentSrc,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      error: video.error ? { code: video.error.code, message: video.error.message } : null,
      play: q('media-play-button')?.getAttribute('aria-label'),
      tryVisible: q('[data-afterimage-example]')?.getBoundingClientRect().width > 0,
      pinVisible: q('[data-afterimage-pin]')?.getBoundingClientRect().width > 0,
    };
  });
  check('boots-final-waterline', Math.abs(boot.duration - 18) < 0.15 && !boot.error && boot.tryVisible && boot.pinVisible, boot);
  if (expectedVersion) check('serving-version', boot.version === expectedVersion, { version: boot.version, expectedVersion });

  await page.locator('media-play-button').click();
  await page.waitForTimeout(900);
  const playing = await page.evaluate(() => {
    const { video } = window.__AFTERIMAGE_RELEASE__;
    return { currentTime: video.currentTime, paused: video.paused };
  });
  check('playback-advances', playing.currentTime > 0.35 && !playing.paused, playing);

  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(() => {
    const release = window.__AFTERIMAGE_RELEASE__;
    if (!release) return false;
    const { player, video } = release;
    const button = player.querySelector('[data-afterimage-example]');
    const status = player.querySelector('.afterimage-status')?.textContent || '';
    return !player.querySelector('.afterimage-reference')?.hidden &&
      !button?.disabled &&
      video.currentTime > 12.6 &&
      video.currentTime < 13.8 &&
      status.startsWith('Example opened:');
  }, null, { timeout: 8000 });
  await page.waitForTimeout(50);
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
  check('reduced-motion-query', reducedMotion.matches && reducedMotion.transition === '0s', reducedMotion);

  await page.setViewportSize({ width: 540, height: 405 });
  await page.waitForTimeout(100);
  const reflow200 = await page.evaluate(() => {
    const player = window.__AFTERIMAGE_RELEASE__.player;
    const primary = [...player.querySelectorAll('button,media-play-button,media-mute-button,media-captions-button,media-fullscreen-button')]
      .filter(el => !el.hidden && el.getBoundingClientRect().width > 0)
      .map(el => ({ w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
    return {
      viewport: innerWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      minTarget: Math.min(...primary.map(x => Math.min(x.w, x.h))),
      playerWidth: Math.round(player.getBoundingClientRect().width),
    };
  });
  check('200pct-equivalent-reflow', !reflow200.overflow && reflow200.minTarget >= 44, reflow200);

  await page.setViewportSize({ width: 720, height: 900 });
  const shapeFixtures = await page.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const stage = player.querySelector('.afterimage-stage');
    const reference = player.querySelector('.afterimage-reference');
    const original = stage.style.aspectRatio;
    const measure = ratio => {
      stage.style.aspectRatio = ratio;
      const stageRect = stage.getBoundingClientRect();
      const referenceRect = reference.getBoundingClientRect();
      return {
        ratio,
        stage: { width: Math.round(stageRect.width), height: Math.round(stageRect.height) },
        reference: { width: Math.round(referenceRect.width), height: Math.round(referenceRect.height) },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        objectFit: getComputedStyle(player.querySelector('video')).objectFit,
      };
    };
    const letterbox = measure('4 / 3');
    const portrait = measure('9 / 16');
    stage.style.aspectRatio = original;
    return { letterbox, portrait };
  });
  check(
    'letterbox-portrait-container-fixtures',
    !shapeFixtures.letterbox.overflow &&
      !shapeFixtures.portrait.overflow &&
      shapeFixtures.letterbox.objectFit === 'contain' &&
      shapeFixtures.portrait.objectFit === 'contain' &&
      shapeFixtures.letterbox.stage.width === shapeFixtures.letterbox.reference.width &&
      shapeFixtures.portrait.stage.width === shapeFixtures.portrait.reference.width,
    shapeFixtures,
  );

  if (browserName === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await page.setViewportSize({ width: 1080, height: 810 });
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const pageScale = await page.evaluate(() => ({
      scale: visualViewport?.scale || 1,
      visualWidth: visualViewport?.width || innerWidth,
      layoutWidth: innerWidth,
    }));
    check('200pct-page-scale', pageScale.scale >= 1.99, pageScale);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  }

  const controlsPage = await context.newPage();
  const controlsResponse = await controlsPage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  if (expectedRelease) {
    const controlsRelease = controlsResponse?.headers()?.['x-afterimage-release'] || null;
    check('controls-serving-release', controlsRelease === expectedRelease, { controlsRelease, expectedRelease });
  }
  await controlsPage.waitForFunction(() => {
    const release = window.__AFTERIMAGE_RELEASE__;
    return release?.video?.readyState >= 1 && Number.isFinite(release.video.duration);
  }, null, { timeout: 30000 });

  const playControl = controlsPage.locator('media-play-button');
  await playControl.click();
  await controlsPage.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.video.paused);
  const afterPlay = await controlsPage.evaluate(() => ({
    paused: window.__AFTERIMAGE_RELEASE__.video.paused,
    time: window.__AFTERIMAGE_RELEASE__.video.currentTime,
  }));
  await controlsPage.waitForTimeout(350);
  await playControl.click();
  await controlsPage.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.paused);
  const afterPause = await controlsPage.evaluate(() => ({
    paused: window.__AFTERIMAGE_RELEASE__.video.paused,
    time: window.__AFTERIMAGE_RELEASE__.video.currentTime,
  }));
  check('essential-play-pause', !afterPlay.paused && afterPause.paused && afterPause.time > afterPlay.time, { afterPlay, afterPause });

  const seekControl = controlsPage.locator('media-time-slider');
  const seekBox = await seekControl.boundingBox();
  check('seek-control-has-geometry', Boolean(seekBox && seekBox.width > 100), seekBox);
  await seekControl.click({ position: { x: Math.round(seekBox.width * 0.62), y: Math.round(seekBox.height / 2) } });
  await controlsPage.waitForFunction(() => {
    const v = window.__AFTERIMAGE_RELEASE__.video;
    return v.currentTime > v.duration * 0.45 && v.currentTime < v.duration * 0.8;
  }, null, { timeout: 3000 });
  const seekState = await controlsPage.evaluate(() => {
    const { video, player } = window.__AFTERIMAGE_RELEASE__;
    return {
      currentTime: video.currentTime,
      duration: video.duration,
      currentLabel: player.querySelector('media-time[type="current"]')?.textContent?.trim() || '',
      durationLabel: player.querySelector('media-time[type="duration"]')?.textContent?.trim() || '',
    };
  });
  check(
    'essential-seek-time',
    seekState.currentTime > seekState.duration * 0.45 &&
      seekState.currentTime < seekState.duration * 0.8 &&
      /\d/.test(seekState.currentLabel) &&
      /\d/.test(seekState.durationLabel),
    seekState,
  );

  const muteControl = controlsPage.locator('media-mute-button');
  const initialAudio = await controlsPage.evaluate(() => {
    const v = window.__AFTERIMAGE_RELEASE__.video;
    return { muted: v.muted, volume: v.volume };
  });
  await muteControl.click();
  await controlsPage.waitForFunction(previous => window.__AFTERIMAGE_RELEASE__.video.muted !== previous, initialAudio.muted);
  const mutedState = await controlsPage.evaluate(() => ({
    muted: window.__AFTERIMAGE_RELEASE__.video.muted,
    volume: window.__AFTERIMAGE_RELEASE__.video.volume,
  }));
  await muteControl.click();
  await controlsPage.waitForFunction(previous => window.__AFTERIMAGE_RELEASE__.video.muted !== previous, mutedState.muted);
  const unmutedState = await controlsPage.evaluate(() => ({
    muted: window.__AFTERIMAGE_RELEASE__.video.muted,
    volume: window.__AFTERIMAGE_RELEASE__.video.volume,
  }));
  check('essential-mute-toggle', mutedState.muted !== initialAudio.muted && unmutedState.muted === initialAudio.muted, { initialAudio, mutedState, unmutedState });

  const volumeControl = controlsPage.locator('media-volume-slider');
  const volumeBox = await volumeControl.boundingBox();
  check('volume-control-has-geometry', Boolean(volumeBox && volumeBox.width >= 40), volumeBox);
  await volumeControl.click({ position: { x: Math.max(2, Math.round(volumeBox.width * 0.2)), y: Math.round(volumeBox.height / 2) } });
  await controlsPage.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.volume < 0.4, null, { timeout: 2000 });
  const lowVolume = await controlsPage.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.volume);
  await volumeControl.click({ position: { x: Math.round(volumeBox.width * 0.82), y: Math.round(volumeBox.height / 2) } });
  await controlsPage.waitForFunction(previous => window.__AFTERIMAGE_RELEASE__.video.volume > previous + 0.25, lowVolume, { timeout: 2000 });
  const highVolume = await controlsPage.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.volume);
  await volumeControl.focus();
  await controlsPage.keyboard.press('ArrowLeft');
  await controlsPage.waitForFunction(previous => window.__AFTERIMAGE_RELEASE__.video.volume < previous, highVolume, { timeout: 2000 });
  const keyboardVolume = await controlsPage.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.volume);
  check(
    'essential-volume-range',
    lowVolume < 0.4 && highVolume > lowVolume + 0.25 && keyboardVolume < highVolume,
    { lowVolume, highVolume, keyboardVolume },
  );

  const fullscreenSupport = await controlsPage.evaluate(() => ({
    enabled: Boolean(document.fullscreenEnabled),
    named: Boolean(window.__AFTERIMAGE_RELEASE__.player.querySelector('media-fullscreen-button')?.getAttribute('aria-label')),
  }));
  check('fullscreen-control-present', fullscreenSupport.named, fullscreenSupport);
  report.notes.fullscreen = 'The native fullscreen transition is verified separately in headed Chromium under Xvfb. Headless browser shells are used here only for control presence/name and the rest of the matrix.';
  await controlsPage.close();

  const keyboardPage = await context.newPage();
  await keyboardPage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  await keyboardPage.waitForFunction(() => Boolean(window.__AFTERIMAGE_RELEASE__), null, { timeout: 30000 });
  await keyboardPage.waitForFunction(() => {
    const v = window.__AFTERIMAGE_RELEASE__?.video;
    return v && Number.isFinite(v.duration) && v.readyState >= 1;
  }, null, { timeout: 30000 });
  await keyboardPage.evaluate(() => document.activeElement?.blur?.());
  const tabsToPlay = await tabUntil(keyboardPage, 'media-play-button');
  const playFocus = await keyboardPage.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const play = player.querySelector('media-play-button');
    const deck = player.querySelector('.afterimage-deck');
    const playStyle = getComputedStyle(play);
    const deckStyle = getComputedStyle(deck);
    return {
      focused: document.activeElement === play,
      color: playStyle.color,
      background: deckStyle.backgroundColor,
      outlineColor: playStyle.outlineColor,
      outlineWidth: playStyle.outlineWidth,
    };
  });
  const textRgb = rgb(playFocus.color);
  const bgRgb = rgb(playFocus.background);
  const outlineRgb = rgb(playFocus.outlineColor);
  const textContrast = textRgb && bgRgb ? contrast(textRgb, bgRgb) : 0;
  const focusContrast = outlineRgb && bgRgb ? contrast(outlineRgb, bgRgb) : 0;
  check(
    'keyboard-focus-visible-contrast',
    Boolean(tabsToPlay) &&
      playFocus.focused &&
      parseFloat(playFocus.outlineWidth) >= 3 &&
      textContrast >= 4.5 &&
      focusContrast >= 3,
    { tabsToPlay, ...playFocus, textContrast, focusContrast },
  );
  await keyboardPage.keyboard.press('Enter');
  await keyboardPage.waitForTimeout(700);
  const keyboardPlaying = await keyboardPage.evaluate(() => {
    const v = window.__AFTERIMAGE_RELEASE__.video;
    return { paused: v.paused, currentTime: v.currentTime };
  });
  check('keyboard-only-playback', !keyboardPlaying.paused && keyboardPlaying.currentTime > 0.25, keyboardPlaying);

  const tabsToExample = await tabUntil(keyboardPage, '[data-afterimage-example]');
  check('keyboard-tabs-to-example', Boolean(tabsToExample), { tabsToExample });
  await keyboardPage.keyboard.press('Enter');
  await keyboardPage.waitForFunction(() => {
    const release = window.__AFTERIMAGE_RELEASE__;
    if (!release) return false;
    const { player, video } = release;
    const button = player.querySelector('[data-afterimage-example]');
    const status = player.querySelector('.afterimage-status')?.textContent || '';
    return !player.querySelector('.afterimage-reference')?.hidden &&
      !button?.disabled &&
      video.currentTime > 12.6 &&
      video.currentTime < 13.8 &&
      status.startsWith('Example opened:');
  }, null, { timeout: 8000 });
  await keyboardPage.waitForTimeout(50);
  const keyboardComparison = await keyboardPage.evaluate(() => {
    const { player, video } = window.__AFTERIMAGE_RELEASE__;
    const seamControl = player.querySelector('.afterimage-seam-control');
    return {
      open: !player.querySelector('.afterimage-reference')?.hidden,
      seamFocused: document.activeElement === seamControl,
      paused: video.paused,
      pinned: player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      now: player.querySelector('[data-afterimage-now]')?.textContent?.trim(),
    };
  });
  check('keyboard-only-comparison', keyboardComparison.open && keyboardComparison.seamFocused && !keyboardComparison.paused && keyboardComparison.pinned === '00:05', keyboardComparison);
  await keyboardPage.keyboard.press('Escape');
  await keyboardPage.waitForTimeout(60);
  const keyboardEscape = await keyboardPage.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const compare = player.querySelector('[data-afterimage-compare]');
    return {
      closed: player.querySelector('.afterimage-reference')?.hidden === true,
      focusRestored: document.activeElement === compare,
    };
  });
  check('keyboard-only-escape', keyboardEscape.closed && keyboardEscape.focusRestored, keyboardEscape);
  await keyboardPage.keyboard.press('Enter');
  await keyboardPage.waitForTimeout(60);
  const keyboardReopen = await keyboardPage.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    return {
      open: player.querySelector('.afterimage-reference')?.hidden === false,
      seamFocused: document.activeElement === player.querySelector('.afterimage-seam-control'),
    };
  });
  check('keyboard-only-reopen', keyboardReopen.open && keyboardReopen.seamFocused, keyboardReopen);
  await keyboardPage.close();

  const stabilityPage = await context.newPage();
  await stabilityPage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  await stabilityPage.waitForFunction(() => Boolean(window.__AFTERIMAGE_RELEASE__), null, { timeout: 30000 });
  await stabilityPage.waitForFunction(() => window.__AFTERIMAGE_RELEASE__?.video?.readyState >= 1, null, { timeout: 30000 });
  await stabilityPage.evaluate(() => {
    const v = window.__AFTERIMAGE_RELEASE__.video;
    v.muted = true;
    window.__afterimageEvents = { pause: 0, seeking: 0, waiting: 0, stalled: 0, playing: 0 };
    for (const type of Object.keys(window.__afterimageEvents)) {
      v.addEventListener(type, () => { window.__afterimageEvents[type] += 1; });
    }
  });
  await stabilityPage.locator('media-play-button').click();
  await stabilityPage.waitForTimeout(900);
  const baselineEvents = await stabilityPage.evaluate(() => ({
    time: window.__AFTERIMAGE_RELEASE__.video.currentTime,
    events: { ...window.__afterimageEvents },
  }));
  await stabilityPage.locator('[data-afterimage-pin]').click();
  await stabilityPage.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-reference')?.hidden, null, { timeout: 3000 });
  const stabilitySeam = stabilityPage.locator('.afterimage-seam-control');
  for (const value of ['10', '90', '50']) {
    await stabilitySeam.evaluate((el, next) => {
      el.value = next;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
  await stabilityPage.waitForTimeout(900);
  const comparisonEvents = await stabilityPage.evaluate(() => ({
    time: window.__AFTERIMAGE_RELEASE__.video.currentTime,
    paused: window.__AFTERIMAGE_RELEASE__.video.paused,
    events: { ...window.__afterimageEvents },
  }));
  const eventDelta = Object.fromEntries(Object.keys(comparisonEvents.events).map(key => [key, comparisonEvents.events[key] - baselineEvents.events[key]]));
  check(
    'comparison-playback-event-stability',
    !comparisonEvents.paused &&
      comparisonEvents.time > baselineEvents.time + 0.5 &&
      eventDelta.pause === 0 &&
      eventDelta.seeking === 0,
    { baselineEvents, comparisonEvents, eventDelta },
  );
  await stabilityPage.close();

  const stressPage = await context.newPage();
  await stressPage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  await stressPage.waitForFunction(() => Boolean(window.__AFTERIMAGE_RELEASE__), null, { timeout: 30000 });
  await stressPage.waitForFunction(() => window.__AFTERIMAGE_RELEASE__?.video?.readyState >= 1, null, { timeout: 30000 });
  await stressPage.evaluate(async () => {
    const { video, player } = window.__AFTERIMAGE_RELEASE__;
    video.muted = true;
    video.pause();
    window.__afterimageErrors = [];
    addEventListener('error', event => window.__afterimageErrors.push(String(event.error || event.message || 'error')));
    addEventListener('unhandledrejection', event => window.__afterimageErrors.push(String(event.reason || 'unhandledrejection')));
    const originalFetch = window.fetch;
    window.__afterimageAppRequests = [];
    window.fetch = (...args) => {
      window.__afterimageAppRequests.push({ type: 'fetch', url: String(args[0]) });
      return originalFetch(...args);
    };
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      window.__afterimageAppRequests.push({ type: 'xhr', method, url: String(url) });
      return originalOpen.call(this, method, url, ...rest);
    };
    if (Math.abs(video.currentTime - 5) > 0.05) {
      await new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true });
        video.currentTime = 5;
      });
    }
    window.__afterimageInitialTransfer = performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    window.__afterimageCanvasRef = player.querySelector('.afterimage-reference canvas');
  });
  await stressPage.waitForTimeout(300);
  const stressPin = stressPage.locator('[data-afterimage-pin]');
  const captureStart = Date.now();
  await stressPin.click();
  await stressPage.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-reference')?.hidden, null, { timeout: 3000 });
  const captureLatencyMs = Date.now() - captureStart;
  for (let i = 1; i < 20; i += 1) {
    await stressPin.click();
    await stressPage.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.player.querySelector('[data-afterimage-pin]')?.disabled, null, { timeout: 2000 });
  }
  const stressSeam = stressPage.locator('.afterimage-seam-control');
  for (const value of ['0', '20', '40', '60', '80', '100', '50']) {
    await stressSeam.evaluate((el, next) => {
      el.value = next;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
  const stress = await stressPage.evaluate(() => {
    const { player } = window.__AFTERIMAGE_RELEASE__;
    const canvases = [...player.querySelectorAll('.afterimage-reference canvas')];
    const canvas = canvases[0];
    return {
      canvasCount: canvases.length,
      sameCanvas: canvas === window.__afterimageCanvasRef,
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      canvasPixels: (canvas?.width || 0) * (canvas?.height || 0),
      rawReferenceBytes: (canvas?.width || 0) * (canvas?.height || 0) * 4,
      appRequestsDuringCaptureAndSeam: window.__afterimageAppRequests.length,
      appRequests: window.__afterimageAppRequests,
      initialTransferBytes: window.__afterimageInitialTransfer,
      errors: [...window.__afterimageErrors],
    };
  });
  check(
    'repeated-pin-bounded-buffer',
    stress.canvasCount === 1 && stress.sameCanvas && stress.canvasPixels > 0 && stress.canvasPixels <= 930000 && stress.errors.length === 0,
    { captureLatencyMs, ...stress },
  );
  check(
    'seam-no-app-network',
    stress.appRequestsDuringCaptureAndSeam === 0,
    { captureLatencyMs, initialTransferBytes: stress.initialTransferBytes, rawReferenceBytes: stress.rawReferenceBytes, appRequests: stress.appRequests },
  );
  await stressPage.evaluate(() => window.__AFTERIMAGE_RELEASE__.player.remove());
  await stressPage.waitForTimeout(300);
  const teardown = await stressPage.evaluate(() => ({
    lensCount: document.querySelectorAll('afterimage-temporal-lens').length,
    errors: [...window.__afterimageErrors],
  }));
  check('teardown-clean', teardown.lensCount === 0 && teardown.errors.length === 0, teardown);
  await stressPage.close();

  if (browserName === 'chromium') {
    const forcedContext = await browser.newContext({ viewport: { width: 1080, height: 810 }, forcedColors: 'active' });
    const forcedPage = await forcedContext.newPage();
    await forcedPage.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
    await forcedPage.waitForFunction(() => Boolean(window.__AFTERIMAGE_RELEASE__), null, { timeout: 30000 });
    const forcedColors = await forcedPage.evaluate(() => {
      const p = window.__AFTERIMAGE_RELEASE__.player;
      const seamLine = p.querySelector('.afterimage-seam');
      const pin = p.querySelector('.afterimage-pin');
      return {
        matches: matchMedia('(forced-colors: active)').matches,
        seamForcedColorAdjust: getComputedStyle(seamLine).forcedColorAdjust,
        pinForcedColorAdjust: getComputedStyle(pin).forcedColorAdjust,
      };
    });
    check('forced-colors', forcedColors.matches && forcedColors.seamForcedColorAdjust === 'none' && forcedColors.pinForcedColorAdjust === 'none', forcedColors);
    await forcedContext.close();
  } else {
    report.notes.forcedColors = 'Playwright forced-colors assertion is run in Chromium; reduced-motion and core accessibility checks run in all engines.';
  }

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
