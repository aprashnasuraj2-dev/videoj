# DETOUR progress

Phase: 05
Resume step: 042

| Item | Current state |
| --- | --- |
| Verified | Phase 4 evidence retained; step 042 remains unchecked pending packed external-host playback. |
| Next | 042. Run packed-install external-host browser checks and confirm the package, media/track slot and optional Mux isolation; then proceed to 043 WebKit proof. |
| Open dependencies | 002: joined-form eligibility. 017: uncoached first-use observations. 042: external packed-install proof and pinned runtime unavailable in this execution environment. 043: seek on Safari/WebKit. Continue independent steps. |
| Prototype / public release | Production build and 15 local headless Chromium scenarios passed. [Mux, Cloudflare and Drive milestones](submission-report/RELEASE-PLAN.md) remain on the release path. |
| Source baseline | Phase 4 started at `e85bc059969102d25e2e707f40d79b3c792e35c5`. Changes are scoped to `detour/`. |

## 2026-11-15 · Phase 5 architecture work (partial: step 042 open)

- Added `skin/index.js` as the demo-independent core entry and `skin/mux.js` as a separate optional public-playback-ID helper. The native Mux adapter explicitly rejects unsupported HLS browsers; no Mux management credentials or playback IDs were committed. Added matching TypeScript declarations and package `exports` for core, styles and optional Mux. Package remains private pending release gate.
- Added `integration/` as a host-owned video and optional captions composition, not an import of the showcase. Added `tests/architecture.test.mjs` with module boundary and playback ID shape assertions. Inspected the exact committed core sources: no demo, fixture or Mux imports/URLs in the skin, and independent host imports only the core entry. These were static source checks, not an executed installed-package/browser acceptance suite.
- [Architecture map and exact follow-up commands](design/PHASE-5.md). **No runtime verification is claimed for the new changes**: the current container cannot reach GitHub for a local checkout and has no installed DETOUR dependencies. Do not mark 042 until the independent packed consumer exercises real playback and captions. Next: `npm ci && npm run build && npm run test:architecture && npm test` from `detour/`, run the second host with a replacement video, add packed-install and WebKit evidence; then reconcile 042/043.

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
