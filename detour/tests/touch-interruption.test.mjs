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
  gate: 'touch-interruption',
  browser: 'Chromium Playwright mobile/touch emulation',
  viewport: { width: 390, height: 844 },
  checks: {},
  observations: {},
  limitations: [
    'Browser-level emulation only; physical iPhone Safari and Android Chrome remain unverified.',
  ],
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
  const arrived = await page.locator('video-player').evaluate((p, time) => p.store.seek(time), seconds);
  assert.ok(Math.abs(arrived - seconds) < 0.5);
  await page.waitForFunction(time => {
    const v = document.querySelector('video');
    return !v.seeking && Math.abs(v.currentTime - time) < 0.5;
  }, seconds, { timeout: 10000 });
}

async function held(page) {
  return page.locator('.detour-origin').isVisible();
}

before(async () => {
  mkdirSync(artifactDir, { recursive: true });
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  baseURL = server.resolvedUrls.local[0];
  browser = await chromium.launch({ args: ['--no-sandbox'] });
});

after(async () => {
  report.pass = Object.values(report.checks).every(entry => entry.pass);
  writeFileSync(join(artifactDir, 'touch-interruption.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
});

test('touch-interruption: tap/drag/outside release/cancel stay bounded and page scroll recovers', { timeout: 55000 }, async () => {
  const context = await browser.newContext({
    viewport: report.viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await ready(page);
    await seek(page, 42.35);
    await page.locator('.detour-hold').tap();
    check('held-after-touch-keep', await held(page), { time: await page.locator('video').evaluate(v => v.currentTime) });

    const slider = page.locator('media-time-slider');
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    check('seek-touch-target', Boolean(box && box.width > 200 && box.height >= 44), box);

    await slider.tap({ position: { x: box.width * 0.30, y: box.height / 2 } });
    await page.waitForFunction(() => {
      const t = document.querySelector('video').currentTime;
      return t > 14 && t < 24;
    });
    const tapTime = await page.locator('video').evaluate(v => v.currentTime);
    check('tap-seek-keeps-held-place', await held(page) && tapTime > 14 && tapTime < 24, { tapTime });

    await page.locator('.detour-return').tap();
    await page.locator('.detour-hold:enabled').waitFor({ timeout: 10000 });
    const returned = await page.locator('video').evaluate(v => v.currentTime);
    check('return-after-touch-seek', Math.abs(returned - 42.35) < 0.55, { returned });

    await page.locator('.detour-hold').tap();
    const cdp = await context.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: (type === 'touchEnd' || type === 'touchCancel')
        ? []
        : [{ x, y, id: 7, radiusX: 2, radiusY: 2, force: 1 }],
      modifiers: 0,
    });

    const b = await slider.boundingBox();
    const y = b.y + b.height / 2;
    await touch('touchStart', b.x + b.width * 0.70, y);
    await touch('touchMove', b.x + b.width * 0.55, y);
    await touch('touchMove', b.x + b.width * 0.38, y);
    await touch('touchEnd', 0, 0);
    await page.waitForTimeout(200);
    const dragTime = await page.locator('video').evaluate(v => v.currentTime);
    check('touch-drag-seek-bounded', dragTime >= 0 && dragTime <= 64 && await held(page), { dragTime });

    await page.evaluate(() => {
      const slider = document.querySelector('media-time-slider');
      window.__detourPointerProbe = { down: 0, up: 0, cancel: 0, id: null };
      slider.addEventListener('pointerdown', e => {
        window.__detourPointerProbe.down += 1;
        window.__detourPointerProbe.id = e.pointerId;
      }, { capture: true });
      document.addEventListener('pointerup', () => { window.__detourPointerProbe.up += 1; }, { capture: true });
      document.addEventListener('pointercancel', () => { window.__detourPointerProbe.cancel += 1; }, { capture: true });
    });

    await page.mouse.move(b.x + b.width * 0.45, y);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width + 140, y + 100, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    const outside = await page.evaluate(() => {
      const slider = document.querySelector('media-time-slider');
      const probe = window.__detourPointerProbe;
      return {
        ...probe,
        retainedCapture: probe.id == null ? false : slider.hasPointerCapture?.(probe.id) || false,
      };
    });
    check('pointer-release-outside-no-retained-capture',
      outside.down >= 1 && outside.up >= 1 && !outside.retainedCapture,
      outside);

    const beforeCancel = await page.locator('video').evaluate(v => v.currentTime);
    await touch('touchStart', b.x + b.width * 0.45, y);
    await touch('touchMove', b.x + b.width * 0.60, y);
    await touch('touchCancel', 0, 0);
    await page.waitForTimeout(100);
    const afterCancel = await page.locator('video').evaluate(v => v.currentTime);
    const cancelProbe = await page.evaluate(() => window.__detourPointerProbe);
    check('pointer-cancel-bounded',
      afterCancel >= 0 && afterCancel <= 64 && cancelProbe.cancel >= 1 && await held(page),
      { beforeCancel, afterCancel, cancelProbe });

    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.id = 'touch-scroll-spacer';
      spacer.style.height = '1600px';
      document.body.append(spacer);
      scrollTo(0, 0);
    });
    const sy0 = await page.evaluate(() => scrollY);
    await touch('touchStart', report.viewport.width - 15, report.viewport.height - 60);
    await touch('touchMove', report.viewport.width - 15, report.viewport.height - 220);
    await touch('touchMove', report.viewport.width - 15, report.viewport.height - 380);
    await touch('touchEnd', 0, 0);
    await page.waitForTimeout(250);
    const sy1 = await page.evaluate(() => scrollY);
    check('page-scroll-recovers-after-slider', sy1 > sy0 + 20, { sy0, sy1 });

    await slider.scrollIntoViewIfNeeded();
    const stayBefore = await page.locator('video').evaluate(v => v.currentTime);
    await page.locator('.detour-stay').tap();
    await page.locator('.detour-hold:enabled').waitFor();
    const stayAfter = await page.locator('video').evaluate(v => v.currentTime);
    check('stay-after-touch-seek-clears-without-seek',
      Math.abs(stayAfter - stayBefore) < 0.1 && !(await held(page)),
      { stayBefore, stayAfter });
    report.observations.basicTouchFlow = { tapTime, returned, dragTime, outside, afterCancel, scroll: [sy0, sy1] };
  } finally {
    await context.close();
  }
});

