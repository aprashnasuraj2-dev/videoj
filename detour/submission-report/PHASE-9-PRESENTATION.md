# Phase 9 presentation evidence

**Accepted capture date:** 2026-11-15.  
**Public player source:** `a3b43f74c7652c707c3703193ab1081820bafa79` / immutable `detour-dist-a3b43f74c765`.  
**Public URL:** https://detour-mux-release.praisethegreatfool.workers.dev/mux/  
**Capture harness commit:** `daa6610ba8a8819893db1c0238bed5ad21a6e516`.  
**Evidence run:** [43712329599](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43712329599), artifact **14161336344**, ZIP digest `sha256:2229dabdc21c38a2310d7e7dad70044492ae1a9e1fb23609e142018a57f3a5e7`. The artifact is retained 14 days for handoff; the capture script remains reproducible from the frozen public URL.

## Form-ready design rationale

**DETOUR lets viewers keep a moment, explore another part of a video, and return in one action.** The familiar seek bar remains familiar: the white playhead follows the current position while a lime bracket preserves the held point, and the explicit **Return to 00:42** ticket makes the reversible action visible. Because the behavior belongs to the player rather than specially authored footage, the same skin works with a second, different video and caption track without changing the interaction.

Public evidence: the [qualified player](https://detour-mux-release.praisethegreatfool.workers.dev/mux/) plus the authentic hero, interaction clip and alternate-media capture below. The rationale intentionally avoids implementation/process terminology; Mux bonus details belong in the submission evidence fields rather than the design story.

## Evidence order and immutable file manifest

| Order | File | Dimensions / duration | Bytes | SHA-256 | What it proves |
| ---: | --- | --- | ---: | --- | --- |
| 1 | `hero-1280-held.png` | 1248×806 | 85,734 | `eb03e909bbd7521535fa384edf8fe3317f5f561c0da139d9fd3198900a7bf2a5` | Main player-only identity: current 00:18, held bracket near 00:42, Return ticket |
| 2 | `detail-1280-held.png` | 1246×135 | 9,422 | `40acf701db340dac38e0200e66a3c09d5ecc22db0d32dc36ed6efc29878ff4e5` | Direct rail/shelf relationship at gallery-detail scale |
| 3 | `compact-375-captions.png` | 363×356 | 21,628 | `396619b43bd8fb20dfaaca4ef83818b93de42ea86162c860e908531e7e001c56` | 375px compact state with a real active caption cue and held Return action |
| 4 | `alternate-960-held.png` | 944×635 | 27,791 | `f6cac1ab0bd577cbed34fcb68fd5334969bb6edc0cb08fb2c0b14b35aca1614a` | Same skin on distinct 01:04 `daylight-study` media |
| 5 | `recovery-375.png` | 363×548 | 30,163 | `0c1cb2bb0b4d35a1a2a1528f4a8cc0a31035327b07f77c48322a008fcede8f42` | Primary-provider failure with exactly one Retry/backup recovery surface |
| Video | `interaction-960x720.webm` | 960×720, **6.08s**, VP8 25fps, no audio stream | 272,667 | `6a95a6edc00ea6a03e83f8e64ee0a44b2038001f9e8844b64d075bccfe766f7f` | Authentic keyboard/focus Hold → explore → Return; verified final media time 42.0s |

The Playwright recorder also emitted a byte-identical temporary `page@….webm`; it is deliberately excluded to avoid duplicate evidence.

## Alt text

- **Hero:** “DETOUR video player at 00:18 with a lime held-position bracket near 00:42 and a bright Return to 00:42 button.”
- **Detail:** “Close crop of the DETOUR seek bar showing the current playhead at 00:18, a lime held bracket near 00:42, and the Return to 00:42 action.”
- **Compact captions:** “375-pixel DETOUR player at 00:18 with captions visible, the held marker on the seek bar, and Return to 00:42 below the video.”
- **Alternate media:** “DETOUR on a second cream-and-yellow video at 00:18 of 01:04 with the same held marker and Return to 00:42 action.”
- **Recovery:** “375-pixel DETOUR page after the primary video source fails, showing Try video again and Use backup video above the player.”
- **Interaction clip:** “Six-second DETOUR screen recording: keyboard focus keeps a place, explores another time on the seek bar, then returns the real video to 00:42.”

## Truth and legibility checks

- The hero, detail and compact images are direct browser screenshots; no control, marker, time or caption is composited afterward.
- The compact capture is accepted only after the browser reports the VTT track as `showing` with at least one active cue.
- Recovery is produced by blocking the actual primary media hostname; the capture rejects a duplicate nested player error.
- The alternate capture loads `/fixtures/daylight-study.mp4`, a different 01:04 media source, and verifies the same Hold/Return state.
- The video is recorded by Playwright from the public page. Its script uses real slider/button focus and keyboard input and asserts the returned media time before accepting the clip.
- The clip contains no audio stream, so its proof does not depend on sound. The 375px still confirms the key action and captions remain legible at a phone-sized viewport.
- These captures do **not** prove physical iPhone/Android or screen-reader behavior; those remain separately open under steps 062 and 064.

## Reproduction

From the DETOUR package with pinned dependencies and Chromium installed:

`DETOUR_PHASE9_OUTPUT=phase9-evidence node scripts/capture-phase9.mjs`

The script reads `mux-release-origin.json`, so reproducing the accepted set requires the frozen public Worker/source above to remain available.
