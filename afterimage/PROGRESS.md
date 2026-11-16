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

## 2026-11-16 · verified engineering milestone

- Branch-scoped AFTERIMAGE CI passed at exact SHA `09cdfb59...`: locked install, tests, reproducible standalone output, Vite build and package dry-run.
- Live custom domain `afterimage.aafnaipatro.com` passed the core Temporal Lens browser flow through Cloudflare Browser Rendering.
- 390px and 320px mobile probes passed without horizontal overflow and with 44px minimum visible primary targets.
- Accessibility tree verified named media controls, seek range, comparison reveal range, comparison actions and the live status announcement.
- Checklist rows are promoted only where that evidence satisfies the task. First-use authored shortcut, final film, keyboard, caption rendering, fullscreen transition, failure paths and cross-browser coverage remain open/in-progress.
- Creative media work started: one locked dry WATERLINE architectural keyframe is generated; a low-cost wet-state edit is in progress so no paid video generation is required.
- **Next action:** finish the wet keyframe, assemble the short original WATERLINE cut in-repo, replace the temporary fixture, add Try a comparison using observed final cue times, and rerun exact-candidate CI/browser evidence.

## 2026-11-16 · final WATERLINE candidate verified

- Replaced the temporary ocean fixture with the original 18-second WATERLINE proof.
- Added host-configured `Try a comparison` at 00:05→00:13. The reusable manual Temporal Lens still contains no programmed play, pause, or seek; only the explicit authored-example helper owns the documented seek exemption.
- Final source `f4d7c1be...` passed exact-source CI and is live at `afterimage.aafnaipatro.com`.
- Final public browser proof passed the authored pair, playback continuity, real captions, paused approximate pin, reverse signed delta, arbitrary seam, Escape/focus restoration, and media MIME/range checks.
- TinyFish is not used. Verification and release stay inside GitHub + Cloudflare Patro.
- **Next action:** add a GitHub-hosted Playwright matrix against the public candidate for Chromium/Firefox/WebKit, keyboard traversal, 240px/zoom, multi-instance/failure checks, and screenshot artifacts.

## 2026-11-16 · cross-browser matrix found 240px defect

- WebKit reached the live candidate successfully and passed earlier playback/authored-pair/keyboard steps, then failed the 240px fallback check because page CSS still imposed a 320px body minimum.
- This is a real layout defect, not a test harness failure: at viewport 240px the measured player was 304px and horizontal overflow was true.
- Removed the page-level 320px floor and added an ultra-narrow container rule that keeps primary actions/presets fluid while preserving 44px target height.
- **Next action:** rebuild/redeploy the exact fix, then rerun Chromium/Firefox/WebKit matrix.

## 2026-11-16 · second 240px root cause isolated

- The first fix removed the page-level 320px floor and reduced the player itself to 224px at a 240px desktop viewport.
- Instrumentation still found document overflow: header min-content width was ~283px (wordmark/eyebrow), while the comparison control grid retained a ~260px min-content width.
- Added an ultra-narrow typography fallback and explicit `min-width:0`/one-column control rules so neither the header nor the Temporal Lens can widen the document.
- **Next action:** regenerate standalone, redeploy exact source, and rerun 240px plus the three-browser matrix.

## 2026-11-16 · WebKit ultra-narrow target correction

- On the corrected no-overflow build, WebKit measured Pinned/Split/Now at 41×44px because the ultra-narrow rule had intentionally removed their minimum width.
- The available 206px control row can fit three 44px targets plus gaps, so the candidate is corrected rather than lowering the 44px acceptance threshold.
- **Next action:** regenerate standalone, redeploy exact source, verify 240px no-overflow + ≥44px targets, then rerun the browser matrix.

## 2026-11-16 · cross-browser codec hardening

- Chromium and Firefox GitHub-hosted Playwright jobs timed out before product assertions at the H.264 metadata wait; WebKit has a decode path on the same runner family.
- Rather than classifying that as a skin failure or weakening coverage, the WATERLINE pipeline now also emits a VP9/Opus WebM fallback from the same 18-second master.
- The public player will use typed source elements so engines can select MP4/H.264 or WebM/VP9 according to actual codec support.
- **Next action:** let the media workflow render and commit the WebM, then wire the host to both sources and rerun the full matrix.
