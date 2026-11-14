import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.argv[2] ?? 'test-results/submission';
const fingerprint=process.env.GITHUB_SHA;
if(!/^[a-f0-9]{40}$/.test(fingerprint ?? ''))throw new Error('A 40-character release fingerprint is required.');
const perf=JSON.parse(readFileSync(root+'/performance-evidence.json','utf8'));
const capture=JSON.parse(readFileSync(root+'/capture-evidence.json','utf8'));
const kb=n=>n==null||!Number.isFinite(Number(n))?'n/a':(Number(n)/1024).toFixed(1)+' kB';
const ms=n=>n==null?'n/a':Math.round(n)+' ms';
const l=perf.lighthouseMobile;
const p=perf.dhagoPlayerAuthoredLayer ?? perf.portableAuthoredLayer;
const r=perf.reusableRibbon;
const s=perf.stressLabApplication;
const d=perf.emittedDemoBuild;

const environments=`| Environment | Playback | Seek | Chapters | Captions | Fullscreen | Accessibility | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google Chrome desktop, Ubuntu CI, exact public release | PASS | PASS | PASS | PASS | PASS | LIMITED — automated keyboard/focus/axe; no real screen reader | PASS |
| Firefox desktop, Playwright/Linux, verified candidate | PASS | PASS | PASS | PASS | PASS | LIMITED — automated keyboard/focus; no real screen reader | PASS |
| WebKit engine, Playwright/Linux, verified candidate | PASS | PASS | PASS | PASS | LIMITED — fullscreen not asserted in compact proof | LIMITED — engine proof only; not Safari | LIMITED |
| Safari desktop on macOS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Android Chrome on a physical phone | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| iPhone Safari on a physical device | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| VoiceOver or NVDA real assistive-technology pass | — | — | — | — | — | NOT TESTED | NOT TESTED |`;

