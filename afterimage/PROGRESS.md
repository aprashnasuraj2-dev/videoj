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

## 2026-11-16 · dual-codec public candidate

- WATERLINE media workflow produced a VP9/Opus WebM fallback (1,291,697 bytes) alongside the H.264/AAC MP4.
- Public host code now uses typed source elements: WebM first, MP4 fallback. The reusable skin remains source-agnostic.
- This addresses GitHub-runner Chromium/Firefox H.264 decode absence without weakening the browser assertions or altering the 18-second authored timeline.
- **Next action:** pass exact-source CI, deploy the dual-codec worker, and rerun Chromium/Firefox/WebKit full-flow evidence.

## 2026-11-16 · deep browser evidence expansion

- Dual-codec public matrix passed Chromium, Firefox and WebKit on the same live release.
- Browser evidence is being expanded beyond mouse-driven happy path: Tab/Enter-only playback and example, focus contrast, 200%-equivalent reflow plus Chromium page-scale 2×, letterbox/portrait container fixtures, repeated 20-pin buffer reuse, clean teardown, transport event counters, app-network counters during seam changes, and Chromium forced-colors.
- These tests remain public-candidate tests against afterimage.aafnaipatro.com; no TinyFish or paid browser service is used.

## 2026-11-16 · keyboard-only authored-flow defect fixed

- Deep Chromium and Firefox tests proved Tab→Enter can activate Try a comparison and open the correct 00:05→00:13 pair, but focus did not move to the reveal slider.
- Root cause: authored-example.js queried the seam inside the Temporal Lens element even though the reveal range lives in the shared player stage.
- Fixed the authored helper to focus the player-level seam control after the pair opens. This aligns keyboard behavior with the existing mouse/authored flow and Escape focus restoration.
- **Next action:** regenerate standalone, deploy exact source, rerun the expanded three-engine suite.

## 2026-11-16 · WebKit authored-focus stabilization

- Deep Firefox and Chromium runs pass the keyboard-only authored comparison after the player-level focus fix.
- WebKit opens the correct pair by keyboard but loses the immediate focus transfer during its asynchronous seek/render update, despite direct range focus working elsewhere in the same engine.
- The authored helper now retries the seam focus on the next animation frame only if focus did not stick. This preserves normal engines and makes the handoff resilient to WebKit's post-seek UI update ordering.
- **Next action:** regenerate/redeploy exact source and rerun the deep matrix.


## 2026-11-16 · WebKit focus handoff ordering fix

- Browser matrix run `43800265060` proved Chromium and Firefox green on the live `0.3.2-webkit-focus` candidate, while WebKit still opened the correct 00:05→00:13 pair but reported `seamFocused:false`.
- The remaining failure is focus ordering, not playback or comparison state: the authored trigger was re-enabled after the attempted seam focus, allowing WebKit's control-state restoration to overwrite the handoff.
- The authored flow now records the seam as the intended focus target, restores `busy`/disabled state first in `finally`, then focuses the still-connected seam on the next animation frame.
- Standalone output is regenerated from the canonical generator in the same commit; reproducibility remains a hard gate.
- **Next action:** deploy the exact source, rerun CI plus the three-engine matrix, and promote checklist items only from passing evidence.


## 2026-11-16 · exact-release browser gate and WebKit race correction

- The first post-deploy WebKit rerun reached the live `f0bed46...` candidate but the harness sampled while the authored flow was still at the first `00:05` seek; its failure detail was `now:"00:05"`, proving the assertion raced the second seek rather than observing a completed flow.
- Replaced fixed sleeps with an observable authored-completion gate: comparison open, trigger re-enabled, current time in the 00:13 window, and live status beginning `Example opened:`.
- The browser workflow now also requires public response header `x-afterimage-release=f0bed46...` and runtime version `0.3.3-webkit-handoff`. A passing matrix therefore proves the intended deployed build rather than merely the hostname.
- **Next action:** rerun the exact-release three-engine matrix; if green, reconcile tasks 30, 53–55, 59, 62, 66–67 and 70 from the recorded assertions.


## 2026-11-16 · exact-release matrix green and checklist reconciliation

