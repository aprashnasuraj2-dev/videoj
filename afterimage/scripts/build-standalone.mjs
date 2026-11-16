import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const removeImports = source => source.replace(/^import\s+[^;]+;\s*$/gm, '');
const removeExports = source => source.replace(/^export\s+/gm, '');
const escapeScript = source => source.replace(/<\/script/gi, '<\\/script');

const format = removeExports(read('skin/format-time.js'));
const lens = removeImports(read('skin/temporal-lens.js'));
const shell = removeExports(removeImports(read('skin/shell.js')));
const player = removeExports(removeImports(read('skin/player.js')));
const skinCss = read('skin/player.css');
const pageCss = read('demo/page.css');
const poster = read('demo/poster.svg');
const captions = read('demo/captions.vtt');

const boot = [
  "const video = document.createElement('video');",
  "video.preload = 'metadata';",
  "video.playsInline = true;",
  "video.crossOrigin = 'anonymous';",
  "video.poster = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(" + JSON.stringify(poster) + ");",
  "video.src = 'https://vjs.zencdn.net/v/oceans.mp4';",
  "const captions = document.createElement('track');",
  "captions.kind = 'captions'; captions.srclang = 'en'; captions.label = 'English';",
  "captions.src = 'data:text/vtt;charset=utf-8,' + encodeURIComponent(" + JSON.stringify(captions) + ");",
  "video.append(captions);",
  "const mountedPlayer = createAfterimagePlayer(video);",
  "document.querySelector('#afterimage-player').append(mountedPlayer);",
  "window.__AFTERIMAGE_RELEASE__ = { version: '0.1.0-preview', video, player: mountedPlayer };",
].join('\n');

const runtime = [format, lens, shell, player, boot].map(escapeScript).join('\n\n');
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
<p class="fixture-note"><strong>Engineering preview.</strong> This first playable slice uses a temporary permissive Video.js fixture while the original <em>The Waterline</em> film is rendered. The skin, clock, pinned frame, seam, and timeline relation are real.</p>
</main>
<script type="module">${runtime}</script>
</body>
</html>`;
writeFileSync(new URL('standalone.html', root), html);
