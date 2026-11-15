# DETOUR progress

Phase: 07
Resume step: 061

| Item | Current state |
| --- | --- |
| Verified | 58/100. Phase 6 steps 051–060 verified with desktop browser and emulated mobile-UA test evidence; physical mobile device testing is not claimed. |
| Next | 061. Capture responsive 240/320/375/768/1280 px and emulated iOS landscape matrices, including held, pending Return, caption and open Settings states. Then pursue physical-device checks at 062/070. |
| Open dependencies | 002: joined-form eligibility. 017: uncoached first-use observations. Physical-device Safari/mobile and assistive-technology evidence remain Phase 7 gates; neither desktop WebKit nor iPhone-shaped WebKit is a physical device. |
| Prototype / public release | Base-only and DETOUR packed consumers pass. Desktop Chromium/WebKit core controls and Return pass; optional real Mux playback and public release remain later work. |
| Source baseline | Phase 6 mobile-UA completed test baseline: `15bd747d57285eb7be236577aff7b41e688cc6fc`, GitHub Actions run 43693510683. |

## 2026-11-15 · 25 responsive screenshots and capability-aware landscape verification

- [Run 43695753935](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695753935) passed the full **5 widths × 5 states = 25** Chromium responsive player matrix, keyboard-only signature, Shift+Tab/rejected-Return focus, reduced-motion/forced-colors/CSS-zoom, emulated Pixel touch (landed 19.199s), gzip budget (1,781 B), and five no-long-task signature loops. Uploaded 28 screenshot files in Actions artifact 14154059762. This is browser emulation evidence, not physical-device proof or accepted screenshot design review.
- The emulated iPhone landscape probe exposed that WebKit legitimately reports fullscreen unsupported and hides its control. Changed the geometry validator to require visibility only when `fullscreenAvailability` reports `available`; this preserves capability truthfulness rather than forcing a decorative disabled fullscreen button.
- Desktop WebKit's Home/End scenario still failed its end-interval assertion after 10s; added an exact native clock/seekable-end diagnostic before asserting. This is an unresolved **software/browser test issue** until the next run reveals whether End is ignored or frame-clamped.
- Extended Phase 7 tests with a synthetic 9:59:59 clock/RTL/dense-chapter case, duplicate Return/manual-seek/source-swap cancellation, and five fresh-context plus five repeat-context Chromium scripting/layout/layer observations. Newly added cases are **not yet verified**.

## 2026-11-15 · First independent Phase 7 probe results and precision fixes

- GitHub Actions [run 43695310958](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695310958) independently ran the Phase 7 tests even after a desktop-WebKit regression failure. The import-graph gzip measurement passed **1,781 B incremental** (base 81,155 B; enhanced 82,936 B) against **15,360 B**. Five 320px Chromium signature loops observed **zero long tasks >50ms** (290–314 ms wall time per iteration; not a device-speed claim). Keyboard-only, Shift+Tab/rejected Return, reduced motion, forced colors and emulated CSS zoom probes passed.
- Responsive matrix and iPhone-landscape probes exposed a **test harness error**: a button within a hidden parent retained its computed display but its rectangle was zero. Changed visibility checks to actual rendered rectangles. The emulated Pixel probe previously tapped the inner slider role instead of the time-slider surface and timed out; it now uses the player slider geometry, logs landed time and asserts a bounded seek.
- Desktop WebKit's Home/End test was using a 50ms tolerance against a potentially frame-clamped duration; updated to a measured seekable-end tolerance of 0.5s and added exact arrival diagnostics. Native ended behavior remains an independent assertion and must pass on the next run. No Phase 7 box is checked by these fixes.

## 2026-11-15 · WebKit cross-browser diagnostics and independent Phase 7 evidence (pending)

- Run 43694806349 reached desktop WebKit, failing the fullscreen Escape assertion, a geometry invariance check and the native end-of-media wait. Added an explicit zero-minimum grid column to stop dynamic min-content sizing from shrinking the seek rail when held actions appear. The browser regression now logs the natural-end stage and allows a bounded 15s native-ended wait; this is instrumentation, **not** a manufactured ended event or a pass.
- Previously committed capture-phase Escape interception addresses the native fullscreen/Settings ordering, pending WebKit confirmation. Phase 7 footprint/responsive steps now execute even when preceding browser tests fail; both probes and capture artifacts will be available for diagnosis rather than silently skipped.

## 2026-11-15 · Firefox fullscreen menu Escape fix (validation pending)

- GitHub Actions run 43694723080 failed Firefox's full-screen Settings Escape path: menu stayed visible after Escape while fullscreen/native transition was in flight. Added focus-scoped, capture-phase Escape handling to close the playback disclosure before native fullscreen handling, and allowed asynchronous visibility settlement in the regression test. Do not mark this pass until exact-head Firefox CI confirms it.
- Added iPhone-descriptor **landscape WebKit emulation** and Shift+Tab plus controlled rejected-Return focus tests to Phase 7. These are software emulation and keyboard checks, not physical iPhone or screen-reader certification.

