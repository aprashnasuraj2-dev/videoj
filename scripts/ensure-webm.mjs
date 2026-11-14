// Build a same-film compatibility fallback from DHAGO's Studies in Thread film.
// It is an alternate encoding of the same authored film, not unrelated footage.
// No fallback media is loaded on browsers that support the primary H.264 rendition.
import { spawnSync } from 'node:child_process';
import { statSync, existsSync, unlinkSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const source = resolve('apps/preview/public/media/studies-in-thread.mp4');
const target = resolve('apps/preview/public/media/studies-in-thread.webm');
const strict = process.env.DHAGO_REQUIRE_WEBM === '1';
const preservedHash = 'c2e7b6b3c4a699c6fa9010245b5c42a90ff93f65c25a1e6a61bf621ea2e7ed39';
const preservedSize = 7455419;
const integrity = () => {
  const data = readFileSync(target);
  const actual = createHash('sha256').update(data).digest('hex');
  if (data.byteLength !== preservedSize || actual !== preservedHash) {
    throw new Error('[DHAGO/compatibility] Preserved original WebM does not match the R2 recovery proof. Do not silently replace media. ' +
      'Expected ' + preservedHash + ', observed ' + actual + ' (' + data.byteLength + ' bytes).');
  }
};
const fail = (reason) => {
  console.error('[DHAGO/compatibility] ' + reason);
  if (strict) process.exit(1);
};
if (!existsSync(source)) fail('Original authored MP4 is missing.');
else {
  const upToDate = existsSync(target) && statSync(target).size > 100_000;
  if (upToDate) {
    integrity();
    console.log('[DHAGO/compatibility] Byte-pinned original VP9 rendition verified.');
  }
  else {
    if (strict) fail('Preserved original VP9 rendition is missing; release builds require the byte-pinned source-controlled file.');
    console.log('[DHAGO/compatibility] Generating a local VP9/Opus compatibility rendition, not certified as release bytes...');
    const conversion = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      // Bit-exact demux/mux options suppress volatile container metadata/UIDs.
      '-fflags', '+bitexact',
      '-i', source,
      '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '6',
      // This compatibility rendition is only ~64s. Sacrifice parallel encode speed
      // for byte-stable CI output so unrelated source changes do not force a new
      // 7+ MB R2 object solely because VP9 row-multithreading reordered work.
      '-b:v', '0', '-crf', '32', '-row-mt', '0', '-threads', '1', '-pix_fmt', 'yuv420p',
      '-c:a', 'libopus', '-b:a', '96k',
      '-metadata', 'title=DHAGO - Studies in Thread',
      '-fflags', '+bitexact',
      '-f', 'webm', target,
    ], { stdio: 'inherit', timeout: 300_000 });
    if (conversion.error || conversion.status !== 0) {
      try { if (existsSync(target)) unlinkSync(target); } catch {}
      fail('VP9 generation failed: ' + (conversion.error?.message || conversion.status));
    } else {
      const bytes = statSync(target).size;
      if (bytes < 100_000) fail('VP9 output was unexpectedly small.');
      else console.log(`[DHAGO/compatibility] Generated noncanonical local VP9 rendition (${bytes} bytes). Release CI requires the frozen source WebM.`);
    }
  }
}
