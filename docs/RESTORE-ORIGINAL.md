# Original-media restoration ledger (2026-11-14)

**Decision: freeze the initial Studies in Thread motion study.** No replacement, narration or image generation. This is a media-specific reconciliation on top of the latest DHAGO code, not a repository reset.

## Evidence
- Pre-replacement repository `d8aba3f957cb` used `studies-in-thread.mp4` in Demo and Studio Journal, `poster.webp`, `chapters.vtt`, `captions.vtt` and the original historical Mux ID.
- Initial film Git blob is `38b34cbd3e0e06221e12e9059979a0ece8cc266b`, 2,563,521 bytes. The Git MP4 remains in the current repo.
- Cloudflare R2 `dhago-studio-static` contains the intact old MP4, WebM, poster and VTT objects alongside later documentary experiments (unreferenced by the corrected app).
- Drive `Videojs` contains pre-replacement release/source evidence and post-release Mux proof archives.
- Mux historical ID exists in pre-replacement app config, but **live Mux availability is not confirmed**.

## Preservation
- [x] Do not roll back player source, Living Loom state engine, stream telemetry, ribbon, Stress Lab, accessibility or CSS architecture.
- [x] Restore original media paths/labels, caption and chapter wiring in player surfaces and build scripts.
- [x] Restore and label player weave-stage choreography for original four chapters.
- [x] Enforce original MP4 digest at build time.
- [ ] Exact-head CI passing.
- [ ] All tests proving current original-media behavior.
- [ ] New engineering Tools and Edge Lab complete.
- [ ] Public deployment from verified merged SHA.
- [ ] Mux original live playback verified or marked unsupported.
- [ ] Owner-controlled competition submission.

Note: verified presence does not establish cryptographic parity of the R2 mirror. The source-controlled Git MP4 plus SHA-256 check is authoritative. Public deploy and live rechecks are separate gates.
