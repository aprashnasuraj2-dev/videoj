import { expect, test } from '@playwright/test';

test('hostile authored metadata is bounded, deduplicated and cannot poison timeline geometry',async({page})=>{
  await page.goto('/stress.html?case=metadataedge');
  const shell=page.locator('#lab-player .dhago');
  const lane=shell.locator('.dhago-metadata-lane[data-track-id="hostile"]');
  await expect(lane).toHaveCount(1);
  await expect(lane).toHaveAttribute('data-kind','custom');
  await expect.poll(()=>lane.locator('.dhago-metadata-thread').count()).toBe(120);
  const color=await lane.evaluate((el:HTMLElement)=>el.style.getPropertyValue('--dhago-lane-color').trim());
  expect(color).toBe('#6f7668');

  const invalidGeometry=await lane.locator('.dhago-metadata-thread').evaluateAll(nodes=>nodes.some((node:HTMLElement)=>{
    const left=node.style.left;
    const width=node.style.width;
    return !left.endsWith('%')||!width.endsWith('%')||left.includes('NaN')||width.includes('NaN');
  }));
  expect(invalidGeometry).toBe(false);

  await expect(shell.getByRole('slider',{name:'Seek'})).toBeVisible();
  await expect(shell).toHaveAttribute('data-metadata-weft','');
});

test('metadata lanes clear when duration becomes non-finite on media replacement',async({page})=>{
  await page.goto('/stress.html?case=metadataedge');
  const shell=page.locator('#lab-player .dhago');
  const media=shell.locator('video');
  await expect.poll(()=>shell.locator('.dhago-metadata-lane[data-track-id="hostile"]').count()).toBe(1);

  await media.evaluate((v:HTMLVideoElement)=>{
    v.src=new URL('/media/definitely-missing-metadata-replacement.mp4',location.href).href;
    v.load();
  });
  await expect(shell.locator('.dhago-metadata-lanes')).toBeHidden();
  await expect(shell).not.toHaveAttribute('data-metadata-weft',/.+/);
});
