# Final checkpoint presentation evidence

**Accepted:** 2026-11-16.  
**Playable authority:** https://detour-entry.aafnaipatro.com/mux/  
**Runtime:** `d430f2ee49fa93a460c150fd90205b13fe5327be` / `detour-dist-d430f2ee49fa`.  
**Evidence run:** 43772874624.  
**Artifact:** 14184539322, ZIP digest `sha256:2281c1083ff62fcdbb9e207a9e0709fb02d35247e06287ca3469694c78dafcc5`.

| File | Dimensions / duration | Bytes | SHA-256 | Role |
| --- | --- | ---: | --- | --- |
| `hero-1280-checkpoints.png` | 1248×806 | 85,773 | `039b00f0104433c673dca18e8a41bb11fc477c79759a793b3c2bc308a785cb20` | Primary submission visual: C1–C4, current 00:15, hovered C1 = 00:42 |
| `detail-1280-checkpoints.png` | 1246×135 | 11,308 | `082f9aa4c7b00e9c9e6d2b178fe509773bfe0057b080bf9c7bef0975063d8011` | Rail/control detail |
| `compact-375-checkpoints-captions.png` | 363×356 | 22,611 | `01de3735d3de0182c7f8ec078ef2b2c29f3c45c552e5013c85760f9d070c28f3` | Phone-width checkpoint + genuine active caption state |
| `alternate-960-held.png` | 944×635 | 27,756 | `1a80f047abae722784c9f806093ee905f5ba229ad576b9b0fbbc3438894d548d` | Different media with backward-compatible single-place mode |
| `recovery-375.png` | 363×548 | 30,408 | `8e2ff6eaf1353b6c1874ee96ff20c23e827ca8d72f8d56778f81920668df98c4` | Provider failure / Retry + backup surface |
| `interaction-960x720.webm` | 6.28s, 960×720 VP8, silent | 298,642 | `448b50908f3b81f7a5ca823d53eeb9ebdcd95bbe5e0b156790df3de044938151` | Authentic multi-checkpoint keyboard interaction |

The duplicate raw Playwright recorder output is byte-identical to the selected WebM and is excluded.

## Submission framing

> **A seek bar that remembers.**

Most seek bars remember only where playback is now. DETOUR keeps that familiar playhead, then adds up to four source-scoped temporal checkpoints on the same rail. At rest they remain compact C1–C4 brackets; hover/focus reveals the saved time, and activation returns without consuming the checkpoint.

The four-point cap is deliberate. Unlimited bookmarks would be a different product and would make the timeline harder to read. DETOUR stays a player primitive.

## Owner pack

`DETOUR_COMPETITION_MASTERPACK_v4.zip`  
SHA-256: `9770949632f6f293a5c1984fa2363994bbe78bfdd3dcfacb9bd74df14bd54da8`

The package inside the owner pack is the exact CI reusable tarball: 19,213 B, 15 files, SHA-256 `86174f366fce43f9da878abbdaecc125e8deda6226838c695aa44ccaa21176e9`.
