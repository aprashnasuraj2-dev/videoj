import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL=process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease=process.env.AFTERIMAGE_RELEASE ?? '6f271470a76161a55a423e5a67e7c5fb1cdb2f63';
const expectedVersion=process.env.AFTERIMAGE_VERSION || '0.3.9-touch-events';
const artifactDir=new URL('../artifacts/judge-first-use/',import.meta.url);
await mkdir(artifactDir,{recursive:true});
const report={
  url:baseURL,expectedRelease,expectedVersion,checks:{},observations:{},
  resolvedConfusion:'Earlier fresh-keyboard evidence found the non-actionable media wrapper took first Tab and keyboard support was not judge-visible. The final release removes that wrapper from sequential focus and adds the restrained keyboard discovery cue.'
};
const check=(name,pass,detail=null)=>{report.checks[name]={pass:Boolean(pass),detail};if(!pass)throw new Error(name+(detail?': '+JSON.stringify(detail):''));};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:'dark'});
const page=await context.newPage();

try{
  const response=await page.goto(baseURL,{waitUntil:'networkidle',timeout:60000});
  if(expectedRelease) check('exact-release',response?.headers()?.['x-afterimage-release']===expectedRelease,{header:response?.headers()?.['x-afterimage-release']});
  await page.waitForFunction(()=>window.__AFTERIMAGE_RELEASE__?.video?.readyState>=1,null,{timeout:30000});
  const readyAt=Date.now();

  const firstLook=await page.evaluate(()=>{
    const {player,video,version}=window.__AFTERIMAGE_RELEASE__;
    const box=el=>{const r=el?.getBoundingClientRect();return r?{width:r.width,height:r.height,top:r.top,bottom:r.bottom}:null;};
    return {
      version,
      paused:video.paused,
      play:box(player.querySelector('media-play-button')),
      seek:box(player.querySelector('media-time-slider')),
      tryComparison:box(player.querySelector('[data-afterimage-example]')),
      tryText:player.querySelector('[data-afterimage-example]')?.textContent?.trim()||null,
      pinText:player.querySelector('[data-afterimage-pin]')?.textContent?.trim()||null,
      cue:document.querySelector('.keyboard-cue')?.textContent?.trim()||null,
      note:document.querySelector('.fixture-note')?.textContent?.trim()||null,
      videoVisible:box(video),
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
    };
  });
  report.observations.firstLook=firstLook;
  check('five-second-player-recognition',
    firstLook.version===expectedVersion &&
    firstLook.play?.width>=44 && firstLook.play?.height>=44 &&
    firstLook.seek?.width>100 &&
    firstLook.videoVisible?.width>0 && !firstLook.overflow,
    firstLook);
  check('five-second-comparison-discovery',
    firstLook.tryComparison?.width>=44 && /Try a comparison/i.test(firstLook.tryText||'') &&
    /Pin moment/i.test(firstLook.pinText||'') &&
    /Tab through controls/i.test(firstLook.cue||'') &&
    /Waterline/i.test(firstLook.note||''),
    firstLook);

  await page.keyboard.press('Tab');
  const firstTab=await page.evaluate(()=>{
    const el=document.activeElement;
    return {tag:el?.tagName?.toLowerCase()||null,label:el?.getAttribute('aria-label')||el?.getAttribute('label')||null};
  });
  report.observations.firstTab=firstTab;
  check('resolved-first-tab-confusion',firstTab.tag==='media-play-button',firstTab);

  await page.locator('media-play-button').click();
  await page.waitForFunction(()=>!window.__AFTERIMAGE_RELEASE__.video.paused&&window.__AFTERIMAGE_RELEASE__.video.currentTime>0.35,null,{timeout:3000});
  const ordinaryPlayback=await page.evaluate(()=>({time:window.__AFTERIMAGE_RELEASE__.video.currentTime,paused:window.__AFTERIMAGE_RELEASE__.video.paused}));
  check('ordinary-playback-first',!ordinaryPlayback.paused&&ordinaryPlayback.time>0.35,ordinaryPlayback);

  await page.locator('[data-afterimage-example]').click();
  await page.waitForFunction(()=>{
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return !player.querySelector('.afterimage-reference')?.hidden &&
      !player.querySelector('[data-afterimage-example]')?.disabled &&
      video.currentTime>12.6 && video.currentTime<13.8;
  },null,{timeout:8000});
  const pair=await page.evaluate(()=>{
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return {
      pinned:player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(),
      now:player.querySelector('[data-afterimage-now]')?.textContent?.trim(),
      delta:player.querySelector('[data-afterimage-delta]')?.textContent?.trim(),
      paused:video.paused,
      seam:Number(player.querySelector('.afterimage-seam-control')?.value)
    };
  });
  check('comparison-understood-from-live-labels',
    pair.pinned==='00:05' && pair.now==='00:13' && pair.delta==='+00:08' && !pair.paused,
    pair);

  const seam=page.locator('.afterimage-seam-control');
  const sb=await seam.boundingBox();
  await page.mouse.move(sb.x+sb.width*0.50,sb.y+sb.height/2);
  await page.mouse.down();
  await page.mouse.move(sb.x+sb.width*0.68,sb.y+sb.height/2,{steps:6});
  await page.mouse.up();
  const dragged=Number(await seam.inputValue());
  check('comparison-seam-is-immediately-interactive',dragged>=60&&dragged<=76,{dragged});

  await page.locator('[data-afterimage-close]').click();
  await page.waitForTimeout(250);
  const closed=await page.evaluate(()=>{
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return {
      hidden:player.querySelector('.afterimage-reference')?.hidden===true,
      compareVisible:player.querySelector('[data-afterimage-compare]')?.hidden===false,
      paused:video.paused,
      time:video.currentTime
    };
  });
  check('close-returns-to-normal-video',closed.hidden&&closed.compareVisible&&!closed.paused,closed);
  await page.locator('[data-afterimage-clear]').click();
  const cleared=await page.evaluate(()=>{
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return {
      relationHidden:player.querySelector('.afterimage-relation')?.hidden===true,
      pinText:player.querySelector('[data-afterimage-pin]')?.textContent?.trim(),
      paused:video.paused
    };
  });
  check('clear-keeps-ordinary-playback',cleared.relationHidden&&/Pin moment/i.test(cleared.pinText||'')&&!cleared.paused,cleared);

  const elapsedMs=Date.now()-readyAt;
  report.observations.walkthrough={elapsedMs,ordinaryPlayback,pair,dragged,closed,cleared};
  check('thirty-second-walkthrough',elapsedMs<30000,{elapsedMs});
  await page.screenshot({path:new URL('judge-30-second-complete.png',artifactDir).pathname,fullPage:true});
  report.pass=true;
}catch(error){
  report.pass=false;report.error=String(error?.stack||error);throw error;
}finally{
  await writeFile(new URL('report.json',artifactDir),JSON.stringify(report,null,2)+'\n');
  await context.close();await browser.close();
}
