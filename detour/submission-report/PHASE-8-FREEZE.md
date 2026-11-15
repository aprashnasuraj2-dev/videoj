# Phase 8 frozen demonstration

**Freeze date:** 2026-11-15  
**Purpose:** authoritative media/service identity for Phase 9 capture and Phase 10 submission preparation. Changes below require re-running the relevant release gates.

| Surface | Frozen value |
| --- | --- |
| Primary judge URL | `https://detour-mux-release.praisethegreatfool.workers.dev/mux/` |
| Cloudflare Worker | `detour-mux-release` |
| Worker deployment created | 2026-11-15T11:01:02Z; deployment id `0ff0d1bd13e14b51800dec96c9d5b88d` |
| Production source | `a9bbfcb4ee6810c2e6a5ed0e1f32c731b3780e6a` |
| Immutable dist | `detour-dist-a9bbfcb4ee68` — 75 files staged by full CI 43706450932 |
| Mux Playback ID | `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ` |
| Mux static rendition | `https://stream.mux.com/Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ/highest.mp4` |
| Mux poster | `https://image.mux.com/Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ/thumbnail.jpg?time=42` |
| Showcase bytes | 871,570 B |
| Showcase SHA-256 | `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1` |
| Captions | same-origin `/showcase/detour-showcase-v1.vtt` |
| Mux config | same-origin `/mux-public.json`; public playback metadata only |
| Same-Worker fallback | same-origin `/showcase/detour-showcase-v1.mp4`, served from SHA-versioned R2 on demand |
| Independent rollback | `https://detour-release.praisethegreatfool.workers.dev/` / `detour-dist-50ac9661e315` |
| Real-site bonus | skipped; do not claim |

## Acceptance evidence

- **Provisioning:** run 43705427292 attempt 2 — Mux asset ready, public Playback ID available, `highest.mp4` 206 byte-range probe passed; credentials masked.
- **Implementation:** run 43706451003 — 3/3 dedicated Mux tests passed. Run 43706450932 — complete DETOUR pipeline green and immutable dist staged.
- **Public mobile-width path:** run 43707445255 — signed-out 375×667 Chromium: HTTPS 200, Mux seekable, paused, Hold 42.35 → seek 18 → Return **42.350s**; fallback range 206 / 1,024 B.
- **Public outage recovery:** same run — Mux network blocked, recovery controls appeared, fallback became seekable, no stale held place inherited.
- **Public desktop path:** same run — signed-out 1280×900 Chromium, player measured **1248×804**, Mux source seekable and fallback exposed.
- **No-metadata/reuse boundary:** earlier package/independent-host evidence shows DETOUR's signature does not depend on chapters, thumbnails or showcase metadata. Mux remains a host concern outside the core import graph.

## Freeze rules

1. Phase 9 may change explanatory copy, capture composition and non-behavioral polish only if it does not silently alter these frozen media/service identifiers. Any player-code change still requires the normal full DETOUR gate.
2. Do not replace the Mux Playback ID or rendition merely to refresh an asset. The provisioner is content-hash keyed; identical bytes should reuse the qualified asset.
3. Keep `detour-release` untouched as the independent rollback. A Mux outage must never force an emergency mutation of the known-good R2 release.
4. Preserve the Mux asset, both Cloudflare Workers, R2 objects and immutable branches through judging. The challenge/repository operator owns that retention obligation.
5. Browser checks at 375×667 and 1280×900 establish responsive public release behavior; they are **not** physical iPhone/Android, screen-reader or native browser-zoom certifications. Steps 062, 064 and 065 remain open.
