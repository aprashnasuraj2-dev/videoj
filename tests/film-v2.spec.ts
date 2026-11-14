import { test, expect } from '@playwright/test';

test('fibre-to-fabric preview plays the actual 64-second film with truthful chapter cues', async ({ page }) => {
  await page.goto('/?film=fibre&local');
  const video=page.locator('video');
  await expect(video).toHaveAttribute('src', /from-fibre-to-fabric\.mp4$/);
  await expect(page.locator('mux-video')).toHaveCount(0);
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  expect(await video.evaluate((v:HTMLVideoElement)=>v.duration)).toBeCloseTo(64,1);
  await expect(page.locator('.dhago-chapter-name')).toHaveText('Raw fibre');
  await page.locator('[data-seek="32"]').click();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(32);
  await expect(page.locator('.dhago-chapter-name')).toHaveText('Warp meets weft');
  const tracks=await video.evaluate((v:HTMLVideoElement)=>Array.from(v.textTracks).map(t=>({kind:t.kind,label:t.label})));
  expect(tracks).toEqual(expect.arrayContaining([
    expect.objectContaining({kind:'captions'}),
    expect.objectContaining({kind:'chapters'}),
    expect.objectContaining({kind:'metadata',label:'thumbnails'}),
  ]));
});

test('film candidate supplies one-second source-derived storyboard frames',async({page})=>{
  await page.goto('/?film=fibre&local');
  const video=page.locator('video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>{
    const t=Array.from(v.textTracks).find(x=>x.kind==='metadata'&&x.label==='thumbnails');
    return t?.cues?.length??0;
  })).toBe(64);
  const cues=await video.evaluate((v:HTMLVideoElement)=>{
    const t=Array.from(v.textTracks).find(x=>x.kind==='metadata'&&x.label==='thumbnails')!;
    return [t.cues![0],t.cues![16],t.cues![63]].map(c=>({start:c.startTime,end:c.endTime,text:(c as VTTCue).text}));
  });
  expect(cues[0].start).toBe(0);
  expect(cues[1].start).toBe(16);
  expect(cues[2].end).toBeCloseTo(64,2);
  for(const cue of cues)expect(cue.text).toContain('from-fibre-to-fabric-storyboard.jpg#xywh=');
});

test('candidate prefers decoded original VP9 over unsupported H264 without pretending it is Mux',async({page})=>{
  await page.addInitScript(()=>{
    const real=HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType=function(type:string){
      if(type.startsWith('video/mp4'))return '';
      if(type.startsWith('video/webm'))return 'probably';
      return real.call(this,type);
    };
  });
  await page.goto('/?film=fibre');
  const video=page.locator('video');
  await expect(video).toHaveAttribute('src',/from-fibre-to-fabric\.webm$/);
  await expect(page.locator('mux-video')).toHaveCount(0);
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.2);
});
