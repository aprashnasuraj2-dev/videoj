import { test, expect } from '@playwright/test';

test('cue-derived joins preserve real seek semantics and native drag treatment', async ({ page }, info) => {
  await page.goto('/?local');
  const video=page.locator('video');
  await expect.poll(() => video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  const chapters=page.locator('.media-time-slider-chapter');
  await expect(chapters).toHaveCount(4);
  expect(await chapters.nth(1).evaluate(el=>getComputedStyle(el,'::before').content)).not.toBe('none');
  const slider=page.locator('media-time-slider');
  const thumb=page.locator('media-time-slider media-slider-thumb');
  await expect(thumb).toBeVisible();

  // Probe presentation against the native Video.js drag attribute; no
  // unrelated custom pointer listener, timer or synthetic buffer values.
  await slider.evaluate(el => el.setAttribute('data-dragging',''));
  await expect.poll(()=>page.locator('.media-time-slider-chapters')
    .evaluate(el=>getComputedStyle(el).transform)).not.toBe('none');
  await page.screenshot({path:info.outputPath('native-drag-appearance.png')});
  await slider.evaluate(el => el.removeAttribute('data-dragging'));
  await expect.poll(()=>page.locator('.media-time-slider-chapters')
    .evaluate(el=>getComputedStyle(el).transform)).toBe('none');

  await thumb.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
});

test('no cue data creates no invented chapter stitches', async ({ page }) => {
  await page.goto('/?local&nochapters');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>
    Array.from(v.textTracks).filter(t=>t.kind==='chapters').length)).toBe(0);
  await expect(page.locator('.dhago-chapter-readout')).toBeHidden();
  await expect(page.locator('media-time-slider media-slider-thumb')).toBeVisible();
});

test('buffering decoration is driven by real media events', async ({ page }) => {
  await page.goto('/?local');
  const video=page.locator('video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.2);
  await video.evaluate((v:HTMLVideoElement)=>v.dispatchEvent(new Event('waiting')));
  await expect(page.locator('.dhago')).toHaveAttribute('data-thread-buffering','');
  await video.evaluate((v:HTMLVideoElement)=>v.dispatchEvent(new Event('playing')));
  await expect(page.locator('.dhago')).not.toHaveAttribute('data-thread-buffering','');
  await page.locator('media-play-button').click();
  await expect(video).toHaveJSProperty('paused',true);
});

test('reduced motion suppresses native-drag tension without disabling seek', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?local');
  await page.locator('media-time-slider').evaluate(el=>el.setAttribute('data-dragging',''));
  expect(await page.locator('.media-time-slider-chapters').evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  await page.locator('media-time-slider').evaluate(el=>el.removeAttribute('data-dragging'));
  await page.locator('media-time-slider media-slider-thumb').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
});

test('forced colors retains chapter joins, labels and keyboard navigation', async ({ page }) => {
  await page.emulateMedia({forcedColors:'active'});
  await page.goto('/?local');
  const joins=page.locator('.media-time-slider-chapter');
  await expect(joins).toHaveCount(4);
  expect(await joins.nth(1).evaluate(el=>getComputedStyle(el,'::before').borderStyle)).toBe('solid');
  await expect(page.locator('.dhago-chapter-name')).toHaveText('A thread of light');
  await page.locator('media-time-slider media-slider-thumb').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
});
