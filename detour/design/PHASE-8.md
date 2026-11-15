# Phase 8 — showcase media decision

## Step 071 decision

**Selected direction:** a deterministic, custom 56-second DETOUR motion study generated entirely from FFmpeg primitives in this repository. The existing `navigation-study` fixture remains the fallback and test source; no DHAGO media is reused.

| Option | Reveal at 00:18 vs 00:42 | Rights / availability | Production cost | Decision |
| --- | --- | --- | --- | --- |
| Existing `navigation-study` | Strong rust/green difference | Fully generated in DETOUR; reproducible | Already available, but silent and intentionally utilitarian | Keep as fallback |
| External documentary/process footage | Potentially stronger realism | Requires source-license, attribution, download and continuity verification | ~1–3 h plus external dependency | Reject for critical path |
| Custom procedural showcase | Exact timing and visual contrast under our control | No external source footage/music; deterministic regeneration | ~1–2 h implementation + verification | **Selected** |

### Time cap

Cap media implementation and verification at **2 active engineering hours**. If the dedicated cut fails playback, visual differentiation or bundle tests inside that cap, revert the public demo to `navigation-study` rather than delaying release.

### Rights basis and provenance

`detour-showcase-v1` is generated from solid colors, grids, boxes, text, a synthetic sine wave and timing expressions declared in `scripts/make-fixture.mjs`. It contains no downloaded footage, photographs, trademarks, logos, music recording or third-party caption text. FFmpeg is a build tool and its binary is not redistributed by this bundle. The generated poster is extracted from the generated video itself. Font glyphs are rendered by the CI/system FFmpeg environment rather than shipping a font file.

This is a project-authored asset/provenance record, not a representation about unrelated external footage. The owner still controls final contest publication and any license notice attached to submission media.

## Step 072 bundle implementation

The generator produces, under `public/showcase/`:

- `detour-showcase-v1.mp4` — 1280×720, 24fps H.264/AAC, fast-start, 56 seconds.
- `detour-showcase-v1-poster.jpg` — actual frame extracted at 42 seconds.
- `detour-showcase-v1.vtt` — English descriptive captions covering the three visual states.
- `detour-showcase-v1.json` — machine-readable timing/provenance manifest.

The bundle is generated rather than committed as binary source. Local build/playback/seek verification and HTTPS qualification remain separate evidence gates before step 072 can be checked.


## Acceptance — 87afdf6

[Actions run 43699914256](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43699914256) passed the full DETOUR pipeline after restoring the legacy 64s fixtures and scoping 56s only to the showcase. The dedicated media suite reports:

- H.264 1280×720 video + AAC 48kHz audio, duration 56s.
- Fast-start MP4 atom order.
- Poster extracted from the actual 42s frame.
- Descriptive VTT and JSON provenance/timing manifest.
- Different encoded frame hashes at 18s and 42s.
- Fresh Chromium/Vite HTTP seeks at 18.000s and 42.000s; poster/VTT/manifest return 200.

**071 passes.** **072 remains open** solely for its HTTPS/public-origin condition.


## Judge demo and portability acceptance — 34261f0

[Actions run 43701045585](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43701045585) passed the full pipeline.

- **073:** public-root composition tested at 320×640, 375×667 and 1280×900. The player begins above 120 CSS px, is meaningfully present in the first viewport, is paused, has no authentication/intro gate, and points to the showcase MP4/poster.
- **074:** Vite now builds `integration/index.html` as a real production entry. Its host owns a different `daylight-study` MP4/VTT and imports the same `createDetourPlayer` entry. Hold → 18s → Return landed at **42.350s**.
- Regression suites explicitly request `?fixture=navigation-study`, keeping the 64s QA media independent from the 56s judge media.

The next blocking acceptance is **072 HTTPS**. Local HTTP evidence is not promoted to HTTPS evidence.


## Step 072 HTTPS acceptance — 1016bd1

