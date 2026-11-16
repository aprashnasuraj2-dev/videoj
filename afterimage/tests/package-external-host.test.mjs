import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const workspace = mkdtempSync(join(tmpdir(), 'afterimage-packed-host-'));
const packDir = join(workspace, 'pack');
const hostDir = join(workspace, 'host');
const publicDir = join(hostDir, 'public');
let packedFiles = [];
let server;
let baseURL;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed with ${result.status}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
  return result.stdout;
}

function makeFixture() {
  mkdirSync(publicDir, { recursive: true });
  const video = join(publicDir, 'host-owned.mp4');
  const result = spawnSync('ffmpeg', [
    '-nostdin', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=24',
    '-f', 'lavfi', '-i', 'sine=frequency=330:sample_rate=48000:duration=24',
    '-shortest', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '64k', video,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'ffmpeg could not create external host fixture.');

  writeFileSync(join(publicDir, 'host-owned.vtt'), `WEBVTT

00:00:04.000 --> 00:00:08.000
[External host caption before the pinned frame.]

00:00:10.000 --> 00:00:14.000
[External host caption after the pinned frame.]
`);
  writeFileSync(join(publicDir, 'host-poster.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#24363a"/><circle cx="320" cy="180" r="72" fill="#d8e2dc"/></svg>`);
}

function makeHost() {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(hostDir, { recursive: true });
  const packed = JSON.parse(run(npm, ['pack', '--json', '--pack-destination', packDir]))[0];
  const tarball = join(packDir, packed.filename);
  packedFiles = packed.files.map(file => file.path).sort();

  writeFileSync(join(hostDir, 'package.json'), JSON.stringify({
    name: 'afterimage-external-consumer',
    private: true,
    type: 'module',
  }, null, 2));
  run(npm, [
    'install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock',
    '--prefer-offline', tarball,
  ], { cwd: hostDir });

  makeFixture();

  writeFileSync(join(hostDir, 'index.html'), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AFTERIMAGE external host</title></head>
<body><main><div id="a"></div><div id="b"></div></main><script type="module" src="/main.js"></script></body>
</html>`);

  writeFileSync(join(hostDir, 'base.html'), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AFTERIMAGE base host</title></head>
<body><main><div id="base"></div></main><script type="module" src="/base-main.js"></script></body>
</html>`);

  writeFileSync(join(hostDir, 'base-main.js'), `import { createBasePlayer } from 'afterimage-video-skin/base';
import 'afterimage-video-skin/styles';

const video = document.createElement('video');
video.preload = 'auto';
video.playsInline = true;
video.poster = '/host-poster.svg';
video.src = '/host-owned.mp4';
const track = document.createElement('track');
track.kind = 'captions';
track.srclang = 'en';
track.label = 'External captions';
track.src = '/host-owned.vtt';
video.append(track);
const player = createBasePlayer(video);
player.id = 'base-player';
document.querySelector('#base').append(player);
window.__BASE_READY__ = { player, video };
`);

  writeFileSync(join(hostDir, 'main.js'), `import { createAfterimagePlayer } from 'afterimage-video-skin';
import 'afterimage-video-skin/styles';

function make(id) {
  const video = document.createElement('video');
  video.id = id + '-video';
  video.preload = 'auto';
  video.playsInline = true;
  video.poster = '/host-poster.svg';
  video.src = '/host-owned.mp4';
  const track = document.createElement('track');
  track.kind = 'captions';
  track.srclang = 'en';
  track.label = 'External captions';
  track.src = '/host-owned.vtt';
  video.append(track);
  const player = createAfterimagePlayer(video);
  player.id = id;
  return { player, video };
}
const a = make('afterimage-a');
const b = make('afterimage-b');
document.querySelector('#a').append(a.player);
document.querySelector('#b').append(b.player);
window.__HOST_READY__ = { a, b };
`);
}

async function seek(player, seconds) {
  const arrived = await player.evaluate((element, time) => element.store.seek(time), seconds);
  assert.ok(Math.abs(arrived - seconds) < 0.5, `Seek returned ${arrived}, expected ${seconds}`);
}

before(async () => {
  makeHost();
  server = await createServer({
    root: hostDir,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  baseURL = server.resolvedUrls.local[0];
});

after(async () => {
  await server?.close();
  rmSync(workspace, { recursive: true, force: true });
});

test('package-external-host: packed artifact contains only reusable product surface', () => {
  for (const required of [
    'package.json', 'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md',
    'skin/index.js', 'skin/index.d.ts', 'skin/base.js', 'skin/base.d.ts',
    'skin/shell.js', 'skin/player.js', 'skin/temporal-lens.js',
    'skin/authored-example.js', 'skin/format-time.js', 'skin/player.css',
  ]) assert.ok(packedFiles.includes(required), `Packed archive missing ${required}`);

  for (const forbidden of ['demo/', 'public/', 'tests/', 'docs/', 'artifacts/']) {
    assert.equal(packedFiles.some(path => path.startsWith(forbidden)), false, `Packed archive leaked ${forbidden}`);
  }

  const skinRoot = join(hostDir, 'node_modules', 'afterimage-video-skin', 'skin');
  const runtime = [
    'index.js', 'base.js', 'shell.js', 'player.js', 'temporal-lens.js',
    'authored-example.js', 'format-time.js', 'player.css',
  ].map(name => readFileSync(join(skinRoot, name), 'utf8')).join('\n');

  assert.doesNotMatch(runtime, /the-waterline|WATERLINE|apollo|aafnaipatro|detour\//i);
  assert.doesNotMatch(runtime, /stream\.mux\.com|image\.mux\.com|MUX_TOKEN_(?:ID|SECRET)|Authorization\s*:|Bearer\s+/i);
  assert.doesNotMatch(runtime, /kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U|playback[_-]?id/i,
    'Packed runtime leaked a public/provider playback identity.');
  assert.doesNotMatch(runtime, /afterimage\.aafnaipatro\.com|challenge|contra\.com/i);
});

test('package-external-host: base export stays conventional and does not load Temporal Lens', { timeout: 45000 }, async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
    await page.goto(new URL('base.html', baseURL).href);
    await page.waitForFunction(() => window.__BASE_READY__?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);

    const base = page.locator('#base-player');
    assert.equal(await base.locator('afterimage-temporal-lens').count(), 0);
    assert.equal(await page.evaluate(() => customElements.get('afterimage-temporal-lens')), undefined);

    for (const selector of [
      'media-play-button', 'media-time-slider', 'media-mute-button',
      'media-volume-slider', 'media-captions-button', 'media-fullscreen-button',
    ]) assert.equal(await base.locator(selector).isVisible(), true, `Base shell missing ${selector}`);

    await seek(base, 6);
    await base.locator('media-play-button').click();
    await page.waitForFunction(() => !window.__BASE_READY__.video.paused && window.__BASE_READY__.video.currentTime > 6.1);
    await base.locator('media-play-button').click();
    assert.equal(await base.locator('video').evaluate(v => v.paused), true);

    await base.locator('media-mute-button').click();
    assert.equal(await base.locator('video').evaluate(v => v.muted), true);
    await base.locator('media-mute-button').click();
    assert.equal(await base.locator('video').evaluate(v => v.muted), false);

    await base.locator('media-captions-button').click();
    await page.waitForFunction(() => window.__BASE_READY__.video.textTracks[0]?.mode === 'showing');

    const poster = await base.locator('video').getAttribute('poster');
    assert.match(poster, /host-poster\.svg$/);
    assert.match(await base.locator('track').getAttribute('src'), /host-owned\.vtt$/);
  } finally {
    await browser.close();
  }
});

test('package-external-host: enhanced export isolates two hosts and survives manual flow plus remount', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page.goto(baseURL);
    await page.waitForFunction(() => {
      const h = window.__HOST_READY__;
      return h?.a?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && h?.b?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    });

    const a = page.locator('#afterimage-a');
    const b = page.locator('#afterimage-b');
    await seek(a, 8);
    await a.locator('media-play-button').click();
    await page.waitForFunction(() => !window.__HOST_READY__.a.video.paused && window.__HOST_READY__.a.video.currentTime > 8.05);
    const beforePin = await a.locator('video').evaluate(v => ({ paused: v.paused, time: v.currentTime }));
    await a.locator('[data-afterimage-pin]').click();
    await page.waitForFunction(() => document.querySelector('#afterimage-a .afterimage-reference')?.hidden === false);
    const afterPin = await a.locator('video').evaluate(v => ({ paused: v.paused, time: v.currentTime }));
    assert.equal(afterPin.paused, false);
    assert.ok(afterPin.time >= beforePin.time, 'Manual pin moved media backward.');
    assert.equal(await b.locator('.afterimage-reference').isVisible(), false, 'Second instance inherited first reference.');

    await a.locator('[data-afterimage-close]').click();
    assert.equal(await a.locator('.afterimage-reference').isVisible(), false);
    assert.equal(await a.locator('[data-afterimage-compare]').isVisible(), true);

    await a.locator('[data-afterimage-compare]').click();
    assert.equal(await a.locator('.afterimage-reference').isVisible(), true);
    const seamA = a.locator('.afterimage-seam-control');
    assert.equal(await seamA.evaluate(el => el === document.activeElement), true);
    await seamA.evaluate(el => {
      el.value = '73';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(await seamA.inputValue(), '73');
    assert.match(await a.locator('.afterimage-reference').getAttribute('style') || '', /73|27/);

    await a.locator('[data-afterimage-clear]').click();
    assert.equal(await a.locator('.afterimage-reference').isVisible(), false);
    assert.equal(await a.locator('.afterimage-relation').isVisible(), false);

    await seek(b, 12);
    await b.locator('[data-afterimage-pin]').click();
    await page.waitForFunction(() => document.querySelector('#afterimage-b .afterimage-reference')?.hidden === false);
    assert.equal(await b.locator('.afterimage-reference').isVisible(), true);
    assert.equal(await a.locator('.afterimage-reference').isVisible(), false, 'Pinning packed instance B revived A state.');
    await b.locator('[data-afterimage-clear]').click();
    assert.equal(await b.locator('.afterimage-reference').isVisible(), false);

    await b.locator('media-captions-button').click();
    await page.waitForFunction(() => window.__HOST_READY__.b.video.textTracks[0]?.mode === 'showing');
    await b.locator('media-mute-button').click();
    assert.equal(await b.locator('video').evaluate(v => v.muted), true);
    await seek(b, 14);
    assert.ok(Math.abs(await b.locator('video').evaluate(v => v.currentTime) - 14) < 0.5);

    await page.evaluate(() => {
      const { player } = window.__HOST_READY__.a;
      const parent = player.parentElement;
      player.remove();
      parent.append(player);
    });
    await page.waitForTimeout(50);
    assert.equal(await a.locator('afterimage-temporal-lens').count(), 1);
    assert.equal(await a.locator('.afterimage-reference').isVisible(), false);
    assert.equal(await a.locator('[data-afterimage-pin]').isEnabled(), true);
  } finally {
    await browser.close();
  }
});
