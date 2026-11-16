# AFTERIMAGE observed evidence

> **Current release closure — 2026-11-16.** Product source is frozen at `2316dc7f07f5b73a2d30d7e95fc5b09e6f83fb69`, runtime `0.3.10-control-fit`. Historical sections below preserve earlier candidates and gaps; where they conflict with this closure, this section is authoritative.

## Final exact release

- Public candidate: https://afterimage.aafnaipatro.com/
- Video.js: `@videojs/html@10.4.0`
- Product source: `2316dc7f07f5b73a2d30d7e95fc5b09e6f83fb69`
- Runtime marker: `0.3.10-control-fit`
- Cloudflare Worker: `afterimage-preview`
- Current deployment: `0b1d5abb-07ae-4c97-87e8-66512216bcfa`
- Current Worker version: `05caf0d5-26c7-432a-abbf-ed77fe092e6b` at 100% traffic.
- Product-source CI: run `43810424989` — locked install, architecture, deterministic standalone regeneration, Vite build and package inspection all passed.
- Final three-engine matrix: run `43810610298` — Chromium / Firefox / WebKit all passed against the exact release header and runtime marker.
- Final official gates: run `43810603770` — keyboard-only, pointer/touch/race robustness, and judge first-use jobs all passed.
- Strengthened headed fullscreen: run `43812044536` — native wrapper enter, deck fit, visible Play, control exit, and accessible label `Enter fullscreen → Exit fullscreen → Enter fullscreen` all passed.
- Submission capture: run `43810624542` — final stills and reel captured from the exact public release.
- AafnaiPatro + Mux bonus: run `43810653422` — exact final skin release, direct Mux currentSrc, host theme/tracks/poster/navigation and manual pin all passed.

## Final judge-facing measurements

- Fresh desktop load: Play 44×44; Seek 710.94×44; Try a comparison 184.09×44; no horizontal overflow.
- Fresh keyboard order: first Tab lands on Play; Shift+Tab is reversible.
- Keyboard playback: Enter advanced media to 0.546s; Space paused at 0.548196s with no clock drift.
- Keyboard seek: 0.699s / 0:00 → 4.075s / 0:04 using ArrowRight.
- Mute: false → true → false. Volume: 1.00 → 0.90 → 0.95 by keyboard.
- Focus: 3px outline; focus contrast 12.07:1; control text contrast 14.80:1.
- Captions: three WATERLINE cues load and keyboard toggle enters `showing`; captions survive fullscreen.
- Native fullscreen: wrapper fills the viewport; stage/deck boundary is registered; deck bottom equals viewport bottom; Play remains visible.
- First-use proof: ordinary playback → 00:05/00:13 pair → seam drag → Close → Clear completed in 1.25s of automated interaction, with playback preserved.
- Pointer/touch reveal: click 27%, mouse drag 76%, outside release clamped 100%, touch tap 31%, touch drag 81%, touch cancel stayed bounded; page vertical scroll remained functional (0 → 502px).
- Atomic failure: forced canvas failure retained the previous valid pin/canvas and kept Play/Seek/Volume/Fullscreen usable while playback continued.
- Race safety: delayed re-pin after Close did not stale-apply; same-URL reload/source change invalidated a pending capture.
- Three-engine stress remains bounded to one 1279×719 reference canvas (~3.51 MiB raw RGBA) over 20 repeated pins, with zero app fetch/XHR from capture/seam operations and clean teardown.

## WATERLINE media

- Runtime observed by final capture: 18.013s (manifest target 18.000s).
- 1280×720, 24fps; VP9/Opus WebM first source with H.264/AAC MP4 fallback.
- Authored pair: dry 00:05 → wet 00:13; signed interval +00:08.
- Six committed check frames: 3, 5, 7, 11, 13 and 15 seconds.
- Original AI-assisted matched keyframes, in-repository motion/edit, procedural FFmpeg sound, captions and chapters.
- Provenance, source task IDs, codecs and hashes: `public/media/the-waterline-v1.json` + `media-plan.json`.

## Submission media

Artifact `14200790244` from run `43810624542` contains:

- `afterimage-primary-still.png` — 1,004,957 bytes.
- `afterimage-inspection-still.png`.
- `afterimage-mobile-390.png`.
- `afterimage-keyboard-focus.png`.
- `afterimage-submission-page.png`.
- `afterimage-submission-reel.mp4` — 52.28s, 5,213,051 bytes, no audio.
- WebM recording and exact-release JSON reports.

## Mux + real-site bonus proof

- Live site: https://aafnaipatro.com/on-this-day/afterimage/apollo-11/
- Public playback ID: `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`
- Browser-observed current source: `https://stream.mux.com/kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U/highest.mp4`
- Media observed: 46.94s, 640×360.
- Host theme: lime `#d9ff4a`.
- Host supplies its own Mux poster, captions, chapters and normal Aafnai Patro navigation/NASA attribution.
- WATERLINE authored shortcut is absent; manual Pin moment is present and works while playback advances.
- Current Apollo Worker deployment: `37a1a47a-7e1f-40dd-af3c-124d7cf00933`, version `e85068b9-4e0e-4976-85d3-f4c42ecbd55a` at 100% traffic.
- Operational requirement: keep the Mux asset live through judging.

