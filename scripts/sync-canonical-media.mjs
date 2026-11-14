import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// The original media is source-controlled and MUST NOT be silently replaced.
const source = resolve('apps/preview/public/media/studies-in-thread.mp4');
const expectedSize = 2563521;
const expectedHash = '9dcc4672e3014ca947e310c1809c0cf6d40ffff186478f3e6a1e47f89b3688b3';
const content = await readFile(source);
const sha256 = createHash('sha256').update(content).digest('hex');
if (content.byteLength !== expectedSize || sha256 !== expectedHash) {
  throw new Error(`DHAGO original film differs from pre-replacement source (bytes=${content.byteLength}, sha256=${sha256})`);
}
console.log('[DHAGO/media] Original Studies in Thread verified; no media overwritten.');
