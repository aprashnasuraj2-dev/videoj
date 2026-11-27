# Platform architecture and verification

DHAGO is a reusable Video.js v10 player and can be integrated independently of its demonstration app, media and optional services.

| Boundary | DHAGO |
| --- | --- |
| Player entry | `src/create-player.ts` |
| Native media source | Host supplies direct source and optional tracks |
| Distinct interaction | Cue-derived woven chapter ribbon |
| Optional integration | Public Mux playback ID and host theme tokens |
| Lab/demo | `apps/preview/` |
| Build | Root Vite config and root lockfile |
| Test suite | `tests/` |

## Reproducible checks

DHAGO requires Node 24, `npm ci`, `npm run typecheck`, `npm run build`, and `npm test` for browser verification. The HTML skin depends on the pinned `@videojs/html` runtime and is tested through Vite, not a no-build script distribution.


## Operational boundaries

- DHAGO's existing public study remains at https://creative.aafnaipatro.com/.
- Live domains are deployment targets, not proof that a current Git revision has already been deployed. Compare exact release manifests and runtime state before making that claim.
- Mux playback IDs are public, but management credentials and deployment permissions must remain server-side. Do not silently provision assets or change unrelated Aafnai Patro routes.
- The player must degrade on missing media, captions and capabilities without synthesizing unsupported state.

## Evidence policy

Separate **source behavior**, **automated browser results**, **published-route observations** and **physical-device results**. An artifact from one category is not a substitute for another. Prior release and planning records are recoverable from repository history; maintain new user-facing documentation around interfaces, integration and reproducible checks instead of administrative scorecards.

## Minimal GitHub Actions policy

The repository uses a file-scoped DHAGO validation workflow and a staging/recovery workflow. Source changes trigger appropriate tests; documentation-only edits do not generate full browser matrices. Optional live-origin/Mux probes are requested explicitly, while routine CI exercises local package and browser functionality. Diagnostic artifacts are retained only on failure for three days; successful main DHAGO builds remain available for four days to support explicit release staging. Existing GitHub Actions run histories are hosted outside the Git tree and follow the repository's separate retention settings.
