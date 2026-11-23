# SUTRA learner workspace interaction contract

Status: engineering acceptance contract for the current synthetic shell. This is not a release claim and does not imply that original lesson media or factual review exists.

## First-viewer task

The page must answer three questions without opening the runtime/provenance inspector:

1. **What am I trying to do?** Trace the synthetic 00:02 timing marker to a versioned source without treating a hash as factual truth.
2. **What supports it?** The 8-second synthetic timing fixture and its own versioned 0–8 second transcript are shown together; the separate 12–18 second evidence annotation is explicitly labeled as a different fixture.
3. **What should I do next?** The guided task exposes one current human action: load media → open cue → verify evidence → preview/save the review card.

The developer/runtime, peer, BYOK and provenance controls are optional and collapsed by default.

## Source identity rules

The timing-media learner flow uses:

- source ID: `synthetic-timing-fixture`
- source version: `v1`
- media duration: 8 seconds
- transcript version: `timing-transcript-v1`
- transcript SHA-256: recorded in `apps/sutra/src/fixtures/timing-transcript.json`

The separate W3C annotation example contains a 12–18 second cue and must never be presented as a cue in the 8-second timing media. It remains an independent evidence-profile fixture.

## Core state model

| State | Meaning | Typical trigger | Next human action |
| --- | --- | --- | --- |
| `empty` | No timing media is mounted yet; text/evidence fixtures remain inspectable. | First load. | Load the synthetic timing fixture. |
| `loading` | Media bytes/version are being loaded and checked. | User activates Load. | Wait for metadata; do not claim playback. |
| `ready` | Timing media is available or evidence consistency was user-reviewed. | Successful media load / user evidence check. | Open the 00:02 cue, verify evidence, then preview the card. |
| `denied` | Optional external contact was denied. Local learning surfaces remain usable. | User denies peer contact. | Continue locally; no peer result is required. |
| `error` | Timing media could not load. No media success is claimed. | Fetch/decode/error path. | Retry media or continue transcript/evidence inspection. |
| `completed` | The reviewed synthetic receipt was saved locally after confirmation. | Confirmed save action. | Delete/export the local card or inspect optional provenance. |

No state may imply factual verification.

## Responsive contract

### Desktop

At CSS viewport widths above 760 px, lesson/transcript and evidence are a two-column workspace. The guided task spans the main content width. The review flow remains below the core evidence workspace.

### Narrow screens

At 760 px or below, the workspace becomes one column. At 520 px or below, transcript cue controls stack their time and text instead of compressing horizontally. At 360 px, the document and core DHAGO controls must remain inside the viewport.

### 200% zoom

Browser zoom effectively reduces the CSS viewport. The design therefore relies on fluid widths, `min-width:0`, wrapping actions, and the same one-column breakpoints rather than a separate zoom-only layout. Acceptance should test an equivalent reduced CSS viewport plus keyboard focus order; no fixed pixel-width core panel is allowed to force horizontal scrolling.

## Transcript interaction

- Search is bounded to 80 characters and at most 100 visible matches.
- Each result has a stable accessible name containing its exact time range and text.
- ArrowUp/ArrowDown/Home/End move focus only among currently visible results.
- Enter/Space use native button activation to seek.
- Active playback only updates `aria-current="true"`; it must not call `focus()` or `scrollIntoView()`.
- Missing transcript and missing captions are separate states.
- Translated text, if later added, must be labeled as translation and must not replace the original quotation.

## Evidence and review interaction

- Evidence validation recomputes transcript integrity and exact cue matching.
- A hash match is explicitly described as byte consistency, not truth.
- Review-card save/export is always previewed before a local write/download.
- The saved receipt is bound to source/cue/version data and can be deleted.
- Unknown write outcome is not retried automatically.

## Optional technical surfaces

The runtime/peer/BYOK/provenance area is inside a collapsed disclosure. Its absence or failure must not prevent:

- timing media playback;
- transcript search/navigation;
- local evidence validation;
- local review-card save/delete/export.

## Fresh-viewer acceptance path

1. Open the page signed out.
2. Read the guided question and see the active synthetic source/transcript versions.
3. Confirm the runtime/provenance disclosure is closed.
4. Load the timing fixture and observe `loading → ready`.
5. Navigate to the timing-marker transcript cue using the keyboard and activate it.
6. Run the visible evidence check and read the truth-boundary explanation.
7. Preview the review card before persistence.
8. Confirm local save and observe `completed`.
9. Delete the card.
10. Repeat the local flow with peer contact denied; the local lesson/transcript/evidence path must remain useful.

This contract intentionally excludes live provider success, public peer HTTPS, original lesson rights, factual-review acceptance and physical-device proof. Those remain separate gates.
