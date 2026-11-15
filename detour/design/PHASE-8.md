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
