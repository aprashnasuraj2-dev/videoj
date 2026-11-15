# DETOUR progress

Phase: 08
Resume step: 073

| Item | Current state |
| --- | --- |
| Verified | 66/100. Phase 7 browser-core acceptance is retained and Phase 8 media strategy 071 is verified. 072 is implemented locally but awaits HTTPS qualification. |
| Next | 073. Compose the public-root one-screen judge demo while 072 waits for HTTPS qualification. |
| Open dependencies | 002 eligibility; 017 uncoached first-use; 062 physical phones; 064 NVDA/VoiceOver; 065 native 200% browser zoom; 072 public HTTPS playback/seek qualification. |
| Prototype / public release | Packed external host and desktop Chromium/Firefox/WebKit core are green. Phase 7 capture artifact exists. Public HTTPS, final showcase media and optional Mux remain later gates. |
| Source baseline | Phase 8 media baseline: `87afdf6a740bbcce95caaa04e2c02886071c895c`, Actions run 43699914256. Showcase verification 2/2 passed; full DETOUR CI passed. |

## 2026-11-15 · Phase 8 step 071 accepted; 072 local bundle ready

- Exact source `87afdf6a740bbcce95caaa04e2c02886071c895c` passed [Actions 43699914256](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43699914256). Showcase verification passed **2/2**: deterministic provenance/A-V/frame separation and a fresh local HTTP browser mount seeking exactly **18.000s → 42.000s**.
- Closed 071. The selected asset is the custom 56s procedural study; the unchanged 64s `navigation-study` stays the tested fallback. No external footage/music or DHAGO media is on the critical path.
- Kept 072 open because local HTTP is not HTTPS. The MP4/poster/VTT/manifest implementation is ready; public byte-range/seek/caption validation will close it during release work.
- Resume at 073: move the playable showcase to the public root with a compact first-viewport composition. Do not change Phase 7 tests to the 56s media; they retain an explicit fixture query.

## 2026-11-15 · Phase 8 generator-scope correction (validation pending)

- Run 43699456032 proved the **new showcase verification itself passes**, but the full Chromium regression correctly failed because the first Phase 8 duration edit changed the shared legacy fixture encoder from 64s to 56s while the showcase encoder still carried a 64s cap. That altered Phase 7's established source duration and invalidated regression assumptions.
- Restored `encodeFixture()` to exactly 64s and scoped the **56s** cap only to `encodeShowcase()`. This is a generator fix, not a test relaxation. The existing Phase 7 baseline remains 64s; only the dedicated Phase 8 media is 56s.

## 2026-11-15 · Phase 8 custom media implementation (validation pending)

- Selected a **56-second deterministic procedural motion study** rather than external stock/documentary footage. It is generated only from FFmpeg color/grid/box/text filters plus a low-level synthetic sine bed; the existing silent `navigation-study` remains the fallback. No DHAGO media or third-party footage/music is reused.
- Added a generated bundle contract: 1280×720 H.264/AAC fast-start MP4, poster extracted from the actual 42s frame, descriptive VTT and JSON provenance/timing manifest. Binary outputs stay generated/ignored; source instructions remain reviewable.
- Added `showcase.test.mjs`: ffprobe verifies codec/dimensions/audio/duration; MP4 atom order verifies fast-start; frame hashes at 18s and 42s must differ; fresh Vite-preview Chromium must seek to both times and fetch poster/VTT/manifest over local HTTP. HTTPS qualification remains step 072/release work.
- CI will run the showcase verification after the production build. Step 071 remains unchecked until this exact implementation passes; step 072 cannot pass before HTTPS verification.

## 2026-11-15 · Phase 7 automated/browser acceptance and Phase 8 handoff

- Exact source `9eeeb770b4f7cc7d7d5ba4c766095f05c2116be2` passed [Actions run 43698982276](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43698982276) with architecture, packed external-host, full Chromium/Firefox/desktop-WebKit, footprint and all Phase 7 probes. The final race set includes a real 8s Return deadline followed by a late resolution and a fresh-page waiting → pause → Return sequence.
- Checked 061, 063 and 066–070. Visual review of artifact 14155597667 confirmed representative 240px held/settings/pending, 1280px settings, forced-colors, 200% CSS-layout zoom and Arabic long-clock captures have no clipped signature action or horizontal loss. Step 065 remains open because CSS zoom is not native browser zoom.
- Kept 062, 064 and 065 open with exact evidence boundaries. Physical Android/iPhone and NVDA/VoiceOver are not available through this executor; the prepared [device QA protocol](design/DEVICE-QA.md) is the handoff. Per CONTINUE.md, advance independently to Phase 8 at 071 rather than idling on external QA.
- Performance gate: incremental gzip **1,815 B / 15,360 B**. Five fresh-context and five repeat-context Chromium runs at 320px observed zero Long Tasks over 50ms; scripting/layout durations are recorded in CI. Headless LayerTree did not expose a stable compositing-layer count, so no GPU/compositing-cost claim is made.

