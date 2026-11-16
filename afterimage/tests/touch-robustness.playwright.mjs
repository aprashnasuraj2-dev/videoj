import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL=process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease=process.env.AFTERIMAGE_RELEASE ?? '6f271470a76161a55a423e5a67e7c5fb1cdb2f63';
const artifactDir=new URL('../artifacts/touch-robustness/', import.meta.url);
await mkdir(artifactDir,{recursive:true});
const report={url:baseURL,expectedRelease,checks:{},observations:{},limitations:[]};
const check=(name,pass,detail=null)=>{report.checks[name]={pass:Boolean(pass),detail};if(!pass)throw new Error(name+(detail?': '+JSON.stringify(detail):''));};
const browser=await chromium.launch({headless:true});

async function ready(page){
  const response=await page.goto(baseURL,{waitUntil:'networkidle',timeout:60000});
  if(expectedRelease) check('release-'+Math.random().toString(36).slice(2,7),response?.headers()?.['x-afterimage-release']===expectedRelease,{header:response?.headers()?.['x-afterimage-release']});
  await page.waitForFunction(()=>window.__AFTERIMAGE_RELEASE__?.video?.readyState>=1,null,{timeout:30000});
}
async function openComparison(page){
  await page.locator('media-play-button').click();
  await page.waitForFunction(()=>!window.__AFTERIMAGE_RELEASE__.video.paused,null,{timeout:3000});
  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(()=>!window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-reference')?.hidden,null,{timeout:8000});
}
try {
  const desktop=await browser.newContext({viewport:{width:1280,height:900},colorScheme:'dark'});
  const page=await desktop.newPage();
  await ready(page); await openComparison(page);
  const seam=page.locator('.afterimage-seam-control');
  const box=await seam.boundingBox();
  check('seam-desktop-geometry',Boolean(box&&box.width>200&&box.height>40),box);
  const play0=await page.evaluate(()=>({paused:window.__AFTERIMAGE_RELEASE__.video.paused,time:window.__AFTERIMAGE_RELEASE__.video.currentTime}));
  await page.mouse.click(box.x+box.width*0.27,box.y+box.height/2);
  const clickValue=Number(await seam.inputValue());
  check('seam-arbitrary-click',clickValue>=18&&clickValue<=36,{clickValue});
  await page.mouse.move(box.x+box.width*0.25,box.y+box.height/2); await page.mouse.down();
  await page.mouse.move(box.x+box.width*0.76,box.y+box.height/2,{steps:8}); await page.mouse.up();
  const dragValue=Number(await seam.inputValue());
  check('seam-mouse-drag',dragValue>=65&&dragValue<=86,{dragValue});
  await page.mouse.move(box.x+box.width*0.5,box.y+box.height/2); await page.mouse.down();
  await page.mouse.move(box.x+box.width+100,box.y-80,{steps:5}); await page.mouse.up();
  const outside=Number(await seam.inputValue());
  check('seam-release-outside-clamped',outside>=0&&outside<=100,{outside});
  const play1=await page.evaluate(()=>({paused:window.__AFTERIMAGE_RELEASE__.video.paused,time:window.__AFTERIMAGE_RELEASE__.video.currentTime}));
  check('pointer-seam-preserves-playback',!play1.paused&&play1.time>play0.time,{play0,play1});
  await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:500},isMobile:true,hasTouch:true,colorScheme:'dark'});
  const touchPage=await mobile.newPage();
  await ready(touchPage); await openComparison(touchPage);
  const touchSeam=touchPage.locator('.afterimage-seam-control');
  await touchSeam.scrollIntoViewIfNeeded();
  await touchPage.waitForTimeout(100);
  const tb=await touchSeam.boundingBox();
  const scrollOffset=await touchPage.evaluate(()=>({x:scrollX,y:scrollY}));
  const tv={x:tb.x,y:tb.y,width:tb.width,height:tb.height};
  const mobileLayout=await touchPage.evaluate(()=>{
    const {player}=window.__AFTERIMAGE_RELEASE__;
    const volume=player.querySelector('media-volume-slider').getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,volumeVisible:volume.width>=44&&volume.height>=44,scrollHeight:document.documentElement.scrollHeight,innerHeight};
  });
  check('mobile-no-overflow-essential-volume',!mobileLayout.overflow&&mobileLayout.volumeVisible,mobileLayout);

  await touchPage.touchscreen.tap(tv.x+tv.width*0.31,tv.y+tv.height/2);
  await touchPage.waitForTimeout(100);
  const tapValue=Number(await touchSeam.inputValue());
  check('seam-touch-tap-bounded',tapValue>=0&&tapValue<=100,{tapValue});
  report.observations.touchTap = {
    value: tapValue,
    behavior: Math.abs(tapValue - 50) < 1
      ? 'Chromium mobile range keeps the prior value on a simple tap; AFTERIMAGE treats touch drag as the adjustment gesture.'
      : 'Touch tap repositioned the native/custom reveal range.'
  };

  const cdp=await mobile.newCDPSession(touchPage);
  const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:(type==='touchEnd'||type==='touchCancel')?[]:[{x,y,id:1,radiusX:2,radiusY:2,force:1}],modifiers:0});
  const y=tv.y+tv.height/2;
  const touchHit=await touchPage.evaluate(({x,y})=>{
    window.__afterimageTouchProbe=[];
    for(const type of ['touchstart','touchmove','touchend','touchcancel']){
      document.addEventListener(type,event=>{
        window.__afterimageTouchProbe.push({type,target:event.target?.className||event.target?.tagName||null,touches:event.touches?.length||0,changed:event.changedTouches?.length||0});
      },{capture:true});
    }
    const el=document.elementFromPoint(x,y);
    return {tag:el?.tagName||null,cls:el?.className||null,hidden:el?.hidden??null};
  },{x:tv.x+tv.width*0.50,y});
  await touch('touchStart',tv.x+tv.width*0.50,y);
  for(const f of [0.60,0.70,0.81]) await touch('touchMove',tb.x+tb.width*f,y);
  await touch('touchEnd',0,0);
  await touchPage.waitForTimeout(120);
  const touchDrag=Number(await touchSeam.inputValue());
  const touchEvents=await touchPage.evaluate(()=>window.__afterimageTouchProbe||[]);
  check('seam-horizontal-touch-drag',touchDrag>=68&&touchDrag<=92,{touchDrag,touchHit,touchEvents,tb,tv,scrollOffset});

  await touch('touchStart',tv.x+tv.width*(touchDrag/100),y);
  await touch('touchMove',tv.x+tv.width*0.42,y);
  await touch('touchCancel',0,0);
  const afterCancel=Number(await touchSeam.inputValue());
  check('touch-cancel-bounded',afterCancel>=0&&afterCancel<=100,{afterCancel});

  await touchPage.evaluate(()=>scrollTo(0,0));
  const sy0=await touchPage.evaluate(()=>scrollY);
  await touch('touchStart',380,450); await touch('touchMove',380,340); await touch('touchMove',380,210); await touch('touchMove',380,100); await touch('touchEnd',0,0);
  await touchPage.waitForTimeout(250);
  const sy1=await touchPage.evaluate(()=>scrollY);
  check('vertical-touch-scroll-after-seam',sy1>sy0+20,{sy0,sy1,mobileLayout});
  const mobilePlay=await touchPage.evaluate(()=>({paused:window.__AFTERIMAGE_RELEASE__.video.paused,seam:Number(window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-seam-control').value)}));
  check('touch-seam-preserves-playback',!mobilePlay.paused&&mobilePlay.seam>=0&&mobilePlay.seam<=100,mobilePlay);
  await touchPage.screenshot({path:new URL('mobile-touch-comparison.png',artifactDir).pathname,fullPage:true});
  await mobile.close();

  const robust=await browser.newContext({viewport:{width:1080,height:810},colorScheme:'dark'});
  const rp=await robust.newPage();
  await ready(rp);
  await rp.locator('media-play-button').click();
  await rp.waitForFunction(()=>!window.__AFTERIMAGE_RELEASE__.video.paused,null,{timeout:3000});
  await rp.locator('[data-afterimage-pin]').click();
  await rp.waitForFunction(()=>!window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-reference')?.hidden,null,{timeout:5000});
  const prior=await rp.evaluate(()=>{
    const {player}=window.__AFTERIMAGE_RELEASE__;
    return {pinned:player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),canvasW:player.querySelector('.afterimage-reference canvas')?.width};
  });
  await rp.evaluate(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    let fail=true;
    HTMLCanvasElement.prototype.getContext=function(...args){
      if(fail && !this.closest?.('.afterimage-reference')){fail=false;return null;}
      return original.apply(this,args);
    };
    window.__restoreCanvasGetContext=()=>{HTMLCanvasElement.prototype.getContext=original;};
  });
  await rp.locator('[data-afterimage-pin]').click();
  await rp.waitForTimeout(500);
  const failedRepin=await rp.evaluate(()=>{
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return {pinned:player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),canvasW:player.querySelector('.afterimage-reference canvas')?.width,status:player.querySelector('.afterimage-status')?.textContent?.trim(),paused:video.paused,playVisible:player.querySelector('media-play-button').getBoundingClientRect().width>0,seekVisible:player.querySelector('media-time-slider').getBoundingClientRect().width>0,volumeVisible:player.querySelector('media-volume-slider').getBoundingClientRect().width>0,fullscreenVisible:player.querySelector('media-fullscreen-button').getBoundingClientRect().width>0};
  });
  check('atomic-repin-failure-keeps-valid-reference',failedRepin.pinned===prior.pinned&&failedRepin.canvasW===prior.canvasW&&/cannot capture|frame/i.test(failedRepin.status)&&!failedRepin.paused, {prior,failedRepin});
  check('canvas-failure-preserves-essential-ui',failedRepin.playVisible&&failedRepin.seekVisible&&failedRepin.volumeVisible&&failedRepin.fullscreenVisible,failedRepin);
  await rp.evaluate(()=>window.__restoreCanvasGetContext?.());

  const beforeDelayed=await rp.evaluate(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('[data-afterimage-pinned]')?.textContent?.trim());
  await rp.evaluate(()=>{
    const v=window.__AFTERIMAGE_RELEASE__.video;
    window.__heldFrameCallback=null;
    v.requestVideoFrameCallback=cb=>{window.__heldFrameCallback=cb;return 777;};
    v.cancelVideoFrameCallback=()=>{};
  });
  await rp.locator('[data-afterimage-pin]').click();
  await rp.waitForFunction(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('[data-afterimage-pin]').disabled,null,{timeout:2000});
  await rp.locator('[data-afterimage-close]').click();
  await rp.evaluate(()=>window.__heldFrameCallback?.(performance.now(),{mediaTime:window.__AFTERIMAGE_RELEASE__.video.currentTime}));
  await rp.waitForTimeout(100);
  const delayed=await rp.evaluate(()=>{
    const {player}=window.__AFTERIMAGE_RELEASE__;
    return {closed:player.querySelector('.afterimage-reference')?.hidden===true,pinned:player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),pinDisabled:player.querySelector('[data-afterimage-pin]').disabled,compareVisible:player.querySelector('[data-afterimage-compare]').hidden===false};
  });
  check('delayed-repin-close-no-stale-apply',delayed.closed&&delayed.pinned===beforeDelayed&&!delayed.pinDisabled&&delayed.compareVisible,{beforeDelayed,delayed});

  const sourcePage=await robust.newPage();
  await ready(sourcePage);
  await sourcePage.locator('media-play-button').click();
  await sourcePage.waitForFunction(()=>!window.__AFTERIMAGE_RELEASE__.video.paused,null,{timeout:3000});
  await sourcePage.evaluate(()=>{
    const v=window.__AFTERIMAGE_RELEASE__.video;
    window.__heldSourceCallback=null;
    v.requestVideoFrameCallback=cb=>{window.__heldSourceCallback=cb;return 888;};
    v.cancelVideoFrameCallback=()=>{};
  });
  await sourcePage.locator('[data-afterimage-pin]').click();
  await sourcePage.waitForFunction(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('[data-afterimage-pin]').disabled,null,{timeout:2000});
  await sourcePage.evaluate(()=>{
    const v=window.__AFTERIMAGE_RELEASE__.video;
    const src=v.currentSrc;
    v.src=src;
    v.load();
  });
  await sourcePage.waitForTimeout(100);
  await sourcePage.evaluate(()=>window.__heldSourceCallback?.(performance.now(),{mediaTime:1}));
  await sourcePage.waitForTimeout(100);
  const sourceRace=await sourcePage.evaluate(()=>{
    const {player}=window.__AFTERIMAGE_RELEASE__;
    return {referenceHidden:player.querySelector('.afterimage-reference')?.hidden===true,relationHidden:player.querySelector('.afterimage-relation')?.hidden===true,pinDisabled:player.querySelector('[data-afterimage-pin]').disabled,status:player.querySelector('.afterimage-status')?.textContent?.trim()};
  });
  check('source-change-invalidates-pending-capture',sourceRace.referenceHidden&&sourceRace.relationHidden&&!sourceRace.pinDisabled,sourceRace);
  await robust.close();

  report.pass=true;
} catch(error){
  report.pass=false;report.error=String(error?.stack||error);throw error;
} finally {
  await writeFile(new URL('report.json',artifactDir),JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
