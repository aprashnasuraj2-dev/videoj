import { test, expect } from '@playwright/test';

/**
 * Actual Cloudflare R2 production smoke for the released Studies in Thread film.
 * Only enabled when DHAGO_LIVE_URL is explicitly supplied by the main-branch
 * release-gate job. Ordinary pull-request CI remains deterministic/local.
 * We test real decoded frames, not just HTTP 200 or a playlist string.
 */
test.describe('Public judge experience', () => {
  test.skip(!process.env.DHAGO_LIVE_URL, 'Public-site audit runs only with DHAGO_LIVE_URL');

  test('public homepage serves and advances the released original Studies in Thread film', async ({ page }, info) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Every moment/i })).toBeVisible();
    await expect(page.getByText('STUDIES IN THREAD — THE ORIGINAL DHAGO FILM', { exact: true })).toBeVisible();

    const film = page.locator('#player-mount video');
    await expect(page.locator('mux-video')).toHaveCount(0);
    await expect(film).toHaveAttribute('src', /studies-in-thread\.mp4$/);
    await expect.poll(() => film.evaluate((element: HTMLVideoElement) => Number(element.duration || 0)), { timeout: 50_000 }).toBeGreaterThan(60);
    await page.locator('media-play-button').click();
    await expect.poll(() => film.evaluate((element: HTMLVideoElement) => Number(element.currentTime || 0)), { timeout: 50_000 }).toBeGreaterThan(2);
    await page.locator('media-play-button').click();
    await page.locator('[data-seek="32"]').click();
    await expect.poll(() => film.evaluate((element: HTMLVideoElement) => Number(element.currentTime || 0))).toBeGreaterThanOrEqual(32);
    await expect(page.locator('.dhago-chapter-name')).toContainText('Where shadows gather');
    await page.screenshot({ path: info.outputPath('public-playing.png'), fullPage: true });
    await info.attach('public-source-evidence', {
      body: JSON.stringify({ finalUrl: page.url(), source: await film.getAttribute('src'), pageErrors: errors }, null, 2),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  });

  test('public Studio Journal shares the Studies in Thread motion study and scene notes', async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.goto('/journal.html', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Looking closely/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Where shadows gather/i })).toBeVisible();

    const film = page.locator('#journal-player video');
    await expect(page.locator('mux-video')).toHaveCount(0);
    await expect(film).toHaveAttribute('src', /studies-in-thread\.mp4$/);
    await expect.poll(() => film.evaluate((element: HTMLVideoElement) => Number(element.duration || 0)), { timeout: 50_000 }).toBeGreaterThan(60);
    await page.locator('[data-time="32"]').click();
    await expect.poll(() => film.evaluate((element: HTMLVideoElement) => Number(element.currentTime || 0)), { timeout: 20_000 }).toBeGreaterThanOrEqual(32);
    await expect(page.locator('[data-time="32"]')).toHaveAttribute('aria-current', 'true');
    expect(await film.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true);
    await page.getByRole('button', {name: 'Play', exact: true}).click();
    await expect.poll(() => film.evaluate(element => (element as HTMLVideoElement).currentTime), {timeout: 20_000}).toBeGreaterThan(33);
    await page.screenshot({ path: info.outputPath('journal-scene-32.png'), fullPage: true });
  });

  test('signed-out narrow backup exposes working named controls and keyboard focus', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 830 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?local', { waitUntil: 'domcontentloaded' });
    const film = page.locator('video');
    await expect(film).toHaveAttribute('src', /studies-in-thread\.mp4$/);
    await expect.poll(() => film.evaluate(element => (element as HTMLVideoElement).duration)).toBeGreaterThan(60);

    const getButton = (name: string) => page.getByRole('button', { name, exact: true });
    const play = getButton('Play');
    const mute = getButton('Mute');
    const captions = getButton('Enable captions');
    const fullscreen = getButton('Enter fullscreen');
    const settings = getButton('Settings');
    for (const control of [play, mute, captions, fullscreen, settings]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await play.press('Enter');
    await expect.poll(() => film.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
    await getButton('Pause').press('Enter');

    const seek = page.getByRole('slider', { name: 'Seek' });
    await seek.press('Home');
    await seek.press('ArrowRight');
    await expect(seek).toHaveAttribute('aria-valuenow', '1');
    await expect(seek).toHaveAttribute('aria-valuetext', /1 second/);
    await mute.press('Enter');
    await expect(getButton('Unmute')).toBeVisible();
    await captions.press('Enter');
    await expect(getButton('Disable captions')).toBeVisible();
    await expect.poll(() => film.evaluate(element => Array.from((element as HTMLVideoElement).textTracks).some(t => t.kind === 'captions' && t.mode === 'showing'))).toBe(true);
    await settings.press('Enter');
    await expect(page.getByRole('menuitem', { name: /speed/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settings).toBeFocused();

    await fullscreen.click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.localName)).toBe('media-container');
    await getButton('Exit fullscreen').click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
    expect(errors).toEqual([]);
    await page.screenshot({path: info.outputPath('public-320px-backup.png')});
  });

  test('public Mux bonus route really plays the same original film rather than a local fallback', async ({ page }, info) => {
    test.setTimeout(90_000);
    const playbackId = 'Kc01fHxM9HqQpKzgf9qZRumwvL02wQZLZUwZHKtQ6F02mw';
    const playlist = `https://stream.mux.com/${playbackId}.m3u8`;
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('stream.mux.com')) requests.push(request.url());
    });
    await page.goto('/?mux', { waitUntil: 'domcontentloaded' });
    const film = page.locator('mux-video');
    await expect(film).toHaveCount(1);
    await expect(film).toHaveAttribute('src', playlist);
    await expect(page.locator('#player-mount video')).toHaveCount(0);
    await expect.poll(() => film.evaluate((video: any) => Number(video.duration)), { timeout: 45_000 }).toBeGreaterThan(63);
    await page.locator('media-play-button').click();
    await expect.poll(() => film.evaluate((video: any) => Number(video.currentTime)), { timeout: 45_000 }).toBeGreaterThan(2);
    await page.locator('media-play-button').click();
    await page.locator('[data-seek="32"]').click();
    await expect.poll(() => film.evaluate((video: any) => Number(video.currentTime)), { timeout: 20_000 }).toBeGreaterThanOrEqual(32);
    await expect(page.locator('.dhago-chapter-name')).toContainText('Where shadows gather');
    await page.locator('media-captions-button').click();
    await expect.poll(() => film.evaluate((video: any) =>
      Array.from(video.textTracks as TextTrackList).some((track: TextTrack) =>
        track.kind === 'captions' && track.mode === 'showing'
      )), { timeout: 10_000 }).toBe(true);
    expect(requests).toContain(playlist);
    expect(await film.evaluate((video: any) => video.error?.code ?? null)).toBeNull();
    await info.attach('live-original-mux-proof', {
      body: JSON.stringify({ playbackId, playlistRequested: true, capturedAt: new Date().toISOString() }, null, 2),
      contentType: 'application/json',
    });
    await page.locator('.dhago').screenshot({ path: info.outputPath('live-mux-original-chapter-03.png') });
  });
});