test('touch-interruption: manual touch seek cancels a pending Return and stale completion cannot jump back', { timeout: 45000 }, async () => {
  const context = await browser.newContext({
    viewport: report.viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await ready(page);
    await seek(page, 42.35);
    await page.locator('.detour-hold').tap();
    await seek(page, 18);

    await page.locator('video-player').evaluate(player => {
      player.__touchRealStore = player.store;
      player.__touchPending = null;
      const real = player.store;
      const wrapped = Object.create(real, {
        seek: {
          value: time => {
            if (Math.abs(time - 42.35) < 0.75 && !player.__touchPending) {
              return new Promise(resolve => { player.__touchPending = resolve; });
            }
            return real.seek(time);
          },
        },
      });
      Object.defineProperty(player, 'store', { configurable: true, value: wrapped });
    });

    await page.locator('.detour-return').tap();
    await page.getByRole('button', { name: 'Returning…' }).waitFor({ timeout: 2000 });

    const slider = page.locator('media-time-slider');
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    await slider.tap({ position: { x: box.width * 0.40, y: box.height / 2 } });
    await page.waitForFunction(() => {
      const text = document.querySelector('.detour-live')?.textContent || '';
      const t = document.querySelector('video').currentTime;
      return /new seek took precedence/i.test(text) && t > 20 && t < 31;
    }, null, { timeout: 10000 });

    const interrupted = await page.evaluate(() => ({
      time: document.querySelector('video').currentTime,
      returnText: document.querySelector('.detour-return')?.textContent?.trim(),
      returnDisabled: document.querySelector('.detour-return')?.getAttribute('aria-disabled'),
      held: !document.querySelector('.detour-origin')?.hidden,
      live: document.querySelector('.detour-live')?.textContent,
    }));
    check('touch-seek-cancels-pending-return',
      interrupted.time > 20 && interrupted.time < 31
      && interrupted.returnDisabled === 'false'
      && interrupted.held
      && /new seek took precedence/i.test(interrupted.live),
      interrupted);

    await page.locator('video-player').evaluate(player => player.__touchPending?.(42.35));
    await page.waitForTimeout(150);
    const stale = await page.evaluate(() => ({
      time: document.querySelector('video').currentTime,
      held: !document.querySelector('.detour-origin')?.hidden,
      pendingVisible: !document.querySelector('.detour-return-pending')?.hidden,
    }));
    check('late-return-completion-ignored',
      Math.abs(stale.time - interrupted.time) < 0.1 && stale.held && !stale.pendingVisible,
      { interrupted, stale });
    report.observations.pendingReturnInterruption = { interrupted, stale };
  } finally {
    await context.close();
  }
});
