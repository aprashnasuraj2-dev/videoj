import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifactDir = join(root, 'artifacts', 'hardening');
let server;
let browser;
let baseURL;
const report = {
  gate: 'fullscreen-roundtrip',
  browser: 'Chromium headed under Xvfb/desktop CI',
  viewport: { width: 1280, height: 800 },
  checks: {},
  observations: {},
  limitations: ['Fullscreen API behavior is browser/runner-specific; this gate does not represent physical Safari/iOS.'],
};

function check(name, pass, detail = null) {
  report.checks[name] = { pass: Boolean(pass), detail };
  assert.ok(pass, `${name}: ${JSON.stringify(detail)}`);
}

function fixtureURL() {
  const url = new URL(baseURL);
  url.searchParams.set('fixture', 'navigation-study');
  return url.href;
}

async function ready(page) {
  await page.goto(fixtureURL(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video?.readyState >= 2 && video.seekable.length > 0;
  }, null, { timeout: 20000 });
  await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
}

async function seek(page, seconds) {
  const arrival = await page.locator('video-player').evaluate((p, time) => p.store.seek(time), seconds);
  assert.ok(Math.abs(arrival - seconds) < 0.5, `Seek landed at ${arrival}, expected ${seconds}`);
  await page.waitForFunction(time => {
    const v = document.querySelector('video');
    return !v.seeking && Math.abs(v.currentTime - time) < 0.5;
  }, seconds, { timeout: 10000 });
}

async function active(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    const r = el?.getBoundingClientRect();
    return {
      tag: el?.tagName?.toLowerCase() || null,
      label: el?.getAttribute?.('aria-label') || el?.textContent?.trim() || '',
      width: r?.width || 0,
      height: r?.height || 0,
      inside: Boolean(el?.closest?.('.detour')),
    };
  });
}

async function tabTo(page, selector, limit = 40) {
  for (let i = 0; i <= limit; i += 1) {
    if (await page.evaluate(s => document.activeElement?.matches?.(s) || false, selector)) return i;
    await page.keyboard.press('Tab');
  }
  return null;
}

async function fullscreenLabel(page) {
  return page.locator('media-fullscreen-button').getAttribute('aria-label');
}

async function waitLabel(page, expected) {
  await page.waitForFunction(label =>
    document.querySelector('media-fullscreen-button')?.getAttribute('aria-label') === label,
    expected, { timeout: 3000 });
}

before(async () => {
  mkdirSync(artifactDir, { recursive: true });
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  baseURL = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
});

