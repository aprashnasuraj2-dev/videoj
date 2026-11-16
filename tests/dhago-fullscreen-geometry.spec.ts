import { test, expect } from '@playwright/test';

for (const viewport of [{width:1280,height:800},{width:1920,height:1080},{width:667,height:375}]) {
  test(`fullscreen preserves all DHAGO controls and woven-time geometry at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/?local');
    const media=page.locator('video');
    await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
    const shell=page.locator('media-container');
    const ribbon=shell.locator('media-time-slider');
    await expect(ribbon).toBeVisible();
    await page.locator('media-fullscreen-button').click();
    await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.tagName)).toBe('MEDIA-CONTAINER');
    const snapshot=await shell.evaluate(node=>{
      const outer=node.getBoundingClientRect();
      const selectors=['video','media-time-slider','media-play-button','media-mute-button',
        'media-captions-button','.media-settings-button','media-fullscreen-button',
        '.dhago-chapter-summary','.media-time-group'];
      return {
        window:{w:innerWidth,h:innerHeight},
        dimensions:{height:node.clientHeight,scrollHeight:node.scrollHeight,width:node.clientWidth,scrollWidth:node.scrollWidth},
        rects:Object.fromEntries(selectors.map(sel=>{
          const el=node.querySelector(sel);
          if(!el)return[sel,null];
          const box=el.getBoundingClientRect();
          return[sel,{x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:box.width,height:box.height}];
        })),
        stage:outer.height
      };
    });
    expect(snapshot.dimensions.scrollHeight).toBeLessThanOrEqual(snapshot.dimensions.height+2);
    expect(snapshot.dimensions.scrollWidth).toBeLessThanOrEqual(snapshot.dimensions.width+2);
    for(const [name,box] of Object.entries(snapshot.rects)){
      expect(box,`missing ${name}`).not.toBeNull();
      expect(box!.width,`${name} width`).toBeGreaterThan(0);
      expect(box!.height,`${name} height`).toBeGreaterThan(0);
      expect(box!.x,`${name} x`).toBeGreaterThanOrEqual(-1);
      expect(box!.right,`${name} right`).toBeLessThanOrEqual(viewport.width+1);
      expect(box!.y,`${name} y`).toBeGreaterThanOrEqual(-1);
      expect(box!.bottom,`${name} bottom`).toBeLessThanOrEqual(viewport.height+1);
    }
    const summary=page.locator('.dhago-chapter-summary');
    await summary.click();
    const chapters=page.locator('.dhago-chapter-jump');
    await expect(chapters.first()).toBeVisible();
    await chapters.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(chapters.nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(summary).toBeFocused();
    await page.locator('media-fullscreen-button').click();
    await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBeNull();
    await expect(page.getByRole('button',{name:'Enter fullscreen'})).toBeVisible();
  });
}
