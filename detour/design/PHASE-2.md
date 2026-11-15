# Phase 2 decision and proof

## Visual signature

Keep the pencil-white rectangular playhead, the smaller lime bracket in its own vertical lane above the rail, and the rectangular “Return to 00:42” button. The bracket adds a spatial reference at the held time. The button identifies the time and action in words. The vertical offset leaves both marks visible at coincident timestamps.

| Actual player width | Bracket and return button | Text-only cue |
| --- | --- | --- |
| 320 px | [320 × 329 crop](evidence/phase2/bracket-320.png) | [320 × 329 crop](evidence/phase2/text-only-320.png) |
| 768 px | [768 × 533 crop](evidence/phase2/bracket-768.png) | [768 × 533 crop](evidence/phase2/text-only-768.png) |

The crops came from the built player on 2026-11-15 in Chromium 143.0.7499.0 on Debian Linux. Playback was paused at 18.000s with a held time of 42.350s. The A/B switch hid only the bracket. A pixel diff found exactly 42 changed pixels at each width, all inside the 8 × 9 bracket bounds. The [browser check](../tests/browser.test.mjs) verified separate shapes again when the playhead returned to the held timestamp. The test checks rendering and interaction geometry. [Human recognition](FIRST-USE.md) remains open.

Reproduce the PNGs with `npm run build` and `DETOUR_PHASE2_CAPTURES=/path/to/crops npm test` from `detour/`, using a Playwright-compatible Chromium installation or setting `DETOUR_BROWSER`.

## Pausepoint backup

Run `npm run dev` from `detour/` and open `/design/pausepoint/` on the dev server. The [proof](pausepoint/index.html) uses the ordinary Video.js transport and seek bar, a future-time number field with keyboard submission, and a triangular pause marker. The review route is outside the production build.

| Storyboard beat | Expected and observed |
| --- | --- |
| At 17.4s, choose 18.3s and press Enter | An 18.3s marker appears and the status confirms the armed point. |
| Play straight through the mark | Paused once at 18.380s in this run. The marker cleared. Pressing Play again continued beyond 19s. |
| While paused, seek from 18s past an armed 19s | The point cleared with “Pause point skipped by seeking.” |
| While playing, PageUp from near 18s past an armed 22s | The point cleared and playback advanced beyond 28.1s with no pause event. |

This proof uses native time updates for crossing detection and the Video.js pause action. The observed 80ms overshoot is one runtime sample. Broader engine and scheduling behavior remains unverified. Estimate **2–4 active hours** if switching becomes necessary: about 1 hour to integrate the future marker and picker, 1–2 hours for keyboard, touch, source lifecycle, and engine checks, and up to 1 hour to recapture evidence. Keep DETOUR as primary under the current proof and scope. Evaluate a switch if the [selection guard](PLAN.md) triggers.
