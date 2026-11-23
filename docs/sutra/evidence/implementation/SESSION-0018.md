# SUTRA session 0018 implementation evidence — guided workspace, evidence seeking and timing transcript

- Observed: 2026-11-23T18:22:28+05:45.
- Tested source candidate: `31a1a8a83a0c39dd8b4c68fcd71bd8d3283a4cb5`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45175869357
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45175869381
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45175869292
- Scope: Phase 041 learner workspace, remaining Phase 043 evidence-to-seek tasks and Phase 044 transcript experience. No original lesson, factual-review or public-release claim.

## Phase 041 — guided learner workspace

The first visible task now asks:

> Can you trace the 00:02 timing marker to a versioned source without treating a hash as truth?

The guided card exposes, without opening any technical inspector:

- active lesson fixture `synthetic-timing-fixture · v1 · 8 seconds`;
- timing transcript `timing-transcript-v1`;
- one current human action.

The core journey state is explicit and visible:

- `empty` — media not yet loaded;
- `loading` — media bytes/version are being loaded;
- `ready` — local timing/evidence task is usable;
- `denied` — optional external peer contact denied; local task remains usable;
- `error` — media load failed and no playback result is claimed;
- `completed` — reviewed receipt saved locally after confirmation.

Background integrity checking no longer advances the human journey. Only a user-initiated evidence review changes the next-action guidance.

The runtime/peer/BYOK/provenance surface is now behind a collapsed `Developer/runtime preview (optional)` disclosure. Engineering tests open it deliberately; the fresh-viewer path never does.

`docs/sutra/LEARNER_WORKSPACE.md` records the desktop, one-column/narrow, equivalent 200-percent-zoom/reflow, source-identity and state-transition contract. Final responsive CSS was applied after that contract. At 360 px the existing browser test still observes no document horizontal overflow and usable core controls.

### Fresh-viewer browser path

A separate Chromium page starts with a clean core journey and:

1. sees the guided question and source/transcript versions;
2. confirms the runtime disclosure is closed;
3. starts media loading while the media request is intentionally held, making `loading` observable;
4. releases the request and reaches `ready`;
5. denies optional peer contact and reaches `denied` while local content remains;
6. performs local evidence review and returns to `ready`;
7. keyboard-activates the timing-marker transcript cue;
8. previews and confirms the local review card;
9. reaches `completed`;
10. deletes the saved card.

A second page aborts the media request and observes the explicit `error` state with no playback-success claim.

This establishes the Phase 041 first-viewer exit condition on the controlled synthetic product shell.

## Phase 043 — evidence card to actual playback

Added `apps/sutra/src/seek-policy.js` so unavailable seeking is classified before changing media state.

The fixed reasons are:

- `invalid_target`;
- `live_or_unknown_duration`;
- `outside_duration`;
- `no_seekable_range`;
- `outside_seekable_range`;
- `seekable`.

`timeRangesSnapshot()` bounds and exception-safely copies the native `TimeRanges` object. The player adapter uses the resulting policy before changing `currentTime`.

Unit tests separately cover live/unknown duration, no range, malformed range, cue outside duration and cue outside the current seek window.

In Chromium:

- the visible evidence cue button is focused and activated with **Enter**;
- the validated 00:02 cue reaches actual native media time within the existing one-second tolerance;
- after the media is deliberately corrupted, activating the same evidence cue produces: “This source has no finite seekable duration…” and explicitly says no seek success is claimed.

No optimistic timer is used.

## Phase 044 — versioned inspectable timing transcript

A new transcript belongs only to the 8-second timing fixture:

- file: `apps/sutra/public/media/timing-transcript.vtt`;
- transcript version: `timing-transcript-v1`;
- transcript SHA-256: `9128748a8a5b636e2bcb99f738fc613d6cc7bcc253546dae45f4a3cf05285881`;
- source ID/version: `synthetic-timing-fixture / v1`;
- media hash: the existing timing-fixture media hash;
- language: English;
- `translated: false`.

The 12–18 second W3C evidence annotation remains visibly labeled as a **separate evidence fixture** and is never bound to the 0–8 second timing media.

The browser recomputes the timing-transcript SHA-256 before rendering. A mismatch, failed request, malformed UTF-8/VTT or invalid cue model does not produce a successful transcript.

### Transcript behavior

`apps/sutra/src/transcript-index.js` provides bounded:

- cue validation and duration limits;
- case-insensitive search;
- maximum query length 80;
- at most 100 returned matches;
- active cue lookup with gaps preserved;
- ArrowUp/ArrowDown/Home/End movement among visible cue IDs;
- stable time-range/text labels.

Chromium observes:

- three versioned synthetic cues;
- search for “marker” returns exactly the marker cue;
- a missing query shows an explicit no-results state;
- ArrowDown moves keyboard focus to the next visible result;
- Enter activates the timing marker and seeks actual media;
- active cue uses valid `aria-current="true"`;
- changing media time updates the active cue while the search field retains focus;
- active highlighting calls `scrollIntoView` zero times.

The UI labels the source version, transcript version, digest prefix and “original synthetic English text, not a translation.”

### Absence states

A dedicated page blocks `timing-transcript.vtt` and observes:

- “Timing transcript unavailable”;
- zero transcript cue buttons;
- the separate evidence annotation/integrity flow remains available.

A second page blocks `timing-captions.vtt`. The declared caption track is preloaded in `hidden` mode so availability can settle without displaying captions. On failure the UI says captions are unavailable while the versioned transcript remains searchable.

Long/malformed cue text and invalid duration/cue metadata fail closed in unit tests.

## Retained failures

The following intermediate failures are retained and are not counted as passing evidence:

- **45173250994** — transcript/media test coupled async transcript readiness and caption state too early after reload;
- **45174231410** — product used an empty boolean-style `aria-current` attribute instead of valid `aria-current="true"`; product code was fixed;
- **45175480362** — disabled caption tracks could remain pending because the browser had not loaded the WebVTT resource; the product now preloads the declared track in hidden mode and settles load/error state.

These failures improved the product rather than being removed from history.

## Counterexamples and limits

- A transcript SHA-256 match proves transcript bytes, not factual truth.
- An active playback cue proves timing correspondence, not semantic correctness.
- Missing captions do not imply a missing transcript; the two resources are intentionally independent.
- A finite seek policy tested on synthetic media does not prove live-stream behavior on every browser; it proves SUTRA will classify non-finite duration as unavailable instead of claiming a seek.
- The current learner workspace is still a controlled synthetic shell. Original lesson rights, factual review, live provider success, public HTTPS and physical-device acceptance remain separate gates.

## Phase exits

### Phase 041

A first-time viewer sees the question, active source/transcript identity, supporting cue and next human action without opening a developer trace. The fresh-viewer path reaches completed and preserves local utility after peer denial.

**Phase 041 can close.**

### Phase 043

Supported media seeks to the valid cue within one second using actual native time. Live/unknown/no-range/out-of-window states have distinct policy reasons and visible no-success feedback. Keyboard activation is observed.

**Phase 043 can close.**

### Phase 044

Transcript search and cue navigation work with keyboard only; active highlighting does not steal focus/scroll; version identity is visible; missing transcript and missing captions have distinct explicit states.

**Phase 044 can close.**
