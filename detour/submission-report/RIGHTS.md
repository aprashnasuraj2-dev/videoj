# DETOUR asset rights, operational responsibility and retention inventory

**Audit date:** 2026-11-15. **Phase 10 status:** step 094 accepted on the final public candidate and reusable package. Media rights, code/dependency licensing and service ownership are intentionally separate claims.

| Component | Permission / evidence | Publication boundary | Availability / restoration owner |
| --- | --- | --- | --- |
| DETOUR package source | `detour/LICENSE` and package metadata declare Apache-2.0 | Reusable skin source; tarball includes LICENSE and README | Repository/challenge operator preserves source and package |
| Runtime dependencies | Pinned lock contains **17 non-dev dependencies**; license set is Apache-2.0, BSD-3-Clause and MIT only | Third-party licenses remain their own; entry Apache-2.0 does not relabel them | Lockfile + exact CI package retained |
| Showcase MP4 + generated audio | FFmpeg lavfi graphics/text + generated sine; no downloaded footage/sound recording; 871,570 B, SHA-256 `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1` | Project-authored demonstration media, separate from package code license | Mux asset + private R2 fallback retained through judging |
| Showcase poster | Mux thumbnail derived from the same public asset at **time=0** | No separate third-party image | Mux image endpoint; fallback video remains independent |
| Showcase captions | Project-authored descriptive VTT | No third-party transcript | Same-origin Worker asset |
| Secondary fixtures/VTT | Procedural `navigation-study`, `daylight-study`, `portrait-study` | Test/reuse evidence, not borrowed footage | Immutable dist preserves accepted versions |
| Font rendering | System font glyphs rasterized into generated video; no font binary distributed | Frozen media hash is authoritative for the accepted binary | Rebuild may vary with system font; accepted bytes retained |
| UI symbols | Project-authored inline SVG/CSS | No third-party icon pack | Frozen source |
| Final public runtime | `a3b43f74c7652c707c3703193ab1081820bafa79` / `detour-dist-a3b43f74c765` | Audience-facing player; no management code or secret | Isolated Worker `detour-mux-release`, deployment `df263a1169024f2598b63aec0bb41bbe` |
| Mux | Public Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`; management credentials exist only as GitHub Actions secrets | Browser/package contain public playback data only | Challenge operator keeps asset live through judging |
| Independent rollback | `detour-release` + private `detour-release-assets` R2 / `detour-dist-50ac9661e315` | No Mux dependency | Challenge operator retains Worker/R2 |
| Reusable tarball | `detour-video-skin-0.1.0.tgz`, **16,417 B**, SHA-256 `6c3680164f42bf582fe739b0e82af73826d35aea9a3f2ae8558c90cd6d6ad5cc`, **15 files** | Excludes demo/public/test/scripts/design/report material | Actions artifact 14161323994 + reproducible `npm ci && npm pack` |
| Real-site bonus | `https://aafnaipatro.com/labs/detour/` on owned `aafnaipatro.com`; accepted DETOUR hashed build with independent same-origin procedural video/captions; Cloudflare Browser Rendering + run 43715327394 | **Qualified live-site claim**; separate from the Mux judging URL | Isolated Worker `aafnai-detour-live-v1`, deployment `f0e707401bac46dfab475122ef993daf`; route `aafnaipatro.com/labs/detour*` |

## Final audit — run 43713525858

- Scanned **74** production-dist files; **69** emitted text files were checked for Mux management credential names, management API endpoints, Basic authorization hooks and related secret patterns.
- Public config contains public playback metadata only and matches the exact generated showcase SHA.
- `npm pack --dry-run` contains **15** files; demo, integration, public media, tests, scripts, design and submission reports are excluded.
- Independent tarball extraction reproduced those 15 paths and found no management-secret/API-hook match.
- Production dependency licenses are limited to **Apache-2.0 / BSD-3-Clause / MIT**.
- Build/test tools such as Vite, Playwright and FFmpeg are not distributed as reusable package assets.

## Operational recovery

- **Primary restore:** deploy `detour-mux-release` from immutable `detour-dist-a3b43f74c765` with the existing `DETOUR_ASSETS` R2 binding, then repeat the signed-out public Mux gate.
- **Independent rollback:** use https://detour-release.praisethegreatfool.workers.dev/ backed by `detour-dist-50ac9661e315`.
- **Mux retention:** keep the current public asset/Playback ID live through judging; a replacement is not bonus-qualified until re-tested.
- **Live-site retention:** keep `aafnai-detour-live-v1` and `aafnaipatro.com/labs/detour*` live through judging; it is isolated from the site's existing application routes.
- **Package restore:** rebuild from the reviewed branch with `npm ci && npm pack`, compare contents and rerun packed-host tests.

**Counterexample:** Apache-2.0 source does not automatically clear media or third-party dependency rights, and project-authored media does not relicense bundled libraries. The audit keeps those permission chains separate.
