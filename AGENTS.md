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
