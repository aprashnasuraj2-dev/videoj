import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium, webkit } from 'playwright';
import { createServer } from 'vite';

const detourRoot = fileURLToPath(new URL('../', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const workspace = mkdtempSync(join(tmpdir(), 'detour-packed-host-'));
const packDir = join(workspace, 'pack');
const hostDir = join(workspace, 'host');
const publicDir = join(hostDir, 'public');
let tarball;
let packedFiles;
let server;
let baseURL;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? detourRoot,
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
    '-f', 'lavfi', '-i', 'color=c=0x24363a:s=640x360:r=24:d=64',
    '-t', '64', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', video,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'ffmpeg could not create host fixture.');
  writeFileSync(join(publicDir, 'host-owned.vtt'), `WEBVTT

00:00:16.000 --> 00:00:24.000
[Host-owned caption at the explored moment.]

00:00:40.000 --> 00:00:46.000
[Host-owned caption near the kept place.]
`);
}

function makeHost() {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(hostDir, { recursive: true });
  const packed = JSON.parse(run(npm, ['pack', '--json', '--pack-destination', packDir]))[0];
  tarball = join(packDir, packed.filename);
  packedFiles = packed.files.map(file => file.path).sort();

  writeFileSync(join(hostDir, 'package.json'), JSON.stringify({
    name: 'detour-external-consumer',
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DETOUR packed host</title></head>
<body>
  <main>
    <div id="mount-a"></div>
    <div id="mount-b"></div>
    <div id="mount-live"></div>
    <div id="mount-audio"></div>
  </main>
  <script type="module" src="/main.js"></script>
</body>
</html>
`);
  writeFileSync(join(hostDir, 'main.js'), `import { createDetourPlayer } from 'detour-video-skin';
import 'detour-video-skin/styles';

function hostVideo(id, captions = true) {
  const video = document.createElement('video');
  video.id = id + '-media';
  video.preload = 'metadata';
  video.playsInline = true;
  video.src = '/host-owned.mp4';
  if (captions) {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.srclang = 'en';
    track.label = 'External host captions';
    track.src = '/host-owned.vtt';
    video.append(track);
  }
  return video;
}

const a = createDetourPlayer(hostVideo('a'), { sourceKind: 'vod' });
a.id = 'player-a';
const b = createDetourPlayer(hostVideo('b'), { sourceKind: 'vod' });
b.id = 'player-b';
const live = createDetourPlayer(document.createElement('video'), { sourceKind: 'live' });
live.id = 'player-live';
const audio = createDetourPlayer(document.createElement('audio'), { sourceKind: 'vod' });
audio.id = 'player-audio';

document.querySelector('#mount-a').append(a);
document.querySelector('#mount-b').append(b);
document.querySelector('#mount-live').append(live);
document.querySelector('#mount-audio').append(audio);
window.detourHostReady = true;
`);
}

async function seek(player, seconds) {
  const arrival = await player.evaluate((element, time) => element.store.seek(time), seconds);
  assert.ok(Math.abs(arrival - seconds) < 0.15, `Seek returned ${arrival}, expected ${seconds}`);
  const clocks = await player.evaluate(element => ({
    native: element.querySelector('video').currentTime,
    state: element.store.state.currentTime,
    seeking: element.store.state.seeking,
    duration: element.store.state.duration,
  }));
  assert.ok(Math.abs(clocks.native - seconds) < 0.15, `Native clock at ${clocks.native}`);
  assert.ok(Math.abs(clocks.state - clocks.native) < 0.15, `Store/native clocks diverged: ${JSON.stringify(clocks)}`);
  assert.equal(clocks.seeking, false);
  assert.ok(clocks.duration > 63 && clocks.duration <= 64.1);
  return clocks;
}

async function proveEngine(engineName, engine) {
  const browser = await engine.launch({ args: engineName === 'chromium' ? ['--no-sandbox'] : [] });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
    await page.goto(baseURL);
    await page.waitForFunction(() => window.detourHostReady === true);
    await page.waitForFunction(() => [...document.querySelectorAll('#player-a video, #player-b video')]
      .every(video => video.readyState >= 2 && video.seekable.length > 0));

    const a = page.locator('#player-a');
    const b = page.locator('#player-b');
    await a.locator('.detour-hold:enabled').waitFor();
    await b.locator('.detour-hold:enabled').waitFor();

    await seek(a, 42.35);
    await a.getByRole('button', { name: 'Keep my place' }).click();
    const origin = await a.locator('.detour-origin').evaluate(el => el.style.insetInlineStart);
    assert.equal(await b.locator('.detour-origin').isVisible(), false, 'Second player inherited first mark.');
    assert.ok(await b.getByRole('button', { name: 'Keep my place' }).isVisible());

    await seek(a, 18);
    await seek(a, 24);
    assert.equal(await a.locator('.detour-origin').evaluate(el => el.style.insetInlineStart), origin);
    await a.getByRole('button', { name: 'Return to 00:42' }).click();
    await a.getByRole('button', { name: 'Keep my place' }).waitFor();
    const returned = await a.evaluate(element => ({
      native: element.querySelector('video').currentTime,
      state: element.store.state.currentTime,
      seeking: element.store.state.seeking,
    }));
    assert.ok(Math.abs(returned.native - 42.35) <= 0.5, `${engineName} returned to ${returned.native}`);
    assert.ok(Math.abs(returned.state - returned.native) <= 0.15, `${engineName} store/native clocks disagree`);
    assert.equal(returned.seeking, false);

    await a.locator('media-captions-button').click();
    await page.waitForFunction(() => document.querySelector('#player-a video').textTracks[0]?.mode === 'showing');
    assert.equal(await page.locator('#player-live detour-place').isVisible(), false, 'Live media exposed DETOUR action.');
    assert.equal(await page.locator('#player-audio detour-place').isVisible(), false, 'Audio exposed DETOUR action.');

    const decoration = await a.locator('.detour-origin').evaluate(el => ({
      aria: el.getAttribute('aria-hidden'),
      tabIndex: el.tabIndex,
      pointerEvents: getComputedStyle(el).pointerEvents,
    }));
    assert.deepEqual(decoration, { aria: 'true', tabIndex: -1, pointerEvents: 'none' });

    if (engineName === 'chromium') {
      await a.locator('media-captions-button').click();
      await seek(a, 42.35);
      await a.getByRole('button', { name: 'Keep my place' }).click();
      await seek(a, 18);
      await a.evaluate(element => {
        element.__detourRealStore = element.store;
        const delayed = Object.create(element.store, {
          seek: { value: () => new Promise(() => {}) },
        });
        Object.defineProperty(element, 'store', { configurable: true, value: delayed });
      });
      await a.getByRole('button', { name: 'Return to 00:42' }).click();
      await a.getByRole('button', { name: 'Returning…' }).waitFor();
      await a.evaluate(element => {
        const place = element.querySelector('detour-place');
        const settings = element.querySelector('.detour-settings');
        place.remove();
        settings.before(place);
        Object.defineProperty(element, 'store', { configurable: true, value: element.__detourRealStore });
      });
      await a.locator('.detour-hold:enabled').waitFor();
      await seek(a, 42.35);
      await a.getByRole('button', { name: 'Keep my place' }).click();
      await seek(a, 18);
      const restored = await a.locator('.detour-return').evaluate(button => ({
        text: button.textContent.trim(),
        bdi: button.querySelector('.detour-return-time')?.textContent,
        labelHidden: button.querySelector('.detour-return-label')?.hidden,
        pendingHidden: button.querySelector('.detour-return-pending')?.hidden,
      }));
      assert.deepEqual(restored, {
        text: 'Return to 00:42Returning…',
        bdi: '00:42',
        labelHidden: false,
        pendingHidden: true,
      });
      await a.getByRole('button', { name: 'Stay here' }).click();

      await b.evaluate(element => {
        const parent = element.parentElement;
        element.remove();
        parent.append(element);
      });
      await b.locator('.detour-hold:enabled').waitFor();
      await seek(b, 12);
    }

    return Number(returned.native.toFixed(3));
  } finally {
    await browser.close();
  }
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

test('packed artifact contains the reusable boundary and excludes showcase/runtime fixtures', () => {
  for (const required of [
    'package.json', 'LICENSE', 'README.md',
    'skin/index.js', 'skin/index.d.ts', 'skin/player.js', 'skin/place.js', 'skin/player.css',
    'skin/mux.js', 'skin/mux.d.ts',
  ]) assert.ok(packedFiles.includes(required), `Packed archive missing ${required}`);

  for (const forbidden of ['demo/', 'integration/', 'tests/', 'public/', 'submission-report/', 'design/']) {
    assert.equal(packedFiles.some(path => path.startsWith(forbidden)), false, `Packed archive leaked ${forbidden}`);
  }

  const packageJson = JSON.parse(readFileSync(join(hostDir, 'node_modules/detour-video-skin/package.json'), 'utf8'));
  assert.equal(packageJson.license, 'Apache-2.0');
  assert.equal(packageJson.exports['./mux'].import, './skin/mux.js');
  assert.equal(packageJson.exports['./styles'], './skin/player.css');

  const mux = execFileSync(process.execPath, [
    '--input-type=module', '-e',
    "import {muxPlaybackUrl} from 'detour-video-skin/mux'; process.stdout.write(muxPlaybackUrl('public_Id-42'));",
  ], { cwd: hostDir, encoding: 'utf8' });
  assert.equal(mux, 'https://stream.mux.com/public_Id-42.m3u8');
});

test('packed skin runs in an external host in Chromium and desktop WebKit', { timeout: 120000 }, async t => {
  const results = {};
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    results[name] = await proveEngine(name, engine);
  }
  t.diagnostic(`Packed external-host arrivals: ${JSON.stringify(results)}; archive ${basename(tarball)}`);
});