## 2026-11-15 · Phase 7 footprint and five-repeat interaction probe (validation pending)

- Added reproducible, equal-target gzip compilation of the detached base and DETOUR entries and a 15 KiB incremental budget assertion. Common scoped CSS is identical across entries (zero incremental CSS); the total CSS is not claimed as zero. This import-graph estimate does not replace actual network trace byte accounting.
- Added five 320px Chromium hold → two seeks → Return traces collecting PerformanceObserver long tasks and reporting wall time per run; no verified performance results are claimed until exact-head CI passes. Physical or budget-hardware results remain open.

## 2026-11-15 · Phase 7 browser-probe implementation (validation pending)

- Added `tests/phase7.test.mjs` with an exact 240/320/375/768/1280px embedded-player matrix for idle, held, real captions, Settings and delayed Return, plus optional real Playwright screenshots; keyboard-only Hold → Home/End → Return and Stay → Escape/focus; reduced motion, forced colors and emulated CSS zoom; and Pixel Chromium emulated touch tap/seek/return.
- CI now invokes the distinct Phase 7 probes after existing build/architecture/packed-host/full-browser regressions, and uploads screenshot artifacts on both success and failure. This is implementation, **not yet a verified passing run**. Existing checklist boxes 061–070 stay open until actual evidence is reviewed.
- Physical iPhone Safari, Android Chrome, NVDA/VoiceOver and real browser zoom cannot be inferred from Playwright descriptors. They remain explicit device/AT gates. Next action: inspect exact-head CI output and screenshots, fix failures, and only then promote supported steps.

## 2026-11-15 · Phase 6 step 058 reconciliation and Phase 7 handoff

- Verified the already-committed iPhone-shaped Playwright WebKit packaged-base consumer at source `15bd747d57285eb7be236577aff7b41e688cc6fc`, successful [Actions run 43693510683](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43693510683). The executable test reads media-store volume/mute availability, tests either supported volume-setting or unsupported-slider state, and toggles native mute on and off. It explicitly does **not** require nonzero maxTouchPoints in Linux WebKit and is **not** real iPhone/touch/Safari evidence.
- Reconciled 058 to verified, bringing Phase 6 to 10/10 executable and previously evidenced checklist items. Existing desktop Chromium/WebKit external-host coverage includes transport, caption toggle, playback-rate selection, Escape/focus restoration, and capability-conditional fullscreen. This is a tracking/evidence reconciliation, **not** a new browser run or feature patch.
- Next actionable: 061 responsive state matrix and real screenshots. 062 physical iOS/Android touch, 064 AT, and 070 real-device browser gate remain unverified. Owner dependencies 002 and 017 remain open. The CI progress validator must pass on this reconciliation commit.

## 2026-11-15 · Phase 6 core implementation checkpoint

- Verified 051, 055, 056, 057, 059 and 060 at `524bac5fb73aaf0568e559c4e08342137c443da7` / Actions run 43692857813. The run passed 5 architecture checks, 3 packed-consumer tests, 17 Chromium scenarios and the 10-run desktop-WebKit signature check.
- Split generic media lifecycle from held-place behavior. `detour-video-skin/base` now proves the five ordinary controls can load from the packed artifact without importing or registering `detour-place`.
- Added a true stale-after-dismissal race and a 20-cycle pending-Return remount stress test. All 20 cycles cleared the marker and one-shot deadline; the final Return dispatched exactly once.
- Packed Chromium and desktop WebKit now cover the signature path plus Stay, play/pause, mute, captions, rate and Settings focus restoration. Dense 64-cue metadata does not add rail clutter.
- Step 058 stays open because its work text specifically requires mobile user-agent volume behavior. Compact desktop emulation is not being counted as that evidence. See [Phase 6](design/PHASE-6.md).

## 2026-11-15 · Phase 5 architecture and portability gate

