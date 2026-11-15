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
| Final public runtime | `d430f2ee49fa93a460c150fd90205b13fe5327be` / `detour-dist-d430f2ee49fa` | Preferred audience-facing multi-checkpoint player; no management code or secret | Isolated Worker `detour-checkpoints-release`, active version `0726463d-1d9f-467a-af51-17ca13bce8f3`; custom domain `detour-entry.aafnaipatro.com` |
| Mux | Public Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`; management credentials exist only as GitHub Actions secrets | Browser/package contain public playback data only | Challenge operator keeps asset live through judging |
| Independent rollback | `detour-release` + private `detour-release-assets` R2 / `detour-dist-50ac9661e315` | No Mux dependency | Challenge operator retains Worker/R2 |
| NASA editorial media | NASA Scientific Visualization Studio page `https://svs.gsfc.nasa.gov/4185/`; Apollo 11 landing-site flyover ingested to a **separate** Mux editorial asset, Playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`; page credits NASA SVS | Used only on the independent live-site page, not in the competition showcase or reusable package | Aafnai Patro Worker proxies the editorial Mux rendition; original NASA source remains the provenance authority |
| Reusable tarball | Checkpoint-capable `detour-video-skin-0.1.0.tgz`; exact package from runtime `d430f2ee…` preserved in artifact 14184079022, ZIP digest `sha256:e63efd22b5b457000be19447b8021461f20d6adfa13d939acd45259d87d20ee8` | Excludes demo/public/test/scripts/design/report material; single-place remains default, C1–C4 is opt-in | Actions artifact 14184079022 + reproducible `npm ci && npm pack` |
| Real-site bonus | `https://aafnaipatro.com/on-this-day/video/apollo-11/`; owned Aafnai Patro On This Day editorial page using NASA SVS `A New Look at the Apollo 11 Landing Site` through the accepted skin | **Qualified live-site claim, separate from the Mux submission demo.** NASA SVS identifies its visualizations as public domain unless otherwise noted; the page credits NASA SVS and links the source. | Worker `aafnai-history-video-apollo11`, deployment `0c287b4c1e994a3caf41c575e7b7376d`; route `aafnaipatro.com/on-this-day/video/apollo-11*`; editorial Playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U` |

## Final audit — run 43713525858

- Scanned **74** production-dist files; **69** emitted text files were checked for Mux management credential names, management API endpoints, Basic authorization hooks and related secret patterns.
- Public config contains public playback metadata only and matches the exact generated showcase SHA.
- `npm pack --dry-run` contains **15** files; demo, integration, public media, tests, scripts, design and submission reports are excluded.
- Independent tarball extraction reproduced those 15 paths and found no management-secret/API-hook match.
- Production dependency licenses are limited to **Apache-2.0 / BSD-3-Clause / MIT**.
- Build/test tools such as Vite, Playwright and FFmpeg are not distributed as reusable package assets.

## Operational recovery

- **Primary restore:** deploy `detour-checkpoints-release` from immutable `detour-dist-d430f2ee49fa` with the existing `DETOUR_ASSETS` R2 binding, then repeat the signed-out checkpoint/Mux gate. The earlier `detour-mux-release` / `a3b43f74…` route remains a separate single-place mirror.
- **Independent rollback:** use https://detour-backup.aafnaipatro.com/ backed by `detour-dist-50ac9661e315`.
- **Mux retention:** keep the current public asset/Playback ID live through judging; a replacement is not bonus-qualified until re-tested.
- **Live-site retention:** keep `aafnai-history-video-apollo11`, `aafnaipatro.com/on-this-day/video/apollo-11*`, and editorial Playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U` live through judging. The retired `aafnai-detour-live-v1` / `/labs/detour*` route was deleted and must not be cited.
- **Package restore:** rebuild from the reviewed branch with `npm ci && npm pack`, compare contents and rerun packed-host tests.

**Counterexample:** Apache-2.0 source does not automatically clear media or third-party dependency rights, and project-authored media does not relicense bundled libraries. The audit keeps those permission chains separate.
