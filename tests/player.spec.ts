import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('actual media responds to play, pause, seek, mute, captions and settings', async ({ page }, info) => {
  await page.goto('/?local');
  const media = page.locator('video');
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.2);
  await page.locator('media-play-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  const slider = page.locator('media-time-slider media-slider-thumb');
  await slider.focus(); await page.keyboard.press('End');
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(60);
  await page.locator('media-mute-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  await page.locator('media-captions-button').click();
  await expect.poll(() => media.evaluate((v: HTMLVideoElement) => Array.from(v.textTracks).some(t => t.kind === 'captions' && t.mode === 'showing'))).toBe(true);
  await page.locator('.media-settings-button').click();
  await expect(page.locator('media-menu-content').first()).toBeVisible();
  await page.locator('media-container').screenshot({path:info.outputPath('settings-open.png')});
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
    if(width<=375) {
      for(const selector of ['media-captions-button .dhago-control-label','.media-settings-button-label','media-fullscreen-button .dhago-control-label']) await expect(page.locator(selector)).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath(`player-${width}.png`), fullPage: true });
  });
}
test('player has no serious automated accessibility findings', async ({ page }) => {
  await page.goto('/?local');
  const result = await new AxeBuilder({ page }).include('#player-mount').analyze();
  expect(result.violations.filter(v => ['serious','critical'].includes(v.impact ?? ''))).toEqual([]);
});

test('fullscreen uses the actual document fullscreen element', async ({page}) => {
  await page.goto('/?local');
  await page.locator('media-fullscreen-button').click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('MEDIA-CONTAINER');
  await page.locator('media-fullscreen-button').click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});
test('volume, chapter seek, speed and ended replay change real state', async ({page}) => {
  await page.goto('/?local');
  const media=page.locator('video');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await page.locator('media-volume-slider media-slider-thumb').focus(); await page.keyboard.press('Home');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.volume)).toBe(0);
  await page.locator('[data-seek="32"]').click();
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(32);
  await page.locator('.media-settings-button').click();
  await page.getByRole('menuitem', {name:/Speed/}).click();
  await page.getByRole('menuitemradio', {name:/1\.5/}).click();
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.playbackRate)).toBe(1.5);
  await page.keyboard.press('Escape');
  await media.evaluate((v:HTMLVideoElement)=>{v.currentTime=v.duration-.1;});
  await page.locator('media-play-button').click();
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.ended)).toBe(true);
  await page.locator('media-play-button').click();
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>!v.paused && v.currentTime<5)).toBe(true);
});
test('unavailable media has an accessible recovery dialog', async ({page}) => {
  await page.route('**/studies-in-thread.mp4',r=>r.abort());
  await page.goto('/?local');
  await expect(page.locator('media-dialog-popup')).toBeVisible();
  const result=await new AxeBuilder({page}).include('#player-mount').analyze();
  expect(result.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
});
test('open settings passes accessibility scan', async ({page})=>{
  await page.goto('/?local'); await page.locator('.media-settings-button').click();
  const result=await new AxeBuilder({page}).include('#player-mount').analyze();
  expect(result.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
});
for(const surface of ['warm','dark','minimal']) {
  test(`${surface} composition, focus, targets and reduced motion`,async({page},info)=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/?local&surface='+surface);
    await page.locator('media-play-button').focus();
    expect(await page.locator('media-play-button').evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
    expect(await page.locator('media-play-button').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
    for(const selector of ['media-play-button','media-mute-button','media-captions-button','.media-settings-button','media-fullscreen-button']) {
      const box=await page.locator(selector).boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({path:info.outputPath(surface+'.png'),fullPage:true});
    const result=await new AxeBuilder({page}).include('#player-mount').analyze();
    expect(result.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
  });
}
test('no chapters retains a usable linear seek bar',async({page})=>{
  await page.goto('/?local&nochapters');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await page.locator('media-time-slider media-slider-thumb').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
});

test('woven chapter tracks occupy the timeline and follow the current chapter',async({page})=>{
 await page.goto('/?local');
 await expect(page.locator('.dhago-chapter-readout')).toBeVisible();
 await expect(page.locator('.dhago-chapter-name')).toHaveText('A thread of light');
 const slider=await page.locator('media-time-slider').boundingBox();
 const track=await page.locator('.media-time-slider-track').first().boundingBox();
 expect(track!.width).toBeGreaterThan(slider!.width*.9);
 await page.locator('[data-seek="32"]').click();
 await expect(page.locator('.dhago-chapter-name')).toHaveText('Where shadows gather');
});
for (const time of [5,40]) {
 test(`isolated player over ${time===5?'bright':'dark'} footage`,async({page},info)=>{
  await page.setViewportSize({width:1600,height:1000}); await page.goto('/?local');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(1);
  await page.locator('video').evaluate((v:HTMLVideoElement,t)=>{v.currentTime=t;},time);
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.seeking)).toBe(false);
  await page.locator('media-container').screenshot({path:info.outputPath(`player-${time}.png`)});
 });
}
