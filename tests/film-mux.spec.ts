import { test, expect } from '@playwright/test';
import film from '../apps/preview/src/media-fibre.json';

test('candidate Mux HLS decodes, advances, seeks and exposes the actual new source',async({page})=>{
  test.skip(!film.playbackId,'The candidate Mux asset is not provisioned yet — no bonus claimed.');
  const requested:string[]=[];
  page.on('request',req=>{ if(req.url().startsWith('https://stream.mux.com/'))requested.push(req.url()); });
  await page.goto('/?film=fibre');
  const mux=page.locator('mux-video');
  await expect(mux).toHaveAttribute('src','https://stream.mux.com/'+film.playbackId+'.m3u8');
  await expect.poll(()=>mux.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:30000}).toBeGreaterThan(0);
  await page.locator('media-play-button').click();
  await expect.poll(()=>mux.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:30000}).toBeGreaterThan(1);
  expect(requested.some(url=>url.includes(film.playbackId!))).toBe(true);
  await page.locator('[data-seek="32"]').click();
  await expect.poll(()=>mux.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(31.5);
  await expect(page.locator('.dhago-chapter-name')).toHaveText('Warp meets weft');
  await page.locator('media-captions-button').click();
  await expect.poll(()=>mux.evaluate((v:HTMLVideoElement)=>Array.from(v.textTracks??[]).some(t=>t.kind==='captions'&&t.mode==='showing'))).toBe(true);
});
