# DETOUR release handoff

**State:** Phase 8 demonstration frozen and publicly qualified. Final Phase 9 polish, Phase 10 submission packet, second-entry eligibility and owner submission remain pending.

| Field | Evidence / status |
| --- | --- |
| Frozen production source | `a9bbfcb4ee6810c2e6a5ed0e1f32c731b3780e6a` — [full DETOUR run 43706450932](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43706450932) green |
| Frozen immutable dist | `detour-dist-a9bbfcb4ee68`, 75 files, staged only after the full run passed |
| Primary public candidate | `https://detour-mux-release.praisethegreatfool.workers.dev/mux/` — isolated Worker `detour-mux-release` |
| Qualified Mux playback | Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`; `highest.mp4`; exact showcase content hash; provisioning run 43705427292 attempt 2 |
| Public Mux browser proof | [Run 43707445255](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43707445255): HTTPS 200, 375×667 signed-out Hold 42.35 → 18 → Return 42.350s, blocked-provider recovery, 1280×900 desktop smoke |
| Fallback range proof | Same public run: fallback bytes 0–1023 returned **206 / 1,024 B / video/mp4 / Accept-Ranges: bytes** |
| Media identity | Procedural 56s `detour-showcase-v1.mp4`, 871,570 B, SHA-256 `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1` |
| Captions / poster | Frozen descriptive VTT at `/showcase/detour-showcase-v1.vtt`; Mux thumbnail derived from the same public asset at 42s |
| Independent rollback | `https://detour-release.praisethegreatfool.workers.dev/`, immutable `detour-dist-50ac9661e315`, previously qualified by run 43703881941 |
| Separate media mount | Production `/integration/` uses distinct `daylight-study` media/captions and unchanged skin; run 43701045585 |
| Rights / operations | [RIGHTS.md](RIGHTS.md) accepted for Phase 8: project-authored media, Apache-2.0 entry, permissive runtime dependency inventory and service restoration roles |
| Real-site bonus | **Skipped.** Engineering integration example is not represented as a genuine separate live-site placement |
| Physical-device / AT truth | Public mobile-width and desktop-width browser evidence is green; physical-phone 062, NVDA/VoiceOver 064 and native 200% zoom 065 remain open |
| Submission eligibility | **Open** steps 002 and 091; no second-entry permission, contest submission or terms acceptance is claimed |
| Hero / public rationale | Pending Phase 9 steps 082–089; captures must use this frozen release unless the release gates are repeated |

## Frozen handoff sequence

- Treat [PHASE-8-FREEZE.md](PHASE-8-FREEZE.md) as the media/service authority. Do not silently replace the Mux Playback ID, MP4, captions, immutable dist or Worker source.
- Phase 9 may polish presentation around the player, but a change to frozen media/service identifiers requires the corresponding Mux/public release gates again.
- Immediately before submission, re-run the exact public release and five-control checks; keep physical-device/AT claims limited to evidence actually collected.
- The entrant must still resolve second-entry eligibility, inspect the official joined form, approve the exact packet and perform the owner-only submission/terms actions.
- Preserve both Workers and immutable dist branches through judging. If Mux availability degrades, the independently green R2 release is the rollback rather than an untested emergency build.
