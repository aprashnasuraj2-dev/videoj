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