const finalEvidence=`# DHAGO — final judge-facing release evidence

**Release fingerprint:** \`${fingerprint}\`  
**Live player:** https://creative.aafnaipatro.com/  
**Studio Journal:** https://creative.aafnaipatro.com/journal.html  
**Portable Stress Lab:** https://creative.aafnaipatro.com/stress.html  
**Reusable Woven Time Ribbon:** https://creative.aafnaipatro.com/ribbon.html  
**Public integration contract:** https://creative.aafnaipatro.com/install.html  
**Public media:** Mux playback ID \`Kc01fHxM9HqQpKzgf9qZRumwvL02wQZLZUwZHKtQ6F02mw\`

## Visual concept

DHAGO turns time into woven material without replacing the ordinary mental model of playback. Time is the warp; chapter and metadata intervals are weft. Linen, Ink and Paper treatments change surface material while play/pause, seek, volume, captions, speed and fullscreen remain standard controls.

## Real streaming history

**Measured when exposed**
- Active Video.js \`videoRenditions\` identity is the preferred rendition signal when the runtime exposes an active rendition.
- Decoded video dimensions are the fallback resolution signal.
- Real \`waiting\` / \`stalled\` playback events create persistent slack intervals.
- Real dropped-frame counter deltas create missed stitches.

**Not inferred**
- Bitrate is never inferred from dimensions.
- A 1080p encode at 3 Mbps and another 1080p encode at 8 Mbps are a counterexample: decoded dimensions alone cannot distinguish them.
- Unsupported telemetry renders nothing rather than a decorative fake.

Historic telemetry DOM is bounded while cumulative observed counters remain available.

## Metadata layers

Native chapter/caption tracks are read from the actual media element. Speaker, sponsor and custom lanes appear only when explicitly supplied by the host. The Stress Lab layered-weft specimen labels its speaker/sponsor data as controlled fixture metadata; it is not presented as factual metadata belonging to the original film.

Malformed ranges are clamped/isolated for rendering and cannot replace the primary seek slider. Cue gaps remain gaps.

## Accessibility

- Chapter navigation exposes ordinal position, total count, visible title, start and end time using visible content plus hidden semantic context.
- The standard seek control remains the continuous keyboard-accessible navigation mechanism.
- Continuously changing playback progress is not a noisy live announcement.
- Forced colors and reduced motion are tested using real browser media-feature emulation.
- Automated axe serious/critical findings introduced by DHAGO are expected to be zero at the final gate.
- VoiceOver/NVDA: **NOT TESTED** unless a genuine assistive-technology run is performed separately.

## Reusable ribbon

The Woven Time Ribbon is demonstrated under two host treatments controlling the same real media semantics. It accepts chapters/tracks plus playback state, returns normalized progress/active-chapter state, and does not own transport, ABR or text-track truth.

## Portable Stress Lab

The public Stress Lab is a standalone browser tool:
- built-in DHAGO reference adapter;
- ESM adapter URL;
- local \`.js\` / \`.mjs\` adapter file;
- opaque-origin sandbox without \`allow-same-origin\`;
- source + random-session validation for messages;
- real 240/320/375/768/wide host geometry;
- malformed/dense/late metadata;
- missing poster/media;
- audio-only behavior;
- source replacement and rapid seeks;
- honest forced-colors/reduced-motion/manual gates;
- JSON download, JSON copy and Markdown report copy.

Adapter-load/CORS failures are distinct from skin failures.

## Size and performance

| Metric | Measured value |
| --- | ---: |
| DHAGO player authored layer raw | ${kb(p.rawBytes)} |
| DHAGO player authored layer gzip | ${kb(p.gzipBytes)} |
| DHAGO player authored layer brotli | ${kb(p.brotliBytes)} |
| Reusable ribbon raw | ${kb(r?.rawBytes)} |
| Reusable ribbon gzip | ${kb(r?.gzipBytes)} |
| Reusable ribbon brotli | ${kb(r?.brotliBytes)} |
| Stress Lab authored app raw | ${kb(s?.rawBytes)} |
| Stress Lab authored app gzip | ${kb(s?.gzipBytes)} |
| Stress Lab authored app brotli | ${kb(s?.brotliBytes)} |
| Full multipage emitted JS+CSS raw | ${kb(d?.totalJsCssRawBytes)} |
| Full multipage emitted JS+CSS gzip | ${kb(d?.totalJsCssGzipBytes)} |
| Full multipage emitted JS+CSS brotli | ${kb(d?.totalJsCssBrotliBytes)} |
| Initial page requests observed by Lighthouse | ${l.requestCount} |
| Initial page transfer observed by Lighthouse | ${kb(l.transferBytes)} |
| Lighthouse mobile Performance | ${l.performance} |
| Lighthouse mobile Accessibility | ${l.accessibility} |
| Lighthouse mobile Best Practices | ${l.bestPractices} |
| Lighthouse mobile SEO | ${l.seo} |
| LCP | ${ms(l.lcpMs)} |
| CLS | ${l.cls==null?'n/a':l.cls.toFixed(3)} |
| TBT | ${ms(l.tbtMs)} |
| INP | ${ms(l.inpMs)} |

**Size boundary:** player, ribbon and Stress Lab are measured as separate authored source groups. The whole multipage build is also reported separately and is not a one-page transfer estimate. Lighthouse is the separate end-to-end public page measurement.

## Tested environments

${environments}

Automated Playwright WebKit is evidence about the WebKit engine, not proof of Safari on macOS or iOS.

## Limitations

- Genuine live/DVR: requires a genuine live source; fixture geometry is not relabeled as live proof.
- Real 400% browser zoom: manual/real-browser gate unless the environment genuinely changes zoom.
- Safari/macOS, iPhone Safari and physical Android Chrome: **NOT TESTED** unless separately performed.
- VoiceOver/NVDA: **NOT TESTED** unless separately performed.
- External human validation: **NOT OBTAINED** unless a real tester is recorded.
- Official Video.js adoption/upstream acceptance: **NOT CLAIMED**.

## Capture provenance

Browser: ${capture.browser}. Evidence uses genuine browser frames from the exact public release. No synthetic playback state is inserted.
`;