## Explicit remaining limits

Do **not** claim these as tested: physical-phone hardware, screen-reader session, numbered-frame tolerance fixture, dedicated slow-network/low-CPU profiling, two simultaneous player instances, true tainted cross-origin canvas/expired-provider failure, or a comparison+fullscreen caption-readability capture. Public requirements do not expose signed-in visual-upload size constraints, and no challenge submission has been executed from this toolset.

---

Evidence here is limited to what was actually exercised. A code path existing is not treated as a pass.

## Exact-source build

- Source: `09cdfb59ac0a39eb158edb5d2696c8e9a2501c6c`.
- GitHub Actions run: `43796465564`, job `133066299025`.
- Passed: checkout exact commit; Node 22; `npm ci`; architecture tests; standalone regeneration with zero diff; production Vite build; `npm pack --dry-run`.

## Live release

- URL: `https://afterimage.aafnaipatro.com/`.
- Worker: `afterimage-preview`.
- First deployed artifact before CI-only follow-up: Worker deployment `5228a40a01d54d6780360065f3a22603`, serving the committed standalone artifact from `31df9ddb...`.
- Custom-domain attach ID: `6560877dee1ca221779ea6d3f9b7ab7d9366b790`.
- Existing apex and DETOUR routes were inventoried before attachment and were not changed.

## Desktop browser instrumentation

Cloudflare Browser Rendering, Chromium-family environment:

- Real media: duration `46.613333s`, decoded `960×400`, `readyState=4`, no media error.
- Required controls found: play, seek, time, mute, volume, captions, fullscreen, pin.
- Playback advanced from start to `1.734962s` and remained unpaused.
- Pin opened. First observed relationship: Pinned `00:02`, Now `00:02`, Interval `+00:01`.
- After another 2.6s, Pinned remained unchanged while Now advanced to `00:05`.
- Pinned/Now/Split presets set seam values 100/0/50 and preserved playback.
- Close hid the reference while playback advanced; Compare reopened it; Clear returned the UI to `Pin moment`.

## Mobile layout

### 390×844

- Player width: 374px.
- No horizontal overflow before or during comparison.
- Seam control width: 372px.
- Minimum visible primary target: 44px.
- Initial Pin action width: 348px.

### 320×700

- Player width: 304px.
- No horizontal overflow before or during comparison.
- Seam control width: 302px.
- Minimum visible primary target: 44px.
- Initial Pin action width: 278px.

## Accessibility tree

At 390px, before comparison the tree exposed:

- region `AFTERIMAGE player`;
- group `Media player`;
- Seek slider;
- Play;
- current time and duration;
- Mute;
- Enable captions;
- Enter fullscreen;
- Pin moment.

With comparison open, it additionally exposed:

- slider `Pinned frame reveal`;
- Pinned / Now / Interval values;
- Pause;
- Pin current frame;
- Close comparison;
- Pinned / Split / Now buttons;
- Clear pin;
- live status text: `Pinned at 00:01. Comparison opened.`

## Remaining evidence gaps

Do not infer passes for pause toggling, real seek edge cases, fullscreen transition, caption rendering over the image, keyboard-only end-to-end flow, failure states, teardown stress, cross-browser coverage, final WATERLINE media, or submission-form acceptance until those are separately observed.

## Final WATERLINE candidate · 2026-11-16

### Serving identity

- Public URL: `https://afterimage.aafnaipatro.com/`
- Source: `f4d7c1be2eb574ddf1792ec89040e515ff897890`
- Exact-source CI: run `43797686805`, job `133070134400`, all steps passed.
- Cloudflare Worker: `afterimage-preview`
- Current deployment: `f32ad97e53134c4a8753b0de94f633e5`
- Startup time reported by Cloudflare: 1 ms.
- Custom domain remains isolated from the apex Patro worker and DETOUR hosts.

### WATERLINE media

- Runtime: exactly 18.000s.
- Video: H.264, 1280×720, 24 fps.
- Audio: AAC; procedural brown-noise water bed + 58 Hz low sine; no third-party recording.
- Final MP4: 1,873,808 bytes.
- MP4 SHA-256: `aff1d6bf979c36c3cd81ef278659b9272d0eed4ab69c32be642793fad83813c8`.
- Authored pair: 00:05 dry reference → 00:13 wet state.
- Keyframes, captions, chapters, poster, six sampled frames, and hashes are committed under `public/media/`.

### Final browser proof

Cloudflare Browser Rendering executed the final public candidate, not the former ocean fixture.

- Media decoded: 18.000s, 1280×720, readyState 4, no media error.
- `Try a comparison`: pinned `00:05`; now `00:13`; interval `+00:08`; playing intent remained playing.
- After another ~1.2s, Pinned remained fixed while Now advanced and delta increased.
- Captions: 2 text tracks present; caption track loaded 3 cues; mode `showing`; active cue over wet state: `[Shallow water settles beneath the same locked architecture.]`.
- Paused manual pin: playback stayed paused; displayed `≈00:15`; status announced the approximate capture.
- Reverse seek: relation showed `−00:13`.
- Arbitrary seam: value 37; reference clip `inset(0px 63% 0px 0px)`; seam line `37%`.
- Escape: comparison closed, Compare remained available, and focus restored to Compare.
- Final assertion set returned `pass: true`.

