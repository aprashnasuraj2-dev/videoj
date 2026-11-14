import { expect, test } from '@playwright/test';

test('real decoded dimensions, native metadata and spoken chapter map are exposed honestly',async({page})=>{
  await page.goto('/?local');
  const shell=page.locator('#player-mount .dhago');
  const video=page.locator('#player-mount video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await expect.poll(()=>shell.getAttribute('data-stream-rendition')).not.toBeNull();
  await expect(shell.locator('.dhago-quality-thread')).toHaveCount(1);
  await expect.poll(()=>shell.locator('.dhago-metadata-lane[data-kind="chapter"]').count()).toBeGreaterThan(0);
  const first= shell.locator('.dhago-chapter-jump').first();
  await expect(first).toContainText('Raw fibre');
  await expect(first.locator('.dhago-visually-hidden')).toHaveText('Chapter 1 of 4; ends at 0:16.');
  await expect(shell.locator('.dhago-chapter-summary')).not.toHaveAttribute('aria-label',/.+/);
});

test('buffer slack and missed stitches are driven by exposed events/counters',async({page})=>{
  await page.addInitScript(()=>{
    let dropped=0;
    Object.defineProperty(window,'__setDhagoDropped',{value:(value:number)=>{dropped=value;}});
    Object.defineProperty(HTMLVideoElement.prototype,'getVideoPlaybackQuality',{
      configurable:true,
      value(){return {droppedVideoFrames:dropped,totalVideoFrames:120};}
    });
  });
  await page.goto('/?local');
  const shell=page.locator('#player-mount .dhago');
  const video=page.locator('#player-mount video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.25);

  await video.evaluate(v=>v.dispatchEvent(new Event('waiting')));
  await expect(shell).toHaveAttribute('data-stream-buffer-events','1');
  await video.evaluate(v=>v.dispatchEvent(new Event('playing')));
  await expect(shell.locator('.dhago-slack-thread')).toHaveCount(1);

  await page.evaluate(()=>((window as any).__setDhagoDropped)(2));
  await video.evaluate(v=>v.dispatchEvent(new Event('timeupdate')));
  await expect(shell).toHaveAttribute('data-stream-dropped-frames','2');
  await expect(shell.locator('.dhago-drop-stitch')).toHaveCount(1);
  await expect(shell.locator('.dhago-drop-stitch')).toHaveAttribute('data-count','2');
});

test('absent authored speaker or sponsor metadata does not invent lanes',async({page})=>{
  await page.goto('/?local');
  const shell=page.locator('#player-mount .dhago');
  await expect.poll(()=>shell.locator('.dhago-metadata-lane').count()).toBeGreaterThan(0);
  await expect(shell.locator('.dhago-metadata-lane[data-kind="speaker"]')).toHaveCount(0);
  await expect(shell.locator('.dhago-metadata-lane[data-kind="sponsor"]')).toHaveCount(0);
});


test('historic telemetry DOM remains bounded during a long noisy session',async({page})=>{
  await page.addInitScript(()=>{
    let width=640,height=360,dropped=0;
    Object.defineProperty(window,'__dhagoHistoryControl',{value:{
      dimensions(w:number,h:number){width=w;height=h;},
      dropped(value:number){dropped=value;},
    }});
    Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{configurable:true,get(){return width;}});
    Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{configurable:true,get(){return height;}});
    Object.defineProperty(HTMLVideoElement.prototype,'getVideoPlaybackQuality',{configurable:true,value(){return {droppedVideoFrames:dropped,totalVideoFrames:1000};}});
  });
  await page.goto('/?local');
  const shell=page.locator('#player-mount .dhago');
  const video=page.locator('#player-mount video');
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);

  await video.evaluate((v:HTMLVideoElement)=>{
    const ctl=(window as any).__dhagoHistoryControl;
    for(let i=0;i<130;i++){
      ctl.dimensions(i%2?1280:640,i%2?720:360);
      v.dispatchEvent(new Event('resize'));
    }
    for(let i=0;i<130;i++){
      v.dispatchEvent(new Event('waiting'));
      v.dispatchEvent(new Event('playing'));
    }
    for(let i=1;i<=70;i++){
      ctl.dropped(i);
      v.dispatchEvent(new Event('timeupdate'));
    }
  });

  await expect(shell.locator('.dhago-quality-thread')).toHaveCount(96);
  await expect(shell.locator('.dhago-slack-thread')).toHaveCount(96);
  await expect(shell.locator('.dhago-drop-stitch')).toHaveCount(48);
  await expect(shell).toHaveAttribute('data-stream-buffer-events','130');
  await expect(shell).toHaveAttribute('data-stream-dropped-frames','70');
});
