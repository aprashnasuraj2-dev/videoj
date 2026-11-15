import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices, webkit } from 'playwright';
import { preview } from 'vite';

// This is simulated-browser QA, NOT a physical mobile or screen-reader certification.
let server;
let browser;
let baseURL;
const captureDir = process.env.DETOUR_PHASE7_CAPTURES;
before(async () => {
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  baseURL = server.resolvedUrls.local[0];
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  if (captureDir) mkdirSync(captureDir, { recursive: true });
});
after(async () => { await browser?.close(); await server?.close(); });

async function ready(page) {
  await page.goto(baseURL);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video?.readyState >= 2 && video.seekable.length > 0;
  });
  await page.locator('.detour-hold:enabled').waitFor();
}
async function seek(page, at) {
  await page.locator('video-player').evaluate((node, time) => node.store.seek(time), at);
}
async function capture(page, name) {
  if (captureDir) await page.locator('.detour').screenshot({ path: join(captureDir, name + '.png'), animations: 'disabled' });
}
async function geometry(page, label) {
  const result = await page.locator('.detour').evaluate(root => {
    const bounds = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
    const rail = root.querySelector('media-time-slider');
    const required = [
      root.querySelector('media-play-button'),
      rail,
      root.querySelector('.detour-clock'),
      root.querySelector('media-mute-button'),
      root.querySelector('media-fullscreen-button'),
      root.querySelector('.detour-place, detour-place'),
    ].filter(Boolean);
    // A child of a hidden parent can retain display:block while occupying 0x0.
    const visible = node => {
      if (!node || !node.getClientRects().length) return false;
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden';
    };
    const hitTargets = [root.querySelector('.detour-hold'), root.querySelector('.detour-return'), root.querySelector('.detour-stay')].filter(visible);
    const rect = bounds(root);
    return {
      rect,
      scrollWidth:root.scrollWidth, clientWidth:root.clientWidth,
      controls:required.map(node=>({name:node.tagName.toLowerCase(),rect:bounds(node),visible:visible(node)})),
      targets:hitTargets.map(node=>({name:node.className,rect:bounds(node)})),
      menuVisible:visible(root.querySelector('.detour-menu')),
    };
  });
  assert.ok(result.scrollWidth <= result.clientWidth + 1, `${label}: horizontal overflow ${JSON.stringify(result)}`);
  for (const target of result.targets) {
    assert.ok(target.rect.width >= 43.5 && target.rect.height >= 43.5,
      `${label}: target too small ${JSON.stringify(target)}`);
    assert.ok(target.rect.x >= result.rect.x - 2 && target.rect.right <= result.rect.right + 2,
      `${label}: target clipped ${JSON.stringify(target)}`);
  }
  for (const control of result.controls) assert.ok(control.visible, `${label}: missing ${control.name}`);
  return result;
}

test('061 Chromium full responsive state/capture matrix at actual embed widths', { timeout: 120000 }, async t => {
  const widths = [240, 320, 375, 768, 1280];
  const table = [];
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width: width + 48, height: 960 } });
    try {
      await ready(page);
      await page.locator('.demo').evaluate((node, width) => { node.style.width = width + 'px'; }, width);
      assert.ok(Math.abs((await page.locator('.detour').boundingBox()).width - width) < 2);
      await geometry(page, `${width}/idle`);
      await capture(page, `${width}-idle`);
      await seek(page, 42.35);
      await page.getByRole('button', { name:'Keep my place' }).click();
      await seek(page, 18);
      await geometry(page, `${width}/held`);
      await capture(page, `${width}-held`);
      await page.locator('media-captions-button').click();
      await page.waitForFunction(() => document.querySelector('video').textTracks[0]?.mode === 'showing');
      await geometry(page, `${width}/captions`);
      await capture(page, `${width}-captions`);
      const settings = page.getByRole('button', { name:'Playback settings' });
      await settings.click();
      assert.equal(await page.locator('.detour-menu').isVisible(), true);
      await geometry(page, `${width}/settings`);
      await capture(page, `${width}-settings`);
      await page.keyboard.press('Escape');
      assert.equal(await settings.evaluate(el => document.activeElement === el), true);
      await page.locator('video-player').evaluate(player => {
        player.__phase7Store = player.store;
        Object.defineProperty(player, 'store', {
          configurable: true,
          value: Object.create(player.store, { seek: { value: () => new Promise(() => {}) } }),
        });
      });
      await page.getByRole('button', { name:'Return to 00:42' }).click();
      await page.getByRole('button', { name:'Returning…' }).waitFor();
      await geometry(page, `${width}/pending`);
      await capture(page, `${width}-pending`);
      table.push({ width, states:5, source:'built Vite demo / Playwright Chromium' });
    } finally { await page.close(); }
  }
  t.diagnostic('Actual responsive states: ' + JSON.stringify(table));
});

