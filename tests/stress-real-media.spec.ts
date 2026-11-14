import { expect, test } from '@playwright/test';

// Real source addresses are preserved. A tiny stand-in is used only where this
// test deliberately simulates upstream failure, never as exhibition footage.
test('all sixteen playback studies keep a real mounted player and a visible credit',async({page})=>{
  await page.goto('/stress.html?case=original');
  const cases=['original','wool','pashmina','dhaka','malformed','uneven','late','nochapters',
    'captions','layers','nocaptions','audio','poster','error','narrow','manual'];
  await expect(page.locator('.lab-case')).toHaveCount(cases.length);
  for(const id of cases){
    await page.locator('.lab-case[data-case="'+id+'"]').click();
    await expect(page.locator('.lab-case[data-case="'+id+'"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#lab-player media-container')).toHaveCount(1);
    await expect(page.locator('#lab-player video,#lab-player audio')).toHaveCount(1);
    await expect(page.locator('#lab-credit')).not.toBeEmpty();
    if(id==='audio'){
      await expect(page.locator('#lab-player audio')).toHaveCount(1);
      await expect(page.locator('#lab-player video')).toHaveCount(0);
      await expect(page.locator('#lab-credit a')).toHaveAttribute('href',/WWS_Loom\.ogg/);
    }
    if(id==='wool')await expect(page.locator('#lab-credit a')).toHaveAttribute('href',/Sheep_grazing_in_the_countryside\.webm/);
  }
});

test('eight-second sheep study tries a lightweight file then retains the original when it fails',async({page,request})=>{
  const canonical=await request.get('/media/studies-in-thread.mp4');
  const bytes=await canonical.body();
  const attempted:string[]=[];
  await page.route(/upload\.wikimedia\.org\/wikipedia\/commons\/(transcoded\/2\/27|2\/27)\//,route=>{
    const url=route.request().url();attempted.push(url);
    if(url.includes('/transcoded/'))return route.fulfill({status:503,body:'Media temporarily unavailable'});
    // Only this deterministic test substitutes a local MP4 for Wikimedia's original WebM.
    return route.fulfill({status:200,contentType:'video/mp4',body:bytes,headers:{'access-control-allow-origin':'*'}});
  });
  await page.goto('/stress.html?case=wool');
  const video=page.locator('#lab-player video');
  await expect.poll(()=>attempted.some(x=>x.includes('480p.vp9.webm'))).toBe(true);
  await expect.poll(()=>attempted.some(x=>x.includes('/commons/2/27/'))).toBe(true);
  await expect(video).toHaveAttribute('src',/upload\.wikimedia\.org\/wikipedia\/commons\/2\/27\/Sheep_grazing_in_the_countryside\.webm/);
  await expect.poll(()=>video.evaluate((m:HTMLVideoElement)=>m.readyState)).toBeGreaterThan(0);
  await expect(page.locator('.dhago-fallback')).toHaveAttribute('href',/commons\.wikimedia\.org\/wiki\/File:Sheep_grazing/);
});

test('the loom opens unmuted and recovers from a failed MP3 rendition',async({page})=>{
  // This short tone exercises native audio recovery; it is not the archival loom recording.
  const rate=8000,frames=rate*2,b=Buffer.alloc(44+frames*2);
  b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);
  b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);
  for(let i=0;i<frames;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
  const attempted:string[]=[];
  await page.route(/upload\.wikimedia\.org\/wikipedia\/commons\/(transcoded\/e\/e8|e\/e8)\//,route=>{
    const url=route.request().url();attempted.push(url);
    if(url.includes('/transcoded/'))return route.fulfill({status:503,body:'MP3 unavailable'});
    return route.fulfill({status:200,contentType:'audio/wav',body:b,headers:{'access-control-allow-origin':'*'}});
  });
  await page.goto('/stress.html?case=audio');
  const audio=page.locator('#lab-player audio');
  await expect(audio).toHaveJSProperty('muted',false);
  await expect(audio).toHaveJSProperty('volume',1);
  await expect.poll(()=>attempted.some(x=>x.endsWith('WWS_Loom.ogg.mp3'))).toBe(true);
  await expect.poll(()=>attempted.some(x=>x.endsWith('/WWS_Loom.ogg'))).toBe(true);
  await expect.poll(()=>audio.evaluate((m:HTMLAudioElement)=>m.readyState)).toBeGreaterThan(0);
  await page.locator('#lab-player media-play-button').click();
  await expect.poll(()=>audio.evaluate((m:HTMLAudioElement)=>m.currentTime)).toBeGreaterThan(.15);
  await expect(page.locator('.dhago-fallback')).toHaveAttribute('href',/commons\.wikimedia\.org\/wiki\/File:WWS_Loom/);
});
