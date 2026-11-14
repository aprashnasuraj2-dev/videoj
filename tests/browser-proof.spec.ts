import { expect, test } from '@playwright/test';

test('judge-visible controls work across the available browser engine', async ({ page, browserName }) => {
  await page.goto('/?local');
  const player=page.locator('#player-mount .dhago');
  const media=player.locator('video');
  await player.waitFor();
  await page.waitForFunction(() => {
    const video=document.querySelector('#player-mount video') as HTMLVideoElement|null;
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 1);
  });

  const play=player.getByRole('button',{name:'Play',exact:true});
  await play.click();
  await expect.poll(()=>media.evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeGreaterThan(.25);
  await player.getByRole('button',{name:'Pause',exact:true}).click();

  await page.locator('[data-seek="32"]').click();
  await expect.poll(()=>media.evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeGreaterThan(31.5);
  await expect(player.locator('.dhago-chapter-name')).toContainText('Warp meets weft');
  await expect(player.locator('media-time-slider')).toBeVisible();

  const captions=player.locator('media-captions-button');
  await captions.click();
  await expect.poll(()=>media.evaluate((video:HTMLVideoElement)=>
    [...video.textTracks].some(track=>track.kind==='captions'&&track.mode==='showing')
  )).toBe(true);

  const settings=player.getByRole('button',{name:'Settings',exact:true});
  await settings.click();
  await expect(player.getByRole('menuitem',{name:/speed/i})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();

  const fullscreen=player.getByRole('button',{name:'Enter fullscreen'});
  await expect(fullscreen).toBeVisible();
  if(browserName!=='webkit'){
    await fullscreen.click();
    await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
    await player.getByRole('button',{name:'Exit fullscreen'}).click();
    await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);
  }

  await page.setViewportSize({width:375,height:820});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(player.locator('media-captions-button')).toBeVisible();
  await expect(player.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
  await expect(player.locator('media-fullscreen-button')).toBeVisible();
});
