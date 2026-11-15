# DETOUR asset rights, operational responsibility and retention inventory

**Audit date:** 2026-11-15. **Phase 8 status:** accepted for step 079. This manifest establishes the usable permission basis and restoration ownership needed for the frozen demonstration. The final exact-bundle secret/license/NOTICE audit remains step 094.

| Component | Origin / permission basis | Redistribution / publication boundary | Availability and restoration owner |
| --- | --- | --- | --- |
| DETOUR skin JS/CSS and host API | Project source under `detour/skin/`; package and `detour/LICENSE` declare Apache-2.0 | Entry source is licensed under Apache-2.0; final packaged notices are rechecked at 094 | Repository owner/operator `aprashnasuraj2-dev` preserves source, immutable dist and package provenance |
| Showcase MP4 + generated audio | `scripts/make-fixture.mjs`: FFmpeg lavfi colors/grid/boxes/text plus generated sine tone; no downloaded footage or sound recording | Project-authored synthetic media; exact public file is 871,570 B, SHA-256 `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1` | Challenge/repository operator retains the Mux asset and R2 fallback through judging |
| Showcase poster | Frame extracted from the project-authored showcase at ~42s | Derivative of the project-authored video | Frozen in immutable dist and R2 fallback; Mux thumbnail is derived from the same Mux asset |
| Showcase captions | English descriptive VTT authored in `scripts/make-fixture.mjs` | Project-authored descriptive text; no third-party transcript | Frozen path `/showcase/detour-showcase-v1.vtt` on the release Worker |
| Secondary fixtures/VTT | `navigation-study`, `daylight-study`, `portrait-study` generated/authored in repository scripts | Synthetic test/integration media, not borrowed footage | Immutable dist retains the versions used by test/integration evidence |
| Font rendering | FFmpeg environment renders text into video pixels | No font binary is distributed by DETOUR; rendered glyphs are part of the generated video | Bitwise rebuild may vary with build-image fonts, so the accepted binary hash is the release authority |
| Runtime production dependencies | Pinned lockfile metadata: Video.js/@videojs, @svta and signal-polyfill entries Apache-2.0; Lit entries BSD-3-Clause; React entries MIT | These are permissive licenses; this inventory is a permission-basis check, not a substitute for final notice inspection | Exact lockfile and immutable production build are preserved; 094 rechecks emitted bundle/notices |
| Build/test tools | Vite, Playwright and FFmpeg are used to build/test; their executables are not shipped as DETOUR package assets | Tool licenses are not represented as the entry's Apache-2.0 license | Reproducibility is documented by CI; final artifact review checks that tool binaries did not enter the bundle |
| Symbols/icons | Project-authored inline SVG/CSS shapes in the skin | No third-party icon package or artwork is claimed in the current skin | Source is preserved with the frozen commit |
| Core public transport | Cloudflare Worker `detour-release` + private R2 bucket `detour-release-assets` | Hosting rights/availability are operational, distinct from media authorship | Challenge operator controls the connected Cloudflare account; immutable `detour-dist-50ac9661e315` is the rollback authority |
| Qualified Mux transport | Public Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`; exact showcase content hash; management credentials exist only as GitHub Actions secrets | Public client contains Playback ID/URLs only; management token is excluded from source/bundle and masked in Actions logs | Challenge operator is responsible for keeping the Mux asset available through judging; content-hash provisioning can re-identify/recreate the asset if service state changes |
| Frozen Mux release host | Cloudflare Worker `detour-mux-release`, immutable `detour-dist-a9bbfcb4ee68`, same private R2 bucket for fallback | Serves the qualified Mux demo and rights-cleared fallback; it does not alter Patro/DHAGO resources | Challenge operator can restore from the immutable branch or revert users to the independently green `detour-release` URL |
| Separate live-site bonus | No independently verified audience-serving placement | **No bonus claim** | Explicit skip in step 078; no availability obligation is invented |

## Operational retention and recovery assignment

- **GitHub/source owner:** repository owner/operator `aprashnasuraj2-dev` retains the frozen source `a9bbfcb4ee6810c2e6a5ed0e1f32c731b3780e6a` and immutable dist `detour-dist-a9bbfcb4ee68`.
- **Cloudflare owner role:** the challenge operator maintains `detour-mux-release`, `detour-release` and `detour-release-assets` through judging. The new Mux Worker was created separately so rollback does not require modifying the known-good Worker.
- **Mux owner role:** the challenge operator keeps the public asset/Playback ID live through judging. Management credentials remain server-side in repository Actions secrets and are not a browser dependency.
- **Primary restore:** redeploy `detour-mux-release` from immutable `detour-dist-a9bbfcb4ee68`, preserving its R2 binding and re-run the signed-out public Mux gate.
- **Fallback restore:** route reviewers to `https://detour-release.praisethegreatfool.workers.dev/` backed by the independently verified R2 release. This fallback does not depend on Mux.

## License boundary and counterexample

An Apache-2.0 code repository can still embed media that lacks redistribution permission; conversely, project-authored media does not automatically relicense third-party JavaScript. DETOUR keeps those chains separate: media provenance is recorded here, the entry source has its Apache-2.0 license, runtime dependency licenses are permissive in the pinned lockfile, and step 094 remains responsible for the final emitted-bundle/secret/NOTICE audit.
