# Phase 5 — package and host boundary

## 2026-11-15 architecture checkpoint (implementation, not browser acceptance)

Core entry: `skin/index.js` re-exports `createDetourPlayer` from `skin/player.js`. CSS and behavior live in `skin/`. A caller passes a host-owned HTML video or audio element (with any native `<track>` elements already attached) and an explicit `sourceKind`. The UI, host title, video URL, caption URL and publication path are not inputs to the core module.

Optional Mux entry: `skin/mux.js` constructs a public playback manifest URL only after validating a public playback ID. `configureNativeMuxVideo` is intentionally native-HLS-only: it throws in browsers without native HLS support rather than promising unsupported Chromium playback. An external site must supply and own its compatible HLS engine where needed. Neither Mux module is imported from the skin; no API secret belongs in either bundle.

A second composition lives in `integration/` and creates its own `video` and optional caption track, then mounts the same core entry independently of `demo/main.js`. Try `/integration/?src=<encoded-URL>&captions=<encoded-VTT-URL>` while the Vite dev server is running. A remote media host must allow CORS; the host must ensure its source is genuinely on-demand and seekable. The fallback path is the repo's local test fixture, not a published media guarantee.

Package `exports` declare `.`, `./styles` and optional `./mux`. Local `node --test tests/architecture.test.mjs` checks static import boundaries and unsafe playback ID shapes. `index.d.ts` and `mux.d.ts` declare the public signatures; an external installed-package compile and packed-browser run remain to be verified. The package stays `private: true` while release rights and publishability are unresolved.

**Acceptance still open:** no separately installed consumer test, screenshot or cross-browser trace was produced by this checkpoint. Run `npm ci`, `npm run build`, `npm run test:architecture`, and the full browser suite in an environment with the pinned dependencies and Playwright browsers. Build an external host from the packed archive and verify timestamp return, two independent instances, source replacement and media captions before checking steps 042/043/060. Repeat Safari/WebKit separately; desktop WebKit must not be labeled physical Safari/iPhone.
