import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('actual media responds to play, pause, seek, mute, captions and settings', async ({ page }) => {
  await page.goto('/?local');
  const media = page.locator('video');
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.2);
  await page.locator('media-play-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  const slider = page.locator('media-time-slider');
  await slider.focus(); await page.keyboard.press('End');
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(60);
  await page.locator('media-mute-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  await page.locator('media-captions-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => Array.from(v.textTracks).some(t => t.kind === 'captions' && t.mode === 'showing'))).toBe(true);
  await page.locator('.media-settings-button').click();
  await expect(page.locator('media-menu-content').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.media-settings-button')).toBeFocused();
});
for (const width of [320, 375, 768, 1280]) {
  test(`layout at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 }); await page.goto('/?local');
    await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('media-fullscreen-button')).toBeVisible();
    await expect(page.locator('media-captions-button')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`player-${width}.png`), fullPage: true });
  });
}
test('player has no serious automated accessibility findings', async ({ page }) => {
  await page.goto('/?local');
  const result = await new AxeBuilder({ page }).include('#player-mount').analyze();
  expect(result.violations.filter(v => ['serious','critical'].includes(v.impact ?? ''))).toEqual([]);
});
