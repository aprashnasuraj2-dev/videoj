# Repository engineering instructions

The default branch contains the DHAGO Video.js v10 player. Work only on the explicitly requested product branch; do not infer the active project from a historical branch or pull request.

## Scope and ownership

- **DHAGO** lives at the repository root: `src/` is reusable player code; `apps/preview/` is the demonstration app. Use the root `package.json`, `INSTALL.md`, and `docs/ARCHITECTURE.md`.
- Keep changes scoped to DHAGO on this branch.
- Previous one-off planning/checklist material is available in Git history. It is not a dependency, gate, or mandate for ongoing open-source maintenance.

## Product correctness

- Use Video.js v10 and its installed version-matched documentation. Do not replace the custom-element runtime with the v8 `videojs()` API.
- Native media state is authoritative. No fake playback timers, buffered ranges, rendition changes, chapters, quality indicators, or dropped-frame metrics.
- Preserve ordinary playback/seek/volume/captions/fullscreen, input focus, keyboard support, reduced motion and narrow-view rendering. Unsupported options must degrade transparently.
- Keep Mux management credentials and any other secrets out of Git, frontend assets, screenshots, logs, and package archives. Public playback IDs are not management secrets.
- Never imply a browser emulator is physical hardware testing. Label unverified conditions explicitly.

## Validation and releases

- DHAGO: `npm ci && npm run typecheck && npm run build`, plus `npm test` after installing Playwright browsers.
- Check integration/package boundaries, resulting content hashes, and browser behavior before changing any public domain mapping. Do not change public deployments without explicit authorization.
- Use meaningful commits and keep artifacts/release evidence tied to exact source revisions. Do not claim tests ran when they did not.
- Use the repository's GitHub Actions verification and ordinary pull-request review for maintenance; avoid generating administrative task trackers as a substitute for product work.