const readDescription=()=>readFileSync('submission/description.md','utf8').trim();
const shortDescription='DHAGO turns time into a woven ribbon: chapters become woven sections, real playback conditions can leave a truthful viewing history in the cloth, and metadata becomes layered weft while standard Video.js v10 controls remain familiar. It also publishes a reusable ribbon and a browser-side Stress Lab for testing compatible player skins.';
const submit=`# DHAGO — manual submission sheet

**Challenge:** Contra × Video.js Skins Design Challenge  
**Project title:** DHAGO — Time, woven  
**Release fingerprint:** \`${fingerprint}\`  
**License:** Apache-2.0 challenge release  
**Video.js:** v10.4.0

## Copy/paste — short description

${shortDescription}

## Copy/paste — long description

${readDescription()}

## Public links

- Player: https://creative.aafnaipatro.com/
- Studio Journal: https://creative.aafnaipatro.com/journal.html
- Stress Lab: https://creative.aafnaipatro.com/stress.html
- Reusable ribbon: https://creative.aafnaipatro.com/ribbon.html
- Integration contract: https://creative.aafnaipatro.com/install.html

## Attachments

Upload first: **assets/hero-desktop.png**

Attach video: **assets/interaction-loop.mp4**

Strong supporting images, in order:
1. assets/finished-cloth.png
2. assets/hero-mobile.png
3. assets/stress-lab.png
4. assets/stress-lab-browser-loader.png
5. assets/layered-weft.png
6. assets/ribbon-component.png
7. assets/install-example.png

Optional engineering evidence:
- final-release-evidence.md
- performance-evidence.md
- dhago-size.json
- tested-environments.md

## Mux note

The film is delivered with a public Mux playback ID. Do not include any management/API secret.

## Claims that remain intentionally absent

Do not claim Contra submission, official Video.js adoption, Safari/macOS testing, iPhone testing, physical Android testing, VoiceOver/NVDA testing or outside human validation unless each genuinely occurs before submission.
`;

const links=`# DHAGO public links

- Player — https://creative.aafnaipatro.com/
- Studio Journal — https://creative.aafnaipatro.com/journal.html
- Portable Stress Lab — https://creative.aafnaipatro.com/stress.html
- Reusable Woven Time Ribbon — https://creative.aafnaipatro.com/ribbon.html
- Public integration contract — https://creative.aafnaipatro.com/install.html
- Release manifest — https://creative.aafnaipatro.com/release-manifest.json
`;

writeFileSync(root+'/tested-environments.md',environments+'\n');
writeFileSync(root+'/final-release-evidence.md',finalEvidence);
writeFileSync(root+'/README-SUBMIT.md',submit);
writeFileSync(root+'/links.md',links);
copyFileSync('submission/description.md',root+'/description.md');

const checksumFiles=[];
const walk=p=>{
  for(const name of readdirSync(p)){
    if(name==='SHA256SUMS.txt')continue;
    const file=join(p,name);
    if(statSync(file).isFile())checksumFiles.push(file);
  }
};
walk(root);
const checksums=checksumFiles.sort().map(file=>{
  const hash=createHash('sha256').update(readFileSync(file)).digest('hex');
  return hash+'  '+file.slice(root.length+1);
}).join('\n')+'\n';
if(existsSync('LICENSE'))copyFileSync('LICENSE',root+'/LICENSE.txt');
writeFileSync(root+'/SHA256SUMS.txt',checksums);

const packageRoot=join(root,'package');
const assetsRoot=join(packageRoot,'assets');
mkdirSync(assetsRoot,{recursive:true});

const selectedAssets=[
  'hero-desktop.png',
  'interaction-loop.mp4',
  'finished-cloth.png',
  'hero-mobile.png',
  'stress-lab.png',
  'stress-lab-browser-loader.png',
  'layered-weft.png',
  'ribbon-component.png',
  'install-example.png',
];
for(const name of selectedAssets){
  const source=join(root,name);
  if(!existsSync(source))throw new Error('Required submission asset missing: '+name);
  copyFileSync(source,join(assetsRoot,name));
}

const selectedDocs=[
  'README-SUBMIT.md',
  'description.md',
  'links.md',
  'final-release-evidence.md',
  'dhago-size.json',
  'tested-environments.md',
  'capture-evidence.json',
  'performance-evidence.md',
  'performance-evidence.json',
];
for(const name of selectedDocs){
  const source=join(root,name);
  if(!existsSync(source))throw new Error('Required submission document missing: '+name);
  copyFileSync(source,join(packageRoot,name));
}
if(existsSync(root+'/LICENSE.txt'))copyFileSync(root+'/LICENSE.txt',join(packageRoot,'LICENSE.txt'));

const packageFiles=[];
const walkPackage=p=>{
  for(const name of readdirSync(p)){
    if(name==='SHA256SUMS.txt')continue;
    const file=join(p,name);
    if(statSync(file).isDirectory())walkPackage(file);
    else packageFiles.push(file);
  }
};
walkPackage(packageRoot);
const packageChecksums=packageFiles.sort().map(file=>{
  const hash=createHash('sha256').update(readFileSync(file)).digest('hex');
  return hash+'  '+file.slice(packageRoot.length+1);
}).join('\n')+'\n';
writeFileSync(join(packageRoot,'SHA256SUMS.txt'),packageChecksums);
console.log('[DHAGO/submission] curated package assembled at '+packageRoot);
console.log(finalEvidence);
