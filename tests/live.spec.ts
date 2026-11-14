import { test, expect } from '@playwright/test';

/**
 * Actual public production smoke.
 * The canonical fibre-to-fabric film may be served directly from Cloudflare R2
 * or through its own Mux playback ID once provisioned. The test validates the
 * media that is really mounted; it never substitutes the retired film's Mux ID.
 */
test.describe('Public judge experience', () => {
  test.skip(!process.env.DHAGO_LIVE_URL, 'Public-site audit runs only with DHAGO_LIVE_URL');

  test('public homepage advances the canonical fibre-to-fabric film', async ({ page }, info) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const muxRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('stream.mux.com')) muxRequests.push(request.url());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Every moment/i })).toBeVisible();
    await expect(page.locator('.film-name')).toContainText(/From fibre to fabric/i);
    await expect(page.getByRole('link', { name: 'Studio journal ↗', exact: true })).toBeVisible();

    const media = page.locator('#player-mount video, #player-mount mux-video').first();
    await media.waitFor();
    const source = await media.evaluate((element: HTMLMediaElement) => element.currentSrc || element.getAttribute('src') || '');
    expect(source).toMatch(/from-fibre-to-fabric|stream\.mux\.com/);
    await expect.poll(() => media.evaluate((element: HTMLMediaElement) => Number(element.duration || 0)), { timeout: 50_000 }).toBeGreaterThan(0);
    await page.locator('media-play-button').click();
    await expect.poll(() => media.evaluate((element: HTMLMediaElement) => Number(element.currentTime || 0)), { timeout: 50_000 }).toBeGreaterThan(2);
    await page.locator('media-play-button').click();
    await page.locator('[data-seek="32"]').click();
    await expect.poll(() => media.evaluate((element: HTMLMediaElement) => Number(element.currentTime || 0))).toBeGreaterThanOrEqual(32);
    await expect(page.locator('.dhago-chapter-name')).toContainText('Warp meets weft');
    await page.screenshot({ path: info.outputPath('public-playing.png'), fullPage: true });
    await info.attach('public-source-evidence', {
      body: JSON.stringify({ finalUrl: page.url(), source, muxRequests: muxRequests.slice(0, 12), pageErrors: errors }, null, 2),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  });

  test('public Studio Journal seeks the same fibre-to-fabric film', async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.goto('/journal.html', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /From fibre/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Warp meets weft/i })).toBeVisible();

    const media = page.locator('#journal-player video, #journal-player mux-video').first();
    await media.waitFor();
    const source = await media.evaluate((element: HTMLMediaElement) => element.currentSrc || element.getAttribute('src') || '');
    expect(source).toMatch(/from-fibre-to-fabric|stream\.mux\.com/);
    await expect.poll(() => media.evaluate((element: HTMLMediaElement) => Number(element.duration || 0)), { timeout: 50_000 }).toBeGreaterThan(0);
    await page.locator('[data-time="32"]').click();
    await expect.poll(() => media.evaluate((element: HTMLMediaElement) => Number(element.currentTime || 0)), { timeout: 20_000 }).toBeGreaterThanOrEqual(32);
    await expect(page.locator('[data-time="32"]')).toHaveAttribute('aria-current', 'true');
    expect(await media.evaluate(element => (element as HTMLMediaElement).paused)).toBe(true);
    await page.getByRole('button', {name: 'Play', exact: true}).click();
    await expect.poll(() => media.evaluate(element => (element as HTMLMediaElement).currentTime), {timeout: 20_000}).toBeGreaterThan(33);
    await page.screenshot({ path: info.outputPath('journal-scene-32.png'), fullPage: true });
  });

  test('signed-out narrow backup exposes working named controls and keyboard focus', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 830 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?local', { waitUntil: 'domcontentloaded' });
    const film = page.locator('video').first();
    await expect(film).toHaveAttribute('src', /from-fibre-to-fabric\.mp4$/);
    await expect.poll(() => film.evaluate(element => (element as HTMLVideoElement).duration)).toBe(64);

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
});