test('063 keyboard-only Hold, two seeks, Return, Stay, and Settings Escape restore focus', { timeout: 45000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 375, height: 780 } });
  try {
    await ready(page);
    const hold = page.getByRole('button',{name:'Keep my place'});
    const seekSlider = page.getByRole('slider',{name:'Seek'});
    await seek(page, 42.35);
    await hold.focus();
    await page.keyboard.press('Space');
    await page.getByRole('button',{name:'Return to 00:42'}).waitFor();
    await seekSlider.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('video').currentTime < 1);
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('video').currentTime > 62);
    const returnButton = page.getByRole('button',{name:'Return to 00:42'});
    await returnButton.focus();
    await page.keyboard.press('Enter');
    await hold.waitFor();
    assert.ok(Math.abs(await page.locator('video').evaluate(v=>v.currentTime) - 42.35) < 0.5);
    await hold.focus();
    await page.keyboard.press('Enter');
    await seekSlider.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('video').currentTime < 1);
    const time = await page.locator('video').evaluate(v=>v.currentTime);
    const stay = page.getByRole('button',{name:'Stay here'});
    await stay.focus();
    await page.keyboard.press('Space');
    await hold.waitFor();
    assert.ok(Math.abs(await page.locator('video').evaluate(v=>v.currentTime) - time) < 0.1);
    const settings = page.getByRole('button',{name:'Playback settings'});
    await settings.focus();
    await page.keyboard.press('Enter');
    await page.locator('.detour-menu [data-rate="1.25"]').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.detour-menu').isVisible(),false);
    assert.equal(await settings.evaluate(node=>node===document.activeElement),true);
    t.diagnostic('Chromium desktop keyboard-only controls, slider, Escape and return/stay checked at 375px.');
  } finally { await page.close(); }
});

test('065 reduced motion, forced colors and 200% layout zoom retain core controls', { timeout: 45000 }, async t => {
  const page = await browser.newPage({ viewport:{width:800,height:900}, reducedMotion:'reduce' });
  try {
    await ready(page);
    await page.locator('.demo').evaluate(node => { node.style.width='320px'; });
    await seek(page,42.35);
    await page.getByRole('button',{name:'Keep my place'}).click();
    const animation = await page.locator('.detour-origin').evaluate(node=>getComputedStyle(node).animationName);
    assert.equal(animation,'none');
    await geometry(page,'320/reduced-motion');
    await capture(page,'320-reduced-motion');
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    await geometry(page,'320/forced-colors');
    await capture(page,'320-forced-colors');
    await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
    await page.locator('.demo').evaluate(node=>{node.style.width='640px';node.style.zoom='2';});
    await geometry(page,'320-css-px/200pct-css-zoom');
    await capture(page,'320-zoom200');
    t.diagnostic('Zoom is CSS emulation, NOT native browser 200% zoom or physical accessibility certification.');
  } finally { await page.close(); }
});

test('062 emulated touch path is not counted as real Android/iOS', { timeout: 45000 }, async t => {
  const context = await browser.newContext({ ...devices['Pixel 7'], viewport:{width:412,height:915} });
  const page = await context.newPage();
  try {
    await ready(page);
    await seek(page,42.35);
    await page.getByRole('button',{name:'Keep my place'}).tap();
    const slider = page.locator('media-time-slider');
    await slider.scrollIntoViewIfNeeded();
    const rect = await slider.boundingBox();
    await slider.tap({ position:{ x:rect.width*0.30, y:rect.height/2 } });
    await page.waitForTimeout(200);
    const touched = await page.locator('video').evaluate(video => video.currentTime);
    t.diagnostic(`Pixel emulation touch seek landed at ${touched.toFixed(3)} seconds`);
    assert.ok(touched >= 16 && touched <= 25, `Touch seek did not land near 19s: ${touched}`);
    await page.getByRole('button',{name:'Return to 00:42'}).tap();
    await page.getByRole('button',{name:'Keep my place'}).waitFor();
    assert.ok(Math.abs(await page.locator('video').evaluate(v=>v.currentTime)-42.35)<0.5);
    t.diagnostic('Pixel descriptor in Playwright Chromium: tap/seek/return only; no physical Android claim.');
  } finally { await context.close(); }
});