- AFTERIMAGE CI #23 passed on tracking/test commit `f7f1c669...`; the serving product source remains immutable `f0bed46...`.
- Browser matrix run `43801027232` (#18) passed Chromium, Firefox and WebKit while explicitly requiring public response header `f0bed46...` and runtime `0.3.3-webkit-handoff`.
- The previous WebKit failure was confirmed as a harness race: the failed sample still showed Now `00:05`. The corrected gate waits for the authored trigger to re-enable, current time to reach the 00:13 window, and the `Example opened:` live-status message before asserting focus.
- Quantified cross-browser evidence is now recorded in `docs/EVIDENCE.md`: 240px no-overflow/44px targets, 14.80:1 text contrast, 12.07:1 focus contrast, complete keyboard flow, zero comparison-induced pause/seek/wait/stall events, one reused 919,601-pixel reference canvas across 20 pins, ~3.68MB raw reference buffer, zero app network requests from pin/seam operations, 41/59/79ms capture observations, clean teardown, reduced motion and failure fallback.
- Checklist rows 13, 30, 53–55, 57, 59, 62, 66–67 and 70 are promoted to done. Candidate identity rows 91–93 are reconciled to the current serving release.
- Deliberately still open/in-progress: native fullscreen, physical device/screen-reader, pointer/touch cancellation, delayed source-switch races, slow/constrained-device profiling, multi-instance, alternate-host package proof, bonuses and submission-form acceptance.
- **Next action:** preserve the strongest exact-release stills, then close the highest-value remaining usability/transport gaps before submission packaging.


## 2026-11-16 · submission-capture runner correction

- Submission capture run `43801633569` stopped before browser launch because the standalone capture script imported `@playwright/test` while AFTERIMAGE's locked dev dependency is `playwright@1.62.1`.
- This is capture tooling only; the serving product release remains `f0bed46...` and the exact-release three-engine matrix remains green.
- Corrected the capture script to import Chromium from the installed `playwright` package. The workflow will rerun from the script change.


## 2026-11-16 · submission recording path normalization

- Submission capture run `43801771733` reached Playwright context creation and failed before navigation because `recordVideo.dir` accepts a filesystem string, not a WHATWG URL object.
- Normalized the recording directory to `artifactDir.pathname`. Screenshot and fs APIs continue using their supported path/URL forms.
- No live release change was made.


## 2026-11-16 · reel choreography correction after full interaction pass

- Submission capture run `43801880259` completed the interaction sequence, including the real pointer seam drag, then failed only at the final hero-pair assertion because the video had intentionally been paused before invoking the authored pair.
- In paused capture mode AFTERIMAGE correctly labels the pinned frame approximate, producing `≈00:05 / 00:13 / +00:08`; this is expected product semantics, not a regression.
- The reel choreography now restores playback before the final authored pair so the final submission frame uses an exact presented-frame callback and reads `00:05 / 00:13`.
- Submission evidence upload is now `if: always()` so future capture failures retain their report/video evidence instead of discarding diagnostics.


## 2026-11-16 · submission reel accepts designed approximate-frame fallback

- Submission capture run `43802088913` again completed the full filmed interaction and real pointer seam drag. The final authored pin resolved through the documented 320ms fallback path and correctly displayed `≈00:05`.
- The capture gate had incorrectly required an unmarked exact pin even though AFTERIMAGE intentionally exposes the approximation marker when no presented-frame callback arrives inside the bound.
- The reel assertion now preserves that semantic distinction: it requires normalized pinned time `00:05`, Now `00:13`, and Interval `+00:08`, while recording whether the final pin was approximate.
- Increased deliberate holds so the finished evidence reel lands closer to the planned ~55-second submission length while remaining understandable with audio off.


## 2026-11-16 · freeze the closing hero pair

- Submission capture run `43802338378` reached an exact `00:05 / 00:13` authored pair, but the newly extended final hold allowed normal playback to continue to `00:18`, making the closing assertion correctly fail at `+00:13`.
- The reel now pauses immediately after the final authored pair resolves, then holds the 00:05 / 00:13 / +00:08 visual for the closing shot.
- This changes only capture choreography; the public player remains immutable.


## 2026-11-16 · raw reel capture passed; system encoder added

- Submission capture run `43802596202` passed the full exact-public recording step. The real pointer seam drag, authored pair gates, final frozen pair, still capture and mobile capture all completed.
- Post-processing failed only because GitHub's Ubuntu image did not expose a system `ffmpeg` executable. Playwright downloaded its internal helper binary for browser recording, but that binary is not added to PATH and is not a substitute for the submission transcode/ffprobe step.
- Added an explicit system `ffmpeg` install before recording. Evidence upload already runs with `if: always()`, so the successful raw WebM/stills from the failed encode remain recoverable.


## 2026-11-16 · submission asset visual polish

- Successful submission capture/encode pipeline produced a 50.32s, 4,754,620-byte H.264 MP4 with no audio plus desktop/mobile stills.
- Visual review found the final exact-pair page still still carried the caption enabled earlier in the reel. Captions are useful evidence, but the hero still should communicate the Temporal Lens without competing overlay text.
- Capture choreography now disables captions after their demonstration, writes the final exact 00:05 / 00:13 / +00:08 player view as `afterimage-primary-still.png`, retains the earlier state as `afterimage-inspection-still.png`, and adds `afterimage-keyboard-focus.png` after focusing the seam.
- Mobile capture now starts playback before the authored pair and pauses after it, giving the 390px evidence the same playback semantics as the desktop primary flow.


## 2026-11-16 · official minimum-control gate added

- Contra's active challenge definition confirms the pre-score minimum controls are play/pause, seek bar, time, volume/mute and fullscreen, plus responsive and keyboard operation.
- Existing evidence already covered playback start, responsive layout, keyboard flow and captions, but mute/volume and native fullscreen state changes were not directly observed.
- The exact-release browser matrix now adds a separate essential-controls page: real play→pause state transition, pointer seek with time readout, mute→unmute, volume Home→End, fullscreen control naming in every engine, and a Chromium native fullscreen enter/Escape round trip when the headless environment exposes Fullscreen API.
- The public candidate remains pinned to `f0bed46...`; this is verification-only branch work.


## 2026-11-16 · package-facing release documentation

- README now starts with the public proof URL, explains the host-owned-media contract, documents both enhanced and base-player imports, and makes the one-video/bounded-canvas mechanism explicit.
- Added `THIRD_PARTY_NOTICES.md`: Video.js `@videojs/html@10.4.0` attribution/license plus WATERLINE source/audio/caption provenance. The dependency is Apache-2.0; media provenance remains explicitly separate from the entry code license.
- Added the notices file to the package `files` allow-list so an exported package cannot silently omit its attribution/provenance note.


## 2026-11-16 · volume probe corrected to supported semantics

- Essential-controls matrix #28 reached the volume test in Chromium, Firefox and WebKit after the new play/pause, seek/time and mute assertions had already succeeded.
- The uniform failure came from assuming `Home`/`End` semantics for Video.js's volume custom element. Those keys are guaranteed by AFTERIMAGE's own reveal range test, not by this Video.js component.
- The volume gate now proves two real pointer-set levels and then focuses the same Video.js volume slider and requires `ArrowLeft` to reduce the media element's actual `volume`.
- No product code changed.


## 2026-11-16 · native fullscreen moved to a headed browser gate

- Corrected volume interaction passed far enough for Chromium to reach fullscreen; Firefox completed the full headless matrix successfully.
- Headless Chromium reports `document.fullscreenEnabled=true` but did not create a `fullscreenElement` after clicking the Video.js fullscreen control. A headless shell is not a reliable native fullscreen environment, so this is not classified as a product failure.
- Added `AFTERIMAGE headed fullscreen`: exact-release Chromium launched headed under Xvfb, requiring the public release/version, a named ≥44px fullscreen control, native enter, screenshot while fullscreen, Escape exit, and usable Play control afterward.
- The ordinary three-engine matrix keeps checking fullscreen control presence/name without making a false native-transition claim from a headless shell.


## 2026-11-16 · fullscreen control promoted from assumption to owned fallback

- Headed Chromium fullscreen run `43804651588` confirmed the Video.js fullscreen element was present/named but clicking it did not create `document.fullscreenElement` even under Xvfb.
- Fullscreen is a published minimum control, so AFTERIMAGE now owns the final activation path instead of relying on an unverified custom-element side effect.
- The existing Video.js fullscreen control remains the visible control. Its click is intercepted synchronously under the user gesture: wrapper Fullscreen API is used when available, Escape/second click exits, and WebKit native video fullscreen is the fallback when wrapper fullscreen is unavailable.
- The wrapper is the fullscreen target so the comparison layer and control deck stay together on desktop/fullscreen-capable browsers.
- Runtime marker advances to `0.3.4-fullscreen-control`.
- **Next action:** deploy this exact source, point all release gates to its SHA/version, and require the headed fullscreen round trip to pass before promoting task 18.


## 2026-11-16 · fullscreen candidate deployed and release gates repointed

- Isolated Worker `afterimage-preview` now serves exact product source `132d2b4b9bda6eb9dcaae2e713bb265faef4f046` as Worker version `265b8f11-93ec-400e-ac59-b87c2b5f7fbe` at 100% traffic.
- Runtime marker is `0.3.4-fullscreen-control`.
- Browser matrix, headed fullscreen gate and submission-capture gate are repointed to require both this exact response header SHA and runtime marker.
- **Next action:** require CI + Chromium/Firefox/WebKit + headed fullscreen to pass before treating this as the new known-good candidate; then regenerate submission evidence against the same release.
