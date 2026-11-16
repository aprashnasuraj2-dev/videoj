import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.AFTERIMAGE_URL || 'https://afterimage.aafnaipatro.com/';
const expectedRelease = process.env.AFTERIMAGE_RELEASE || '6f271470a76161a55a423e5a67e7c5fb1cdb2f63';
const expectedVersion = process.env.AFTERIMAGE_VERSION || '0.3.9-touch-events';
const artifactDir = new URL('../artifacts/official-gates/', import.meta.url);
await mkdir(artifactDir, { recursive: true });

const report = { url: baseURL, expectedRelease, expectedVersion, checks: {}, journey: [], observations: {}, limitations: [] };
const check = (name, pass, detail = null) => {
  report.checks[name] = { pass: Boolean(pass), detail };
  if (!pass) throw new Error(name + (detail ? ': ' + JSON.stringify(detail) : ''));
};
const active = page => page.evaluate(() => {
  const el = document.activeElement;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    cls: typeof el.className === 'string' ? el.className : null,
    name: el.getAttribute('aria-label') || el.getAttribute('label') || el.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 100) || null,
    role: el.getAttribute('role') || null,
    width: rect.width,
    height: rect.height,
    outlineWidth: style.outlineWidth,
    outlineColor: style.outlineColor,
    color: style.color,
    backgroundColor: style.backgroundColor,
  };
});
const press = async key => {
  const before = await active(page);
  await page.keyboard.press(key);
  await page.waitForTimeout(35);
  const after = await active(page);
  report.journey.push({ key, before, after });
  return after;
};
const matches = selector => page.evaluate(sel => document.activeElement?.matches?.(sel) || false, selector);
const activeNamed = name => page.evaluate(n => {
  const el=document.activeElement;
  return (el?.getAttribute('aria-label') || el?.getAttribute('label') || '').trim() === n;
}, name);
const tabTo = async (selector, max = 32) => {
  for (let i = 0; i < max; i += 1) {
    if (await matches(selector)) return i;
    await press('Tab');
  }
  return null;
};
const rgb = value => {
  const m = String(value).match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)/i);
  return m ? m.slice(1, 4).map(Number) : null;
};
const lum = c => {
  const v = c.map(x => { const n=x/255; return n <= 0.03928 ? n/12.92 : ((n+0.055)/1.055)**2.4; });
  return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];
};
const ratio = (a,b) => (Math.max(lum(a),lum(b))+0.05)/(Math.min(lum(a),lum(b))+0.05);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
const page = await context.newPage();

