# DETOUR progress

Phase: 06
Resume step: 058

| Item | Current state |
| --- | --- |
| Verified | 57/100. Steps 051 and 055–057, 059–060 now have executable Phase 6 evidence; 052–054 were already verified. |
| Next | 058. Finish mobile user-agent volume/mute evidence, then reconcile whether Phase 6 can advance to browser/device QA. |
| Open dependencies | 002: joined-form eligibility. 017: uncoached first-use observations. Physical-device Safari/mobile and assistive-technology evidence remain later QA gates, not Phase 5 passes. |
| Prototype / public release | Base-only and DETOUR packed consumers pass. Desktop Chromium/WebKit core controls and Return pass; optional real Mux playback and public release remain later work. |
| Source baseline | Phase 6 executable baseline: `524bac5fb73aaf0568e559c4e08342137c443da7`, GitHub Actions run 43692857813. |

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
