# DETOUR progress

Phase: 02
Resume step: 018

| Item | Current state |
| --- | --- |
| Verified | 20/100, including the Phase 01 live scan and concept decision, Phase 02 flow setup, reproducible v10 build, and saved-origin, marker and return behavior. |
| Next | 018. Compare the live bracket and ticket against a text-only alternative at 320 and 768 px, then test and document Pausepoint's bounded backup behavior, step 019. |
| Open dependencies | 002: joined-form eligibility remains entrant-side. 017: five uncoached first-use sessions remain open. 043: repeat on Safari/WebKit. Continue independent steps. |
| Prototype / public release | Local production build passes four headless Chromium browser scenarios. Public URL, physical devices, bonuses and submission are pending. |
| Source baseline | Initial DETOUR setup `21e24433c591c3588947e9caffa59e996bc2a914`. All product changes are under `detour/`. |

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
