import { readFileSync, writeFileSync } from 'node:fs';

const root=process.argv[2] ?? 'test-results/release';
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
| Chrome desktop, automated public-release check | PASS | PASS | PASS | PASS | PASS | LIMITED — keyboard/focus checks; no screen reader | PASS |
| Firefox desktop, automated browser check | PASS | PASS | PASS | PASS | PASS | LIMITED — keyboard/focus checks; no screen reader | PASS |
| WebKit engine, automated browser check | PASS | PASS | PASS | PASS | LIMITED — fullscreen not asserted in this check | LIMITED — engine evidence only; not physical Safari | LIMITED |
| Safari on macOS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Android Chrome on a physical phone | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| iPhone Safari on a physical device | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| VoiceOver or NVDA | — | — | — | — | — | NOT TESTED | NOT TESTED |`;

const md=`# DHAGO — public playback evidence

**Positioning:** DHAGO's strength is the player itself: a distinctive woven-time concept resolved across real playback, interaction, responsive layouts and accessibility states.

**Live player:** https://creative.aafnaipatro.com/  
**Mux playback:** https://creative.aafnaipatro.com/?mux  
**Studio Journal:** https://creative.aafnaipatro.com/journal.html  
**Timeline study:** https://creative.aafnaipatro.com/ribbon.html  
**Edge studies:** https://creative.aafnaipatro.com/stress.html?case=original

## Measured public-page results

| Metric | Measured value |
| --- | ---: |
| Skin authored layer raw | ${kb(p.rawBytes)} |
| Skin authored layer gzip | ${kb(p.gzipBytes)} |
| Skin authored layer brotli | ${kb(p.brotliBytes)} |
| Initial page requests | ${l.requestCount} |
| Initial page transfer | ${kb(l.transferBytes)} |
| Lighthouse mobile Performance | ${l.performance} |
| Lighthouse mobile Accessibility | ${l.accessibility} |
| Lighthouse mobile Best Practices | ${l.bestPractices} |
| Lighthouse mobile SEO | ${l.seo} |
| LCP | ${ms(l.lcpMs)} |
| CLS | ${l.cls==null?'n/a':l.cls.toFixed(3)} |
| TBT | ${ms(l.tbtMs)} |
| INP | ${ms(l.inpMs)} |

These measurements describe the tested public release. They are not claims about every device or network.

## Tested environments

${environments}

Automated WebKit results are evidence about the engine, not a claim that Safari on macOS or iOS was physically tested.

## Craft and interaction strengths

- **Woven time is functional, not decorative.** Chapter intervals, progress, the shuttle thumb and active chapter all respond to real media time.
- **The metaphor reverses truthfully.** Seeking backward unwinds the visual state; pause, completion and replay remain synchronized with playback.
- **The visual identity survives narrow layouts.** The chapter ribbon and essential controls remain bounded at mobile sizes, including the dedicated 240px edge study.
- **Accessibility is part of the composition.** Visible focus, comfortable control targets, a solid control shelf, descriptive captions and reduced-motion behaviour are built into the visual treatment.
- **Three appearances, one interaction model.** Linen, Ink and Paper change atmosphere without changing how viewers operate the player.
- **The same skin works beyond the showcase.** The Studio Journal presents the player in an editorial context while preserving its interaction language.

## Reuse and portability proof

- **The player is not tied to the showcase page.** The same skin mount is used in more than one published context.
- **The woven timeline stands on its own.** It can receive chapter geometry and playback state, drive seeking, and report active progress in a different host treatment.
- **The edge-state instrument is reusable.** Another compatible player can be connected in the browser through a small adapter and exercised against the same resilience cases.
- **Local adapter files stay local.** They are read by the browser and executed inside an isolated sandbox rather than uploaded to a DHAGO backend.
- **Remote adapters are isolated too.** CORS-readable modules load inside an opaque-origin frame; load/contract failures are reported separately from actual player failures.
- **Reports avoid leaking implementation input.** Exported result data omits adapter source text and local filesystem paths.

## Recommended attachment order

1. Active desktop player hero.
2. Authentic 8-second play-to-seek interaction.
3. Chapter 03 seek/caption state.
4. Active mobile-width player.
5. Ink and Paper variants.
6. Studio Journal.
7. Edge-state evidence as supporting material.

The longer proof recording and raw measurement files should remain supporting evidence rather than the opening impression.

## Visual design note

The player pairs a quiet control typeface with a restrained editorial display voice around it. Linen uses bone, ink and rust tones that suggest fibre, shadow and dyed thread while keeping the controls clear. Repeated warp/weft intervals and cue-derived joins give the timeline its identity, while the conventional seek thumb keeps navigation immediately understandable.

## Evidence integrity

The screenshots and recordings in this evidence set come from genuine browser playback of the public release. No synthetic playback state is inserted.

Release provenance and exact integrity records are retained separately from this public playback report. Capture browser: ${capture.browser}.
`;
writeFileSync(root+'/tested-environments.md',environments+'\n');
writeFileSync(root+'/final-release-evidence.md',md);
console.log(md);
