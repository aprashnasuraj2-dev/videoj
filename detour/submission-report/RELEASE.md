# DETOUR release handoff

**State:** Core public demonstration qualified by exact-head CI; final submission packet and owner sign-off remain pending. This record separates the **publicly deployed immutable assets** from the **later branch source** and does not assume a new deployment on every commit.

| Field | Evidence / status |
| --- | --- |
| Verified source CI | `1016bd1b39d817261fc0a5b0d3cbdc2252c2ce6e` — [Actions 43703881941](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703881941), full pipeline green |
| Frozen asset source | `50ac9661e315f099d3121850a57dd398cbeb5865`, immutable branch `detour-dist-50ac9661e315`; do not conflate with later source changes |
| Public URL | https://detour-release.praisethegreatfool.workers.dev/ — anonymous HTTPS browser pass recorded in CI 43703881941 |
| Host and storage | Isolated Cloudflare Worker `detour-release`, private R2 bucket `detour-release-assets`, binding `DETOUR_ASSETS`; public r2.dev disabled |
| Media bytes | Procedural 56s `detour-showcase-v1.mp4`, 871,570 B, SHA-256 `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1` |
| Anonymous playback / seek | 375×667 Chromium, real 206 byte range of exactly 1,024 B, poster JPEG and English VTT; paused Hold 42.35 → Seek 18 → Return 42.350s |
| Separate media mount | Production `/integration/` hosts `daylight-study` plus its own VTT, same skin; [Actions 43701045585](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43701045585) |
| Mobile and assistive technology | Responsive browser coverage exists; physical-phone step 062, NVDA/VoiceOver step 064 and native 200% zoom step 065 remain **open** |
| Mux optional bonus | **Not qualified.** Run 43704372300 failed for missing secrets; [recovery run 43705427292](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43705427292) intentionally skipped provisioning. No Playback ID to claim |
| Real-site bonus | **Skipped.** Engineering integration page is not a separately verified authentic site (step 078) |
| Media/code rights | [Rights and operations inventory](RIGHTS.md): generated DETOUR media and captions; source Apache-2.0. Owner verification and service retention responsibilities remain open (step 079) |
| Rollback | Restore the frozen `detour-dist-50ac9661e315` source and SHA-versioned R2 objects behind the isolated Worker; read back all headers and run the HTTPS seek gate before declaring recovery |
| Submission eligibility and owner acceptance | **Open** steps 002, 091 and 099; no contest submission, terms acceptance or second-entry permission is claimed |
| Hero capture and submission fields | **Pending** steps 082–089 and 097. Use actual screenshots from the frozen public player only |

## Handoff sequence

- Confirm the current public Worker still serves the frozen source and media bytes immediately before the entrant uses the URL. Fresh publication evidence is needed if the release changes.
- Prove the five mandatory controls, captions, focus, keyboard and compact behavior on the exact public build; do not infer physical-device/AT passes from desktop browser emulation.
- Have the entrant inspect the joined Contra form, decide whether this second entry is permitted, confirm media licensing, ownership, billing and persistence through judging, then explicitly approve the packet before submitting.
- Submit only qualifying optional bonuses. A green Mux workflow that skipped its asset step is **not** a qualified bonus.
- Preserve the reviewed build, rollback SHA and media object inventory throughout judging. After submission, verify the listing's link from an anonymous browser and save the actual submission receipt.
