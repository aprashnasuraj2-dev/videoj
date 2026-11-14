import { expect, test } from '@playwright/test';

test('host-neutral ribbon drives one media element from default and minimal treatments',async({page})=>{
  await page.goto('/ribbon.html');
  const video=page.locator('#ribbon-video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.woven-time-ribbon')).toHaveCount(2);
  const first=page.locator('#default-ribbon .woven-ribbon-slider');
  await first.evaluate((input:HTMLInputElement)=>{input.value='32';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(31.5);
  await expect(page.locator('#default-ribbon .woven-ribbon-readout')).toContainText('Where shadows gather');
  await expect(page.locator('#minimal-ribbon .woven-ribbon-readout')).toContainText('Where shadows gather');
  await expect(page.locator('.host-default .woven-time-ribbon')).toBeVisible();
  await expect(page.locator('.host-minimal .woven-time-ribbon')).toBeVisible();
});

test('portable Stress Lab advertises its adapter cases without claiming forced colors',async({page})=>{
  await page.goto('/stress.html?case=original');
  await expect(page.getByRole('link',{name:/Run Stress Lab against your skin/})).toBeVisible();
  await expect(page.locator('#portable-cases')).toContainText('Malformed cues');
  await expect(page.locator('#portable-cases')).toContainText('240px container');
  await expect(page.locator('#portable-cases')).toContainText('Forced colors');
});