## 2026-11-15 · Independent timeout and buffering-race probes (validation pending)

- Split 068's real 8s timeout/stale completion and provider-wait/pause/Return cases into separate fresh pages. This avoids carrying a replaced Video.js store and synthetic timer state into the buffering fixture.
- The timeout case still waits the actual production 8s deadline and resolves the old promise after failure. The buffering case now starts from a clean player and mirrors the already-verified waiting fixture before pausing and returning. No product behavior was relaxed.

## 2026-11-15 · Waiting-fixture alignment (validation pending)

- Run 43698360905 again passed every pre-existing browser/package gate, step 067 and the real 8s timeout/stale-completion portion of 068. Only the newly added buffering visibility assertion failed.
- The older verified provider-waiting fixture freezes both `readyState` and the native clock while dispatching `waiting`; the new subcase had frozen only `readyState`. Aligned the subcase exactly with that established fixture, then deletes both temporary properties before Return. This keeps the test focused on pause intent and recovery rather than creating a second, subtly different buffering simulator.

## 2026-11-15 · Buffering-race probe correction (validation pending)

- Run 43697966802 passed the new 067 duration/range test and the existing duplicate/manual/source-swap 068 stress. Its only Phase 7 failure was the new buffering subcase because it dispatched `waiting` while the media was already paused; the player correctly did not present active buffering in that state.
- Corrected the probe to enter `waiting` while playing, wait for the real buffer indicator, pause through the actual play control, restore native readyState and then Return. The asserted requirement remains unchanged: pause must win, and recovery must never restart playback. The preceding real 8s Return-timeout/stale-completion assertions had already passed before that failed visibility assertion.

## 2026-11-15 · Exact-head Phase 7 green baseline and remaining difficult-state probes

- Exact source `88e442377b30e053c7b1ac0404daed90b4b0ac8d` passed [Actions run 43697253579](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43697253579): architecture, packed external host, full Chromium/Firefox/WebKit regressions, footprint budget and all Phase 7 probes. End-key snapshots were **63.95/64.00s** in all three desktop engines. The Phase 7 screenshot artifact is 14154867955.
- Added direct step 067 evidence for duration expansion/shrink/restoration with a held mark, live classification, out-of-range Return and NaN/Infinity absence. Added step 068 timeout evidence that waits for the real 8s Return deadline, resolves the stale promise afterward, and confirms time/mark/pause intent are untouched; it also exercises paused buffering followed by Return. These additions are pending a new exact-head CI run.
- Physical Android Chrome/iPhone Safari (062), NVDA/VoiceOver (064), and native browser 200% zoom (065) remain unavailable in this executor and are explicitly not replaced by Playwright emulation.

## 2026-11-15 · WebKit final-frame seek correction (exact-build CI pending)

- [Actions run 43696833543](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43696833543) passed both desktop Chromium/Firefox full suites, the complete **10/10 independent Phase 7 probes**, 25 responsive screenshots, emulated iPhone landscape and Pixel tap, 066/068 stress, 1,812 B incremental gzip, and 10 no-long-task Chromium traces. Its only failure was desktop WebKit's End key remaining at 0.000/64.000 seconds.
- The first keyboard boundary override still sought the exact 64.000s end; changed it to request the final decodable frame (last seekable edge minus 50 ms) and capture the keystroke at document level only if its composed path includes this player's seek slider, preventing native WebKit from overriding it. Native Home and End remain keyboard actions, source/timer guards remain in place. A fresh WebKit run must confirm actual arrival before checking Phase 7 keyboard certification.

## 2026-11-15 · Phase 7 regression fixes (exact-build CI pending)

- At [Actions run 43696239741](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43696239741), Chromium and Firefox full suites passed. Desktop WebKit failed Home/End: native playhead was still **0.000s** after End with duration and seekable end both 64.000s. Added an explicit, capability-checked Home/End keyboard boundary path to the ordinary media shell, using the actual Video.js store seek and a source-scoped manual-seek cancellation event for pending Returns. It does not replace arrow-key behavior or autoplay.
- The Phase 7 duplicate-Return probe incorrectly used Playwright's delayed click before repeated DOM clicks; the 8s pending deadline expired and permitted a **new valid retry**. Corrected it to dispatch four clicks synchronously inside the 8s deadline. The test still requires exactly one store seek, and still checks manual-seek cancellation, stale resolution and source replacement. Behavior and test both await fresh CI.
- 43696239741 otherwise passed 25/25 Chromium state captures, landscape iPhone-descriptor WebKit, Pixel emulated touch, 063 keyboard probes, long 9:59:59 RTL/dense chapters, five fresh-context and five repeat-context performance traces, and 1,781B gzip delta. Ten traces recorded zero observed tasks >50 ms. All are Linux-hosted/browser-emulated, not physical QA.

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
