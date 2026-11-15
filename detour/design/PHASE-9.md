# Phase 9 — visual polish and public presentation

## Step 081 cold-path issue log — 2026-11-15

Source of review: signed-out public diagnostics from Actions run 43710251344, captured against the frozen Phase 8 Mux candidate at 375×667 and 1280×900. The diagnostic commit itself changed no player presentation.

| Priority | Observed friction | Quantified evidence | Fix |
| --- | --- | --- | --- |
| 1 | Service/infrastructure language precedes the interaction | At 375px the recovery panel was **80.5px** tall and moved the player top to **155.3px**. Body text exposed “Mux-hosted” and “independent fallback” before the player. | Hide recovery controls during healthy playback; expose them only on provider failure or active backup. Replace the page tagline with the viewer action: “Keep your place. Explore another moment. Return in one action.” |
| 2 | Cold poster contradicts the real media clock | The displayed Mux thumbnail came from ~42s and visibly contained `00:00:41.917` while controls truthfully read `0:00`. | Freeze the Mux thumbnail at **time=0** so the poster and playback origin agree. |
| 3 | Current and held times use different visual grammars | Held public capture showed `0:18 / 0:55` beside `Return to 00:42`. | Render a DETOUR visual clock with shared formatter (`00:18 / 00:55`) while preserving native Video.js `media-time` semantics offscreen for accessibility. |

### Boundaries

- No timeline remapping, mark behavior, media source, caption source, Mux Playback ID or fallback media bytes change in this polish.
- The native Video.js time components remain the semantic accessibility source. The custom visual clock is `aria-hidden` and updates from real media state.
- Recovery remains fully available; it is no longer advertised when nothing has failed.
- The Phase 8 release remains rollback until the new staged dist and public Mux Worker pass signed-out checks.

### Acceptance plan

1. Dedicated Mux build must prove time-zero poster retrieval, healthy recovery panel hidden, viewer-facing tagline and `00:18 / 00:55` visual clock.
2. Full DETOUR CI must keep Chromium, Firefox, desktop WebKit, packed-host, responsive and keyboard suites green.
3. Stage the exact successful dist; update only the isolated `detour-mux-release` Worker.
4. Re-run signed-out 375×667 public Hold → 18s → Return and 1280×900 smoke. Capture the new public states and compare player top position to the prior 155.3px mobile baseline.
5. Only then check 081 and move to 082.
