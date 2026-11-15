import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { muxPlaybackUrl } from '../skin/mux.js';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
test('core skin has no demo, fixture or Mux dependency', () => {
  for (const filename of ['../skin/index.js', '../skin/player.js', '../skin/place.js', '../skin/player.css']) {
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