### Delivery proof

- MP4 range request: HTTP 206, `Content-Type: video/mp4`, `Content-Range: bytes 0-63/1873808`, `Accept-Ranges: bytes`.
- Caption and chapter files: `text/vtt; charset=utf-8`.
- Poster: `image/jpeg`.
- Manifest: `application/json; charset=utf-8`.
- All responses carry `x-afterimage-release: f4d7c1be...`.

### Evidence still not claimed

Not yet promoted: full keyboard-only traversal, 240px/200% zoom, touch-cancel/scroll behavior, repeated-pin memory stress, two-instance lifecycle, Firefox/WebKit, fullscreen transition behavior, caption visual contrast in fullscreen, failure/cross-origin paths, screenshot/reel artifacts, Mux bonus, or signed-in submission-form acceptance.


## Exact-release three-engine matrix · 2026-11-16

### Identity

- Public candidate: `https://afterimage.aafnaipatro.com/`.
- Serving source: `f0bed46afe912b43af657841b0a2897742e9f4ff`.
- Runtime marker: `0.3.3-webkit-handoff`.
- Worker version: `e45a2583-3414-46f6-a1cd-bf94e7ed1be7`, 100% traffic.
- Exact-source CI: AFTERIMAGE CI run `43800635868` (#22), passed.
- Exact-release browser evidence: run `43801027232` (#18), passed Chromium / Firefox / WebKit.
- The browser workflow rejects a stale hostname by requiring both the response header `x-afterimage-release=f0bed46...` and the runtime version marker before product assertions.

### Cross-browser primary flow

All three engines:

- decoded the 18.013s 1280×720 VP9/Opus WATERLINE source with no media error;
- advanced ordinary playback;
- completed authored comparison `00:05 → 00:13`, signed interval `+00:08`, without pausing;
- passed seam keyboard Home=0, End=100, ArrowLeft=99;
- passed Escape close/focus restoration and keyboard reopen;
- loaded the 3-cue captions track and observed the wet-state active cue.

### Narrow / zoom / shape evidence

- 240px viewport: player 224px; no horizontal overflow; minimum primary target 44px in all three engines.
- Mobile landscape 667×375: no document overflow.
- 200%-equivalent reflow at 540px: no overflow; minimum target 44px.
- Chromium page-scale probe: `visualViewport.scale = 2`.
- 4:3 and 9:16 stage fixtures: current video and reference remained registered to the same width with `object-fit: contain`.

### Keyboard and contrast

Across Chromium, Firefox and WebKit:

- Tab→Enter started playback.
- Keyboard traversal reached the authored comparison.
- At completion, the seam had focus, playback remained running, and Pinned/Now read `00:05 / 00:13`.
- Escape restored focus to Compare; Enter reopened and returned focus to the seam.
- Computed control text contrast: `14.795:1`.
- Computed focus outline contrast: `12.066:1`.
- Focus outline width: `3px`.

The transport/control deck is opaque `rgb(16,24,32)`, so these control ratios do not depend on the brightness of WATERLINE or its poster.

### Playback stability and bounded capture

For manual comparison operations, each engine recorded **zero added pause, seeking, waiting, or stalled events** while playback continued.

Twenty repeated pins per engine reused one committed canvas:

- canvas: `1279×719` = `919,601` pixels;
- raw RGBA bound: `3,678,404` bytes (~3.51 MiB);
- canvas count: 1;
- same canvas object retained: true;
- application fetch/XHR generated by repeated capture + seam changes: 0;
- runtime JS/unhandled-rejection errors: 0;
- after player removal: Temporal Lens count 0.

Observed first paused capture latency in that stress probe:

| Engine | Capture latency |
| --- | ---: |
| Chromium | 41 ms |
| Firefox | 59 ms |
| WebKit | 79 ms |

The browser `performance` transfer counter varied by engine/cache state (Chromium 14,945 B; Firefox 300 B; WebKit 2,840,299 B), so it is recorded as an observation rather than treated as a normalized network benchmark.

### Accessibility preferences and failure behavior

- Reduced motion: all three engines reported the media query active and the reference transition duration as `0s`.
- Forced colors: Chromium coverage passed with the seam/pin explicitly preserved; Firefox/WebKit reports identify this as a Chromium-only Playwright assertion.
- Missing-media fixture produced media error code 4, kept Play and Pin visible, and announced: `Wait for the frame to load, then try again.`

### Remaining evidence not claimed

Still not treated as complete: native fullscreen transition/caption contrast in fullscreen, physical-phone or screen-reader testing, pointer/touch-cancellation and vertical-scroll behavior, intentionally delayed source-switch races, slow-network/constrained-device profiling, two simultaneous instances, alternate-host package install, Mux bonus, real-site bonus, and signed-in submission-form acceptance.
