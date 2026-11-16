import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { formatAfterimageDelta, formatAfterimageTime } from '../skin/format-time.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('time formatting covers signed, zero and hour cases', () => {
  assert.equal(formatAfterimageTime(6.4), '00:06');
  assert.equal(formatAfterimageTime(3661), '1:01:01');
  assert.equal(formatAfterimageTime(Number.NaN), '—:——');
  assert.equal(formatAfterimageDelta(8.2), '+00:08');
  assert.equal(formatAfterimageDelta(-8.2), '−00:08');
  assert.equal(formatAfterimageDelta(-0.01), '±00:00');
});

test('core package is independent from demo media and sibling skins', () => {
  const sources = [
    '../skin/index.js', '../skin/base.js', '../skin/player.js', '../skin/shell.js',
    '../skin/temporal-lens.js', '../skin/authored-example.js', '../skin/format-time.js', '../skin/player.css'
  ].map(read).join('\n');
  assert.doesNotMatch(sources, /vjs\.zencdn\.net|detour\/|apps\/preview|THE WATERLINE|the-waterline/i);
  assert.doesNotMatch(sources, /MUX_TOKEN_(?:ID|SECRET)|Authorization\s*:|Bearer\s+[A-Za-z0-9+/_=-]{12,}/i);
});

test('manual Temporal Lens never programs transport', () => {
  const source = read('../skin/temporal-lens.js');
  assert.doesNotMatch(source, /\.play\s*\(/);
  assert.doesNotMatch(source, /\.pause\s*\(/);
  assert.doesNotMatch(source, /currentTime\s*=/);
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /cancelVideoFrameCallback/);
  assert.match(source, /new AbortController\(\)/);
});

test('authored example is the single documented seek exemption', () => {
  const source = read('../skin/authored-example.js');
  assert.equal((source.match(/video\.currentTime\s*=/g) || []).length, 1);
  assert.doesNotMatch(source, /\.play\s*\(/);
  assert.doesNotMatch(source, /\.pause\s*\(/);
  assert.match(source, /Try|example/i);
});

test('skin CSS is scoped to the AFTERIMAGE player', () => {
  const css = read('../skin/player.css');
  const selectorHeads = css.split('\n')
    .map(line => line.trim())
    .filter(line => line.endsWith('{') && !line.startsWith('@') && !/^(?:from|to|\d+%)\s*\{/.test(line));
  for (const selector of selectorHeads) assert.match(selector, /^\.afterimage(?:\b|[\s.:[>#,+~])/i, 'Unscoped selector: ' + selector);
});
