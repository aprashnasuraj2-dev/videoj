import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
  const fallback = readFileSync(join(dist, 'studies-in-thread.webm'));
  expect(fallback.length).toBe(7455419);
  expect(createHash('sha256').update(fallback).digest('hex')).toBe('c2e7b6b3c4a699c6fa9010245b5c42a90ff93f65c25a1e6a61bf621ea2e7ed39');
});
