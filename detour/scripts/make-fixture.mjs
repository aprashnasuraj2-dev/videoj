import { mkdirSync, existsSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const fixtures = new URL('../public/fixtures/', import.meta.url);
mkdirSync(fixtures, { recursive: true });
const output = fileURLToPath(new URL('navigation-study.mp4', fixtures));
const temporary = fileURLToPath(new URL('navigation-study.tmp.mp4', fixtures));
if (!existsSync(output)) {
  const grid = 'drawgrid=width=48:height=48:thickness=1:color=white@0.12';
  const filters = [
    grid,
    "drawbox=x=426:y=0:w=428:h=480:color=0x182f32:t=fill",
    "drawbox=x=426:y=0:w=428:h=480:color=0x6e392b:t=fill:enable='between(t,16,31)'",
    "drawbox=x=426:y=0:w=428:h=480:color=0x31483d:t=fill:enable='gte(t,38)'",
    'drawbox=x=403:y=0:w=3:h=480:color=0xe4ff52:t=fill',
    'drawbox=x=490:y=122:w=270:h=226:color=white@0.6:t=2',
    'drawbox=x=516:y=145:w=218:h=180:color=white@0.35:t=1',
    'drawbox=x=64:y=121:w=279:h=5:color=0xe4ff52:t=fill',
    'drawbox=x=64:y=154:w=191:h=2:color=white@0.66:t=fill',
    'drawbox=x=64:y=175:w=232:h=2:color=white@0.3:t=fill',
    "drawtext=text='NAVIGATION STUDY':x=64:y=78:fontsize=25:fontcolor=white",
    "drawtext=text='%{pts\\:hms}':x=64:y=280:fontsize=32:fontcolor=white",
    "drawtext=text='POSITION / 01':x=510:y=243:fontsize=21:fontcolor=white:enable='lt(t,16)'",
    "drawtext=text='POSITION / 02':x=510:y=243:fontsize=21:fontcolor=white:enable='between(t,16,37.999)'",
    "drawtext=text='POSITION / 03':x=510:y=243:fontsize=21:fontcolor=white:enable='gte(t,38)'",
  ];
  const run = spawnSync('ffmpeg', [
    '-nostdin', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=0x12191b:s=854x480:r=24:d=64',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', filters.join(','), '-t', '64', '-c:v', 'libx264', '-preset', 'fast',
    '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', temporary,
  ], { stdio: 'inherit' });
  if (run.status !== 0) {
    rmSync(temporary, { force: true });
    throw run.error ?? new Error('FFmpeg could not generate the DETOUR video fixture.');
  }
  renameSync(temporary, output);
}
writeFileSync(new URL('navigation-study.vtt', fixtures), `WEBVTT

00:00:00.000 --> 00:00:04.000
[Silent motion study. A clock tracks the current position.]

00:00:17.000 --> 00:00:23.000
[The image turns rust. Position two.]

00:00:40.000 --> 00:00:46.000
[The image turns green. Position three.]
`);
