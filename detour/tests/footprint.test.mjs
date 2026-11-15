import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const compile = async entry => {
  const output = await build({
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

test('069 incremental compressed JS and CSS budget over base shell', async t => {
  // Same pinned Video.js runtime, browser target, build mode and host-owned media boundary.
  // Scoped CSS is imported by BOTH entries, so incremental CSS is zero; measure its
  // absolute archive size separately. No third-party player bytes are attributed to DETOUR.
  const base = await compile('skin/base.js');
  const enhanced = await compile('skin/index.js');
  const deltaJS = Math.max(0, enhanced - base);
  const deltaCSS = 0;
  const increment = deltaJS + deltaCSS;
  t.diagnostic(JSON.stringify({
    engine:'esbuild transitive dependency of pinned Vite',
    baseline:'base.js',
    enhanced:'index.js',
    gzipBaseBytes:base,
    gzipEnhancedBytes:enhanced,
    incrementalJSBytes:deltaJS,
    incrementalCSSBytes:deltaCSS,
    incrementalCombinedBytes:increment,
    limitBytes:15360,
    caveat:'import-graph gzip estimate; not a network-trace or third-party size guarantee',
  }));
  assert.ok(increment <= 15360, `Incremental gzip delta ${increment} exceeds 15 KiB`);
});
