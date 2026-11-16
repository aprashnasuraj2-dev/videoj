# Public hosting and release boundaries

DHAGO and DETOUR are independent player packages with separate demonstration origins. A source merge does **not** automatically publish a new version.

| Application | Example origin | Release scope |
| --- | --- | --- |
| DHAGO | https://creative.aafnaipatro.com/ | Original Studies in Thread source, journal, ribbon, tools and stress lab |
| DHAGO mirror | https://dhago.aafnaipatro.com/ | Verify independently before claiming an identical version |
| DETOUR checkpoints | https://detour-entry.aafnaipatro.com/mux/ | Optional four-place seek rail |
| DETOUR standard | https://detour.aafnaipatro.com/mux/ | Single-place Hold/Return |
| DETOUR fallback | https://detour-backup.aafnaipatro.com/ | Independently backed recovery route |

## DHAGO release process

- Verify locally with `npm ci && npm run typecheck && npm run build && npm test`.
- GitHub Actions `Validate DHAGO` tests source changes, retaining the built `dist/` on main for four days. It **does not deploy automatically**.
- For a release, use the separately triggered `Restage an existing verified Cloudflare build` workflow with the successful **main-push** validation run ID. It stages the exact verified bundle under an immutable `dist-<SHA>` branch for deployment tooling.
- Confirm the public `release-manifest.json.source_sha`, asset checksums, actual film decode, captions, seeking and Journal navigation before promoting a production origin. Existing Cloudflare R2 objects and unrelated Patro pages must remain untouched.

## DETOUR release process

- Verify the nested package and browser behavior in `detour/` using the commands in its README.
- The usual DETOUR CI validates local build, package boundary and multi-browser behavior. Checks against changing public network origins are **manual** rather than repeated for every source commit.
- An accepted release may be staged using `detour/scripts/stage-release-dist.mjs` and its matching source/runtime evidence. Maintain distinct checkpoint, single-place and fallback deployment records. No automatic media provisioning is triggered by code changes.

## Media and secrets

Canonical DHAGO media lives under `apps/preview/public/media/`; the distributed original MP4/WebM and WebVTT files are distinct from the reusable skin. Mux is optional: public playback IDs can appear in client configuration, but management tokens may not.

Neither release process should reupload a video without checking content hashes and existing storage, nor alter global Cloudflare rules or other domains. Consult [release integrity](release-integrity.md) and [media provenance](media.md) for the operational checks.
