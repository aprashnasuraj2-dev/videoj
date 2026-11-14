import {expect,test} from '@playwright/test';

test('Original film has a richly layered but lightweight, uniquely identified poster',async({page,request})=>{
 const response=await request.get('/media/dhago-studies-poster.svg');
 expect(response.ok()).toBe(true);
 const svg=await response.text();
 expect(svg.length).toBeGreaterThan(10000);
 expect(svg.length).toBeLessThan(120000);
 expect(svg).toMatch(/<svg[^>]+viewBox="0 0 1600 900"/);
 expect(svg).toContain('DHAGO / MOTION STUDY 01');
 expect(svg).toContain('LIGHT   /   QUIET   /   SHADOW   /   RETURN');
 await page.goto('/?local');
 const video=page.locator('#player-mount video');
 await expect(video).toHaveAttribute('poster','./media/dhago-studies-poster.svg');
 await expect(video).toHaveAttribute('src','./media/studies-in-thread.mp4');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 await expect(page.locator('#player-mount media-play-button')).toHaveCount(1);
});

test('the editorial poster and four original chapters survive across all real uses',async({page})=>{
 const targets=[
   {url:'/?local',media:'#player-mount video'},
   {url:'/journal.html?local',media:'#journal-player video'},
   {url:'/stress.html?case=original',media:'#lab-player video'},
   {url:'/ribbon.html',media:'#ribbon-video'},
 ];
 for(const entry of targets){
  await page.goto(entry.url);
  await expect(page.locator(entry.media)).toHaveAttribute('poster',/dhago-studies-poster\.svg$/);
  await expect(page.locator(entry.media)).toHaveAttribute('src',/studies-in-thread\.mp4$/);
 }
});

test('the design remains a functional skin, not a static mockup',async({page})=>{
 await page.goto('/?local&surface=dark');
 const container=page.locator('#player-mount .dhago');
 const media=page.locator('#player-mount video');
 await expect(container).toHaveAttribute('data-surface','dark');
 const play=page.locator('#player-mount media-play-button');
 await expect(play).toBeVisible();
 await expect(play).toHaveCSS('border-radius','10px');
 await expect(page.locator('#player-mount .media-time-slider-thumb')).toBeVisible();
 await play.click();
 await expect.poll(()=>media.evaluate((m:HTMLVideoElement)=>m.currentTime)).toBeGreaterThan(.2);
 await expect(container).toHaveAttribute('data-playback-state','playing');
 const stageBefore=await container.getAttribute('data-weave-stage');
 await media.evaluate((m:HTMLVideoElement)=>{m.currentTime=55;});
 await expect(container).toHaveAttribute('data-weave-stage','coming-home');
 await media.evaluate((m:HTMLVideoElement)=>{m.currentTime=5;});
 await expect(container).toHaveAttribute('data-weave-stage','thread-of-light');
 expect(stageBefore).not.toBeNull();
});

test('no motion preference leaves the controls stable and real focus still visible',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:375,height:812});
 await page.goto('/?local');
 const play=page.locator('#player-mount media-play-button');
 await play.focus();
 await expect(play).toHaveCSS('transition-duration','0s');
 expect(await play.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
 for(const s of ['media-play-button','media-captions-button','.media-settings-button','media-fullscreen-button']){
  const box=await page.locator('#player-mount '+s).boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
