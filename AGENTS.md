# Repository engineering instructions

This repository contains two independent Video.js v10 projects.

## Scope and ownership

- **DHAGO** lives at the repository root: `src/` is reusable player code; `apps/preview/` is the demonstration app. Use the root `package.json`, `INSTALL.md`, and `docs/ARCHITECTURE.md`.
- **DETOUR** lives in `detour/`: `detour/skin/` is reusable source; `detour/demo/`, `detour/mux/`, and `detour/integration/` are examples. Use the nested `package.json` and `detour/README.md`.
- Keep changes scoped to the requested player. Do not mix visual systems, imports, demo media, test fixtures, or deployment configurations across projects.
- Previous one-off planning/checklist material is available in Git history. It is not a dependency, gate, or mandate for ongoing open-source maintenance.

## Product correctness

- Use Video.js v10 and its installed version-matched documentation. Do not replace the custom-element runtime with the v8 `videojs()` API.
- Native media state is authoritative. No fake playback timers, buffered ranges, rendition changes, chapters, quality indicators, or dropped-frame metrics.
- Preserve ordinary playback/seek/volume/captions/fullscreen, input focus, keyboard support, reduced motion and narrow-view rendering. Unsupported options must degrade transparently.
- Keep Mux management credentials and any other secrets out of Git, frontend assets, screenshots, logs, and package archives. Public playback IDs are not management secrets.
- Never imply a browser emulator is physical hardware testing. Label unverified conditions explicitly.

## Validation and releases

- DHAGO: `npm ci && npm run typecheck && npm run build`, plus `npm test` after installing Playwright browsers.
- DETOUR: `cd detour && npm ci && npm run build && npm run test:architecture && npm test && npm run test:package`. Run Firefox and WebKit regressions as appropriate.
- Check integration/package boundaries, resulting content hashes, and browser behavior before changing any public domain mapping. Public DHAGO and DETOUR deployments are independent.
- Use meaningful commits and keep artifacts/release evidence tied to exact source revisions. Do not claim tests ran when they did not.
- Use the repository's GitHub Actions verification and ordinary pull-request review for maintenance; avoid generating administrative task trackers as a substitute for product work.

## SUTRA continuation and execution (v2 branch)

- Active SUTRA 2.0 direction is in `docs/sutra-v2/`: open knowledge compiler and self-verifying agentic web. The historical `docs/sutra/` v1 register remains intact as source evidence, not the current product roadmap.
- Treat “continue sutra”, “continue with sutra”, or equivalent continuation wording as an execution command, not a request for a status recap. Resume from the latest remote SUTRA branch/PR state, reconcile any commits and CI produced since the prior session, read `docs/sutra-v2/CONTINUE.md`, then continue dependency-ready engineering. Do not reset to the last chat checkpoint.
- Develop testable capability contracts and adversarial counterexamples as work proceeds. Separate LLM proposals from deterministic verification authority. Never count planned work, stale CI, mocked peer execution, synthetic content, same-owner origins, or unrun checks as genuine independent adoption or public verification.
- Use isolated development branches; preserve DHAGO/DETOUR and old SUTRA work. No merge, release, paid inference, production/DNS change, or competition submission merely because work continues. Actual HTTPS deployed-site testing is a mandatory later gate after applicable authorization.
- Keep implementation and registers synchronized throughout continuation: after material code/evidence changes, update the affected v2 checklist/roadmap state, `progress.json` machine cursor, session evidence and decisions/limitations in the same logical checkpoint. A status report is not a substitute for continuing the next safe dependency-ready task.
- Preserve the SUTRA1 workspace under `docs/sutra/` and its proven continuation/checkpoint/release logic. SUTRA2 is the active product roadmap, but `docs/sutra/CONTINUE.md`, legacy source, evidence, decisions and reusable implementation remain an inherited compatibility/source layer and must be consulted when relevant rather than discarded or silently restarted.
- Preserve prior failures and stale evidence; promote only exact-source passing evidence. Do not create background jobs from the continuation phrase.
