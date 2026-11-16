import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const removeImports = source => source.replace(/^import\s+[^;]+;\s*$/gm, '');
const removeExports = source => source.replace(/^export\s+/gm, '');
const escapeScript = source => source.replace(/<\/script/gi, '<\\/script');

const format = removeExports(read('skin/format-time.js'));
const lens = removeImports(read('skin/temporal-lens.js'));
const authored = removeImports(read('skin/authored-example.js'));
const shell = removeExports(removeImports(read('skin/shell.js')));
const player = removeExports(removeImports(read('skin/player.js')));
const skinCss = read('skin/player.css');
const pageCss = read('demo/page.css');

const boot = [
  "const asset = path => new URL(path, document.baseURI).href;",
  "const video = document.createElement('video');",
  "video.preload = 'metadata';",
  "video.playsInline = true;",
  "video.crossOrigin = 'anonymous';",
  "video.poster = asset('./media/the-waterline-v1-poster.jpg');",
  "for (const source of [{ src: asset('./media/the-waterline-v1.webm'), type: 'video/webm; codecs=\\\"vp9, opus\\\"' }, { src: asset('./media/the-waterline-v1.mp4'), type: 'video/mp4; codecs=\\\"avc1.42E01E, mp4a.40.2\\\"' }]) { const element = document.createElement('source'); element.src = source.src; element.type = source.type; video.append(element); }",
  "const captions = document.createElement('track');",
  "captions.kind = 'captions'; captions.srclang = 'en'; captions.label = 'English';",
  "captions.src = asset('./media/the-waterline-v1.vtt');",
  "video.append(captions);",
  "const chapters = document.createElement('track');",
  "chapters.kind = 'chapters'; chapters.srclang = 'en'; chapters.label = 'Waterline';",
  "chapters.src = asset('./media/the-waterline-v1-chapters.vtt');",
  "video.append(chapters);",
  "const mountedPlayer = createAfterimagePlayer(video, { example: { pinnedSeconds: 5, currentSeconds: 13 } });",
  "document.querySelector('#afterimage-player').append(mountedPlayer);",
  "window.__AFTERIMAGE_RELEASE__ = { version: '0.3.2-webkit-focus', video, player: mountedPlayer };",
].join('\n');

const runtime = [format, lens, authored, shell, player, boot].map(escapeScript).join('\n\n');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#101820">
<meta name="description" content="AFTERIMAGE — pin a frame and see what changes as the film plays.">
<title>AFTERIMAGE — Temporal Lens</title>
<style>${pageCss}\n${skinCss}</style>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/cdn@10.4.0/video.js"></script>
</head>
<body>
<main>
<header>
<div><span class="eyebrow">Temporal Lens · Video.js v10</span><h1>AFTERIMAGE</h1></div>
<p><strong>Time leaves a trace.</strong><br>Pin a frame. See what changes as the film plays.</p>
</header>
<section id="afterimage-player" aria-label="AFTERIMAGE player"></section>
<p class="fixture-note"><strong>The Waterline.</strong> Try the matched study, or pin any moment yourself. The copper mark remembers one rendered frame while the pale playhead keeps moving.</p>
</main>
<script type="module">${runtime}</script>
</body>
</html>`;
writeFileSync(new URL('standalone.html', root), html);
