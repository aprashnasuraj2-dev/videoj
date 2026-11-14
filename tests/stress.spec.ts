import {test,expect} from '@playwright/test';

test('fibre-to-fabric lab is reachable without changing the main page',async({page})=>{
  await page.goto('/stress.html?case=original');
  await expect(page.getByRole('heading',{name:/loom, under pressure/i})).toBeVisible();
  await expect(page.locator('media-container')).toHaveCount(1);
  await expect(page.locator('#case-title')).toHaveText('Original weave');
  await expect(page.locator('#lab-credit')).toContainText('Original DHAGO');
});
test('no chapters stays playable and hides the current chapter readout',async({page})=>{
  await page.goto('/stress.html?case=nochapters');
  const media=page.locator('#lab-player video');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.dhago-chapter-readout')).toBeHidden();
  await page.locator('media-time-slider media-slider-thumb').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
});
test('invalid chapter metadata is sorted, clamped and reported without inventing gaps',async({page})=>{
  await page.goto('/stress.html?case=malformed');
  const media=page.locator('#lab-player video');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('#lab-diagnostics')).toContainText('Sorted out-of-order chapters');
  await expect(page.locator('#lab-diagnostics')).toContainText('Resolved overlapping chapter');
  await expect(page.locator('#lab-diagnostics')).toContainText('Preserved unlabeled gap');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>Array.from(v.textTracks).some(t=>t.kind==='chapters'&&t.cues&&t.cues.length>0))).toBe(true);
});
test('240px live resizing preserves core navigation controls',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('/stress.html?case=narrow');
  await expect.poll(()=>page.locator('#lab-player').evaluate(e=>Math.round(e.getBoundingClientRect().width))).toBe(240);
  await expect(page.locator('media-play-button')).toBeVisible();
  await expect(page.locator('media-captions-button')).toBeVisible();
  await expect(page.locator('.media-settings-button')).toBeVisible();
  await page.locator('#lab-width').selectOption('320px');
  await expect.poll(()=>page.locator('#lab-player').evaluate(e=>Math.round(e.getBoundingClientRect().width))).toBe(320);
  await expect(page.locator('media-fullscreen-button')).toBeVisible();
});
test('audio-only scenario mounts real audio media, not a fake video surface',async({page})=>{
  await page.goto('/stress.html?case=audio');
  await expect(page.locator('media-container[data-audio-only] audio')).toHaveCount(1);
  await expect(page.locator('media-container video')).toHaveCount(0);
  await expect(page.locator('#lab-credit')).toContainText('Work With Sounds');
  await expect(page.locator('#case-badge')).toContainText('REAL PLAYBACK');
});
test('404 scenario exposes explicit retry and backup',async({page})=>{
  await page.goto('/stress.html?case=error');
  await expect(page.locator('.dhago-retry')).toBeVisible({timeout:15000});
  const backup=page.locator('.dhago-fallback');
  await expect(backup).toBeVisible();
  await expect(backup).toHaveAttribute('href','./?local');
});
test('fixture switch does not accumulate unused media players',async({page})=>{
  await page.goto('/stress.html?case=original');
  await page.getByRole('button',{name:/Empty loom/}).click();
  await page.getByRole('button',{name:/Broken thread/}).click();
  await page.getByRole('button',{name:/Original weave/}).click();
  await expect(page.locator('#lab-player video,#lab-player audio')).toHaveCount(1);
  await expect(page.locator('#lab-player media-container')).toHaveCount(1);
});
