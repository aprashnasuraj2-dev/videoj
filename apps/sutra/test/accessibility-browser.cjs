// Targeted Chromium accessibility regression. This is not a substitute for
// human screen-reader or physical-device testing.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');

const rgb=value=>{
 const m=String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
 return m?[+m[1],+m[2],+m[3]]:null;
};
const luminance=([r,g,b])=>{
 const f=x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
 return .2126*f(r)+.7152*f(g)+.0722*f(b);
};
const contrast=(a,b)=>{
 const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
};

(async()=>{
 const app=path.resolve(__dirname,'..');
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4189','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,logs='';for(const stream of [server.stdout,server.stderr])stream.on('data',d=>logs=(logs+d).slice(-5000));
 try{
  let ready=false;for(let i=0;i<70;i++){try{const r=await fetch('http://127.0.0.1:4189',{signal:AbortSignal.timeout(400)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
  assert.ok(ready,'Accessibility preview did not start: '+logs);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4189');

  // Static automated checks: IDs, visible interactive names and live regions.
  const audit=await page.evaluate(()=>{
   const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
   const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
   const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
   const controls=[...document.querySelectorAll('button,input,summary,a[href]')].filter(visible);
   const unnamed=controls.filter(e=>{
    const labelled=e.getAttribute('aria-label')||e.getAttribute('aria-labelledby');
    const label=e.id&&document.querySelector('label[for="'+CSS.escape(e.id)+'"]');
    return !(labelled||label?.textContent?.trim()||e.textContent?.trim()||e.getAttribute('title')||e.getAttribute('placeholder'));
   }).map(e=>e.id||e.tagName);
   const live=[...document.querySelectorAll('[aria-live],[role=status]')].filter(visible).map(e=>({id:e.id,role:e.getAttribute('role'),live:e.getAttribute('aria-live')}));
   return {duplicates:[...new Set(duplicates)],unnamed,live};
  });
  assert.deepEqual(audit.duplicates,[]);
  assert.deepEqual(audit.unnamed,[]);
  assert.ok(audit.live.some(x=>x.id==='peer-status'));
  assert.equal(audit.live.filter(x=>x.id==='peer-exec-state').length,0,'budget details should not create duplicate live announcements');

  // Key contrast samples. These are targeted computed-style checks, not a full WCAG scanner.
  for(const selector of ['body','.intro','.muted','button.primary','#peer-status']){
   const pair=await page.locator(selector).first().evaluate(el=>{
    let bg=getComputedStyle(el).backgroundColor,p=el;
    while((!bg||bg==='rgba(0, 0, 0, 0)'||bg==='transparent')&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}
    return {fg:getComputedStyle(el).color,bg};
   });
   const fg=rgb(pair.fg),bg=rgb(pair.bg);assert.ok(fg&&bg,selector+' colors parse');
   assert.ok(contrast(fg,bg)>=4.5,selector+' text contrast >= 4.5:1');
  }

  // Reduced-motion preference applies to ordinary interactive controls.
  const motion=await page.locator('button').first().evaluate(el=>({transition:getComputedStyle(el).transitionDuration,animation:getComputedStyle(el).animationDuration}));
  const seconds=v=>Math.max(...String(v).split(',').map(x=>x.trim().endsWith('ms')?parseFloat(x)/1000:parseFloat(x)||0));
  assert.ok(seconds(motion.transition)<=.001&&seconds(motion.animation)<=.001);

  // Core peer flow keyboard order and modal focus restoration.
  const peerInput=page.getByLabel('Exact peer network URL');await peerInput.focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'run-peer');
  await peerInput.fill('http://127.0.0.1:4199/agents/checklist');
  await page.getByRole('button',{name:'Run scripted peer test'}).click();
  await page.getByRole('dialog',{name:'Approve real public artifact access?'}).waitFor();
  const dialogFocus=await page.evaluate(()=>document.activeElement?.closest('dialog')?.id);
  assert.equal(dialogFocus,'peer-consent-dialog');
  await page.getByRole('button',{name:'Deny external request'}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-status').dataset.state==='denied');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'run-peer','denial returns focus to initiating control');

  // Minimum target size for core visible controls. 24 CSS px is the WCAG 2.2 AA target-size minimum.
  const targets=await page.evaluate(()=>[...document.querySelectorAll('#load-timing,#check,#alter,#peer-url,#run-peer,#peer-inspector>summary,#prepare-review')]
   .map(el=>{const r=el.getBoundingClientRect();return {id:el.id||'peer-inspector-summary',w:r.width,h:r.height};}));
  for(const t of targets)assert.ok(t.w>=24&&t.h>=24,JSON.stringify(t));

  // Actual synthetic media/transcript still works under reduced-motion preference.
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  assert.equal(await page.locator('video').count(),1);
  assert.equal(await page.getByRole('searchbox',{name:'Search synthetic transcript'}).count(),1);
  const captions=page.locator('media-captions-button');assert.equal(await captions.count(),1);
  await captions.click();
  await page.locator('video').evaluate(video=>{video.currentTime=1;});
  await page.waitForFunction(()=>Array.from(document.querySelector('video').textTracks).some(track=>track.kind==='captions'&&track.mode==='showing'&&track.activeCues?.length));
  const captionState=await page.locator('video').evaluate(video=>{
   const track=Array.from(video.textTracks).find(t=>t.kind==='captions');
   return {mode:track?.mode,text:track?.activeCues?.[0]?.text??'',buttonVisible:!!document.querySelector('media-captions-button')?.getBoundingClientRect().width};
  });
  assert.equal(captionState.mode,'showing');assert.match(captionState.text,/Silent synthetic timing fixture/);assert.equal(captionState.buttonVisible,true);

  // 200% CSS zoom regression in Chromium plus the existing narrow-layout boundary.
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>document.documentElement.style.zoom='2');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true,'200% Chromium CSS zoom should not create horizontal clipping');
  const captionBox=await captions.boundingBox();assert.ok(captionBox&&captionBox.width>=24&&captionBox.height>=24,'caption control remains reachable at 200% zoom');
  await page.evaluate(()=>document.documentElement.style.zoom='1');
  await page.setViewportSize({width:360,height:800});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'360px core layout stays within viewport');

  assert.deepEqual(errors,[]);
  console.log('PASS: targeted automated a11y audit: unique IDs/names, live-region discipline, sampled 4.5:1 contrast, reduced motion, keyboard/modal focus restoration, >=24px targets, active native captions, synthetic media/transcript, 200% CSS zoom and 360px layout. Physical touch and screen-reader tests remain separate.');
 }finally{
  if(browser)await browser.close();
  server.kill();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
