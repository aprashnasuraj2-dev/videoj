# Source artifacts and storage

DHAGO and DETOUR have independently reproducible builds. Keep the source SHA, checksums and deployed URL together when creating an actual release.

| Artifact | Creation / verification |
| --- | --- |
| DHAGO reusable source | Repository `src/` with `npm ci`, `npm run typecheck` and `npm run build` |
| DETOUR packed source | `cd detour && npm pack` and `npm run test:package` |
| DHAGO canonical media | `npm run sync:canonical-media` and byte-pinned source media |
| Built DHAGO website | `dist/` plus immutable `release-manifest.json.source_sha` |
| Built DETOUR example | `detour/dist/` and the matching DETOUR release manifest |
| Browser regressions | GitHub Actions checks on modified project files, failure evidence only |
| Published runtime | Browser observations against the exact deployed revision, verified separately |

Optional archival to an owner-controlled storage folder can be performed outside the source repository. Do not commit export archives, local credentials, generated Playwright reports or massive one-off render assets. CI artifacts are intentionally short-lived; a successful build is not a durable backup and not proof that an external site serves that build.

The two published applications may use different pinned versions and different Cloudflare/Mux services. Do not conflate them or overwrite unrelated Aafnai Patro resources during maintenance.
