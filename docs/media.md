# Canonical DHAGO media — original film restored

## Frozen identity

**Studies in Thread** is the original 64-second procedural motion study that existed before all later documentary replacement experiments. It contains abstract scenic line animation and a quiet synthesized tone, **no speech**, and descriptive captions. It is NOT the later **From Fibre to Fabric** documentary or its regenerated variants. No future video generation is authorized.

| Role | Canonical file |
|---|---|
| Original film | `apps/preview/public/media/studies-in-thread.mp4` |
| Compatibility source | `apps/preview/public/media/studies-in-thread.webm` (build-produced when missing) |
| Poster | `apps/preview/public/media/poster.webp` |
| Chapters | `apps/preview/public/media/chapters.vtt` |
| Captions | `apps/preview/public/media/captions.vtt` |
| Derived weave study | `apps/preview/src/weave-studies.json` (build-produced) |

The Git MP4 blob was `38b34cbd3e0e06221e12e9059979a0ece8cc266b` (2,563,521 bytes) both on the pre-replacement baseline `d8aba3f957cb` and later `main`. The original Mux provisioning configuration recorded content SHA-256 `9dcc4672e3014ca947e310c1809c0cf6d40ffff186478f3e6a1e47f89b3688b3`; the canonical-source verification command checks that exact digest rather than downloading an unverified replacement.

Original chapter boundaries: `0–16s A thread of light`, `16–32s The shape of quiet`, `32–48s Where shadows gather`, `48–64s Coming home`. Use actual WebVTT cues; tool fixtures must be clearly labeled.

## Recovery mirrors, checked 2026-11-14

- Cloudflare R2 bucket **dhago-studio-static** retains `media/studies-in-thread.mp4` (2,563,521 bytes), `media/studies-in-thread.webm` (7,455,419 bytes), `media/poster.webp`, `media/chapters.vtt`, `media/captions.vtt`.
- Historical original Mux playback ID: `Kc01fHxM9HqQpKzgf9qZRumwvL02wQZLZUwZHKtQ6F02mw`. This is public playback metadata, not a management token. **Current live playback remains unverified.** Do not make the old ID default until its HLS stream plays and seeks reliably in the actual browser build.
- Owner Google Drive folder: `Videojs`, ID `1uBHKAcUv2G8mfn3e9Q01A-F1Cp5U7RL5`. Earlier archives include original-source and live Mux test evidence from 2026-11-13; earlier passes are historical, not current release proof.

The released Demo uses the original self-hosted MP4 with compatibility WebM where supported. Mux is optional and must not become a hard dependency or delay engineering release. Do not publish/reupload duplicate original media objects merely because the public HTML was replaced. Keep secrets out of source, logs and artifacts.

See `docs/RESTORE-ORIGINAL.md` for implementation/verification status.
