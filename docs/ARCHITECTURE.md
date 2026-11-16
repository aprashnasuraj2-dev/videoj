# Platform architecture and verification

DHAGO and DETOUR share the Video.js v10 ecosystem, but they are not one coupled player. Each can be integrated without loading the other project's demo, its media, or its optional services.

| Boundary | DHAGO | DETOUR |
| --- | --- | --- |
| Player entry | `src/create-player.ts` | `detour/skin/index.js` |
| Native media source | Host supplies direct source and optional tracks | Host owns the `<video>` / `<audio>` and its tracks |
| Distinct interaction | Cue-derived woven chapter ribbon | Source-scoped Hold and Return; optional four markers |
| Optional integration | Public Mux playback ID and host theme tokens | `detour-video-skin/mux` public URL helpers |
| Lab/demo | `apps/preview/` | `detour/demo/`, `detour/mux/`, `detour/integration/` |
| Build | Root Vite config and root lockfile | Nested Vite config and nested lockfile |
| Test suite | `tests/` | `detour/tests/` |

## Reproducible checks

DHAGO requires Node 24, `npm ci`, `npm run typecheck`, `npm run build`, and `npm test` for browser verification. The HTML skin depends on the pinned `@videojs/html` runtime and is tested through Vite, not a no-build script distribution.

DETOUR requires `cd detour && npm ci && npm run build`, then `npm run test:architecture`, `npm test` and `npm run test:package`. The external-host test exercises the generated `npm pack` package and host-replaced media. Firefox and desktop WebKit are additional browser engines; neither is a physical device.

## Operational boundaries

- DHAGO's existing public study remains at https://creative.aafnaipatro.com/.
- DETOUR's four-checkpoint example is published at https://detour-entry.aafnaipatro.com/mux/.
- DETOUR's single-place mirror is https://detour.aafnaipatro.com/mux/.
- Live domains are deployment targets, not proof that a current Git revision has already been deployed. Compare exact release manifests and runtime state before making that claim.
- Mux playback IDs are public, but management credentials and deployment permissions must remain server-side. Do not silently provision assets or change unrelated Aafnai Patro routes.
- Each player must degrade on missing media, captions and capabilities without synthesizing unsupported state.

## Evidence policy

Separate **source behavior**, **automated browser results**, **published-route observations** and **physical-device results**. An artifact from one category is not a substitute for another. Prior release and planning records are recoverable from repository history; maintain new user-facing documentation around interfaces, integration and reproducible checks instead of administrative scorecards.
