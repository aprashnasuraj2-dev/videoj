import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const media=JSON.parse(readFileSync(new URL('../apps/preview/src/media.json',import.meta.url),'utf8')) as {playbackId:string|null};

test('Mux source really plays, seeks and carries local chapter and caption cues',async({page},info)=>{
 test.setTimeout(90_000);
 test.skip(!media.playbackId,'No published Mux asset configured; bonus remains unverified');
 const requests:string[]=[];
 page.on('request',r=>{if(/stream\.mux\.com|\.m4s|\.ts\?/.test(r.url()))requests.push(r.url());});
 await page.goto('/');
 const video=page.locator('mux-video');
 await expect(video).toHaveAttribute('src',`https://stream.mux.com/${media.playbackId}.m3u8`);
 await page.locator('media-play-button').click();
 await expect.poll(()=>video.evaluate((v:any)=>v.currentTime),{timeout:45000}).toBeGreaterThan(1);
 await page.locator('media-play-button').click();
 await page.locator('[data-seek="32"]').click();
 await expect.poll(()=>video.evaluate((v:any)=>v.currentTime),{timeout:15000}).toBeGreaterThanOrEqual(32);
 await expect(page.locator('.dhago-chapter-name')).toHaveText('Warp meets weft');
 await page.locator('media-captions-button').click();
 await expect.poll(()=>video.evaluate((v:any)=>Array.from(v.textTracks as TextTrackList).some(t=>t.kind==='captions'&&t.mode==='showing'))).toBe(true);
 expect(requests.some(url=>url.includes(`${media.playbackId}.m3u8`))).toBe(true);
 await info.attach('public-mux-playback-evidence',{body:JSON.stringify({playbackId:media.playbackId,requests},null,2),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('mux-playing.png'),fullPage:true});

 const slider = page.locator('media-time-slider');
 await slider.scrollIntoViewIfNeeded();
 const bounds = (await slider.boundingBox())!;
 const image = slider.locator('.media-slider-thumbnail-image');
 await page.mouse.move(bounds.x + bounds.width * .68, bounds.y + bounds.height / 2);
 await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
 await expect(slider.locator('.media-time-slider-preview')).toHaveCSS('opacity', '1');
 await expect(image).toHaveAttribute('src', /image\.mux\.com.*storyboard/);
 await page.locator('.dhago').screenshot({path:info.outputPath('mux-woven-preview.png')});
});
