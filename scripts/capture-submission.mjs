import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const {
  DHAGO_LIVE_URL,
  DHAGO_RELEASE_SHA,
  DHAGO_EXPECTED_ENTRY_ASSET,
  DHAGO_EXPECTED_MUX_ID,
  PLAYWRIGHT_CHROMIUM_EXECUTABLE,
} = process.env;
const output = resolve(process.argv[2] ?? 'submission/assets');
const complete = process.env.DHAGO_LOOM_COMPLETE_SELECTOR ?? '.dhago[data-weave-complete]';
if (!DHAGO_LIVE_URL || !/^[a-f0-9]{40}$/.test(DHAGO_RELEASE_SHA ?? '')
  || !/^assets\/[\w-]+\.js$/.test(DHAGO_EXPECTED_ENTRY_ASSET ?? '')
  || !/^[a-zA-Z0-9]+$/.test(DHAGO_EXPECTED_MUX_ID ?? '')) {
  throw new Error('Supply DHAGO_LIVE_URL, DHAGO_RELEASE_SHA, DHAGO_EXPECTED_ENTRY_ASSET and DHAGO_EXPECTED_MUX_ID.');
}
const origin = new URL(DHAGO_LIVE_URL);
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('DHAGO_LIVE_URL must be the unmodified public HTTPS homepage.');
}
const width = 1280;
const height = 960;
const muxSource = `https://stream.mux.com/${DHAGO_EXPECTED_MUX_ID}.m3u8`;
const filmStates = {};
const clipLabels = [];
const shots = [];
const saves = [];
const work = await mkdtemp(join(tmpdir(), 'dhago-proof-'));
await mkdir(output, { recursive: true });

function ffmpeg(args) {
  const process = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (process.status !== 0) throw new Error('FFmpeg failed while assembling recorded Chromium frames.');
}

async function createScreencast(context, page) {
  const client = await context.newCDPSession(page);
  let latest;
  let frames;
  let start;
  client.on('Page.screencastFrame', ({ data, sessionId }) => {
    void client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    latest = Buffer.from(data, 'base64');
    if (frames) frames.push({ at: performance.now() - start, jpeg: latest });
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width, maxHeight: height });
  for (let wait = 0; !latest && wait < 50; wait++) await sleep(100);
  if (!latest) throw new Error('Chromium did not start recording browser frames.');
  return {
    async clip(label, seconds, act) {
      const firstFrame = latest;
      start = performance.now();
      frames = [{ at: 0, jpeg: firstFrame }];
      await act();
      await sleep(Math.max(0, seconds * 1000 - (performance.now() - start)));
      const current = frames.filter(({ at }) => at < seconds * 1000);
      frames = undefined;
      const directory = join(work, String(shots.length));
      await mkdir(directory);
      const concat = [];
      for (const [index, frame] of current.entries()) {
        const file = `frame-${index}.jpg`;
        const nextFrame = current[index + 1]?.at ?? seconds * 1000;
        await writeFile(join(directory, file), frame.jpeg);
        concat.push(`file '${file}'`, `duration ${Math.max(0.001, (nextFrame - frame.at) / 1000).toFixed(5)}`);
      }
      concat.push(`file 'frame-${current.length - 1}.jpg'`);
      const list = join(directory, 'frames.ffconcat');
      const out = join(directory, 'shot.mp4');
      await writeFile(list, concat.join('\n') + '\n');
      const videoFilter = label === 'Finished cloth'
        ? "scale=1280:960,fps=25,drawtext=text=DHAGO:fontsize=34:fontcolor=0x24251f:x=48:y=30:box=1:boxcolor=0xf4eee2@0.95:boxborderw=13:enable='gte(t,1.8)'"
        : 'scale=1280:960,fps=25';
      ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-t', String(seconds), '-vf', videoFilter,
        '-an', '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', out]);
      shots.push(out);
      clipLabels.push({ label, seconds, recordedFrames: current.length });
    },
    stop: () => client.send('Page.stopScreencast'),
  };
}

async function playerSnapshot(media) {
  return media.evaluate(element => ({
    src: element.getAttribute('src'),
    time: element.currentTime,
    duration: element.duration,
    paused: element.paused,
    ended: element.ended,
    decodedWidth: element.videoWidth,
    readyState: element.readyState,
    captions: [...element.textTracks].some(track => track.kind === 'captions' && track.mode === 'showing'),
  }));
}

async function photo(target, filename, options = {}) {
  await target.screenshot({ path: join(output, filename), ...options });
  saves.push(filename);
}

async function waitForDecoded(page, minimumTime) {
  await page.waitForFunction(minimum => {
    const media = document.querySelector('mux-video');
    return media?.readyState >= 2 && media.videoWidth > 0 && media.currentTime >= minimum;
  }, minimumTime, { timeout: 35_000 });
}

