import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('host-neutral ribbon drives one media element from default and minimal treatments',async({page})=>{
  await page.goto('/ribbon.html');
  const video=page.locator('#ribbon-video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.woven-time-ribbon')).toHaveCount(2);
  await expect(page.locator('#default-ribbon .woven-ribbon-lane')).toHaveCount(3);
  const first=page.locator('#default-ribbon .woven-ribbon-slider');
  await expect(first).toHaveAttribute('aria-valuetext',/of/);
  await first.evaluate((input:HTMLInputElement)=>{input.value='32';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(31.5);
  await expect(page.locator('#default-ribbon .woven-ribbon-readout')).toContainText('Where shadows gather');
  await expect(page.locator('#minimal-ribbon .woven-ribbon-readout')).toContainText('Where shadows gather');
  await expect(page.locator('.host-default .woven-time-ribbon')).toBeVisible();
  await expect(page.locator('.host-minimal .woven-time-ribbon')).toBeVisible();
  await expect(page.locator('.woven-ribbon-readout[aria-live]')).toHaveCount(0);
});

test('ribbon resets cleanly at duration zero and includes the final cue only at the real end',async({page})=>{
  await page.goto('/ribbon.html');
  const video=page.locator('#ribbon-video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.duration)).toBeGreaterThan(60);
  await video.evaluate((v:HTMLVideoElement)=>{v.currentTime=v.duration;v.dispatchEvent(new Event('timeupdate'));});
  await expect(page.locator('#default-ribbon .woven-ribbon-readout')).toContainText('Coming home');

  await video.evaluate((v:HTMLVideoElement)=>{v.removeAttribute('src');v.load();v.dispatchEvent(new Event('durationchange'));});
  await expect(page.locator('#default-ribbon .woven-ribbon-readout')).toContainText('0% · Unmarked passage');
  await expect(page.locator('#default-ribbon .woven-ribbon-slider')).toHaveAttribute('aria-valuetext','Media duration unavailable');
  await expect(page.locator('#default-ribbon .woven-ribbon-cue[data-active]')).toHaveCount(0);
});

test('ribbon remains operable under real forced-colors and reduced-motion emulation',async({page})=>{
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await page.goto('/ribbon.html');
  await expect(page.locator('#default-ribbon .woven-ribbon-slider')).toBeVisible();
  await expect(page.locator('#default-ribbon .woven-ribbon-lane')).toHaveCount(3);
  await page.locator('#default-ribbon .woven-ribbon-slider').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#default-ribbon .woven-ribbon-slider')).toBeFocused();
});

test('portable Stress Lab exposes the browser adapter instrument without claiming forced colors',async({page})=>{
  await page.goto('/stress.html?case=original');
  await expect(page.getByRole('heading',{name:'Test your own player.'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Adapter contract/})).toBeVisible();
  await expect(page.locator('#portable-case option')).toContainText(['Malformed cues']);
  await expect(page.locator('#portable-case')).toContainText('240px container');
  await expect(page.locator('#portable-case')).toContainText('Forced colors');
});

test('layered-weft fixture renders supplied speaker and sponsor tracks without calling them film facts',async({page})=>{
  await page.goto('/stress.html?case=layers');
  await expect(page.locator('#case-badge')).toHaveText('CONTROLLED FIXTURE');
  await expect(page.locator('#case-description')).toContainText('fixture metadata');
  await expect.poll(()=>page.locator('.dhago-metadata-lane[data-kind="speaker"]').count()).toBeGreaterThan(0);
  await expect.poll(()=>page.locator('.dhago-metadata-lane[data-kind="sponsor"]').count()).toBeGreaterThan(0);
});


test('reusable ribbon and public integration route introduce no serious or critical axe findings',async({page})=>{
  for(const path of ['/ribbon.html','/install.html']){
    await page.goto(path);
    const report=await new AxeBuilder({page}).analyze();
    const severe=report.violations.filter(v=>v.impact==='serious'||v.impact==='critical');
    expect(severe,path+'\n'+JSON.stringify(severe,null,2)).toEqual([]);
  }
});