test('069 five cached-run signature traces have no observed long task above 50ms', { timeout: 90000 }, async t => {
  const context = await browser.newContext({viewport:{width:320,height:740}});
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__detourLongTasks = [];
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__detourLongTasks.push({start:entry.startTime,ms:entry.duration}); })
        .observe({entryTypes:['longtask']});
    }
  });
  try {
    const durations = [];
    for (let n=0;n<5;n++) {
      const first = performance.now();
      await ready(page);
      await page.evaluate(()=>{window.__detourLongTasks=[];});
      const start = performance.now();
      await seek(page,42.35);
      await page.getByRole('button',{name:'Keep my place'}).click();
      await seek(page,18);
      await seek(page,24);
      await page.getByRole('button',{name:'Return to 00:42'}).click();
      await page.getByRole('button',{name:'Keep my place'}).waitFor();
      await page.waitForTimeout(120);
      const tasks = await page.evaluate(()=>window.__detourLongTasks);
      const max = tasks.reduce((m,x)=>Math.max(m,x.ms),0);
      assert.ok(max<=50,`Run ${n+1} had ${max}ms long task`);
      durations.push({n:n+1,wallMs:Math.round(performance.now()-start),observedLongTasks:tasks.length,maxLongTaskMs:max});
    }
    t.diagnostic('Chromium 320px warm-process signature observations: '+JSON.stringify(durations));
  } finally {await context.close();}
});

test('061 emulated iPhone landscape WebKit can hold and return without clipping', { timeout: 45000 }, async t => {
  const mobileBrowser = await webkit.launch();
  const iphone = devices['iPhone 13'];
  const context = await mobileBrowser.newContext({
    userAgent:iphone.userAgent,viewport:{width:844,height:390},
    deviceScaleFactor:iphone.deviceScaleFactor,isMobile:true,hasTouch:true,
  });
  try {
    const page = await context.newPage();
    await ready(page);
    await page.locator('.demo').evaluate(node => { node.style.width='800px'; });
    await geometry(page,'emulated-iPhone-landscape/idle');
    await seek(page,42.35);
    await page.getByRole('button',{name:'Keep my place'}).click();
    await seek(page,18);
    await geometry(page,'emulated-iPhone-landscape/held');
    await capture(page,'emulated-iPhone-landscape-held');
    await page.getByRole('button',{name:'Return to 00:42'}).click();
    await page.getByRole('button',{name:'Keep my place'}).waitFor();
    assert.ok(Math.abs(await page.locator('video').evaluate(v=>v.currentTime)-42.35)<0.5);
    t.diagnostic('Linux WebKit with iPhone UA landscape geometry: no physical Safari/iOS claim.');
  } finally {await context.close(); await mobileBrowser.close();}
});

test('063 Shift+Tab stays inside visible controls and failed Return keeps focus', { timeout: 30000 }, async t => {
  const page = await browser.newPage({viewport:{width:375,height:800}});
  try {
    await ready(page);
    const settings=page.getByRole('button',{name:'Playback settings'});
    await settings.focus();
    await page.keyboard.press('Shift+Tab');
    const focus=await page.evaluate(()=>{
      const element=document.activeElement;
      const rect=element?.getBoundingClientRect();
      return {inside:!!element?.closest('.detour'),width:rect?.width??0,height:rect?.height??0};
    });
    assert.ok(focus.inside&&focus.width>0&&focus.height>0, 'Reverse tab landed outside visible player');
    await seek(page,42.35);
    await page.getByRole('button',{name:'Keep my place'}).click();
    await seek(page,18);
    await page.locator('video-player').evaluate(player=>{
      player.__phase7RealStore=player.store;
      Object.defineProperty(player,'store',{configurable:true,
        value:Object.create(player.store,{seek:{value:()=>Promise.reject(new Error('Controlled phase7 reject'))}})});
    });
    const back=page.getByRole('button',{name:'Return to 00:42'});
    await back.focus();
    await page.keyboard.press('Enter');
    await page.locator('.detour-notice:visible').waitFor();
    assert.equal(await back.evaluate(node=>node===document.activeElement),true);
    assert.equal(await back.getAttribute('aria-disabled'),'false');
    await page.locator('video-player').evaluate(player=>{
      Object.defineProperty(player,'store',{configurable:true,value:player.__phase7RealStore});
    });
    t.diagnostic('Desktop Chromium reverse tab and controlled rejected-return focus recovery.');
  } finally {await page.close();}
});
