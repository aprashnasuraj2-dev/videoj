import { test, expect } from '@playwright/test';

test('the isolated skin itself has a chapter chooser with real seek and focus return', async ({page}) => {
  await page.goto('/?local');
  const video=page.locator('video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  const details=page.locator('.dhago-chapter-readout');
  await expect(details).toBeVisible();
  const summary=details.locator('summary');
  await expect(summary).toContainText('CHAPTER 01 / 04');
  await summary.click();
  await expect(details).toHaveAttribute('open','');
  const choices=details.locator('.dhago-chapter-jump');
  await expect(choices).toHaveCount(4);
  await choices.nth(2).click();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(32);
  await expect(summary).toContainText('Warp meets weft');
  await expect(details).not.toHaveAttribute('open','');
  await expect(summary).toBeFocused();
  await summary.click();
  await page.keyboard.press('Escape');
  await expect(details).not.toHaveAttribute('open','');
  await expect(summary).toBeFocused();
});
test('the chapter chooser is absent when the player has no actual cues', async ({page})=>{
  await page.goto('/?local&nochapters');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.dhago-chapter-readout')).toBeHidden();
  await expect(page.locator('media-time-slider media-slider-thumb')).toBeVisible();
});
test('40 actual WebVTT cues form keyboard-operable, individually labeled jump choices', async ({page})=>{
  const marks=Array.from({length:40},(_,i)=>{
    const stamp=(s:number)=>'00:'+String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')+'.'+String(Math.round((s%1)*1000)).padStart(3,'0');
    return `${stamp(i*1.6)} --> ${stamp((i+1)*1.6)}\nWeave passage ${i+1}\n`;
  }).join('\n');
  await page.route('**/media/from-fibre-to-fabric-chapters.vtt',route=>route.fulfill({contentType:'text/vtt',body:'WEBVTT\n\n'+marks}));
  await page.goto('/?local');
  const chooser=page.locator('.dhago-chapter-readout');
  await expect(chooser).toBeVisible();
  await chooser.locator('summary').click();
  const choices=chooser.locator('button.dhago-chapter-jump');
  await expect(choices).toHaveCount(40);
  await choices.nth(34).click();
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(54.4);
  await expect(page.locator('.dhago-chapter-name')).toContainText('Weave passage 35');
  await chooser.locator('summary').click();
  await expect(choices.nth(34)).toHaveAttribute('aria-current','true');
});
test('Devanagari and RTL cue names preserve actual text without overflow in a small player',async({page})=>{
  await page.setViewportSize({width:320,height:780});
  await page.route('**/media/from-fibre-to-fabric-chapters.vtt',route=>route.fulfill({contentType:'text/vtt',body:
    'WEBVTT\n\n00:00.000 --> 00:32.000\nधागो र नेपाली परम्परागत कपडा उत्पादनको लामो विवरण\n\n00:32.000 --> 01:04.000\nنسيج من الذاكرة والتقاليد في جبال الهيمالايا\n'
  }));
  await page.goto('/?local');
  const summary=page.locator('.dhago-chapter-summary');
  await expect(summary).toContainText('धागो');
  await summary.click();
  await expect(page.locator('.dhago-chapter-jump')).toHaveCount(2);
  await page.locator('.dhago-chapter-jump').nth(1).click();
  await expect(page.locator('.dhago-chapter-name')).toContainText('نسيج');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('native media events distinguish seeking from buffering and stalled without fake progress',async({page})=>{
  await page.goto('/?local');
  const media=page.locator('video');
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.2);
  const shell=page.locator('.dhago');
  // Deterministic event injection to verify CSS state wiring, not a claim of network outage.
  await media.evaluate((v:HTMLVideoElement)=>v.dispatchEvent(new Event('waiting')));
  await expect(shell).toHaveAttribute('data-thread-buffering','');
  await expect(shell).not.toHaveAttribute('data-thread-stalled','');
  // Buffered playback can produce a real timeupdate before the next browser
  // round trip. Read the injected transition synchronously, then test recovery.
  const stalled = await media.evaluate((v: HTMLVideoElement) => {
    v.dispatchEvent(new Event('stalled'));
    return v.closest('.dhago')?.hasAttribute('data-thread-stalled');
  });
  expect(stalled).toBe(true);
  await media.evaluate((v:HTMLVideoElement)=>v.dispatchEvent(new Event('seeking')));
  await expect(shell).toHaveAttribute('data-thread-seeking','');
  await expect(shell).not.toHaveAttribute('data-thread-stalled','');
  await media.evaluate((v:HTMLVideoElement)=>v.dispatchEvent(new Event('seeked')));
  await expect(shell).not.toHaveAttribute('data-thread-seeking','');
});
test('native controls remain available without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  try {
    const page=await context.newPage();
    await page.goto('/');
    const native=page.locator('noscript video[controls]');
    await expect(native).toBeVisible();
    await expect(native).toHaveAttribute('src','./media/from-fibre-to-fabric.mp4');
  }finally{await context.close();}
});

test('H.264-incapable Chromium plays the original VP9 rendition instead of a broken MP4 backup', async ({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType=function(type:string):CanPlayTypeResult {
      if(type.includes('avc1.64001f'))return '';
      if(type.includes('vp9'))return 'probably';
      return original.call(this,type);
    };
  });
  await page.goto('/?local');
  const video=page.locator('#player-mount video');
  await expect(video).toHaveAttribute('src',/from-fibre-to-fabric\.webm$/);
  await expect(page.locator('.dhago')).toHaveAttribute('data-compatibility-source','webm');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:15000}).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:15000}).toBeGreaterThan(.3);
  await expect(page.locator('.dhago-chapter-name')).toContainText('Raw fibre');
});
test('codec-capable browsers mount the new H.264 film directly',async({page})=>{
  await page.goto('/');
  await expect(page.locator('mux-video')).toHaveCount(0);
  await expect(page.locator('#player-mount video')).toHaveAttribute('src',/from-fibre-to-fabric\.mp4$/);
  await expect(page.locator('.dhago')).not.toHaveAttribute('data-compatibility-source','webm');
});
