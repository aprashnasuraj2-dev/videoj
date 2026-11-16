import { test, expect } from '@playwright/test';

test('chapter map arrow navigation preserves woven rail and seeks only on activation', async ({ page }) => {
  await page.goto('/?local');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
  const chooser = page.locator('.dhago-chapter-readout');
  await expect(chooser).toBeVisible();
  const summary = chooser.locator('.dhago-chapter-summary');
  await summary.click();
  await expect(chooser).toHaveAttribute('open', '');
  const chapters = chooser.locator('.dhago-chapter-jump');
  await expect.poll(() => chapters.count()).toBeGreaterThan(2);
  await chapters.first().focus();
  const before = await video.evaluate((v: HTMLVideoElement) => v.currentTime);

  await page.keyboard.press('ArrowDown');
  await expect(chapters.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(chapters.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(chapters.first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(chapters.first()).toBeFocused();
  // Focusing chapter choices must never seek or create a parallel media clock.
  expect(Math.abs((await video.evaluate((v: HTMLVideoElement) => v.currentTime)) - before)).toBeLessThan(1);
  await page.keyboard.press('ArrowDown');
  const destination = Number(await chapters.nth(1).getAttribute('data-chapter-time'));
  await page.keyboard.press('Enter');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(destination - 0.2);
  await expect(chooser).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();

  await summary.click();
  await chapters.first().focus();
  await page.keyboard.press('Escape');
  await expect(chooser).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await expect(page.locator('media-time-slider')).toBeVisible();
});

test('chapter map keys do not replace the actual timeline keyboard behavior', async ({ page }) => {
  await page.goto('/?local');
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
  const thumb = page.locator('media-time-slider media-slider-thumb');
  await thumb.focus();
  await page.keyboard.press('End');
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(60);
});
