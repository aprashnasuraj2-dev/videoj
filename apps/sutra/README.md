# SUTRA isolated learner and runtime spike

A local, synthetic learning workspace with actual receipt validation, an explicitly scripted two-agent orchestration test and opt-in native media timing checks. It is not a funded live-AI service, a finished agentic website or a public deployment.

```sh
cd apps/sutra
npm ci
npm run build
npm test
npm run dev
```

Node >=22.12; Vite is pinned to 8.3.4 in this package/lockfile. Output remains apps/sutra/dist. Root DHAGO dist and detour/dist are independent. No preview or DETOUR source/media is imported.

## Reusable runtime

packages/sutra-runtime vendors ten unchanged nsDeploy reference modules at commit 486ecf26aa8775963f9b765f894734bef1ac9817, with Apache-2.0 license and a drift-check inventory. The restricted host validates local-only graphs, schemas, deadlines and budgets before dispatch. The graph, manifest and links are published under public/agents. It currently refuses peer/MCP/coded capabilities and has no claimed funded router.

“Run scripted network test” exercises real reference-loop delegation from learner to evidence using an explicit deterministic test driver. The UI and trace name that mode; it is not live AI or factual verification. See packages/sutra-runtime/README.md for the API, limits and remaining integration surface.

## Player and timing fixture

The lazy player-adapter.js imports only the existing src/create-player.ts surface and its reusable dependencies. @videojs/html and the optional Mux build peer are pinned to 10.4.0 here. Vite dedupe resolves shared-source imports from this app's own dependencies; no root npm install is needed. Mux's optional chunk is built because the shared player supports it, but is not used by the native timing fixture.

The silent eight-second MP4 is a generated timing marker, not instructional content or the entrant's submission video. tools/make-timing-fixture.py regenerates it with FFmpeg and refreshes media/cue hashes. Byte-identical encoding depends on the FFmpeg build; metadata binds the bytes actually generated. Before mount, the app checks downloaded bytes and loads a local Blob of that exact content. Actual native metadata/currentTime/seeking are authoritative. A failed load/seek never produces a success message. The rights-cleared original lesson remains pending.

## Validation and failure boundaries

“Check example” checks references against a supplied synthetic catalog. “Try altered quotation” returns QUOTE_MISMATCH. Catalog consistency does not establish factual truth, publisher trust, semantic support or operational safety. No keys, third-party analytics, hosted writes or paid model requests exist in this shell. Dynamic text is set with textContent.

npm test checks build/source boundaries, published graph parity and actual fixture hashes. npm run test:browser starts its own preview and runs Chromium checks for receipt interaction, scripted delegation, native decode/play/pause/seek and 360px overflow. Run npx playwright install --with-deps chromium first in a capable environment. Local Chromium is blocked by this execution environment's socket restriction; CI owns browser verification. Physical hardware, Firefox/Safari and human visual review remain separate unverified gates.
