import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from 'playwright';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifactDir = join(root, 'artifacts', 'hardening');
const engines = { chromium, firefox, webkit };
const engineName = process.env.DETOUR_HARDENING_ENGINE || 'chromium';
let server;
let browser;
let baseURL;
const report = {
  gate: 'keyboard-full-journey',
  browser: engineName,
  viewport: { width: 1280, height: 900 },
  checks: {},
  observations: {},
  limitations: [],
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

async function active(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    const rect = el?.getBoundingClientRect();
    const style = el ? getComputedStyle(el) : null;
    const label = el?.getAttribute?.('aria-label')
      || el?.getAttribute?.('label')
      || el?.textContent?.trim()
      || '';
    return {
      tag: el?.tagName?.toLowerCase() || null,
      className: typeof el?.className === 'string' ? el.className : null,
      label,
      role: el?.getAttribute?.('role') || null,
      width: rect?.width || 0,
      height: rect?.height || 0,
      left: rect?.left || 0,
      top: rect?.top || 0,
      outlineWidth: style?.outlineWidth || null,
      outlineStyle: style?.outlineStyle || null,
      outlineColor: style?.outlineColor || null,
      color: style?.color || null,
      backgroundColor: style?.backgroundColor || null,
      insidePlayer: Boolean(el?.closest?.('.detour')),
    };
  });
}

async function matches(page, selector) {
  return page.evaluate(selector => document.activeElement?.matches?.(selector) || false, selector);
}

async function tabTo(page, selector, { reverse = false, limit = 40 } = {}) {
  for (let i = 0; i <= limit; i += 1) {
    if (await matches(page, selector)) return i;
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
  }
  return null;
}

async function keyboardSeekTo(page, seconds) {
  const slider = page.getByRole('slider', { name: 'Seek' });
  const tabs = await tabTo(page, 'media-time-slider media-slider-thumb');
  check(`seek-tab-reachable-${seconds}`, tabs !== null, { tabs, active: await active(page) });
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('video').currentTime < 0.5);
  for (let i = 0; i < seconds; i += 1) await page.keyboard.press('ArrowRight');
  await page.waitForFunction(target => {
    const v = document.querySelector('video');
    return !v.seeking && Math.abs(v.currentTime - target) < 0.75;
  }, seconds, { timeout: 12000 });
  return slider;
}

function cssContrastScript() {
  return () => {
    const parse = value => {
      const text = String(value).trim();
      if (/^#[0-9a-f]{6}$/i.test(text)) {
        return [1, 3, 5].map(i => parseInt(text.slice(i, i + 2), 16));
      }
      if (/^#[0-9a-f]{3}$/i.test(text)) {
        return [1, 2, 3].map(i => parseInt(text[i] + text[i], 16));
      }
      const match = text.match(/[\d.]+/g);
      return match && match.length >= 3 ? match.slice(0, 3).map(Number) : [0, 0, 0];
    };
    const lum = rgb => {
      const channel = x => {
        const s = x / 255;
        return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
      };
      const [r, g, b] = rgb.map(channel);
      return .2126 * r + .7152 * g + .0722 * b;
    };
    const contrast = (a, b) => {
      const la = lum(parse(a));
      const lb = lum(parse(b));
      const [hi, lo] = la > lb ? [la, lb] : [lb, la];
      return (hi + .05) / (lo + .05);
    };
    const player = document.querySelector('.detour');
    const active = document.activeElement;
    const activeStyle = getComputedStyle(active);
    const playerStyle = getComputedStyle(player);
    const playStyle = getComputedStyle(player.querySelector('media-play-button'));
    return {
      focusOutline: activeStyle.outlineColor,
      focusWidthPx: parseFloat(activeStyle.outlineWidth),
      adjacentSurface: playerStyle.getPropertyValue('--detour-shelf').trim(),
      focusContrast: contrast(activeStyle.outlineColor, playerStyle.getPropertyValue('--detour-shelf').trim()),
      controlColor: playStyle.color,
      controlContrast: contrast(playStyle.color, playerStyle.getPropertyValue('--detour-shelf').trim()),
    };
  };
}

before(async () => {
  assert.ok(engines[engineName], `Unsupported engine: ${engineName}`);
  mkdirSync(artifactDir, { recursive: true });
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  baseURL = server.resolvedUrls.local[0];
  browser = await engines[engineName].launch({
    args: engineName === 'chromium' ? ['--no-sandbox'] : [],
  });
});

