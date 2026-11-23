# Repository map refreshed 2026-11-23T13:20:58+05:45

Inspected remote main `47191f97499d0c1b2ca4dbc5f32b0b39f7d698c2` and recursive tree before edits. Only root AGENTS.md applies; no nested instruction file exists in the inspected tree. Existing SUTRA work is the validator and progress system; no apps/sutra package existed remotely before this batch.

- Root: DHAGO, reusable src/create-player.ts, custom-element @videojs/html 10.4.0. apps/preview is its independent demonstration. Root Node 24 commands remain npm ci, typecheck, build and browser tests.
- detour/: independent package, demos, source and outputs. No import or asset is reused by this shell.
- packages/sutra-evidence/: standalone ES module reused by the shell with no root install.
- apps/sutra/: new own package/lock, Vite root/output and synthetic example shell. SUTRA now has an explicit lazy adapter to the existing reusable player entry. App-local pinned Video.js dependencies and Vite dedupe resolve shared imports without a root install; P012-04 has been verified. Existing source/demos/deployments are unchanged.
- SUTRA shell CI watches its app, evidence/runtime/source/inference packages, API service, reused source dependency and own workflow. Existing DHAGO/DETOUR workflow bytes remain unchanged.
- Existing Validate DHAGO watches root scripts/src/preview/tests. Its successful main workflow can trigger restaging; that is not evidence of public promotion. This change touches none of those trigger paths.
- New app build output: apps/sutra/dist, verified separately from root dist and detour/dist using preservation sentinels.

Existing domain relationships were read from repository documentation only. No live site mapping, deployed SHA or Cloudflare account was checked or changed. Source reads, local builds, browser launch failure and CI results are distinct evidence classes.

The attached 41-page plan's hash and 100 matching titles remain recorded in BASELINE.md from the prior verified bootstrap. The source tree is now beyond the historical PDF baseline; current work is resumed rather than recreated.

Current SUTRA integration was revalidated on candidate `9100c0e4ebd2fde2c8827f3a5cb6e709873ec8a1` with actual passing app/runtime/browser CI at 2026-11-23T13:54:20+05:45. Historical baseline SHA above records the original inspection, not the current app implementation.


## Session 0005 additions

- `packages/sutra-inference/`: bounded stream parser and same-origin provider adapter; no browser key interface.
- `packages/sutra-source-tools/`: UI-independent read registry, with explicit evidence/runtime schema-helper source dependencies.
- `packages/sutra-runtime/source-mcp.js`: exact local endpoint, pinned JSON-only MCP profile, validated discovery/results and cancellation. Default profile remains local-only; trusted host options grant the narrow source capability.
- `services/sutra-api/`: default-off Worker candidate, atomic daily quota, same-origin source endpoint, setup and local Vite bridge. Proposed origin is configuration only; no public route or deployment has been changed.
- `apps/sutra/src/playback-state.js`: bounded snapshot of actual native media state; no returned DOM or write capability.
- `docs/sutra/OPEN_KIT.md`: community artifact inventory; independent reproduction/adoption remains pending.
