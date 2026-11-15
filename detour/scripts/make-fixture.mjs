import { mkdirSync, existsSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const fixtures = new URL('../public/fixtures/', import.meta.url);
mkdirSync(fixtures, { recursive: true });

function encodeFixture(name, color, filters, { size = '854x480' } = {}) {
  const output = fileURLToPath(new URL(`${name}.mp4`, fixtures));
  if (existsSync(output)) return;
  const temporary = fileURLToPath(new URL(`${name}.${process.pid}.tmp.mp4`, fixtures));
  const run = spawnSync('ffmpeg', [
    '-nostdin', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `color=c=${color}:s=${size}:r=24:d=64`,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', filters.join(','), '-t', '64', '-c:v', 'libx264', '-preset', 'fast',
    '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', temporary,
  ], { stdio: 'inherit' });
  if (run.status !== 0) {
    rmSync(temporary, { force: true });
    throw run.error ?? new Error(`FFmpeg could not generate ${name}.`);
  }
  renameSync(temporary, output);
}

encodeFixture('navigation-study', '0x12191b', [
  'drawgrid=width=48:height=48:thickness=1:color=white@0.12',
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
]);

encodeFixture('daylight-study', '0xf5f1e6', [
  'drawgrid=width=48:height=48:thickness=1:color=0x5f725d@0.20',
  'drawbox=x=480:y=0:w=374:h=480:color=0xe9dca3:t=fill',
  'drawbox=x=545:y=104:w=220:h=214:color=0xd1dfc4:t=fill',
  "drawbox=x=600:y=154:w=120:h=120:color=0xb5bd89:t=fill:enable='between(t,14,29)'",
  "drawbox=x=580:y=136:w=166:h=152:color=0xfbf5d4:t=fill:enable='gte(t,37)'",
  'drawbox=x=58:y=355:w=320:h=3:color=0x3e544b:t=fill',
  'drawbox=x=58:y=378:w=250:h=2:color=0x759087:t=fill',
]);

encodeFixture('portrait-study', '0x142226', [
  'drawgrid=width=40:height=40:thickness=1:color=white@0.10',
  'drawbox=x=52:y=82:w=256:h=3:color=0xe4ff52:t=fill',
  "drawbox=x=62:y=170:w=236:h=250:color=0x315248:t=fill:enable='between(t,14,31)'",
  "drawbox=x=82:y=210:w=196:h=210:color=0x784536:t=fill:enable='gte(t,38)'",
  "drawtext=text='PORTRAIT STUDY':x=52:y=112:fontsize=21:fontcolor=white",
  "drawtext=text='%{pts\\:hms}':x=52:y=500:fontsize=28:fontcolor=white",
], { size: '360x640' });

writeFileSync(new URL('navigation-study.vtt', fixtures), `WEBVTT

00:00:00.000 --> 00:00:04.000
[Silent motion study. A clock tracks the current position.]

00:00:17.000 --> 00:00:23.000
[The image turns rust.]
[Position two.]

00:00:40.000 --> 00:00:46.000
[The image turns green. Position three.]
`);
writeFileSync(new URL('daylight-study.vtt', fixtures), `WEBVTT

00:00:00.000 --> 00:00:08.000
[Pale grid and a light green field.]

00:00:15.000 --> 00:00:23.000
[A darker square appears.]
[The background stays bright.]

00:00:40.000 --> 00:00:46.000
[A pale yellow rectangle appears.]
`);

writeFileSync(new URL('portrait-study.vtt', fixtures), `WEBVTT

00:00:17.000 --> 00:00:23.000
[Portrait fixture at the explored moment.]

00:00:40.000 --> 00:00:46.000
[Portrait fixture near the kept place.]
`);

function vttTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map(value => String(value).padStart(2, '0')).join(':') + '.000';
}
const denseChapters = Array.from({ length: 64 }, (_, index) =>
  `${vttTime(index)} --> ${vttTime(index + 1)}\nChapter ${String(index + 1).padStart(2, '0')}`
).join('\n\n');
writeFileSync(new URL('dense-chapters.vtt', fixtures), `WEBVTT\n\n${denseChapters}\n`);
