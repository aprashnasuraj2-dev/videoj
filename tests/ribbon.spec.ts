import { expect, test } from '@playwright/test';

test('host-neutral ribbon drives one media element from default and minimal treatments',async({page})=>{
  await page.goto('/ribbon.html');
  const video=page.locator('#ribbon-video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.woven-time-ribbon')).toHaveCount(2);
  await expect(video).toHaveAttribute('src','./media/studies-in-thread.mp4');
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
  await expect(page.getByRole('link',{name:/Explore the player comparison studio/})).toBeVisible();
  await expect(page.locator('#portable-cases')).toContainText('25 playback conditions to explore');
  await expect(page.locator('#portable-case option[value="malformed-cues"]')).toHaveCount(1);
  await expect(page.locator('#portable-case option[value="narrow-240"]')).toHaveCount(1);
  await expect(page.locator('#portable-case option[value="forced-colors"]')).toHaveCount(1);
});

test('layered-weft fixture renders supplied speaker and sponsor tracks without calling them film facts',async({page})=>{
  await page.goto('/stress.html?case=layers');
  await expect(page.locator('#case-badge')).toHaveText('GUIDED STUDY');
  await expect(page.locator('#case-description')).toContainText('illustrative speaker and sponsor intervals');
  await expect.poll(()=>page.locator('.dhago-metadata-lane[data-kind="speaker"]').count()).toBeGreaterThan(0);
  await expect.poll(()=>page.locator('.dhago-metadata-lane[data-kind="sponsor"]').count()).toBeGreaterThan(0);
});


test('portable ribbon changes position without rewriting static cue geometry',async({page})=>{
  await page.goto('/ribbon.html');
  const media=page.locator('#ribbon-video');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('#default-ribbon .woven-ribbon-cue').first()).toHaveAttribute('style',/left:/);
  await page.evaluate(()=>{
    const root=document.querySelector('#default-ribbon')!;
    const cues=Array.from(root.querySelectorAll('.woven-ribbon-cue'));
    (window as unknown as {ribbonCueMutations:number}).ribbonCueMutations=0;
    const observer=new MutationObserver(records=>{
      (window as unknown as {ribbonCueMutations:number}).ribbonCueMutations+=records.length;
    });
    cues.forEach(cue=>observer.observe(cue,{attributes:true,attributeFilter:['style']}));
    (window as unknown as {stopRibbonObservation:()=>void}).stopRibbonObservation=()=>observer.disconnect();
  });
  for(const t of [8,42,17,54]){
    await media.evaluate((v:HTMLVideoElement,t)=>{v.currentTime=t;},t);
    await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(t-.6);
  }
  await expect.poll(()=>page.locator('#default-ribbon .woven-ribbon-readout').innerText()).toContain('Coming home');
  expect(await page.evaluate(()=>(window as unknown as {ribbonCueMutations:number}).ribbonCueMutations)).toBe(0);
  await page.evaluate(()=>(window as unknown as {stopRibbonObservation:()=>void}).stopRibbonObservation());
});

