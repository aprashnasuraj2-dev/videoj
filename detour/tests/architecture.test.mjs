import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { muxPlaybackUrl } from '../skin/mux.js';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
test('core skin has no demo, fixture or Mux dependency', () => {
  for (const filename of ['../skin/index.js', '../skin/player.js', '../skin/place.js', '../skin/format-time.js', '../skin/shell.js', '../skin/media-state.js', '../skin/base.js', '../skin/player.css']) {
    const source = read(filename);
    assert.doesNotMatch(source, /(?:from\s*['"][^'"]*(?:demo\/|fixtures\/|mux(?:\.js)?['"]))|(?:stream\.mux\.com)|(?:navigation-study)/i, filename);
  }
});
test('public Mux playback URL never uses a management secret', () => {
  assert.equal(muxPlaybackUrl('public_Id-42'), 'https://stream.mux.com/public_Id-42.m3u8');
  for (const invalid of ['', '../../secret', 'abc?token=private', 'a/b']) {
    assert.throws(() => muxPlaybackUrl(invalid));
  }
});

test('core lifecycle is event-driven, bounded and abortable per instance', () => {
  for (const [filename, allowedTimers] of [['../skin/place.js', 1], ['../skin/media-state.js', 0]]) {
    const source = read(filename);
    assert.match(source, /new AbortController\(\)/, filename);
    assert.match(source, /this\.#disconnect\?\.abort\(\)/, filename);
    assert.doesNotMatch(source, /requestAnimationFrame|requestVideoFrameCallback|setInterval|MutationObserver/, filename);
    assert.equal((source.match(/setTimeout\(/g) ?? []).length, allowedTimers,
      `${filename} has an unexpected timer count.`);
    const listenerCalls = (source.match(/addEventListener\(/g) ?? []).length;
    const signalUses = (source.match(/\{ signal(?:,|\s*\})/g) ?? []).length;
    const signalDestructures = (source.match(/const\s+\{\s*signal\s*\}\s*=/g) ?? []).length;
    assert.equal(signalUses - signalDestructures, listenerCalls,
      `Every listener in ${filename} must be tied to the instance AbortSignal.`);
  }
});

test('skin CSS stays host-scoped and client sources contain no management credential hooks', () => {
  const css = read('../skin/player.css');
  const selectorHeads = css.split('\n')
    .map(line => line.trim())
    .filter(line => line.endsWith('{') && !line.startsWith('@') && !/^(?:from|to|\d+%)\s*\{/.test(line));
  for (const selector of selectorHeads) {
    assert.match(selector, /^\.detour(?:\b|[\s.:[>#,+~])/i, `Unscoped selector: ${selector}`);
  }

  const client = ['../skin/index.js', '../skin/player.js', '../skin/place.js', '../skin/format-time.js', '../skin/shell.js', '../skin/media-state.js', '../skin/base.js', '../skin/mux.js', '../skin/player.css']
    .map(read).join('\n');
  assert.doesNotMatch(client, /MUX_TOKEN_(?:ID|SECRET)|Authorization\s*:|Bearer\s+[A-Za-z0-9+/_=-]{12,}|api[_-]?secret\s*=|management[_-]?token\s*=/i);
});

test('base package entry has no held-place module or markup dependency', () => {
  for (const filename of ['../skin/base.js', '../skin/shell.js', '../skin/media-state.js']) {
    const source = read(filename);
    assert.doesNotMatch(source, /(?:\.\/place\.js)|(?:<detour-place\b)/, filename);
  }
  assert.match(read('../skin/player.js'), /import ['"]\.\/place\.js['"]/);
});
