# AFTERIMAGE · progress

Append-only execution log. Read this file with `CHECKLIST.md` from the same revision before resuming. If code and tracking disagree, verify the code/evidence and correct tracking.

## 2026-11-16 08:36 NPT · kickoff baseline

- **Branch:** `afterimage`
- **Verified starting commit:** `fddbfdbc2ea9f9aa26bf3d72bac88b17a557b560` (`main`)
- **Execution surface:** remote GitHub branch via authorized repository connection; no claim is made about unobserved local worktrees.
- **Scoped paths:** new work under `afterimage/` only until an isolated deployment/integration step is explicitly reached.
- **Protected paths/releases:** root DHAGO source/config/assets and `https://creative.aafnaipatro.com/`; `detour/` and DETOUR routes including `https://detour-entry.aafnaipatro.com/mux/`; existing GitHub workflows and shared hosting mappings stay outside the change set unless a later verified release step requires an isolated addition.
- **Repo conventions verified:** root `AGENTS.md` requires Video.js v10, native media state, honest unsupported-state behavior, no frontend secrets, and exact-source release evidence. DHAGO and DETOUR are independent. DETOUR pins `@videojs/html` 10.4.0 and uses its own build/test/package boundary.
- **Challenge status rechecked:** Contra challenge is ACTIVE with submissions enabled and deadline `2026-11-17T07:59:00Z` = **Nov 16, 11:59 p.m. PST** = **Nov 17, 1:44 p.m. NPT**. Required: public Video.js v10 video player URL, visual, short description, essential controls, responsive layout, keyboard support. Apache-2.0 entry license. +1 Mux and +1 real-live-site bonuses remain listed.
- **Additional-entry rule:** Contra Help Center currently says multiple submissions are allowed when each is unique and meets the challenge criteria. Exact signed-in form field/media constraints still require later verification.
- **Completed setup:** remote branches inspected; no existing AFTERIMAGE branch found; current main/detour heads recorded; root repo instructions read; DHAGO/DETOUR package boundaries inspected; tracking files seeded before product/media/live-service changes.
- **Known blockers/limits:** current execution has not observed any developer-local uncommitted worktree; no player code has been implemented or tested yet; exact signed-in submission form field constraints are not exposed by the public challenge record.
- **Next task:** **04** — finish the rules/form evidence register, then **05–10** to lock rubric evidence, reusable conventions, v10.4.0 API direction, prior-art consequence, isolated publish/rollback target, and first-use matched-camera proof before scaffolding.
- **Concrete next action:** add AFTERIMAGE planning/evidence notes under `afterimage/docs/`, reconcile tasks 04–10, then scaffold the isolated package at task 11.

## 2026-11-16 · planning lock (tasks 04–10)

- Rechecked the live Contra challenge record: active, submissions enabled, deadline and scoring unchanged; multiple unique submissions are supported by Contra Help Center.
- Mapped every scored category and both bonuses to a concrete player/test artifact in afterimage/docs/RULES.md.
- Confirmed the repository-wide reusable conventions: separate package/build boundary, scoped styles, native media state, no secrets, exact-source evidence. Adopted @videojs/html 10.4.0 because both current sibling projects pin it; installed API behavior still must be proven in CI.
- Refreshed closest public mechanisms and documented evidence limits. The main collision is editorial frame inspection; AFTERIMAGE stays distinct by compositing one fixed viewer-selected frame over a still-running film and drawing their signed time relationship on the normal rail.
- Locked the opening pair to one repeated Camera A composition (dry ≈00:06 → first flow ≈00:14). Arbitrary manual pins remain supported; the judge shortcut deliberately uses matched geometry.
- Defined isolated primary/fallback deployment and rollback rules without touching live services.
- **Next task:** **11** — scaffold the independent package, then **12** mount genuine Video.js v10 with a deterministic local proof fixture.

## 2026-11-16 · first playable slice implemented, pending build verification

- Added an independent afterimage-video-skin package pinned to @videojs/html 10.4.0 with its own Vite build, package lock, Apache-2.0 license and architecture tests.
- Built a genuine Video.js v10 custom-element shell with play/pause, seek, time, mute/volume, captions and fullscreen controls.
- Implemented the first manual Temporal Lens path: bounded one-shot frame capture, registered canvas overlay, range seam, Pinned/Split/Now presets, fixed rail pin, current-time relation band, signed delta, close/reopen and clear.
- The lens contains no programmed play/pause/seek. Playing capture uses a bounded requestVideoFrameCallback wait; paused capture is a best-effort current-frame sample marked approximate. New-source and teardown paths invalidate pending work.
- Added responsive layouts, 44px primary targets, visible focus, reduced-motion behavior and forced-colors treatment.
- The studio labels the current remote video as an engineering preview. It is temporary and is not represented as THE WATERLINE or final submission media.
- Local container Git/network access cannot resolve github.com, so local npm verification is unavailable in this execution surface. Next verification uses a source-matched remote build/deployment.
- **Next action:** build the exact branch through an isolated Vercel preview; only observed passes will be changed from in-progress to done.

## 2026-11-16 · standalone release surface prepared

- Corrected v10 UI state styling to use documented data-paused and data-visible state attributes.
- Added scripts/build-standalone.mjs. It composes the same committed Temporal Lens modules and CSS into standalone.html, loading the official pinned @videojs/cdn@10.4.0 video preset for a no-bundler browser surface.
- The standalone page keeps the temporary fixture explicitly labeled and exposes only a non-secret debug handle for browser verification.
- Vercel project creation is blocked by account permission (403). Cloudflare Pages Git project creation is separately blocked by the account's broken Pages Git installation (error 8000011). Neither blocker implies a source/build failure.
- **Next action:** deploy standalone.html as an isolated preview without altering DHAGO/DETOUR, then exercise the actual browser flow. Package build remains separately unverified until a dependency-capable runner is available.

## 2026-11-16 · no-paid-browser verification path

- TinyFish is not part of the release or verification plan.
- The live custom hostname is now `https://afterimage.aafnaipatro.com/`, attached only to the isolated `afterimage-preview` Worker. No apex, DHAGO, DETOUR, or Patro route was changed.
- Cloudflare Browser Rendering on that hostname has already passed the desktop core-flow instrumentation: all required controls present; playback advanced; a live pin opened; Pinned stayed fixed while Now advanced; Pinned/Now/Split presets preserved playback; Close/Compare/Clear behaved correctly; media decoded at 960×400 with no error.
- Added a branch-scoped GitHub Actions workflow for `afterimage` only. It installs the lockfile, runs architecture tests, proves the standalone generator is reproducible, runs the production Vite build, and inspects the npm package surface.
- **Next action:** collect the exact workflow result and complete 390px/320px plus accessibility checks with Cloudflare Browser Rendering.
