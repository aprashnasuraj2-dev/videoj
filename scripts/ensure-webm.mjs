// Build a royalty-free fallback from DHAGO's original motion study.
// It is an alternate encoding of the same authored film, not unrelated footage.
// The fallback is an alternate encode of the same canonical fibre-to-fabric film; delivery may be direct R2 or Mux.
import { spawnSync } from 'node:child_process';
import { statSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('apps/preview/public/media/from-fibre-to-fabric.mp4');
const target = resolve('apps/preview/public/media/from-fibre-to-fabric.webm');
const strict = process.env.DHAGO_REQUIRE_WEBM === '1';
const fail = (reason) => {
  console.error('[DHAGO/compatibility] ' + reason);
  if (strict) process.exit(1);
};
if (!existsSync(source)) fail('Original authored MP4 is missing.');
else {
  const upToDate = existsSync(target) && statSync(target).size > 100_000 &&
    statSync(target).mtimeMs >= statSync(source).mtimeMs;
  if (upToDate) console.log('[DHAGO/compatibility] Existing original VP9 rendition is current.');
  else {
    console.log('[DHAGO/compatibility] Generating an additional VP9/Opus rendition...');
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
      '-metadata', 'title=DHAGO - From fibre to fabric',
      '-fflags', '+bitexact',
      '-f', 'webm', target,
    ], { stdio: 'inherit', timeout: 300_000 });
    if (conversion.error || conversion.status !== 0) {
      try { if (existsSync(target)) unlinkSync(target); } catch {}
      fail('VP9 generation failed: ' + (conversion.error?.message || conversion.status));
    } else {
      const bytes = statSync(target).size;
      if (bytes < 100_000) fail('VP9 output was unexpectedly small.');
      else console.log(`[DHAGO/compatibility] Generated original VP9 rendition (${bytes} bytes).`);
    }
  }
}
