import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifactDir = join(root, 'artifacts', 'hardening');
let server;
let browser;
let baseURL;
const report = {
  gate: 'performance-footprint',
  environment: {
    browser: 'Chromium Playwright on CI/host OS',
    caveat: 'This is not a low-end phone performance claim.',
  },
  footprint: {},
  capture: {},
  seam: {},
  traces: [],
  limitations: ['No physical low-end mobile hardware was exercised.'],
};

const compile = async entry => {
  const output = await build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
    outfile: 'out.js',
    logLevel: 'silent',
    loader: { '.css': 'empty' },
  });
  const js = output.outputFiles.filter(item => item.path.endsWith('.js'));
  assert.equal(js.length, 1, `Unexpected chunks for ${entry}`);
  return gzipSync(js[0].contents, { level: 9 }).byteLength;
};

async function ready(page) {
  await page.goto(new URL('tests/hardening-host.html', baseURL).href);
  await page.waitForFunction(() =>
    window.__AFTERIMAGE_HARDENING__?.a?.video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
    null, { timeout: 20000 });
}

before(async () => {
  mkdirSync(artifactDir, { recursive: true });
  server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  baseURL = server.resolvedUrls.local[0];
  browser = await chromium.launch({ args: ['--no-sandbox'] });
});

after(async () => {
  writeFileSync(join(artifactDir, 'performance-footprint.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
});

test('performance-footprint: enhanced bundle delta is measured against identical base build target', async () => {
  const base = await compile('skin/base.js');
  const enhanced = await compile('skin/index.js');
  const deltaJS = Math.max(0, enhanced - base);
  const cssBytes = gzipSync(readFileSync(join(root, 'skin', 'player.css')), { level: 9 }).byteLength;
  report.footprint = {
    target: 'es2022 browser ESM, esbuild minified, gzip-9',
    gzipBaseBytes: base,
    gzipEnhancedBytes: enhanced,
    incrementalJSBytes: deltaJS,
    sharedScopedCSSGzipBytes: cssBytes,
    incrementalCSSBytes: 0,
  };
  assert.ok(deltaJS <= 20 * 1024, `Incremental JS gzip ${deltaJS} B exceeds 20 KiB hardening budget.`);
});

test('performance-footprint: repeated pin reuses one bounded reference canvas', { timeout: 50000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await ready(page);
    const player = page.locator('#player-a');
    await player.locator('video').evaluate(v => v.pause());
    const costs = [];
    for (let i = 0; i < 20; i += 1) {
      const started = performance.now();
      await player.locator('[data-afterimage-pin]').click();
      await page.waitForFunction(() => {
        const p = document.querySelector('#player-a');
        return p && p.querySelector('.afterimage-reference')?.hidden === false
          && !p.querySelector('[data-afterimage-pin]')?.disabled;
      });
      costs.push(performance.now() - started);
    }
    const canvas = await player.evaluate(p => {
      const all = [...p.querySelectorAll('.afterimage-reference canvas')];
      const c = all[0];
      return {
        count: all.length,
        width: c?.width || 0,
        height: c?.height || 0,
        pixels: (c?.width || 0) * (c?.height || 0),
      };
    });
    report.capture = {
      pinRuns: 20,
      wallMs: costs.map(v => Number(v.toFixed(2))),
      maxWallMs: Number(Math.max(...costs).toFixed(2)),
      meanWallMs: Number((costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(2)),
      canvas,
      approximateRawRGBABytes: canvas.pixels * 4,
    };
    assert.equal(canvas.count, 1);
    assert.ok(canvas.pixels > 0 && canvas.pixels <= 920000);
  } finally {
    await page.close();
  }
});

test('performance-footprint: seam movement neither seeks media nor performs network activity', { timeout: 30000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await ready(page);
    const player = page.locator('#player-a');
    await player.locator('video').evaluate(v => v.pause());
    await player.locator('[data-afterimage-pin]').click();
    await page.waitForFunction(() => document.querySelector('#player-a .afterimage-reference')?.hidden === false);

    const requests = [];
    const observe = request => requests.push(request.url());
    page.on('request', observe);

    const result = await player.evaluate(async p => {
      const v = p.querySelector('video');
      const seam = p.querySelector('.afterimage-seam-control');
      let seeking = 0;
      let seeked = 0;
      v.addEventListener('seeking', () => { seeking += 1; });
      v.addEventListener('seeked', () => { seeked += 1; });
      const before = v.currentTime;
      const started = performance.now();
      for (let i = 0; i < 200; i += 1) {
        seam.value = String(i % 101);
        seam.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        scriptingWallMs: performance.now() - started - 100,
        before,
        after: v.currentTime,
        seeking,
        seeked,
        seam: seam.value,
      };
    });
    page.off('request', observe);
    report.seam = { ...result, requests };
    assert.equal(result.seeking, 0);
    assert.equal(result.seeked, 0);
    assert.ok(Math.abs(result.after - result.before) < 0.05);
    assert.equal(requests.length, 0, `Seam movement emitted network requests: ${requests.join(', ')}`);
  } finally {
    await page.close();
  }
});

test('performance-footprint: five fresh and five repeat Chromium control traces have no observed >50ms interaction Long Task', { timeout: 70000 }, async () => {
  const run = async (context, condition, index) => {
    const page = await context.newPage();
    try {
      await ready(page);
      await page.evaluate(() => {
        window.__afterimageLongTasks = [];
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) window.__afterimageLongTasks.push(entry.duration);
        });
        observer.observe({ type: 'longtask', buffered: false });
        window.__afterimageObserver = observer;
      });

      const result = await page.locator('#player-a').evaluate(async p => {
        const video = p.querySelector('video');
        video.pause();
        const pin = p.querySelector('[data-afterimage-pin]');
        const start = performance.now();
        pin.click();
        await new Promise(resolve => {
          if (!p.querySelector('.afterimage-reference').hidden) return resolve();
          p.addEventListener('afterimage:pin-complete', resolve, { once: true });
        });
        const seam = p.querySelector('.afterimage-seam-control');
        for (const value of [15, 50, 85, 33, 67]) {
          seam.value = String(value);
          seam.dispatchEvent(new Event('input', { bubbles: true }));
        }
        p.querySelector('[data-afterimage-close]').click();
        p.querySelector('[data-afterimage-compare]').click();
        p.querySelector('[data-afterimage-clear]').click();
        await new Promise(resolve => setTimeout(resolve, 80));
        return { wallMs: performance.now() - start };
      });
      const tasks = await page.evaluate(() => {
        window.__afterimageObserver?.disconnect();
        return window.__afterimageLongTasks || [];
      });
      const max = tasks.length ? Math.max(...tasks) : 0;
      report.traces.push({
        condition,
        index,
        wallMs: Number(result.wallMs.toFixed(2)),
        longTaskCount: tasks.length,
        maxLongTaskMs: Number(max.toFixed(2)),
      });
      assert.ok(max <= 50, `${condition} #${index} observed ${max}ms Long Task`);
    } finally {
      await page.close();
    }
  };

  for (let i = 1; i <= 5; i += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try { await run(context, 'fresh-context', i); } finally { await context.close(); }
  }

  const warm = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    for (let i = 1; i <= 5; i += 1) await run(warm, 'repeat-context', i);
  } finally {
    await warm.close();
  }
  assert.equal(report.traces.length, 10);
});