async function mountFrame(player) {
  return player.evaluate(element => {
    const y = element.getBoundingClientRect().top + window.scrollY - 42;
    window.scrollTo(0, Math.max(0, y));
  });
}

async function captureRelease(browser) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const issues = [];
  page.on('pageerror', error => issues.push(error.message));
  const manifestResponse = page.waitForResponse(response => response.url() === muxSource
    && (response.ok() || response.status() === 302 || response.status() === 307), { timeout: 35_000 });
  void manifestResponse.catch(() => {});
  const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  if (!response?.ok() || new URL(page.url()).origin !== origin.origin) {
    throw new Error('Public homepage failed or redirected to a different origin.');
  }
  const entrypoints = await page.locator('script[type=module][src]').evaluateAll(scripts =>
    scripts.map(script => new URL(script.src).pathname.slice(1)));
  if (!entrypoints.includes(DHAGO_EXPECTED_ENTRY_ASSET)) {
    throw new Error(`Release entry asset mismatch. Observed: ${entrypoints.join(', ')}.`);
  }

  const player = page.locator('#player-mount .dhago');
  const media = player.locator('mux-video');
  const play = player.locator('media-play-button');
  await media.waitFor();
  if (await media.getAttribute('src') !== muxSource) throw new Error('Playback ID differs from the release input.');
  const stylesheet = await page.locator('link[rel=stylesheet]').count();
  if (!stylesheet) throw new Error('No linked release stylesheet was observed.');

  await photo(page, 'hero-desktop.png', { fullPage: true });
  await photo(player, 'hero-player.png');
  await mountFrame(player);
  const capture = await createScreencast(context, page);
  await play.click();
  await waitForDecoded(page, .15);
  await capture.clip('Playing and weaving', 4.0, async () => {
    filmStates.playStart = await playerSnapshot(media);
  });
  filmStates.playEnd = await playerSnapshot(media);
  if (filmStates.playEnd.time - filmStates.playStart.time < 2.3) throw new Error('Recorded media time did not advance enough.');
  await photo(player, 'playing-weave.png');
  await play.click();
  filmStates.paused = await playerSnapshot(media);
  if (!filmStates.paused.paused) throw new Error('Pause did not reach the media.');
  await photo(player, 'paused.png');

  const slider = player.locator('media-time-slider');
  const track = await slider.boundingBox();
  if (!track || track.width < 300) throw new Error('The visible timeline cannot be recorded at desktop width.');
  const y = track.y + track.height / 2;
  const preview = slider.locator('.media-time-slider-preview');
  const previewImage = slider.locator('.media-slider-thumbnail-image');
  const startPosition = track.x + track.width * .16;
  const endPosition = track.x + track.width * .56;
  await page.mouse.move(startPosition, y);
  await page.waitForFunction(() => document.querySelector('.media-slider-thumbnail-image')?.naturalWidth > 0,
    undefined, { timeout: 20_000 });
  await photo(player, 'chapters-preview.png');
  await capture.clip('Seek shuttle and frame preview', 3.2, async () => {
    await page.mouse.down();
    for (let step = 1; step <= 26; step++) {
      await page.mouse.move(startPosition + (endPosition - startPosition) * step / 26, y);
      await sleep(52);
    }
    if (Number(await preview.evaluate(element => getComputedStyle(element).opacity)) < .9
      || !await previewImage.evaluate(image => image.complete && image.naturalWidth > 0)) {
      throw new Error('No visible decoded frame preview during the real pointer drag.');
    }
    await photo(player, 'living-loom-seeking.png');
    await sleep(380);
    await page.mouse.up();
  });
  await page.waitForFunction(() => {
    const mux = document.querySelector('mux-video');
    return mux?.currentTime > 32 && mux.currentTime < 41 && !mux.seeking;
  }, undefined, { timeout: 15_000 });
  filmStates.seeked = await playerSnapshot(media);
  await photo(player, 'chapter-transition.png');

  const captions = player.locator('media-captions-button');
  const ink = page.getByRole('button', { name: 'Ink', exact: true });
  await capture.clip('Keyboard captions and Ink surface', 3.6, async () => {
    await captions.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => [...document.querySelector('mux-video').textTracks]
      .some(track => track.kind === 'captions' && track.mode === 'showing'));
    await sleep(750);
    await ink.click();
    if (await player.getAttribute('data-surface') !== 'dark') throw new Error('Ink appearance did not apply.');
    await mountFrame(player);
    await captions.focus();
    await photo(player, 'dark-surface.png');
  });
  filmStates.captions = await playerSnapshot(media);

  await media.evaluate(element => { element.currentTime = element.duration - 1.15; });
  await page.waitForFunction(() => {
    const mux = document.querySelector('mux-video');
    return !mux.seeking && mux.readyState >= 2 && mux.currentTime > 61;
  }, undefined, { timeout: 15_000 });
  await play.focus();
  await capture.clip('Finished cloth', 3.4, async () => {
    await page.keyboard.press('Enter');
    await page.waitForFunction(selector => document.querySelector('mux-video')?.ended
      && document.querySelector(selector), complete, { timeout: 12_000 });
    filmStates.ended = await playerSnapshot(media);
    await photo(player, 'finished-cloth.png');
  });
  await capture.stop();
  await play.click();
  await page.waitForFunction(selector => {
    const mux = document.querySelector('mux-video');
    return !mux.ended && !mux.paused && mux.currentTime > .1 && mux.currentTime < 3
      && !document.querySelector(selector);
  }, complete, { timeout: 20_000 });
  filmStates.replay = await playerSnapshot(media);
  await photo(player, 'replay.png');
  await play.click();

  await captions.focus();
  await photo(player, 'captions-on.png');
  const settings = player.getByRole('button', { name: 'Settings', exact: true });
  await settings.press('Enter');
  await player.getByRole('menuitem', { name: /speed/i }).waitFor();
  await photo(player, 'settings-open.png');
  await page.keyboard.press('Escape');
  // Menu focus restoration completes after the menu's close transition. The live
  // browser test already asserts this behavior with Playwright's auto-waiting;
  // the recorder must not sample document.activeElement in the same task as Escape.
  await page.waitForFunction(() => document.activeElement?.classList.contains('media-settings-button'), undefined, { timeout: 3_000 });
  await player.getByRole('button', { name: 'Enter fullscreen' }).click();
  await page.waitForFunction(() => document.fullscreenElement?.localName === 'media-container');
  await photo(page, 'fullscreen.png');
  await player.getByRole('button', { name: 'Exit fullscreen' }).click();

  await page.getByRole('button', { name: 'Paper', exact: true }).click();
  await photo(player, 'paper-surface.png');
  await page.getByRole('button', { name: 'Linen', exact: true }).click();
  await photo(player, 'linen-surface.png');

  const manifestUrl = (await manifestResponse).url();
  if (issues.length) throw new Error(`Uncaught errors on public homepage: ${issues.join(' | ')}`);
  await page.goto(new URL('journal.html', origin).href);
  const journal = page.locator('#journal-player .dhago');
  const journalMedia = journal.locator('mux-video');
  await journalMedia.waitFor();
  if (await journalMedia.getAttribute('src') !== muxSource) throw new Error('Studio Journal uses a different film.');
  await page.waitForFunction(() => Number.isFinite(document.querySelector('mux-video')?.duration));
  await page.locator('[data-time="32"]').click();
  await page.waitForFunction(() => {
    const mux = document.querySelector('mux-video');
    return mux?.paused && mux.currentTime >= 32;
  });
  // The Journal updates its selected-note semantics from the media seek event.
  // Wait for that observable state instead of sampling the attribute in the
  // same task as the completed media-time check.
  await page.waitForFunction(() => document.querySelector('[data-time="32"]')?.getAttribute('aria-current') === 'true', undefined, { timeout: 3_000 });
  await photo(page, 'studio-journal.png', { fullPage: true });

  await page.goto(new URL('stress.html', origin).href);
  await page.locator('#lab-case-list [data-case=original]').waitFor();
  await photo(page, 'stress-lab.png', { fullPage: true });
  await page.locator('#lab-case-list [data-case=error]').click();
  await page.locator('#lab-player .dhago-retry').waitFor({ timeout: 20_000 });
  await photo(page, 'stress-lab-controlled-404.png', { fullPage: true });

  for (const [size, label] of [[768, 'tablet'], [375, 'hero-mobile']]) {
    await page.setViewportSize({ width: size, height: 900 });
    await page.goto(origin.href);
    await player.getByRole('button', { name: 'Play', exact: true }).waitFor();
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) {
      throw new Error(`The homepage overflows at ${size}px.`);
    }
    await photo(page, `${label}.png`, { fullPage: true });
  }
  await context.close();
  const list = join(work, 'shots.ffconcat');
  await writeFile(list, shots.map(shot => `file '${shot}'`).join('\n') + '\n');
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', join(output, 'proof-demo.mp4')]);
  await writeFile(join(output, 'capture-evidence.json'), JSON.stringify({
    releaseSha: DHAGO_RELEASE_SHA,
    entrypoints,
    origin: origin.href,
    browser: `Chromium ${browser.version()}`,
    manifestUrl,
    clips: clipLabels,
    media: filmStates,
    capturedAt: new Date().toISOString(),
    screenshots: saves,
    method: 'Genuine browser frames, edited into four chapters. No simulated media state. Sound is omitted in the screen recording.',
  }, null, 2) + '\n');
}

let browser;
try {
  browser = await chromium.launch({ executablePath: PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
  await captureRelease(browser);
} finally {
  await browser?.close();
  await rm(work, { recursive: true, force: true });
}