after(async () => {
  report.pass = Object.values(report.checks).every(entry => entry.pass);
  writeFileSync(join(artifactDir, 'fullscreen-roundtrip.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
});

test('fullscreen-roundtrip: keyboard entry, geometry, settings/captions persistence, Escape and second pass', { timeout: 65000 }, async () => {
  const context = await browser.newContext({ viewport: report.viewport });
  const page = await context.newPage();
  try {
    await ready(page);
    const support = await page.locator('video-player').evaluate(p => ({
      documentEnabled: document.fullscreenEnabled,
      availability: p.store?.fullscreenAvailability,
      initialLabel: p.querySelector('media-fullscreen-button')?.getAttribute('aria-label'),
    }));
    report.observations.support = support;
    check('fullscreen-supported',
      support.documentEnabled && support.availability === 'available',
      support);
    check('initial-label-enter', support.initialLabel === 'Enter fullscreen', support);

    await seek(page, 42.35);
    await page.locator('.detour-hold').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Return to 00:42' }).waitFor();
    await seek(page, 18);

    await page.locator('media-captions-button').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('video').textTracks[0]?.mode === 'showing');
    const captionBefore = await page.locator('video').evaluate(v => ({
      mode: v.textTracks[0]?.mode,
      cueCount: v.textTracks[0]?.cues?.length || 0,
      active: v.textTracks[0]?.activeCues?.length || 0,
    }));
    check('captions-keyboard-before-fullscreen',
      captionBefore.mode === 'showing' && captionBefore.cueCount > 0,
      captionBefore);

    const pausedBefore = await page.locator('video').evaluate(v => v.paused);
    await page.locator('media-fullscreen-button').focus();
    const focusedEntry = await active(page);
    check('fullscreen-control-keyboard-focused',
      focusedEntry.tag === 'media-fullscreen-button' && focusedEntry.width >= 44 && focusedEntry.height >= 44,
      focusedEntry);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
    await waitLabel(page, 'Exit fullscreen');

    const entered = await page.evaluate(() => {
      const player = document.querySelector('.detour');
      const screen = player.querySelector('.detour-screen').getBoundingClientRect();
      const shelf = player.querySelector('.detour-shelf').getBoundingClientRect();
      const play = player.querySelector('media-play-button').getBoundingClientRect();
      const seek = player.querySelector('media-time-slider').getBoundingClientRect();
      const ret = player.querySelector('.detour-return').getBoundingClientRect();
      const stay = player.querySelector('.detour-stay').getBoundingClientRect();
      const settings = player.querySelector('.detour-settings').getBoundingClientRect();
      return {
        fullscreenTag: document.fullscreenElement?.tagName || null,
        fullscreenClass: document.fullscreenElement?.className || null,
        viewport: { width: innerWidth, height: innerHeight },
        screen: { top: screen.top, bottom: screen.bottom, width: screen.width, height: screen.height },
        shelf: { top: shelf.top, bottom: shelf.bottom, width: shelf.width, height: shelf.height },
        controls: {
          play: { width: play.width, height: play.height, bottom: play.bottom },
          seek: { width: seek.width, height: seek.height, bottom: seek.bottom },
          ret: { width: ret.width, height: ret.height, bottom: ret.bottom },
          stay: { width: stay.width, height: stay.height, bottom: stay.bottom },
          settings: { width: settings.width, height: settings.height, bottom: settings.bottom },
        },
      };
    });
    report.observations.firstEntryGeometry = entered;
    check('fullscreen-wrapper-correct',
      /detour/.test(String(entered.fullscreenClass)) && entered.fullscreenTag === 'MEDIA-CONTAINER',
      entered);
    check('fullscreen-geometry-inside-viewport',
      entered.screen.width > 0 && entered.screen.height > 0
      && entered.screen.bottom <= entered.viewport.height + 1
      && entered.shelf.bottom <= entered.viewport.height + 1
      && Object.values(entered.controls).every(c => c.width > 0 && c.height > 0 && c.bottom <= entered.viewport.height + 1),
      entered);

    const captionInside = await page.locator('video').evaluate(v => ({
      mode: v.textTracks[0]?.mode,
      active: v.textTracks[0]?.activeCues?.length || 0,
      cueCount: v.textTracks[0]?.cues?.length || 0,
    }));
    check('captions-survive-fullscreen',
      captionInside.mode === 'showing' && captionInside.cueCount > 0,
      captionInside);

    const settingsTabs = await tabTo(page, '.detour-settings');
    check('settings-reachable-inside-fullscreen', settingsTabs !== null, { settingsTabs, active: await active(page) });
    await page.keyboard.press('Enter');
    check('settings-opens-inside-fullscreen', await page.locator('.detour-menu').isVisible(), await active(page));
    await page.keyboard.press('Tab');
    check('settings-first-rate-inside-fullscreen',
      /0\.75/.test((await active(page)).label),
      await active(page));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.detour-menu')?.hidden === true);
    check('settings-escape-keeps-fullscreen',
      Boolean(await page.evaluate(() => document.fullscreenElement))
      && await page.evaluate(() => document.activeElement?.matches?.('.detour-settings') || false),
      { active: await active(page), label: await fullscreenLabel(page) });

    const stateAfterMenu = await page.evaluate(() => ({
      returnVisible: document.querySelector('.detour-return')?.getBoundingClientRect().width > 0,
      stayVisible: document.querySelector('.detour-stay')?.getBoundingClientRect().width > 0,
      paused: document.querySelector('video').paused,
      captions: document.querySelector('video').textTracks[0]?.mode,
    }));
    check('held-and-playback-intent-survive-settings',
      stateAfterMenu.returnVisible && stateAfterMenu.stayVisible
      && stateAfterMenu.paused === pausedBefore && stateAfterMenu.captions === 'showing',
      stateAfterMenu);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    let escaped = !(await page.evaluate(() => Boolean(document.fullscreenElement)));
    if (!escaped) {
      const tabs = await tabTo(page, 'media-fullscreen-button');
      check('fullscreen-fallback-control-reachable', tabs !== null, { tabs, active: await active(page) });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
      escaped = true;
      report.observations.firstExit = 'visible fullscreen control';
    } else {
      report.observations.firstExit = 'Escape exited Fullscreen API';
    }
    check('first-fullscreen-exit', escaped, report.observations.firstExit);
    await waitLabel(page, 'Enter fullscreen');
    check('label-settled-after-first-exit', await fullscreenLabel(page) === 'Enter fullscreen', await fullscreenLabel(page));

    const afterExit = await page.locator('video').evaluate(v => ({
      captions: v.textTracks[0]?.mode,
      paused: v.paused,
    }));
    check('captions-survive-return-from-fullscreen',
      afterExit.captions === 'showing' && afterExit.paused === pausedBefore,
      afterExit);

    const tabsSecond = await tabTo(page, 'media-fullscreen-button');
    check('fullscreen-second-entry-reachable', tabsSecond !== null, { tabsSecond, active: await active(page) });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 });
    await waitLabel(page, 'Exit fullscreen');
    check('second-entry-label-exit', await fullscreenLabel(page) === 'Exit fullscreen', await fullscreenLabel(page));

    const tabsExit = await tabTo(page, 'media-fullscreen-button');
    check('fullscreen-control-reachable-while-fullscreen-second-pass',
      tabsExit !== null, { tabsExit, active: await active(page) });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
    await waitLabel(page, 'Enter fullscreen');
    check('final-label-enter', await fullscreenLabel(page) === 'Enter fullscreen', await fullscreenLabel(page));

    report.observations.labelSequence = [
      support.initialLabel,
      'Exit fullscreen',
      'Enter fullscreen',
      'Exit fullscreen',
      await fullscreenLabel(page),
    ];
    check('label-roundtrip-sequence',
      JSON.stringify(report.observations.labelSequence)
        === JSON.stringify(['Enter fullscreen', 'Exit fullscreen', 'Enter fullscreen', 'Exit fullscreen', 'Enter fullscreen']),
      report.observations.labelSequence);
  } finally {
    await context.close();
  }
});
