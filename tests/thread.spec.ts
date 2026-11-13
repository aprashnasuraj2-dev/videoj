import { test, expect } from '@playwright/test';

test('cue joins form knots without replacing accessible seek controls', async ({ page }, info) => {
  await page.goto('/?local');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThan(0);
  const chapters = page.locator('.media-time-slider-chapter');
  await expect(chapters).toHaveCount(4);
  const knot = await chapters.nth(1).evaluate(el => getComputedStyle(el, '::before').content);
  expect(knot).not.toBe('none');
  await expect(page.locator('media-time-slider media-slider-thumb')).toBeVisible();

  const slider = page.locator('media-time-slider');
  const box = await slider.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width * .4, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect.poll(() => page.locator('.media-time-slider-chapters')
    .evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
  await page.screenshot({path:info.outputPath('thread-held.png')});
  await page.mouse.up();
  await expect.poll(() => page.locator('.media-time-slider-chapters')
    .evaluate(el => getComputedStyle(el).transform)).toBe('none');

  const thumb = page.locator('media-time-slider media-slider-thumb');
  await thumb.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0);
});

test('no cue data creates no invented chapter stitches', async ({ page }) => {
  await page.goto('/?local&nochapters');
  await expect.poll(() => page.locator('video').evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThan(0);
  const cueCount = await page.locator('video').evaluate((el: HTMLVideoElement) =>
    Array.from(el.textTracks).filter(t => t.kind === 'chapters').length);
  expect(cueCount).toBe(0);
  await expect(page.locator('.dhago-chapter-readout')).toBeHidden();
  await expect(page.locator('media-time-slider media-slider-thumb')).toBeVisible();
});

test('waiting visualization tracks media events and clears without stale status', async ({ page }) => {
  await page.goto('/?local');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(.2);
  await video.evaluate((el: HTMLVideoElement) => el.dispatchEvent(new Event('waiting')));
  await expect(page.locator('.dhago')).toHaveAttribute('data-thread-buffering', '');
  await video.evaluate((el: HTMLVideoElement) => el.dispatchEvent(new Event('playing')));
  await expect(page.locator('.dhago')).not.toHaveAttribute('data-thread-buffering', '');
  await page.locator('media-play-button').click();
  await expect(video).toHaveJSProperty('paused', true);
});

test('reduced motion removes the thread-pull movement while keeping seek usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?local');
  const slider = page.locator('media-time-slider');
  const box = await slider.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width * .4, box!.y + box!.height / 2);
  await page.mouse.down();
  expect(await page.locator('.media-time-slider-chapters')
    .evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await page.mouse.up();
  await page.locator('media-time-slider media-slider-thumb').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0);
});
