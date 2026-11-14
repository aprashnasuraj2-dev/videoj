import { readFileSync, writeFileSync } from 'node:fs';

const root=process.argv[2] ?? 'test-results/submission';
const sha=process.env.GITHUB_SHA;
if(!/^[a-f0-9]{40}$/.test(sha ?? ''))throw new Error('GITHUB_SHA is required');
const perf=JSON.parse(readFileSync(root+'/performance-evidence.json','utf8'));
const capture=JSON.parse(readFileSync(root+'/capture-evidence.json','utf8'));
const kb=n=>(Number(n)/1024).toFixed(1)+' kB';
const ms=n=>n==null?'n/a':Math.round(n)+' ms';
const l=perf.lighthouseMobile;
const p=perf.portableAuthoredLayer;

const environments=`| Environment | Playback | Seek | Chapters | Captions | Fullscreen | Accessibility | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google Chrome desktop, GitHub-hosted Ubuntu, exact public release | PASS | PASS | PASS | PASS | PASS | LIMITED — keyboard/focus semantics automated; no screen reader | PASS |
| Firefox desktop, Playwright/Linux, verified candidate | PASS | PASS | PASS | PASS | PASS | LIMITED — keyboard/focus semantics automated; no screen reader | PASS |
| WebKit engine, Playwright/Linux, verified candidate | PASS | PASS | PASS | PASS | LIMITED — fullscreen not asserted in WebKit proof | LIMITED — engine proof only; this is not Safari | LIMITED |
| Safari desktop on macOS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Android Chrome on a physical phone | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| iPhone Safari on a physical device | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| VoiceOver or NVDA real assistive-technology pass | — | — | — | — | — | NOT TESTED | NOT TESTED |`;

const md=`# DHAGO — final judge-facing release evidence

**Narrative:** A visually distinctive woven-time interface that is also a portable, accessible, small, production-tested Video.js v10 skin.

**Final Git SHA:** \`${sha}\`  
**Live:** https://creative.aafnaipatro.com/  
**Studio Journal:** https://creative.aafnaipatro.com/journal.html  
**Source package:** exact Apache-2.0 source archive from the final handoff  
**Public media:** Mux playback ID \`Kc01fHxM9HqQpKzgf9qZRumwvL02wQZLZUwZHKtQ6F02mw\`  
**Reusable ribbon proof:** https://creative.aafnaipatro.com/ribbon.html  
**Portable Stress Lab:** https://creative.aafnaipatro.com/stress.html

## Size and performance

| Metric | Measured value |
| --- | ---: |
| DHAGO authored layer raw | ${kb(p.rawBytes)} |
| DHAGO authored layer gzip | ${kb(p.gzipBytes)} |
| DHAGO authored layer brotli | ${kb(p.brotliBytes)} |
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

**Size boundary:** authored DHAGO CSS, TypeScript and HTML template compressed as one stream. Video.js runtime/scaffold, demo application, Mux media and screenshots are excluded. Lighthouse page transfer is a separate end-to-end measurement.

## Tested environments

${environments}

Automated WebKit is evidence about the WebKit engine, not a claim that Safari on macOS/iOS was physically tested.

## Engineering differentiators

- **Viewing history becomes cloth:** decoded rendition dimensions change strand thickness; real waiting/stalled events leave slack spans; exposed dropped-frame counters leave missed stitches. Unsupported telemetry renders nothing.
- **Warp + weft carry data:** time remains the warp. Native chapters/caption tracks and explicitly supplied speaker/sponsor/custom intervals become separate weft lanes.
- **Nonvisual chapter map:** every chapter jump exposes its ordinal, name, start and end time to assistive technology; the visual ribbon is not the only way to understand structure.
- **Reusable component:** \`src/ribbon/ribbon.ts\` has no DHAGO or Video.js import and is demonstrated under default and minimal host treatments.
- **Portable Stress Lab:** \`src/stress-lab/harness.ts\` accepts a skin adapter and supplies malformed cues, a real 240px host, missing media and actual forced-colors detection.

## External validation

**Genuine outside human validation: NOT OBTAINED.** No testimonial, star, issue or embed test is manufactured for the submission.

## Manual Contra attachment set

Use these exact files from the \`public-smoke-evidence\` artifact:

1. \`submission/hero-desktop.png\` — strongest active-playback hero.
2. \`submission/interaction-loop.mp4\` — 8-second playback → woven seek interaction.
3. \`submission/finished-cloth.png\` — completed woven-time state.
4. \`submission/hero-mobile.png\` — active real mobile-width capture.
5. \`submission/stress-lab.png\` — edge-state Stress Lab.
6. \`submission/install-example.png\` — installability proof from the Journal.
7. \`submission/performance-evidence.md\` and \`submission/dhago-size.json\` — measured size/performance.
8. \`submission/final-release-evidence.md\` — this tested-environment and release summary.
9. \`submission/capture-evidence.json\` — browser/media-state provenance.
10. \`submission/lighthouse-mobile.json\` — raw Lighthouse result.

Supplemental ecosystem proof: \`submission/layered-weft.png\` and \`submission/ribbon-component.png\`.

The longer \`submission/proof-demo.mp4\` remains available as supporting evidence but should not lead the submission.

## Visual design note

Typography pairs a quiet system sans-serif for controls and metadata with a restrained serif display face in the surrounding presentation; the contrast separates instrument from story without imitating a museum label. The Linen palette uses bone, ink and rust because those values read as fibre, shadow and dyed thread while preserving control contrast. The ribbon geometry uses repeated warp/weft intervals, cue-derived joins and a conventional seek thumb: weaving changes the material language, not the mental model of playback. Chapter colour can be sampled offline from the authored film, but time geometry and interaction remain truthful Video.js states.

## Capture provenance

Browser: ${capture.browser}. The interaction evidence uses genuine browser frames from the exact public release; no synthetic playback state is inserted.
`;
writeFileSync(root+'/tested-environments.md',environments+'\n');
writeFileSync(root+'/final-release-evidence.md',md);
console.log(md);
