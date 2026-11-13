import {test,expect} from '@playwright/test';
import media from '../apps/preview/src/media.json';

test('Mux source really plays, seeks and carries local chapter and caption cues',async({page},info)=>{
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
 await expect(page.locator('.dhago-chapter-name')).toHaveText('Where shadows gather');
 await page.locator('media-captions-button').click();
 await expect.poll(()=>video.evaluate((v:any)=>Array.from(v.textTracks as TextTrackList).some(t=>t.kind==='captions'&&t.mode==='showing'))).toBe(true);
 expect(requests.some(url=>url.includes(`${media.playbackId}.m3u8`))).toBe(true);
 await info.attach('public-mux-playback-evidence',{body:JSON.stringify({playbackId:media.playbackId,requests},null,2),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('mux-playing.png'),fullPage:true});
});
