import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('keyboard follows visual order and leaves text entry alone',async({page})=>{
 await page.goto('/?local');
 const media=page.locator('video');
 await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 const route=['media-time-slider media-slider-thumb','media-play-button','media-mute-button','media-volume-slider media-slider-thumb','media-captions-button','.media-settings-button','media-fullscreen-button'];
 await page.locator(route[0]).focus();
 for(let i=0;i<route.length;i++){
  await expect(page.locator(route[i])).toBeFocused();
  if(i<route.length-1)await page.keyboard.press('Tab');
 }
 await page.locator('.media-settings-button').press('Enter');
 await expect(page.locator('media-menu-content').first()).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.media-settings-button')).toBeFocused();
 await page.evaluate(()=>{const field=document.createElement('input');field.setAttribute('aria-label','Private test notes');document.querySelector('main')!.append(field);});
 await page.getByLabel('Private test notes').fill('watch');
 await page.getByLabel('Private test notes').press('Space');
 await expect(media).toHaveJSProperty('paused',true);
 await expect(page.getByLabel('Private test notes')).toHaveValue('watch ');
});

test('explicit retry recovers after the network becomes available',async({page})=>{
 await page.route('**/from-fibre-to-fabric.mp4',r=>r.abort());
 await page.goto('/?local');await expect(page.locator('media-dialog-popup')).toBeVisible();
 await page.unroute('**/from-fibre-to-fabric.mp4');
 await page.getByRole('button',{name:'Try loading again'}).click();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 await page.locator('media-play-button').click();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.2);
 await expect(page.locator('media-dialog-popup')).not.toBeVisible();
});

test('forced colors and enlarged text preserve useful narrow controls',async({page},info)=>{
 await page.setViewportSize({width:375,height:1000});
 await page.emulateMedia({forcedColors:'active',contrast:'more'});
 await page.goto('/?local');
 await page.addStyleTag({content:'html {font-size:200%} .dhago-chapter-name {font-size:24px}'});
 await page.locator('media-time-slider media-slider-thumb').focus();
 await page.keyboard.press('ArrowRight');
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const s of ['media-play-button','media-captions-button','.media-settings-button','media-fullscreen-button']){
  await expect(page.locator(s)).toBeVisible();
  const b=await page.locator(s).boundingBox();expect(b!.width).toBeGreaterThanOrEqual(44);expect(b!.height).toBeGreaterThanOrEqual(44);
 }
 await page.screenshot({path:info.outputPath('forced-colors-large-text.png'),fullPage:true});
});

test('long chapter and caption cues remain usable at 320px',async({page},info)=>{
 await page.setViewportSize({width:320,height:1000});
 const title='A very long chapter title: watching light travel across an unusually intricate woven landscape';
 await page.route('**/media/from-fibre-to-fabric-chapters.vtt',r=>r.fulfill({contentType:'text/vtt',body:`WEBVTT\n\n00:00.000 --> 01:04.000\n${title}\n`}));
 await page.route('**/media/from-fibre-to-fabric-captions.vtt',r=>r.fulfill({contentType:'text/vtt',body:'WEBVTT\n\n00:00.000 --> 01:04.000\nLong visual description: a warm field of overlapping threads drifts gently, with room for more than one line of text.\n'}));
 await page.goto('/?local');
 await expect(page.locator('.dhago-chapter-name')).toHaveText(title);
 await page.locator('media-captions-button').click();
 await page.locator('media-play-button').click();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('long-content.png'),fullPage:true});
});

test('journal uses the portable skin with a different accent and working scene notes',async({page},info)=>{
 await page.goto('/journal.html?local');
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 await page.locator('[data-time="48"]').click();
 await expect(page.locator('.dhago-chapter-name')).toHaveText('Coming home');
 await expect(page.locator('video')).toHaveJSProperty('paused',true);
 await expect(page.locator('media-time-slider media-slider-thumb')).toBeFocused();
 const result=await new AxeBuilder({page}).include('main').analyze();
 expect(result.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 await page.screenshot({path:info.outputPath('journal-desktop.png'),fullPage:true});
 await page.setViewportSize({width:375,height:1000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('journal-phone.png'),fullPage:true});
});

test('throttled startup is measured rather than inferred from bundle size',async({page,context},info)=>{
 const cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.setViewportSize({width:375,height:900});
 const start=Date.now();await page.goto('/?local');
 await page.locator('media-play-button').click();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:30000}).toBeGreaterThan(.2);
 const elapsedMs=Date.now()-start;
 const entries=await page.evaluate(()=>performance.getEntriesByType('resource').map((e:any)=>({name:e.name,bytes:e.transferSize,ms:e.duration})));
 await info.attach('throttled-startup',{body:JSON.stringify({profile:'Chromium emulated 4x CPU, 1.6Mbps down, 150ms latency; local dev server, not physical phone',elapsedMs,entries},null,2),contentType:'application/json'});
});

test('rapid play and pause settle on the actual final state',async({page})=>{
 await page.goto('/?local');const v=page.locator('video');
 await expect.poll(()=>v.evaluate((el:HTMLVideoElement)=>el.readyState)).toBeGreaterThan(0);
 for(let i=0;i<6;i++)await page.locator('media-play-button').click();
 await expect(v).toHaveJSProperty('paused',true);
 await expect(page.locator('media-play-button')).toHaveAttribute('aria-label','Play');
});
