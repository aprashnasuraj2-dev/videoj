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

test('touch scrubbing holds beyond the slider and clears on cancellation', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });
  try {
    const page = await context.newPage();
    await page.goto('/?local');
    const slider = page.locator('media-time-slider');
    const thumb = slider.locator('media-slider-thumb');
    await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(0);
    await slider.scrollIntoViewIfNeeded();
    const box = (await slider.boundingBox())!;
    const y = Math.round(box.y + box.height / 2);
    const x = Math.round(box.x + 16);
    const cdp = await context.newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 45, y }] });
    await expect(slider).toHaveAttribute('data-dragging', '');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 95, y: y + box.height }] });
    await expect(slider).toHaveAttribute('data-dragging', '');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(slider).not.toHaveAttribute('data-dragging', '');

    const video = page.locator('video');
    const before = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
    await thumb.focus();
    await page.keyboard.press('Home');
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(0);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    expect(before).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});

test('uneven stitch positions follow cue starts and dense mobile ribbons hide stitches', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const captionsUrl = '**/media/chapters.vtt';
  await page.route(captionsUrl, route => route.fulfill({
    contentType: 'text/vtt',
    body: 'WEBVTT\n\n00:00.000 --> 00:11.000\nOne\n\n00:11.000 --> 00:40.000\nTwo\n\n00:40.000 --> 01:04.000\nThree\n',
  }));
  await page.goto('/?local');
  const chapters = page.locator('.media-time-slider-chapter');
  await expect(chapters).toHaveCount(3);
  const coordinates = await chapters.evaluateAll(cues => cues.map(cue => {
    const marker = getComputedStyle(cue, '::before');
    return { content: marker.content, start: Number.parseFloat(getComputedStyle(cue).getPropertyValue('--media-slider-chapter-start')), markerX: Number.parseFloat(marker.insetInlineStart), width: cue.getBoundingClientRect().width };
  }));
  expect(coordinates[0].content).toBe('none');
  for (const cue of coordinates.slice(1)) expect(cue.markerX).toBeCloseTo(cue.width * cue.start / 100 + 5, 0);

  await page.unroute(captionsUrl);
  const stamp = (s: number) => '00:' + String(s).padStart(2, '0') + '.000';
  const dense = Array.from({ length: 14 }, (_, i) => `${stamp(i * 4)} --> ${stamp((i + 1) * 4)}\nChapter ${i + 1}\n`).join('\n');
  await page.route(captionsUrl, route => route.fulfill({ contentType: 'text/vtt', body: `WEBVTT\n\n${dense}` }));
  await page.reload();
  await expect.poll(() => chapters.count()).toBeGreaterThanOrEqual(14);
  expect(await chapters.nth(1).evaluate(el => getComputedStyle(el, '::before').display)).toBe('none');
  await page.locator('media-time-slider media-slider-thumb').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
});
