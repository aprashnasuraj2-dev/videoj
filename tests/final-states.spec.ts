import {test,expect} from '@playwright/test';

test('poster state and exact final frame retain chapter context',async({page})=>{
  await page.goto('/?local');
  const video=page.locator('video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.chapter[aria-current="true"]')).toHaveCount(1);
  await expect(page.locator('.chapter[aria-current="true"]')).toContainText('Raw fibre');
  await video.evaluate((v:HTMLVideoElement)=>{v.currentTime=v.duration;});
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(63.9);
  await expect(page.locator('.dhago-chapter-name')).toHaveText('Cloth holds time');
  await expect(page.locator('.chapter[aria-current="true"]')).toContainText('Cloth holds time');
});

test('no-chapter variant leaves an honest linear seek bar',async({page})=>{
  await page.goto('/?local&nochapters');
  const video=page.locator('video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.chapter-list')).toBeHidden();
  await expect(page.locator('.dhago-chapter-readout')).toBeHidden();
  await page.locator('media-time-slider media-slider-thumb').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
});

test('journal notes track initial cue, scene selection and last frame',async({page})=>{
  await page.goto('/journal.html?local');
  const video=page.locator('video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.scene-note[aria-current="true"]')).toHaveCount(1);
  await page.locator('[data-time="32"]').click();
  await expect(page.locator('.scene-note[aria-current="true"]')).toContainText('Warp meets weft');
  await video.evaluate((v:HTMLVideoElement)=>{v.currentTime=v.duration;});
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(63.9);
  await expect(page.locator('.scene-note[aria-current="true"]')).toContainText('Cloth holds time');
});

test.describe('touch-emulated narrow player',()=>{
  test.use({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  test('play, chapter selection and captions affect real media',async({page})=>{
    await page.goto('/?local');
    const video=page.locator('video');
    await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
    for(const s of ['media-play-button','media-captions-button','.media-settings-button','media-fullscreen-button']){
      await expect(page.locator(s)).toBeVisible();
      const box=await page.locator(s).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('media-play-button').tap();
    await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.2);
    await page.locator('media-play-button').tap();
    await page.locator('[data-seek="32"]').tap();
    await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(32);
    await page.locator('media-captions-button').tap();
    await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>Array.from(v.textTracks).some(t=>t.kind==='captions'&&t.mode==='showing'))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
});
