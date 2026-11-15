# DETOUR asset rights, operational responsibility and retention inventory

**Audit date:** 2026-11-15. **Status:** Engineering provenance documented; owner-level rights and account retention sign-off pending. This does not itself close checklist 079.

| Component | Origin / evidence | Permission boundary | Availability and responsible party |
| --- | --- | --- | --- |
| Reusable skin JS/CSS and host API | `detour/skin/`, package `license: Apache-2.0` and `detour/LICENSE` | DETOUR entry source intended for Apache-2.0 redistribution; check dependency notices separately | Repo owner must preserve GitHub source, release commit and package provenance |
| Showcase MP4 | `scripts/make-fixture.mjs` FFmpeg `lavfi` graphics and generated sine audio, not downloaded footage | Project-authored synthetic video, no third-party footage or sound recording claimed | 871,570 B version verified in release run 43703881941; Worker/R2 account owner must retain through judging |
| Showcase poster | Frame extracted from showcase video at ~42s | Derivative of project-authored showcase | Same versioned R2 object inventory; owner must retain |
| Showcase captions | English descriptive VTT authored in `scripts/make-fixture.mjs` | Project-authored descriptive captions | Same Worker/R2 storage; owner must retain |
| Other fixture videos/VTT | `navigation-study`, `daylight-study`, `portrait-study` scripted in `scripts/make-fixture.mjs` | Synthetic test media and authored descriptive text | Distinct test/integration host media; maintain release assets if included |
| Font rendering | Text drawn into synthetic MP4 by FFmpeg environment's installed fonts | Font outlines rasterized into video; no font binary distributed by generator | Reproducibility may vary with available system fonts; record build image for bitwise rebuild claims |
| Video.js and test/build dependencies | `@videojs/html@10.4.0`, Vite, Playwright and FFmpeg | Own third-party licenses; Apache-2.0 for this entry does **not** automatically license external dependencies or tools | Confirm exact installed dependency notices and release build provenance before step 094 |
| Symbols/icons | Native UI shapes and scoped skin CSS; requires final shipped-asset check | No third-party icon art claimed on current evidence | Confirm production-bundle inventory at freeze |
| Public media transport | `detour-release` Worker and private `detour-release-assets` R2 binding | Deployment rights and ongoing service access are distinct from media authorship | **Owner confirmation required:** Cloudflare account, billing and availability through judging; preserve SHA-versioned objects |
| Optional Mux | No independently qualified playback asset or ID | Bonus should not be claimed or exposed as working | **Blocked:** `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` not available as GitHub Actions secrets in failed run; owner must configure and accept retention/billing if this path is pursued |
| Separate live-site bonus | No verified independent audience-serving deployment | No qualifying claim | Explicit skip recorded in Phase 8 step 078 |

## Open attestations for step 079

1. **Service control:** Account owner must identify who can repair Cloudflare Worker/R2 and confirm billing/retention through the challenge judging period. A repo-side tool cannot infer this ownership.
2. **Media and licensing:** Entrant must confirm project-authored source and desired license scope for submitted media separately from Apache-2.0 code, and audit the final shipped dependencies/notices.
3. **Operational proof:** Perform a fresh unsigned browser/HTTP readback of actual assets at the final freeze, retaining exact URL, source SHA, object hashes and rollback instructions.
4. **Optional streaming:** Only after Mux is provisioned with server-side credentials, verify readiness, signed-out seeks and fallback independently; never claim the bonus based only on successful workflow status.

**Counterexample:** An Apache-2.0 code repository can be legally redistributable while a video embedded by its host is not licensed for redistribution. Keeping those two rights chains separate prevents a false all-assets-cleared declaration.
