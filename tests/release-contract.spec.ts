import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

test('production distribution includes only the canonical original DHAGO film', () => {
  const dist = resolve('dist/media');
  expect(existsSync(dist)).toBe(true);
  const files = readdirSync(dist);
  for (const name of [
    'studies-in-thread.mp4',
    'studies-in-thread.webm',
    'chapters.vtt',
    'captions.vtt',
    'dhago-studies-poster.svg',
  ]) {
    expect(files).toContain(name);
    expect(statSync(join(dist, name)).size).toBeGreaterThan(0);
  }
  expect(files.filter(name => /^from-fibre-to-fabric(?:[.-]|$)/.test(name))).toEqual([]);
});
