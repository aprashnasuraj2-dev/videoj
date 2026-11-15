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

## Step 081 public acceptance — 2026-11-15

The polished implementation source `c647d59d6f00dae6f753a20ebc163ef12bcd5992` passed the complete DETOUR pipeline in run 43710674795 and was staged as `detour-dist-c647d59d6f00`. The isolated Mux Worker was updated to that immutable branch and public verification run 43711048857 passed.

Reviewed public capture deltas:

| Measurement | Before | After | Effect |
| --- | ---: | ---: | --- |
| 375px player top | 155.28px | 65.98px | **89.30px earlier**, ~57.5% reduction in pre-player vertical distance |
| 375px recovery panel | 80.5px visible | 0px | Infrastructure UI removed from healthy path |
| 1280×900 player bottom | 933.83px | 869.44px | Full player now fits inside 900px viewport with ~30.6px reserve |
| Cold media image vs clock | poster ~41.917s vs clock 0:00 | frame 0.000s vs clock 00:00 | First frame and truthful playback state agree |
| Held time grammar | 0:18 / 0:55 vs Return 00:42 | 00:18 / 00:55 vs Return 00:42 | Current and held times use one visual grammar |

Keyboard and mobile behavior did not regress: the full run retained packed-host, Chromium, Firefox, desktop WebKit, responsive, keyboard and emulated-touch passes. The semantic Video.js `media-time` components remain in the DOM; only the visible time face is custom-formatted and aria-hidden. **Step 081 passes.**

## Evidence review after step 081 — 2026-11-15

Evidence run 43711518943 confirmed the capture pipeline can reproduce the real signature and record a 6.32-second browser interaction clip, but review intentionally did **not** promote every generated file. The first compact capture lacked a visibly active cue, the detail crop was too tight above the held bracket, and the failure frame contained two competing recovery surfaces. These are being corrected before 082–086 acceptance.

A separate full run (43711379164) showed desktop WebKit report the native media `ended` flag before the DETOUR ended-state CSS became observable. Packed WebKit, Chromium, Firefox and independent Phase 7 probes in the same run passed. The regression now waits a bounded 2 seconds for the actual ended UI after the native ended flag, preserving the product requirement while removing an event-listener/CSS settlement race from the assertion timing.

## Steps 082–087 and 089 evidence acceptance — 2026-11-15

Final capture run 43712329599 executed the browser evidence script against public source `a3b43f74c7652c707c3703193ab1081820bafa79`. The selected evidence is documented in [PHASE-9-PRESENTATION.md](../submission-report/PHASE-9-PRESENTATION.md). Visual review confirmed that the improved detail crop contains the complete held bracket, compact captions are actually rendered from an active VTT cue, the recovery frame contains one recovery surface, and the alternate context is visually/media-distinct rather than a duplicated hero.

The interaction recording is 6.08 seconds, 960×720 VP8 at 25fps with no audio stream. Frame inspection shows the real player at 00:00, the held-state exploration with keyboard focus on the seek control, and completion at 00:42 with focus on Keep my place. This is stronger than a motion mock because the capture script asserts real media time and real button state before accepting the file.

## Step 088 public-language acceptance — 2026-11-15

[Mux verification run 43712857162](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43712857162) opened the exact public primary, alternate and recovery routes in a fresh Chromium context. The audit requires viewer-facing titles/copy and rejects visible terms matching Mux, R2, workflow, GitHub/Actions, fixture, debug, source SHA, detour-dist, “Independent host” or developer. It also requires the recovery host to expose its two viewer actions without the nested generic player error. All assertions passed. Technical `mux-public.json` remains a machine-readable playback resource, not a linked creative surface. **Step 088 passes.**
