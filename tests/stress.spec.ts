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

test('Stress Lab reports real playback state and keeps its clock out of live announcements',async({page},info)=>{
  await page.goto('/stress.html?case=original');
  const media=page.locator('#lab-player video');
  await expect(page.locator('#state-duration')).toHaveText('0:01:04');
  await expect(page.locator('#state-chapter')).toHaveText('Raw fibre');
  await expect(page.locator('#state-source')).toHaveText('Video file');
  expect(await page.locator('#state-time').evaluate(clock=>clock.closest('[aria-live],[role=status]')!==null)).toBe(false);
  await page.locator('#lab-player media-play-button').click();
  await expect(page.locator('#state-status')).toHaveText('Playing');
  await expect.poll(()=>media.evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeGreaterThan(.25);
  await page.locator('#lab-player media-play-button').click();
  await expect(media).toHaveJSProperty('paused',true);
  await expect(page.locator('#state-status')).toHaveText('Paused');
  await page.screenshot({path:info.outputPath('stress-lab.png'),fullPage:true});
});

test('Stress Lab recovers from an unavailable source and drops detached specimen events',async({page})=>{
  let fail=true;
  await page.route('**/media/from-fibre-to-fabric.mp4',route=>fail
    ? route.fulfill({status:503,body:'Synthetic service interruption'})
    : route.continue());
  await page.goto('/stress.html?case=original');
  const original=page.locator('#lab-player video');
  await expect(page.locator('#state-status')).toHaveText('Error');
  await expect(page.locator('#state-error')).toBeVisible();
  await expect(page.locator('#state-duration')).toHaveText('—');
  fail=false;
  await page.getByRole('button',{name:'Try loading again'}).click();
  await expect(page.locator('#state-error')).toBeHidden();
  await expect(page.locator('#state-duration')).toHaveText('0:01:04');
  const detached=await original.elementHandle();
  await page.getByRole('button',{name:/Empty loom/}).click();
  await expect(page.locator('#state-duration')).toHaveText('0:01:04');
  await detached!.evaluate(video=>video.dispatchEvent(new Event('error')));
  await expect(page.locator('#state-status')).not.toHaveText('Error');
  await expect(page.locator('#state-chapter')).toHaveText('—');
  await expect(page.locator('#lab-player video')).toHaveCount(1);
  await detached?.dispose();
});

test('late chapter fixture attaches genuine cues while paused',async({page})=>{
  // Route the external fixture to a same-origin complete 64s progressive source so
  // the late-cue contract remains reproducible when Wikimedia is unavailable.
  await page.route(url=>url.hostname==='upload.wikimedia.org',async route=>{
    const response=await route.fetch({url:new URL('/media/from-fibre-to-fabric.mp4',page.url()).href});
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}});
  });
  await page.goto('/stress.html?case=late');
  await expect(page.locator('#lab-diagnostics')).toContainText('scheduled four seconds');
  await expect(page.locator('#state-chapter')).toHaveText('—');
  await expect(page.locator('#state-chapter')).toHaveText('Fibre study 01',{timeout:10000});
  await expect(page.locator('#lab-player video')).toHaveJSProperty('paused',true);
  await expect(page.locator('#lab-player .dhago-chapter-jump')).toHaveCount(40);
});
