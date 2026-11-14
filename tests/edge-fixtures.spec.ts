import { expect, test } from '@playwright/test';

test('missing poster does not block real playback', async ({ page }) => {
  let posterRequested = false;
  await page.route('**/media/nonexistent-cover.webp', route => {
    posterRequested = true;
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('/stress.html?case=poster');
  await expect.poll(() => posterRequested).toBe(true);
  const media = page.locator('#lab-player video');
  await expect(media).toHaveJSProperty('duration', 64);
  await page.locator('#lab-player media-play-button').click();
  await expect.poll(() => media.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(.25);
  await expect(page.locator('#state-error')).toBeHidden();
});

test('captions absence and repeated track toggles remain truthful', async ({ page }) => {
  // Exercise the source under known codecs without depending on the external specimen host.
  await page.route(url => url.hostname === 'upload.wikimedia.org', async route => {
    const response = await route.fetch({ url: new URL('/media/studies-in-thread.mp4', page.url()).href });
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
  });
  await page.goto('/stress.html?case=nocaptions');
  const media = page.locator('#lab-player video');
  await expect(media).toHaveJSProperty('duration', 64);
  expect(await media.evaluate((video: HTMLVideoElement) => [...video.textTracks].filter(track => track.kind === 'captions').length)).toBe(0);
  await expect(page.getByRole('button', { name: 'Disable captions' })).toHaveCount(0);
  await page.locator('#lab-player media-play-button').click();
  await expect.poll(() => media.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(.25);

  await page.getByRole('button', { name: /Original weave/ }).click();
  const captionModes = () => media.evaluate((video: HTMLVideoElement) =>
    [...video.textTracks].filter(track => track.kind === 'captions').map(track => track.mode));
  await expect.poll(captionModes).toHaveLength(1);
  for (let pass = 0; pass < 3; pass++) {
    await page.getByRole('button', { name: 'Enable captions' }).click();
    await expect.poll(captionModes).toEqual(['showing']);
    await page.getByRole('button', { name: 'Disable captions' }).click();
    await expect.poll(async () => (await captionModes()).filter(mode => mode !== 'showing')).toHaveLength(1);
  }
});

test('audio-only lab controls drive real decoding, seeking and mute', async ({ page }) => {
  const sampleRate = 8_000;
  const seconds = 3;
  const dataLength = sampleRate * seconds * 2;
  const wav = Buffer.alloc(44 + dataLength);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(dataLength, 40);
  await page.route(url => url.hostname === 'commons.wikimedia.org', route => {
    const headers = { 'access-control-allow-origin': '*', 'accept-ranges': 'bytes' };
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? '');
    if (!range) return route.fulfill({ body: wav, contentType: 'audio/wav', headers });
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    if (start >= wav.length || end < start) {
      return route.fulfill({ status: 416, headers: { ...headers, 'content-range': `bytes */${wav.length}` } });
    }
    const body = wav.subarray(start, end + 1);
    return route.fulfill({
      status: 206, body, contentType: 'audio/wav',
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${wav.length}`, 'content-length': String(body.length) },
    });
  });
  await page.goto('/stress.html?case=audio');
  const audio = page.locator('#lab-player audio');
  await expect(audio).toHaveJSProperty('duration', seconds);
  await page.locator('#lab-player media-play-button').click();
  await expect.poll(() => audio.evaluate((media: HTMLAudioElement) => media.currentTime)).toBeGreaterThan(.25);
  await page.locator('#lab-player media-play-button').click();
  await expect(audio).toHaveJSProperty('paused', true);
  await expect.poll(() => audio.evaluate((media: HTMLAudioElement) => media.seekable.length)).toBeGreaterThan(0);
  const seek = page.getByRole('slider', { name: 'Seek' });
  await expect(seek).toBeEnabled();
  await seek.press('Home');
  await expect(audio).toHaveJSProperty('currentTime', 0);
  await seek.press('ArrowRight');
  await expect.poll(() => audio.evaluate((media: HTMLAudioElement) => media.currentTime)).toBeGreaterThan(0);
  await page.locator('#lab-player media-mute-button').click();
  await expect(audio).toHaveJSProperty('muted', true);
  await expect(page.locator('#state-source')).toHaveText('Audio file');
});

test('240px specimen exposes a bounded, keyboard-operable control shelf', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/stress.html?case=narrow');
  const shell = page.locator('#lab-player .dhago');
  const dimensions = await shell.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
  expect(dimensions.width).toBe(240);
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  const seek = page.getByRole('slider', { name: 'Seek' });
  await expect(seek).toBeEnabled();
  await seek.press('ArrowRight');
  await expect.poll(() => page.locator('#lab-player video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0);
  const settings = page.getByRole('button', { name: 'Settings' });
  await settings.press('Enter');
  await expect(page.getByRole('menuitem', { name: /speed/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
});
