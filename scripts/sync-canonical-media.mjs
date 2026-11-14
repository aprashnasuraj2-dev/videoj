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

const fallback = resolve('apps/preview/public/media/studies-in-thread.webm');
const expectedFallbackBytes = 7455419;
const expectedFallbackSha256 = 'c2e7b6b3c4a699c6fa9010245b5c42a90ff93f65c25a1e6a61bf621ea2e7ed39';
const webm = await readFile(fallback);
const fallbackSha256 = createHash('sha256').update(webm).digest('hex');
if (webm.length !== expectedFallbackBytes || fallbackSha256 !== expectedFallbackSha256) {
  throw new Error('[DHAGO/media] Original VP9 fallback differs from the preserved public recovery object ' +
    '(bytes=' + webm.length + ', sha256=' + fallbackSha256 + ')');
}
console.log('[DHAGO/media] Preserved original VP9 compatibility fallback verified; no media overwritten.');