[Actions run 43703881941](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703881941) passed the full DETOUR pipeline on source `1016bd1b39d817261fc0a5b0d3cbdc2252c2ce6e`.

The signed-out 375×667 Chromium public-origin test verified:

- `https://detour-release.praisethegreatfool.workers.dev/` returned HTTPS 200 with frozen source/dist headers.
- Real MP4 metadata became seekable from SHA-versioned R2 storage.
- A browser fetch of bytes 0–1023 returned **206**, exactly **1,024 bytes**, `video/mp4`, `Accept-Ranges: bytes`, and a valid Content-Range.
- The actual 42-second poster returned JPEG and the descriptive captions returned `text/vtt` beginning with `WEBVTT`.
- The player did not autoplay.
- Hold at 42.35 → seek to 18 → Return landed at **42.350 s** and remained paused.

The release storage is private R2 behind the Worker binding; direct `r2.dev` public access is disabled. The frozen release source is `detour-dist-50ac9661e315`. **072 passes.**

## Step 075 Mux GO — 1016bd1

**Official bonus:** the Video.js Skins Challenge awards **+1 point** when the submitted player uses Mux-hosted video, the submission includes the public Mux Playback ID, and the asset remains live through judging.

**Decision:** GO, but keep it strictly optional. The core R2 release already passes independently, so Mux cannot become a critical dependency.

**Budget:** 90 active engineering minutes. At the 072 acceptance checkpoint approximately 45.5 hours remained before the published challenge deadline; the Mux cap consumes ~3.3% of that buffer. If provisioning, rendition readiness, public playback or signed-out seek verification does not pass inside the cap, remove/skip the Mux bonus and keep the verified R2 release.

**Implementation boundary:**

- Upload the exact DETOUR showcase using management credentials only in GitHub Actions.
- Deduplicate by content SHA/passthrough to avoid duplicate Mux assets on reruns.
- Request a **public** Playback ID, `video_quality:"basic"`, and the current Static Renditions API with `resolution:"highest"`; do not use deprecated `mp4_support`.
- Optional host may use `https://stream.mux.com/{PLAYBACK_ID}/highest.mp4` plus Mux thumbnail/caption strategy as appropriate.
- Do not import Mux management code into `skin/index.js`, `skin/base.js`, or the normal R2 release route.
- Keep the R2 MP4 as fallback for step 077.
- Retain the bonus only after signed-out browser playback and real DETOUR Hold/seek/Return pass on the Mux URL.

References: official Contra challenge page, Mux Direct Upload API, Mux Assets / Static Renditions API, and Mux playback-ID documentation current on 2026-11-15.

## Step 078 real-site bonus skip — 2026-11-15

**Decision: SKIP and claim zero real-site bonus points.** The production `/integration/` page and its separately supplied `daylight-study` media demonstrate a portable skin, but they are engineering examples under the same release project rather than independently verified useful content on a genuine audience-serving website. No external-owned deployment, anonymous real-site playback, or site-owner persistence evidence exists in the current branch. Such a page must not be described as a qualified live-site bonus. Retain the tested core R2 demo and the portability evidence for their respective claims; only reopen 078 if an authentic site is deployed and independently verified before submission.

## Step 076 provisioning result and optional-host implementation — 2026-11-15

Mux workflow [43705427292](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43705427292), rerun attempt 2, successfully provisioned the exact 871,570-byte DETOUR showcase under content hash `detour-fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`. The public Playback ID is `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`; Mux reported `highest.mp4` ready and the provisioning probe returned **206** with **1,024 bytes**. The public configuration artifact is 14158174193. No management credential is stored in the repository.

The implementation adds a dedicated `/mux/` production entry instead of replacing the already-qualified R2 root. The host uses Mux's public static rendition so Chromium/Firefox/WebKit can retain the native `<video>` contract without adding an HLS runtime to the reusable core. It exposes a separate fallback action to the same rights-cleared showcase bytes through the ordinary release origin. Dedicated browser verification remains required before 076/077 can be checked.