after(async () => {
  report.pass = Object.values(report.checks).every(entry => entry.pass);
  writeFileSync(join(artifactDir, `keyboard-full-journey-${engineName}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
});

test('keyboard-full-journey: clean first focus, deterministic tab sequence and quantified focus visibility', { timeout: 35000 }, async () => {
  const page = await browser.newPage({ viewport: report.viewport });
  try {
    await ready(page);
    const initial = await active(page);
    check('no-artificial-prefocus', !initial.insidePlayer, initial);

    await page.keyboard.press('Tab');
    const first = await active(page);
    check('first-tab-visible-player-control',
      first.insidePlayer && first.width > 0 && first.height > 0
      && first.left >= 0 && first.top >= 0,
      first);
    report.observations.firstFocus = first;

    const contrast = await page.evaluate(cssContrastScript());
    report.observations.focusMetrics = contrast;
    check('focus-indicator-thickness', contrast.focusWidthPx >= 3, contrast);
    check('focus-indicator-contrast', contrast.focusContrast >= 3, contrast);
    check('control-text-icon-contrast', contrast.controlContrast >= 4.5, contrast);

    const sequence = [first];
    const seen = new Set([`${first.tag}|${first.label}`]);
    for (let i = 0; i < 13; i += 1) {
      await page.keyboard.press('Tab');
      const item = await active(page);
      if (!item.insidePlayer || item.width <= 0 || item.height <= 0) break;
      const key = `${item.tag}|${item.label}`;
      if (seen.has(key)) break;
      seen.add(key);
      sequence.push(item);
    }
    report.observations.initialTabSequence = sequence;
    const tags = sequence.map(item => item.tag);
    for (const required of [
      'media-play-button', 'media-mute-button',
      'media-captions-button', 'media-fullscreen-button',
    ]) check(`tab-sequence-${required}`, tags.includes(required), { tags, sequence });
    check('tab-sequence-seek-slider',
      sequence.some(item => item.role === 'slider' && /Seek/i.test(item.label)),
      sequence);
    if (await page.locator('media-volume-slider').isVisible()) {
      check('tab-sequence-volume-slider',
        sequence.some(item => item.role === 'slider' && /Volume/i.test(item.label)),
        sequence);
    }
    check('tab-sequence-keep', sequence.some(item => /Keep my place/.test(item.label)), sequence);
    check('tab-sequence-settings', sequence.some(item => /Playback settings/i.test(item.label)), sequence);

    const settingsIndex = sequence.findIndex(item => /Playback settings/i.test(item.label));
    if (settingsIndex >= 0) {
      await page.locator('.detour-settings').focus();
      await page.keyboard.press('Shift+Tab');
      const reverse = await active(page);
      check('reverse-tab-visible-no-trap', reverse.insidePlayer && reverse.width > 0 && reverse.height > 0, reverse);
      report.observations.reverseFromSettings = reverse;
    }
  } finally {
    await page.close();
  }
});

test('keyboard-full-journey: real Play/Pause, mute/volume, captions and Settings are keyboard-operable', { timeout: 45000 }, async () => {
  const page = await browser.newPage({ viewport: report.viewport });
  try {
    await ready(page);

    const playTabs = await tabTo(page, 'media-play-button');
    check('play-tab-reachable', playTabs !== null, { playTabs, active: await active(page) });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return !v.paused && v.currentTime > 0.08;
    });
    const playing = await page.locator('video').evaluate(v => ({ paused: v.paused, time: v.currentTime }));
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('video').paused);
    const paused = await page.locator('video').evaluate(v => ({ paused: v.paused, time: v.currentTime }));
    await page.waitForTimeout(180);
    const stopped = await page.locator('video').evaluate(v => v.currentTime);
    check('keyboard-play-pause-real-media',
      !playing.paused && playing.time > 0 && paused.paused && Math.abs(stopped - paused.time) < 0.08,
      { playing, paused, stopped });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('video').paused);

    const muteTabs = await tabTo(page, 'media-mute-button');
    check('mute-tab-reachable', muteTabs !== null, { muteTabs, active: await active(page) });
    const muteBefore = await page.locator('video').evaluate(v => v.muted);
    await page.keyboard.press('Enter');
    const muteAfterEnter = await page.locator('video').evaluate(v => v.muted);
    await page.keyboard.press('Space');
    const muteAfterSpace = await page.locator('video').evaluate(v => v.muted);
    check('keyboard-mute-real-state',
      muteAfterEnter !== muteBefore && muteAfterSpace === muteBefore,
      { muteBefore, muteAfterEnter, muteAfterSpace });

    const capability = await page.locator('video-player').evaluate(p => ({
      volume: p.store?.volumeAvailability,
      muted: p.store?.mutedAvailability,
    }));
    report.observations.mediaCapabilities = capability;
    if (capability.volume === 'available') {
      const volumeTabs = await tabTo(page, 'media-volume-slider media-slider-thumb');
      check('volume-tab-reachable', volumeTabs !== null, { volumeTabs, active: await active(page) });
      const v0 = await page.locator('video').evaluate(v => v.volume);
      await page.keyboard.press('ArrowLeft');
      const v1 = await page.locator('video').evaluate(v => v.volume);
      await page.keyboard.press('ArrowRight');
      const v2 = await page.locator('video').evaluate(v => v.volume);
      check('keyboard-volume-real-state', v1 < v0 && v2 > v1, { v0, v1, v2 });
      const box = await page.locator('media-volume-slider').boundingBox();
      check('volume-visible-target', Boolean(box && box.height >= 44 && box.width >= 44), box);
    } else {
      check('volume-capability-truthful',
        capability.volume === 'unsupported' && await page.locator('media-volume-slider').isVisible() === false,
        capability);
    }

    const captionsTabs = await tabTo(page, 'media-captions-button');
    check('captions-tab-reachable', captionsTabs !== null, { captionsTabs, active: await active(page) });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const track = document.querySelector('video').textTracks[0];
      return track?.mode === 'showing' && (track.cues?.length || 0) > 0;
    }, null, { timeout: 10000 });
    const track = await page.locator('video').evaluate(v => ({
      mode: v.textTracks[0]?.mode,
      cueCount: v.textTracks[0]?.cues?.length || 0,
    }));
    check('keyboard-captions-real-track', track.mode === 'showing' && track.cueCount > 0, track);
    await page.keyboard.press('Escape');
    const afterCaptionEscape = await active(page);
    check('captions-escape-no-trap',
      afterCaptionEscape.insidePlayer && afterCaptionEscape.width > 0 && afterCaptionEscape.height > 0,
      afterCaptionEscape);

    const settingsTabs = await tabTo(page, '.detour-settings');
    check('settings-tab-reachable', settingsTabs !== null, { settingsTabs, active: await active(page) });
    await page.keyboard.press('Enter');
    check('settings-opens', await page.locator('.detour-menu').isVisible(), await active(page));
    await page.keyboard.press('Tab');
    const rateFocus = await active(page);
    check('settings-first-rate-reachable', /0\.75/.test(rateFocus.label), rateFocus);
    const intentBeforeEscape = await page.locator('video').evaluate(v => ({ paused: v.paused, rate: v.playbackRate }));
    await page.keyboard.press('Escape');
    check('settings-escape-focus-returns',
      await page.locator('.detour-menu').isVisible() === false
      && await matches(page, '.detour-settings'),
      { active: await active(page) });
    const intentAfterEscape = await page.locator('video').evaluate(v => ({ paused: v.paused, rate: v.playbackRate }));
    check('settings-escape-preserves-playback-intent',
      intentBeforeEscape.paused === intentAfterEscape.paused && intentBeforeEscape.rate === intentAfterEscape.rate,
      { intentBeforeEscape, intentAfterEscape });
  } finally {
    await page.close();
  }
});

test('keyboard-full-journey: Keep → two keyboard seeks → Return and Keep → seek → Stay preserve semantics and focus', { timeout: 70000 }, async () => {
  const page = await browser.newPage({ viewport: report.viewport });
  try {
    await ready(page);

    await keyboardSeekTo(page, 42);
    const holdTabs = await tabTo(page, '.detour-hold');
    check('keep-tab-reachable', holdTabs !== null, { holdTabs, active: await active(page) });
    const heldAt = await page.locator('video').evaluate(v => v.currentTime);
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Return to 00:42' }).waitFor();
    check('keep-does-not-seek',
      Math.abs(await page.locator('video').evaluate(v => v.currentTime) - heldAt) < 0.08,
      { heldAt, now: await page.locator('video').evaluate(v => v.currentTime) });

    await keyboardSeekTo(page, 18);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('video').currentTime >= 18.8);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.querySelector('video').currentTime < 19);
    const explored = await page.locator('video').evaluate(v => v.currentTime);
    const returnTabs = await tabTo(page, '.detour-return');
    check('return-tab-reachable', returnTabs !== null, { returnTabs, active: await active(page), explored });
    await page.keyboard.press('Enter');
    await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
    const returned = await page.locator('video').evaluate(v => v.currentTime);
    check('return-one-deliberate-seek', Math.abs(returned - heldAt) <= 0.55, { heldAt, explored, returned });
    const focusAfterReturn = await active(page);
    check('return-focus-keep',
      await page.evaluate(() => document.activeElement?.matches?.('.detour-hold') || false),
      focusAfterReturn);

    await keyboardSeekTo(page, 42);
    const hold2 = await tabTo(page, '.detour-hold');
    check('keep-second-tab-reachable', hold2 !== null, { hold2, active: await active(page) });
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Return to 00:42' }).waitFor();

    await keyboardSeekTo(page, 18);
    const stayTime = await page.locator('video').evaluate(v => v.currentTime);
    const stayTabs = await tabTo(page, '.detour-stay');
    check('stay-tab-reachable', stayTabs !== null, { stayTabs, active: await active(page) });
    await page.keyboard.press('Enter');
    await page.locator('.detour-hold:enabled').waitFor();
    const afterStay = await page.locator('video').evaluate(v => v.currentTime);
    check('stay-clears-without-seek', Math.abs(afterStay - stayTime) < 0.08, { stayTime, afterStay });
    check('stay-focus-keep', await matches(page, '.detour-hold'), await active(page));

    const captions = await page.locator('video').evaluate(v => ({
      mode: v.textTracks[0]?.mode,
      cueCount: v.textTracks[0]?.cues?.length || 0,
    }));
    report.observations.captionsAfterSignatureFlow = captions;
  } finally {
    await page.close();
  }
});