try {
  const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  check('anonymous-http-ok', response?.ok(), { status: response?.status() });
  check('exact-release-header', response?.headers()?.['x-afterimage-release'] === expectedRelease, { header: response?.headers()?.['x-afterimage-release'] });
  await page.waitForFunction(() => {
    const r=window.__AFTERIMAGE_RELEASE__;
    return r?.video?.readyState >= 1 && Number.isFinite(r.video.duration);
  }, null, { timeout: 30000 });
  const boot = await page.evaluate(() => {
    const { video, player, version } = window.__AFTERIMAGE_RELEASE__;
    return {
      version, duration: video.duration, paused: video.paused, currentSrc: video.currentSrc,
      videojs: customElements.get('video-player')?.name || null,
      preFocused: document.activeElement !== document.body,
      keyboardCue: document.querySelector('.keyboard-cue')?.textContent?.trim() || null,
      controls: [...player.querySelectorAll('media-play-button,media-time-slider,media-mute-button,media-volume-slider,media-captions-button,media-fullscreen-button')].map(el => ({
        tag: el.tagName.toLowerCase(), name: el.getAttribute('aria-label') || el.getAttribute('label') || null,
        width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height
      }))
    };
  });
  report.observations.boot = boot;
  check('videojs-v10-runtime', boot.version === expectedVersion && Math.abs(boot.duration - 18) < 0.15 && Boolean(boot.videojs), boot);
  check('fresh-load-no-prefocus', !boot.preFocused, boot);
  check('keyboard-discovery-cue', /Tab through controls/.test(boot.keyboardCue || ''), boot.keyboardCue);

  await press('Tab');
  check('tab-order-1-play', await matches('media-play-button'), await active(page));
  const playFocus = await active(page);
  const deckBg = await page.evaluate(() => getComputedStyle(window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-deck')).backgroundColor);
  const focusRatio = ratio(rgb(playFocus.outlineColor), rgb(deckBg));
  const textRatio = ratio(rgb(playFocus.color), rgb(deckBg));
  check('visible-focus-contrast', parseFloat(playFocus.outlineWidth) >= 3 && focusRatio >= 3 && textRatio >= 4.5, { ...playFocus, deckBg, focusRatio, textRatio });
  check('play-target-44', playFocus.width >= 44 && playFocus.height >= 44, playFocus);

  await press('Enter');
  await page.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.video.paused, null, { timeout: 3000 });
  const playStart = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.currentTime);
  await page.waitForTimeout(650);
  const playAdvanced = await page.evaluate(() => ({ paused: window.__AFTERIMAGE_RELEASE__.video.paused, time: window.__AFTERIMAGE_RELEASE__.video.currentTime }));
  check('play-enter-real-state', !playAdvanced.paused && playAdvanced.time > playStart + 0.3, { playStart, playAdvanced });

  await press('Space');
  await page.waitForFunction(() => window.__AFTERIMAGE_RELEASE__.video.paused, null, { timeout: 3000 });
  const pauseAt = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.currentTime);
  await page.waitForTimeout(350);
  const pauseAfter = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.currentTime);
  check('pause-space-real-state', Math.abs(pauseAfter - pauseAt) < 0.12, { pauseAt, pauseAfter });
  await press('Enter');
  await page.waitForFunction(() => !window.__AFTERIMAGE_RELEASE__.video.paused, null, { timeout: 3000 });

  await press('Tab');
  check('tab-order-2-seek', await activeNamed('Seek'), await active(page));
  const seekFocusStyle = await page.evaluate(() => {
    const player=window.__AFTERIMAGE_RELEASE__.player;
    const parent=player.querySelector('media-time-slider');
    const rect=parent.getBoundingClientRect(), style=getComputedStyle(parent), deck=getComputedStyle(player.querySelector('.afterimage-deck'));
    return {width:rect.width,height:rect.height,outlineWidth:style.outlineWidth,outlineColor:style.outlineColor,deckBackground:deck.backgroundColor};
  });
  const seekFocusRatio=ratio(rgb(seekFocusStyle.outlineColor),rgb(seekFocusStyle.deckBackground));
  check('seek-focus-visible-target',seekFocusStyle.height>=44&&parseFloat(seekFocusStyle.outlineWidth)>=3&&seekFocusRatio>=3,{...seekFocusStyle,seekFocusRatio});
  await press('Shift+Tab');
  check('shift-tab-reversible', await matches('media-play-button'), await active(page));
  await press('Tab');
  const seekBefore = await page.evaluate(() => ({ time: window.__AFTERIMAGE_RELEASE__.video.currentTime, label: window.__AFTERIMAGE_RELEASE__.player.querySelector('media-time[type="current"]')?.textContent?.trim() }));
  await press('ArrowRight'); await press('ArrowRight'); await press('ArrowRight');
  await page.waitForTimeout(120);
  const seekAfter = await page.evaluate(() => ({ time: window.__AFTERIMAGE_RELEASE__.video.currentTime, label: window.__AFTERIMAGE_RELEASE__.player.querySelector('media-time[type="current"]')?.textContent?.trim() }));
  check('seek-keyboard-real-media', seekAfter.time > seekBefore.time + 1.5 && seekAfter.label !== seekBefore.label, { seekBefore, seekAfter });

  await press('Tab');
  check('tab-order-3-mute', await matches('media-mute-button'), await active(page));
  const muted0 = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.muted);
  await press('Enter');
  await page.waitForFunction(v => window.__AFTERIMAGE_RELEASE__.video.muted !== v, muted0, { timeout: 2000 });
  const muted1 = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.muted);
  await press('Space');
  await page.waitForFunction(v => window.__AFTERIMAGE_RELEASE__.video.muted !== v, muted1, { timeout: 2000 });
  const muted2 = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.muted);
  check('mute-keyboard-toggle', muted1 !== muted0 && muted2 === muted0, { muted0, muted1, muted2 });

  await press('Tab');
  check('tab-order-4-volume', await activeNamed('Volume'), await active(page));
  const volumeBox = await page.evaluate(() => {
    const el=window.__AFTERIMAGE_RELEASE__.player.querySelector('media-volume-slider');
    const rect=el.getBoundingClientRect(), style=getComputedStyle(el), deck=getComputedStyle(window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-deck'));
    return {width:rect.width,height:rect.height,outlineWidth:style.outlineWidth,outlineColor:style.outlineColor,deckBackground:deck.backgroundColor};
  });
  const volumeFocusRatio=ratio(rgb(volumeBox.outlineColor),rgb(volumeBox.deckBackground));
  check('volume-target-focus-44', volumeBox.width >= 44 && volumeBox.height >= 44 && parseFloat(volumeBox.outlineWidth)>=3 && volumeFocusRatio>=3, {...volumeBox,volumeFocusRatio});
  const volume0 = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.volume);
  await press('ArrowLeft'); await press('ArrowLeft');
  const volumeLow = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.volume);
  await press('ArrowRight');
  const volumeHigh = await page.evaluate(() => window.__AFTERIMAGE_RELEASE__.video.volume);
  check('volume-keyboard-real-media', volumeLow < volume0 && volumeHigh > volumeLow, { volume0, volumeLow, volumeHigh });

  await press('Tab');
  check('tab-order-5-captions', await matches('media-captions-button'), await active(page));
  await press('Enter');
  await page.waitForFunction(() => {
    const track=window.__AFTERIMAGE_RELEASE__.video.textTracks?.[0];
    return track?.mode === 'showing' && (track.cues?.length || 0) > 0;
  }, null, { timeout: 5000 });
  const captions = await page.evaluate(() => {
    const {video,player}=window.__AFTERIMAGE_RELEASE__;
    const visibleMenus=[...player.querySelectorAll('[role="menu"],[role="listbox"],media-menu')].filter(el=>el.getBoundingClientRect().width>0 && el.getBoundingClientRect().height>0);
    return { mode:video.textTracks[0]?.mode, cues:video.textTracks[0]?.cues?.length || 0, active:video.textTracks[0]?.activeCues?.[0]?.text || null, visibleMenuCount:visibleMenus.length };
  });
  check('captions-keyboard-operable', captions.mode === 'showing' && captions.cues === 3, captions);
  if (captions.visibleMenuCount === 0) {
    report.limitations.push('The one-track Video.js captions component is a direct toggle on this release; there is no captions popup to dismiss.');
    await press('Escape');
    check('captions-direct-toggle-not-trapped', await matches('media-captions-button'), await active(page));
  } else {
    await press('Escape');
    check('captions-menu-escape', await matches('media-captions-button'), await active(page));
  }

  await press('Tab');
  check('tab-order-6-fullscreen', await matches('media-fullscreen-button'), await active(page));
  await page.screenshot({ path: new URL('keyboard-focus-fullscreen.png', artifactDir).pathname });
  await press('Enter');
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
  const full = await page.evaluate(() => {
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    const wrapper=player.querySelector('.afterimage');
    const stage=player.querySelector('.afterimage-stage').getBoundingClientRect();
    const deck=player.querySelector('.afterimage-deck').getBoundingClientRect();
    const play=player.querySelector('media-play-button').getBoundingClientRect();
    return {
      exactWrapper: document.fullscreenElement === wrapper,
      stageVisible: stage.width>0 && stage.height>0,
      deckBottom: deck.bottom, viewportHeight: innerHeight,
      playVisible: play.width>=44 && play.height>=44,
      captionMode: video.textTracks[0]?.mode,
      activeCue: video.textTracks[0]?.activeCues?.[0]?.text || null
    };
  });
  check('fullscreen-keyboard-wrapper-fit', full.exactWrapper && full.stageVisible && full.deckBottom <= full.viewportHeight + 1 && full.playVisible, full);
  check('captions-survive-fullscreen', full.captionMode === 'showing', full);
  await page.screenshot({ path: new URL('keyboard-fullscreen-captions.png', artifactDir).pathname });
  await press('Escape');
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  check('fullscreen-escape-exit', await matches('media-fullscreen-button'), await active(page));
  await press('Space');
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
  const tabsBackToFullscreen = await tabTo('media-fullscreen-button');
  check('fullscreen-control-reachable-inside-fullscreen', tabsBackToFullscreen !== null, { tabs: tabsBackToFullscreen, active: await active(page) });
  await press('Space');
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  check('fullscreen-visible-control-exit', await matches('media-fullscreen-button'), await active(page));

  const toExample = await tabTo('[data-afterimage-example]');
  check('keyboard-tabs-to-example', toExample !== null, { tabs: toExample, active: await active(page) });
  await press('Enter');
  await page.waitForFunction(() => {
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return !player.querySelector('.afterimage-reference')?.hidden &&
      !player.querySelector('[data-afterimage-example]')?.disabled &&
      video.currentTime > 12.6 && video.currentTime < 13.8;
  }, null, { timeout: 8000 });
  const pair = await page.evaluate(() => {
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return { seamFocused:document.activeElement===player.querySelector('.afterimage-seam-control'), pinned:player.querySelector('[data-afterimage-pinned]')?.textContent?.trim(), now:player.querySelector('[data-afterimage-now]')?.textContent?.trim(), delta:player.querySelector('[data-afterimage-delta]')?.textContent?.trim(), paused:video.paused };
  });
  check('keyboard-authored-pair', pair.seamFocused && pair.pinned==='00:05' && pair.delta==='+00:08' && !pair.paused, pair);
  await press('ArrowLeft'); const revealLeft=await page.evaluate(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-seam-control').value);
  await press('ArrowRight'); const revealRight=await page.evaluate(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-seam-control').value);
  await press('Home'); const revealHome=await page.evaluate(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-seam-control').value);
  await press('End'); const revealEnd=await page.evaluate(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-seam-control').value);
  check('comparison-range-keys', Number(revealRight)>Number(revealLeft) && revealHome==='0' && revealEnd==='100', {revealLeft,revealRight,revealHome,revealEnd});
  await page.screenshot({ path: new URL('keyboard-comparison-focus.png', artifactDir).pathname });

  await press('Escape');
  check('comparison-escape-focus-compare', await matches('[data-afterimage-compare]'), await active(page));
  await press('Enter');
  check('comparison-enter-reopen-range-focus', await matches('.afterimage-seam-control'), await active(page));

  const toClose = await tabTo('[data-afterimage-close]');
  check('close-keyboard-reachable', toClose !== null, {tabs:toClose, active:await active(page)});
  await press('Enter');
  check('close-keyboard-operable-focus-compare', await matches('[data-afterimage-compare]'), await active(page));
  await press('Enter');
  check('compare-keyboard-reopen', await matches('.afterimage-seam-control'), await active(page));

  for (const [selector, expected] of [['[data-afterimage-preset="100"]','100'],['[data-afterimage-preset="50"]','50'],['[data-afterimage-preset="0"]','0']]) {
    const tabs=await tabTo(selector);
    check('preset-reachable-'+expected, tabs !== null, {tabs,active:await active(page)});
    await press('Enter');
    const value=await page.evaluate(()=>window.__AFTERIMAGE_RELEASE__.player.querySelector('.afterimage-seam-control').value);
    check('preset-operable-'+expected, value===expected, {value});
  }

  const toClear = await tabTo('[data-afterimage-clear]');
  check('clear-keyboard-reachable', toClear !== null, {tabs:toClear,active:await active(page)});
  await press('Enter');
  const cleared=await page.evaluate(()=>{
    const {player,video}=window.__AFTERIMAGE_RELEASE__;
    return {referenceHidden:player.querySelector('.afterimage-reference')?.hidden, relationHidden:player.querySelector('.afterimage-relation')?.hidden, pinFocused:document.activeElement===player.querySelector('[data-afterimage-pin]'), paused:video.paused};
  });
  check('clear-keyboard-operable', cleared.referenceHidden && cleared.relationHidden && cleared.pinFocused && !cleared.paused, cleared);

  report.pass=true;
} catch (error) {
  report.pass=false;
  report.error=String(error?.stack || error);
  throw error;
} finally {
  await writeFile(new URL('report.json', artifactDir), JSON.stringify(report,null,2)+'\n');
  await context.close();
  await browser.close();
}