- Verified steps 042–050. The core, styles and optional Mux helper have separate package exports; `npm pack` excludes demo/test/fixture material and includes Apache-2.0 licensing. A fresh external host installed the tarball and supplied its own video and caption track.
- GitHub Actions run 43691495087 at `012482415ecb706d246646f0f9b95dbe780d91dc` passed 4/4 architecture checks, 2/2 packed-host checks, 16/16 Chromium scenarios, and the focused desktop-WebKit round trip with 10/10 arrivals at 42.350s. The packed host itself returned to 42.350s in both engines with native and Video.js store clocks agreeing.
- Fixed the pending-Return reconnect defect by keeping persistent label/pending nodes instead of destructively replacing button children. Two packed player instances isolate marks; explicit live/audio cases hide DETOUR; stale provider completions and source epochs remain guarded.
- Added deterministic portrait media, a 64-cue chapter track and a synthetic 40,000-second state case. Existing local harnesses cover chapterless/no-poster, captions, throttling, error/retry, source swap and delayed/rejected seeks. No paid media calls are needed.
- Technical decision: **go**. Estimated submission-ready core work is 12–18 active engineering hours against roughly 45 hours of calendar reserve to the planned Nov 17 10:44 NPT freeze. Keep optional Mux/public-site extras behind the core gate. Desktop WebKit is not claimed as physical Safari/iPhone, and Mux URL-helper resolution is not claimed as HLS playback.
- Full architecture, capability, event budget, fixture table and limits: [Phase 5 acceptance](design/PHASE-5.md#2026-11-15-phase-5-acceptance). Next actionable step: 051.

## 2026-11-15 · Phase 4 visual system

- Implemented the opaque graphite shelf, separate white playhead and safety-lime bracket, and tabular Return ticket. The stem holds its exact rail position as its arms flip inward near the end.
- Verified 240, 320, 375, 600, 768 and 1100 px layouts, including the 600 px inline threshold. The regular Hold transition preserves transport geometry. Reduced-motion and forced-colors cases were measured in Chromium.
- Added visible loading, waiting, ended, no-time and retry treatments. A separate bright fixture demonstrates the same controls, native captions and kept-place behavior.
- Locked the [visual acceptance sheet](design/PHASE-4.md) with three paired player-only boards and a forced-colors sample. See the [test evidence](submission-report/EVIDENCE.md#2026-11-15-phase-4-visual-proof).

## 2026-11-15 · Phase 3 interaction and release decisions

- Kept required controls exposed at desktop and compact widths. Settings offers real playback speed below the picture while native two-line captions remain inside it. Escape closes settings and restores focus.
- Tested Home/End and emulated touch seeking, paused/playing/ended return, missing captions, unavailable time, and long RTL copy. Added seekable-range and source-epoch guards. Controlled rejection and late completion confirmed the UI preserves a valid mark, including a new mark after a same-URL reload.
- Adopted a DETOUR-specific Cloudflare host, optional Mux HLS bonus path and milestone-based Google Drive archive. The proposed hostname and service paths are release work. See the [interaction contract](design/PHASE-3.md), [browser evidence](submission-report/EVIDENCE.md#2026-11-15-phase-3-interaction-proof) and [release plan](submission-report/RELEASE-PLAN.md).

## 2026-11-15 · Phase 2 visual decision and backup

- Compared live player-only crops at 320 and 768 px with the bracket present and hidden. Retained the raised bracket and the explicit Return button. Current and held markers stay distinct even at the same timestamp.
- Ran the isolated Pausepoint proof. Set 18.3s using the keyboard picker, observed one pause at 18.380s, resumed playback, and verified that seeking across armed targets while paused and while playing skips the point. The backup has a 2–4 hour switch estimate.
- Locked the single-place scope and prepared the first-use moderator guide. Step 017 remains unchecked. The next independently actionable step is 021.
- See the [crops and backup proof](design/PHASE-2.md), [concept scope](design/SCOPE.md), and [test evidence](submission-report/EVIDENCE.md#2026-11-15-phase-2-design-proof).

## 2026-11-15 · Competition refresh and playable prototype

- Rechecked the public terms and documented the open second-entry question. Reviewed 58 entries across both feed orderings, inspected seven related designs, and found no described full match for the exposed hold/explore/return flow in the sample. Direct demo playback was unavailable in the capture environment for Plate and Arcade.
- Recomputed all 30 candidate scores. Proceeded with DETOUR and kept Pausepoint as backup. Added a milestone run sheet, source-independent use cases and the first player state table.
- Built the first reusable local skin with pinned v10 components, real buffered ranges, a chapterless 64-second fixture and a source-scoped origin. Chromium returned to 42.350s in all ten runs after seeking through 18s and 24s. Playback, mute, captions, fullscreen, narrow keyboard Stay and same-element source reload passed. See [evidence](submission-report/EVIDENCE.md#2026-11-15-first-prototype).
- Start the next session at step 018. Record uncoached observations when available rather than treating automated success as discovery evidence.

## 2026-11-15 · Branch setup

- Imported the 100 original IDs and acceptance conditions into the [living checklist](CHECKLIST.md). Added the [master direction](README.md), [resumption rules](CONTINUE.md), and the [submission report](submission-report/README.md).
- Verified step 001 with the dated [public rules and requirement map](submission-report/RULES.md). Initialization does not verify any implementation steps.
- Next artifact to produce: an eligibility evidence note or a precise unresolved status, then the timed run sheet for step 003.

For each checkpoint, place the newest dated entry above older entries. Record step IDs, changes, meaningful test/evidence links, any open dependencies and the exact next action. Set the two fields at the top to the current phase and first actionable unchecked step. Identify remaining gaps in the same update when resuming past a blocked item.
