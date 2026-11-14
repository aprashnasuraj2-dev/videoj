import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';

test('canonical original media is byte-frozen and its captions and four chapters match',async({page,request})=>{
 const response=await request.get('/media/studies-in-thread.mp4');
 expect(response.status()).toBe(200);
 const bytes=await response.body();
 expect(bytes.length).toBe(2563521);
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('9dcc4672e3014ca947e310c1809c0cf6d40ffff186478f3e6a1e47f89b3688b3');
 const cues=await (await request.get('/media/chapters.vtt')).text();
 for(const name of ['A thread of light','The shape of quiet','Where shadows gather','Coming home'])expect(cues).toContain(name);
 const captions=await (await request.get('/media/captions.vtt')).text();
 expect(captions).toContain('The quiet tone fades');
 await page.goto('/?local');
 await expect(page.locator('#player-mount video')).toHaveAttribute('src','./media/studies-in-thread.mp4');
 await expect(page.locator('.chapter')).toHaveCount(4);
 await page.locator('[data-seek="48"]').click();
 await expect(page.locator('.dhago-chapter-name')).toContainText('Coming home');
});

test('Engineering Tools perform real seek, bounded logging and reset',async({page})=>{
 await page.goto('/tools.html');
 const media=page.locator('#tools-player video');
 await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 await expect(media).toHaveAttribute('src','./media/studies-in-thread.mp4');
 await page.locator('#tools-seeks button[data-seek="75%"]').click();
 await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(48);
 await expect(page.locator('[data-metric="Progress"]')).toContainText('75');
 await page.locator('#tools-seeks button[data-seek="-10"]').click();
 await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeLessThan(40);
 await expect.poll(()=>page.locator('#tools-snapshot').textContent()).toContain('"playbackState"');
 await expect(page.locator('#tools-snapshot')).not.toContainText('from-fibre-to-fabric');
 await page.locator('#tools-toggle-log').click();
 await expect(page.locator('#tools-toggle-log')).toHaveAttribute('aria-pressed','true');
 await page.locator('#tools-toggle-log').click();
 await page.locator('#tools-clear-log').click();
 await expect(page.locator('#tools-event-count')).toHaveText('0 / 120');
 await page.locator('#tools-reset').click();
 await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeLessThan(.1);
 expect(await media.evaluate((v:HTMLVideoElement)=>({paused:v.paused,rate:v.playbackRate,volume:v.volume,muted:v.muted}))).toEqual({paused:true,rate:1,volume:1,muted:false});
});

test('Edge States Lab shows actual native and derived state without fabricating stalls',async({page})=>{
 await page.goto('/stress.html?case=original');
 const video=page.locator('#lab-player video');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 await expect(page.locator('#edge-truth-metrics')).toContainText('ReadyState');
 await expect(page.locator('#edge-truth-metrics')).toContainText('studies-in-thread.mp4');
 await page.locator('[data-edge="forward"]').click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(9.5);
 await page.locator('[data-edge="back"]').click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeLessThan(1);
 await page.locator('[data-edge="mute"]').click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.muted)).toBe(true);
 await page.locator('[data-edge="reset"]').click();
 await expect.poll(()=>page.locator('#lab-player video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeLessThan(1);
 await expect(page.locator('#edge-feedback')).toContainText('Observing selected specimen');
});

test('Tools and Lab stay reachable and usable at narrow viewport',async({page})=>{
 await page.setViewportSize({width:320,height:780});
 for(const path of ['/tools.html','/stress.html?case=original']){
  await page.goto(path);
  const diagnostic=await page.evaluate(()=>({
    viewport:innerWidth,width:document.documentElement.scrollWidth,
    offenders:Array.from(document.querySelectorAll('*')).filter(el=>el.getBoundingClientRect().right>innerWidth+1)
      .slice(0,8).map(el=>({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,70):'',right:Math.round(el.getBoundingClientRect().right)}))
   }));
   expect(diagnostic.width, path+' overflow '+JSON.stringify(diagnostic)).toBeLessThanOrEqual(diagnostic.viewport);
 }
 await expect(page.locator('#edge-truth-title')).toBeVisible();
});
