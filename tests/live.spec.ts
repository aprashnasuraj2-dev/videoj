import { test, expect } from '@playwright/test';

/**
 * Actual Cloudflare R2 + Mux production smoke.
 * Only enabled when DHAGO_LIVE_URL is explicitly supplied by the main-branch
 * release-gate job. Ordinary pull-request CI remains deterministic/local.
 * We test real decoded frames, not just HTTP 200 or a playlist string.
 */
test.describe('Public judge experience', () => {
  test.skip(!process.env.DHAGO_LIVE_URL, 'Public-site audit runs only with DHAGO_LIVE_URL');

  test('public homepage requests Mux and advances real media', async ({ page }, info) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('stream.mux.com')) requests.push(request.url());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Every moment/i })).toBeVisible();
    await expect(page.locator('a[href="./journal.html"]')).toBeVisible();

    const mux = page.locator('mux-video');
    await expect(mux).toHaveAttribute('src', /https:\/\/stream\.mux\.com\/[^/]+\.m3u8/);
    await expect.poll(() => mux.evaluate((element: any) => Number(element.duration || 0)), { timeout: 50_000 }).toBeGreaterThan(0);
    await page.locator('media-play-button').click();
    await expect.poll(() => mux.evaluate((element: any) => Number(element.currentTime || 0)), { timeout: 50_000 }).toBeGreaterThan(2);
    await page.locator('media-play-button').click();
    await page.locator('[data-seek="32"]').click();
    await expect.poll(() => mux.evaluate((element: any) => Number(element.currentTime || 0))).toBeGreaterThanOrEqual(32);
    await expect(page.locator('.dhago-chapter-name')).toContainText('Where shadows gather');
    expect(requests.some(url => url.includes('stream.mux.com'))).toBe(true);
    await page.screenshot({ path: info.outputPath('public-playing.png'), fullPage: true });
    await info.attach('public-source-evidence', {
      body: JSON.stringify({ finalUrl: page.url(), muxRequests: requests.slice(0, 12), pageErrors: errors }, null, 2),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  });

  test('public Studio Journal is present and scene notes seek the shared Mux film', async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.goto('/journal.html', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Looking closely/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Where shadows gather/i })).toBeVisible();

    const mux = page.locator('mux-video');
    await expect(mux).toHaveAttribute('src', /https:\/\/stream\.mux\.com\/[^/]+\.m3u8/);
    await expect.poll(() => mux.evaluate((element: any) => Number(element.duration || 0)), { timeout: 50_000 }).toBeGreaterThan(0);
    await page.locator('[data-time="32"]').click();
    await expect.poll(() => mux.evaluate((element: any) => Number(element.currentTime || 0)), { timeout: 20_000 }).toBeGreaterThanOrEqual(32);
    await expect(page.locator('[data-time="32"]')).toHaveAttribute('aria-current', 'true');
    await page.screenshot({ path: info.outputPath('journal-scene-32.png'), fullPage: true });
  });
});
