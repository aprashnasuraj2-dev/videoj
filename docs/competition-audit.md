# DHAGO — Source and Design Audit (2026-11-15)

**Main inspected:** `7b585e369bc3f4d322a26d947a9bbcd114707fc4` · [passing historical workflow](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43662610661).

**Verified source facts:** Video.js HTML v10.4.0 is pinned. `createDhagoPlayer()` mounts the actual shared `video-player` template. Living Loom reads HTMLMediaElement events and time. Host-neutral ribbon does not import Video.js. Original 64-second *Studies in Thread* MP4, WebM, chapter and caption VTT are retained. The Mux public playback ID recorded in source is `Kc01fHxM9HqQpKzgf9qZRumwvL02wQZLZUwZHKtQ6F02mw`.

**Source-level weaknesses and improvements:**

| Importance | Finding | Candidate response | Verification requirement |
| --- | --- | --- | --- |
| High, visual | Optional sampled weave overrides unique chapter-specific stripe structures with one shared pattern | Four distinct chapter track/fill patterns restored in `src/video/dhago.css` | Inspect actual isolated player screenshots at desktop and mobile sizes |
| High, performance | Portable ribbon rewrote all cue geometries on every time update | Cache cue nodes and only relayout on duration change in `src/ribbon/ribbon.ts` | Mutation counter during actual repeated seeks |
| High, release | Current public `release-manifest.json` SHA not returned by available public text extraction | Do not assert exact source/live parity yet | Fetch manifest, compare tested main SHA and run public playback capture |
| Medium, accessibility | Physical iPhone/Android and VoiceOver/NVDA sessions are not documented as completed | Keep manual proof explicit | Owner/human device report |
| Medium, narrow view | 240px layout has a Stress Lab fixture but lacks current inspected player crop | Capture 240px through 1280px | Browser bounding boxes and isolated visual review |
| Medium, adapter | Browser sandbox uses `allow-scripts` without same-origin permission; URL scheme checks can be hardened | Scope changes to adapter loader only | Test HTTPS acceptance and unsupported URL rejection |

**Before-state evidence boundary:** Existing prior CI runs have reported screenshots. The pixels were not inspected in this current audit, so this is a source-first audit, not a fabricated before/after visual assessment. The new CSS remains IMPLEMENTED until exact-head browser and actual-image review.

**Competition evidence boundary:** 10/5/5/5 rubric plus two *possible* bonuses; no judge scores or bonus awards are inferred. Source, Mux and published video must be reconciled before final claims. Phase 10 remains unsubmitted.
