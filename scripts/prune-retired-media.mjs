// Reject any retired experimental film accidentally copied into a public build.
// An accidental documentary in dist adds tens of MB, complicates
// immutable R2 parity and can make a release appear to ship the wrong film.
// Only removes generated dist files. Never deletes source or public R2 objects.
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve('dist/media');
if (!existsSync(root)) throw new Error('Build missing dist/media; cannot prune safely.');
const required = [
  'studies-in-thread.mp4',
  'studies-in-thread.webm',
  'chapters.vtt',
  'captions.vtt',
  'dhago-studies-poster.svg',
];
for (const name of required) {
  const path = join(root, name);
  if (!existsSync(path) || statSync(path).size === 0) {
    throw new Error('Canonical original-film output missing: ' + name);
  }
}
const retired = readdirSync(root)
  .filter(name => /^from-fibre-to-fabric(?:[.-]|$)/.test(name));
let saved = 0;
for (const name of retired) {
  const path = join(root, name);
  if (!statSync(path).isFile()) throw new Error('Refusing to prune non-file: ' + path);
  saved += statSync(path).size;
  unlinkSync(path);
}
console.log('[DHAGO/release] Excluded ' + retired.length
  + ' retired documentary artifacts (' + saved + ' bytes) from generated dist. Canonical source remains intact.');
