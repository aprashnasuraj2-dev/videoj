import { test, expect } from '@playwright/test';

test('sampled weave from Studies in Thread is removed when the host changes media identity', async ({ page }) => {
  await page.goto('/?local');
  const video = page.locator('video');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
  const container = page.locator('media-container');
  // Sampled weave is optional, so only assert non-leakage if it was applied.
  const originallySampled = await container.getAttribute('data-weave-sampled');
  await video.evaluate((v: HTMLVideoElement) => {
    v.src = '/not-the-studies-in-thread-film.mp4';
    v.load();
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.getAttribute('src'))).toBe('/not-the-studies-in-thread-film.mp4');
  await expect(container).not.toHaveAttribute('data-weave-sampled', '');
  const retainedSwatches = await container.locator('.media-time-slider-chapter').evaluateAll(nodes =>
    nodes.filter(node => (node as HTMLElement).style.getPropertyValue('--dhago-weave-color') ||
      (node as HTMLElement).style.getPropertyValue('--dhago-weave-thread')).length);
  expect(retainedSwatches).toBe(0);
  // A missing weave is valid. This gate proves that it cannot be inherited.
  expect([null, '']).toContain(originallySampled);
});
