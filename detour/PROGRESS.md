# DETOUR progress

Phase: 09
Resume step: 081

| Item | Current state |
| --- | --- |
| Verified | 75/100. Phase 8 is complete: 071–080 are verified, including the qualified Mux bonus path, tested fallback, explicit real-site skip, rights/operations manifest and frozen demo. |
| Next | 081. Begin Phase 9 polish on the frozen `a9bbfcb4ee68` demonstration without changing its media identity, Mux Playback ID or rollback contract. |
| Open dependencies | 002 second-entry eligibility; 017 uncoached first-use; 062 physical phones; 064 NVDA/VoiceOver; 065 native 200% browser zoom. These remain open and are not reclassified by Phase 8 browser evidence. |
| Prototype / public release | Frozen Mux candidate: `https://detour-mux-release.praisethegreatfool.workers.dev/mux/` on immutable `detour-dist-a9bbfcb4ee68`; stable rollback/fallback remains `https://detour-release.praisethegreatfool.workers.dev/`. |
| Source baseline | Phase 8 production source `a9bbfcb4ee6810c2e6a5ed0e1f32c731b3780e6a`: full CI 43706450932 green and immutable dist staged. Public Mux release verification 43707445255 passed from the later test-only harness; earlier full CI 43707040940 also remained green after adding the public gate. |

## 2026-11-15 · Phase 9 step 081 — three cold-path friction fixes implemented (public qualification pending)

- Downloaded and reviewed the actual signed-out public capture artifact from Mux verification run 43710251344 rather than relying on the older fixture boards. At 375×667 the player began at y=155px because an **80.5px technical source panel** sat above it; the visible page repeated “Mux-hosted”/“fallback” infrastructure copy before the viewer reached the interaction.
- The cold poster was the Mux frame at ~42s and visibly embedded **00:00:41.917** while the real control clock was **0:00**. That made the very first frame contradict the actual playback position.
- The held-state control clock rendered Video.js smart time as **0:18 / 0:55** while the signature action said **Return to 00:42**. The mechanism was correct, but the visual time grammar was inconsistent precisely where the judge compares current vs held time.
- Implemented only those three high-impact fixes: healthy playback hides recovery/provider UI and uses viewer-benefit copy; the Mux poster is now the time-zero thumbnail; and a visual **MM:SS** clock shares DETOUR's formatter with the Return ticket while the native `media-time` elements remain present as visually hidden semantic time values.
- Added Mux tests for the time-zero poster, healthy-copy boundary, hidden recovery panel, `00:18 / 00:55` visual clock and failure-triggered backup path. This commit requests immutable dist staging after the full DETOUR gate. **081 remains unchecked until the new immutable build is deployed and the signed-out public mobile/keyboard checks pass.**

## 2026-11-15 · Phase 8 complete — frozen public Mux candidate and rollback

- **076 accepted.** Mux provisioning run 43705427292 attempt 2 produced public Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ` for the exact showcase hash. Dedicated verification run 43706451003 passed 3/3: public 206 byte range, production-built Hold → 18s → 42.350s Return and blocked-provider fallback.
- Full implementation source `a9bbfcb4ee6810c2e6a5ed0e1f32c731b3780e6a` passed complete DETOUR run 43706450932 and staged **75 files** at immutable `detour-dist-a9bbfcb4ee68`. The new isolated Cloudflare Worker `detour-mux-release` serves that branch and redirects its root to `/mux/`; the older `detour-release` Worker was not modified.
- **076/077 public acceptance.** Run 43707445255 passed 3/3 public-release checks: signed-out HTTPS 200; 375×667 Mux media seekable; Hold 42.35 → seek 18 → Return **42.350s**; fallback byte range **206 / 1,024 B**; blocked Mux exposed recovery and loaded the fallback with no stale mark; 1280×900 desktop smoke rendered a 1248×804 seekable player and exposed fallback.
- **079 accepted.** [Rights/operations](submission-report/RIGHTS.md) separates project-authored media rights, Apache-2.0 entry source, permissive runtime dependency licenses, build-only tools and service retention. Operational restoration responsibility is assigned to the repository/challenge operator; final notices/bundle audit remains step 094.
- **080 accepted.** [Phase 8 freeze](submission-report/PHASE-8-FREEZE.md) locks source/dist, Mux ID/URL, captions, media hash, Worker, R2 fallback and rollback. Real-site bonus remains explicitly skipped. Physical phone, screen-reader and native 200% zoom evidence remain open under 062/064/065.
- Phase 8 is **10/10 complete**. Resume Phase 9 at **081** without mutating the frozen media/service identifiers unless the corresponding release gates are repeated.

## 2026-11-15 · Mux asset provisioned; host and recovery proof implemented (validation pending)

- Re-ran Mux workflow 43705427292 after repository secrets were configured. Attempt 2 completed successfully: public Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`, content hash `detour-fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`, `highest.mp4` ready, anonymous byte probe **206 / 1,024 B**, artifact 14158174193. Management credentials remained masked and are not copied into source.
- Added a production-built `/mux/` host that uses the exact same skin and Mux-hosted static rendition, keeps descriptive captions, and exposes explicit Retry Mux / Use fallback video recovery. The already-qualified showcase MP4 remains the independent fallback.
- Added dedicated Mux CI rather than making the core R2 validation depend on optional service availability. Tests require anonymous Mux byte-range access, real 42.35 → 18 → 42.35 DETOUR behavior, blocked-Mux recovery, and stale-mark clearing on source replacement.
- This is **implementation evidence only** until the exact-head Mux workflow and full DETOUR pipeline pass. The commit requests immutable dist staging only after full CI success.

## 2026-11-15 · Release and rights handoff reconciliation (079 in progress)

- Converted the stale initial-prototype release placeholder into an evidence-based handoff: immutable asset source `50ac9661e315`, separately validated core source `1016bd1`, verified release and rollback, explicit omissions and owner-only proof gaps. See [release handoff](submission-report/RELEASE.md).
- Added [asset rights and operational retention inventory](submission-report/RIGHTS.md) covering procedural video/audio, poster, VTT, package source, runtime/build dependencies, Worker/R2 and optional Mux. Rights provenance is engineering evidence, **not** proof of account billing, license sign-off or availability; **079 remains unchecked**.
- Checklist 078 remains the only additional accepted step in this continuation. Resume 076 on repository-secret availability; otherwise complete owner-independent 079 audits and 080 freeze preparations. CI on this head is required before asserting new build validation.

## 2026-11-15 · Mux CI failure diagnosed; explicit real-site skip (078)

- At source `5e7cbed11dd40c22d49d3e90c2f8b04734f2e7b2`, [Actions run 43704372300](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43704372300) failed in `provision` because **both** `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` were empty. The script exited before any Mux API call. This does not mean Mux playback or the core skin failed. No Mux Playback ID has been qualified.
- Adjusted only the optional Mux workflow to preflight both credentials and issue a conspicuous warning/step summary when absent. Both provision and artifact upload are conditional; a green workflow when credentials are missing is **not** evidence that Mux passed. Re-run after the owner configures both repository secrets and use a real signed-out playback/seek test before checking 076.
- **078 accepted by explicit skip:** the production `/integration/` example establishes reusable skin portability but is not independently evidenced as an authentic separate audience-serving website. Do not claim the additional real-site bonus. See [decision](design/PHASE-8.md#step-078-real-site-bonus-skip--2026-11-15).
- Previously qualified baseline remains [Actions run 43703881941](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703881941), including R2-backed byte-range media and signed-out Hold → Seek → Return; it is independent of the optional Mux workflow. Newly modified workflow and progress documentation require fresh exact-head CI before acceptance; no new test run is represented as passed here.
- **Next actionable:** 076 after GitHub secrets are configured; independently audit 079 rights and media/service ownership, and advance the 080 release freeze where physical-device and owner evidence are not required.

## 2026-11-15 · 072 accepted; 075 Mux reserve decision

- [Actions run 43703881941](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703881941) passed the complete pipeline on source `1016bd1b39d817261fc0a5b0d3cbdc2252c2ce6e`. The strict public-release test completed in **3.725 s**: HTTPS 200, pinned source/dist headers, MP4 byte range **206 / 1,024 B / video/mp4 / Accept-Ranges: bytes**, poster/VTT checks, then signed-out Hold at 42.35 → seek 18 → Return at **42.350 s**, remaining paused.
- **072 accepted.** Public transport is isolated Cloudflare Worker + private R2 binding; the bucket's public `r2.dev` endpoint is disabled. The verified frozen source remains `detour-dist-50ac9661e315`.
- **075 GO.** The official challenge offers **+1 point** for using Mux when the submitted player plays a Mux-hosted video, the form includes the public Playback ID, and the asset remains live through judging. At this checkpoint roughly **45.5 h** remained before the challenge deadline, so reserve **90 active engineering minutes** for the optional path (~3.3% of that buffer). Stop/skip the bonus if a ready public playback path plus signed-out browser seek proof is not achieved inside the cap.
- Lowest-risk implementation: keep R2 MP4 as default/fallback; upload the same DETOUR showcase as a separate content-hash-keyed Mux asset with `playback_policies:["public"]`, `video_quality:"basic"`, and current `static_renditions:[{resolution:"highest"}]`. Use only public Playback ID/URL client-side; management credentials stay in GitHub Actions secrets. Static MP4 is preferred for the bonus path because it preserves DETOUR's native `<video>` contract across Chromium/Firefox/WebKit without adding an HLS runtime to the reusable core.

## 2026-11-15 · Global R2 release storage after regional-cache failure

- [Actions run 43703342426](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703342426) showed that per-edge Cache API warming was not sufficient: a cold GitHub runner region still timed out waiting for media metadata.
- Created isolated R2 bucket `detour-release-assets` in APAC and attached it to `detour-release` as binding `DETOUR_ASSETS`, with no new long-lived credential. The Worker stores objects under the frozen source SHA and hydrates a missing object once from the immutable dist branch.
- Prehydrated the 8 root-critical release objects. R2 inventory is **8 objects / 1,063,733 B** including the exact **871,570 B MP4**, **46,768 B poster**, index, player/showcase JS/CSS and VTT. Subsequent regions read durable R2 objects rather than GitHub or a regional cache.
- The public response now reports `X-DETOUR-Storage: r2` when served from durable storage. The strict 072 test remains unchanged and must pass from CI before acceptance.

## 2026-11-15 · Cache-backed HTTPS transport after first public gate

- [Actions run 43702919194](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43702919194) reached the public origin but timed out waiting for video metadata. Independent resource probes showed the cause: immutable JS/CSS/VTT requests through raw-GitHub proxying took roughly **7–10 s each**, making repeated video-range fetches unsuitable for the 30 s first-load gate.
- Updated only the release Worker transport: each immutable file is fetched once, normalized, stored in `caches.default` under the frozen source SHA, and then served from Cloudflare cache. MP4 range requests now slice the cached full object deterministically and return 206 without refetching raw GitHub for each byte range.
- External prewarm after deployment measured the same JS/CSS/VTT resources at roughly **0.17–0.31 s**, versus the earlier 7–10 s. The strict HTTPS browser gate is intentionally unchanged and must pass before 072 closes.

## 2026-11-15 · Public HTTPS origin and exact-browser gate (validation pending)

- Full source `50ac9661e315f099d3121850a57dd398cbeb5865` passed Actions run 43702266692 and staged **70 files / 2,163,553 B** at immutable branch `detour-dist-50ac9661e315`. The 871,570 B showcase MP4 SHA-256 is `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`.
- Deployed isolated Cloudflare Worker `detour-release` at `https://detour-release.praisethegreatfool.workers.dev/`, pinned to that immutable branch/source. It corrects MIME types, exposes source/dist headers and preserves upstream byte ranges with an explicit 206 slicing fallback. An independent public fetch returned the expected DETOUR title/tagline; no login/gate was observed.
- Added `tests/https-release.test.mjs`: a fresh 375×667 Chromium context must receive the pinned source headers, load the real poster/VTT/MP4, fetch bytes 0–1023 as **206 / 1,024 B / video/mp4 / Accept-Ranges: bytes**, then execute Hold at 42.35 → seek 18 → Return within ±0.5 s while remaining paused. This exact browser gate is pending CI.
- Frozen dist staging is now explicit/manual or `[stage-dist]` commit-message gated so ordinary validation commits do not create one immutable branch per run.

## 2026-11-15 · Immutable dist branch fallback for HTTPS release (validation pending)

- Exact source `bc6c473668ae3b05faff1a037e5b0655949abedf` passed validation and produced artifact 14157281055: **1,631,159 B ZIP**, SHA-256 `9ffdf3b8a9f0e210acfae38618a56af3fd22f7680acfcd96b30c00405da8501b`; expanded release is 2,163,553 B and contains the 871,570 B showcase MP4.
- Cloudflare Pages Direct Upload asset JWTs cannot be redeemed through the connected API boundary (upload session succeeds; asset upload returns authorization failure). The isolated `detour-videojs` Pages project was created but has not received a deployment; no existing Pages project was changed.
- Added successful-CI staging to an immutable `detour-dist-<source12>` branch with a SHA-256/byte manifest. This gives a frozen public origin source for an isolated Worker fallback without embedding or rebuilding release binaries. The stage runs only after the full checklist validator and browser suite pass.
- 072 stays open until the resulting HTTPS Worker origin passes signed-out playback, byte-range seek, poster and captions.

## 2026-11-15 · Immutable release artifact for Direct Upload (validation pending)

- Cloudflare Pages Git-connected project creation returned Cloudflare error 8000011 (internal Pages Git installation issue) even though the connection has Pages Write. Existing Patro/DHAGO projects were not modified.
- Added a success-only CI artifact containing the exact production `detour/dist/` bytes, named with the source SHA and retained 14 days. This is the input for isolated Pages Direct Upload; it prevents deployment from rebuilding different bytes or depending on the broken Git integration.
- Keep 072 open until that artifact is deployed and signed-out HTTPS seek/poster/caption checks pass.

## 2026-11-15 · Static release-asset materialization

- Added a DETOUR-only write workflow that runs only when its own workflow file changes or by explicit manual dispatch. It regenerates the already-tested showcase and `daylight-study`, verifies duration and SHA-256s, then force-adds exactly six static media files and commits them if bytes changed.
- This is intentionally separate from validation CI. It contains no Cloudflare/Mux credential and cannot touch DHAGO/Patro assets. Once materialized, Cloudflare Pages can run Vite without depending on FFmpeg in its build image.

## 2026-11-15 · Judge demo and portability accepted; HTTPS gate active

- Exact source `34261f03c8df75bbeed847879de7269ab794fb55` passed [Actions run 43701045585](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43701045585).
- **073:** root showcase appears immediately at 320×640, 375×667 and 1280×900, remains paused, exposes Keep, uses the verified showcase MP4/poster and has no dialog/password gate.
- **074:** the production-built `/integration/` host uses `daylight-study.mp4` with separate captions and the same package skin; Hold at 42.35 → seek 18 → Return landed at **42.350s**.
- Closed 073 and 074. Resume 072 because the same media bundle still needs signed-out HTTPS playback and seek qualification. The planned Cloudflare route is isolated from existing Patro/DHAGO Pages projects.

## 2026-11-15 · Production multi-page portability fix (validation pending)

- Run 43700686209 reached the new 074 test but timed out because Vite's production build emitted only the root entry; `integration/index.html` was a source/dev page, not a built production page.
- Added explicit Vite multi-page inputs for the public showcase and independent integration host. This makes the portability proof exercise a real production artifact rather than relying on a dev-server fallback. No skin branching or media-specific logic was added to the package.

## 2026-11-15 · Phase 8 portability implementation (validation pending)

- Prepared the independent-host example to default to `daylight-study.mp4` + its own VTT rather than the public showcase or the regression fixture. Media selection remains a host concern; the same `createDetourPlayer` skin entry is reused unchanged.
- Added an explicit 074 browser proof: load `integration/`, verify the distinct clip/captions, hold at 42.35s, seek to 18s and Return to the saved point within ±0.5s. This is a separate host context, not a special skin variant.
- Both 073 and 074 now share the next exact-head CI gate; neither is checked until that run is green.

## 2026-11-15 · Hosted-runner performance diagnostic correction

- Run 43700337821 passed the new 073 root composition and all ordinary browser/package work, but one of the *secondary* five-fresh/five-repeat diagnostic samples reported a 350ms process-wide Long Task on the GitHub-hosted runner. The dedicated five-run signature performance gate still passed.
- Kept the normative 069 assertion unchanged in the dedicated five-run control trace. The broader cold/repeat-context sampler now records >50ms process-wide tasks as diagnostics instead of attributing every browser/runner task to DETOUR controls. This preserves performance evidence without converting host scheduling noise into a product failure.

## 2026-11-15 · Phase 8 one-screen judge demo implementation (validation pending)

- Public root now selects the 56s showcase by default with its real poster and captions; automated Phase 7 regressions explicitly request the unchanged 64s `navigation-study` fixture through a non-visual query parameter so release media cannot silently rewrite QA assumptions.
- Reworked only the demo-page framing: compact wordmark/tagline and minimal top padding place the player immediately in view instead of behind a large hero heading. No gate, intro animation, autoplay or alternate site mode is added.
- Extended showcase tests to check the root at 320×640, 375×667 and 1280×900: player must start above 120 CSS px, be meaningfully visible in the first viewport, remain paused, use the showcase MP4/poster, expose Keep, and contain no dialog/password gate. Pending exact-head CI.

## 2026-11-15 · Phase 8 step 071 accepted; 072 local bundle ready

- Exact source `87afdf6a740bbcce95caaa04e2c02886071c895c` passed [Actions 43699914256](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43699914256). Showcase verification passed **2/2**: deterministic provenance/A-V/frame separation and a fresh local HTTP browser mount seeking exactly **18.000s → 42.000s**.
- Closed 071. The selected asset is the custom 56s procedural study; the unchanged 64s `navigation-study` stays the tested fallback. No external footage/music or DHAGO media is on the critical path.
- Kept 072 open because local HTTP is not HTTPS. The MP4/poster/VTT/manifest implementation is ready; public byte-range/seek/caption validation will close it during release work.
- Resume at 073: move the playable showcase to the public root with a compact first-viewport composition. Do not change Phase 7 tests to the 56s media; they retain an explicit fixture query.

## 2026-11-15 · Phase 8 generator-scope correction (validation pending)

- Run 43699456032 proved the **new showcase verification itself passes**, but the full Chromium regression correctly failed because the first Phase 8 duration edit changed the shared legacy fixture encoder from 64s to 56s while the showcase encoder still carried a 64s cap. That altered Phase 7's established source duration and invalidated regression assumptions.
- Restored `encodeFixture()` to exactly 64s and scoped the **56s** cap only to `encodeShowcase()`. This is a generator fix, not a test relaxation. The existing Phase 7 baseline remains 64s; only the dedicated Phase 8 media is 56s.

## 2026-11-15 · Phase 8 custom media implementation (validation pending)

- Selected a **56-second deterministic procedural motion study** rather than external stock/documentary footage. It is generated only from FFmpeg color/grid/box/text filters plus a low-level synthetic sine bed; the existing silent `navigation-study` remains the fallback. No DHAGO media or third-party footage/music is reused.
- Added a generated bundle contract: 1280×720 H.264/AAC fast-start MP4, poster extracted from the actual 42s frame, descriptive VTT and JSON provenance/timing manifest. Binary outputs stay generated/ignored; source instructions remain reviewable.
- Added `showcase.test.mjs`: ffprobe verifies codec/dimensions/audio/duration; MP4 atom order verifies fast-start; frame hashes at 18s and 42s must differ; fresh Vite-preview Chromium must seek to both times and fetch poster/VTT/manifest over local HTTP. HTTPS qualification remains step 072/release work.
- CI will run the showcase verification after the production build. Step 071 remains unchecked until this exact implementation passes; step 072 cannot pass before HTTPS verification.

## 2026-11-15 · Phase 7 automated/browser acceptance and Phase 8 handoff

- Exact source `9eeeb770b4f7cc7d7d5ba4c766095f05c2116be2` passed [Actions run 43698982276](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43698982276) with architecture, packed external-host, full Chromium/Firefox/desktop-WebKit, footprint and all Phase 7 probes. The final race set includes a real 8s Return deadline followed by a late resolution and a fresh-page waiting → pause → Return sequence.
- Checked 061, 063 and 066–070. Visual review of artifact 14155597667 confirmed representative 240px held/settings/pending, 1280px settings, forced-colors, 200% CSS-layout zoom and Arabic long-clock captures have no clipped signature action or horizontal loss. Step 065 remains open because CSS zoom is not native browser zoom.
- Kept 062, 064 and 065 open with exact evidence boundaries. Physical Android/iPhone and NVDA/VoiceOver are not available through this executor; the prepared [device QA protocol](design/DEVICE-QA.md) is the handoff. Per CONTINUE.md, advance independently to Phase 8 at 071 rather than idling on external QA.
- Performance gate: incremental gzip **1,815 B / 15,360 B**. Five fresh-context and five repeat-context Chromium runs at 320px observed zero Long Tasks over 50ms; scripting/layout durations are recorded in CI. Headless LayerTree did not expose a stable compositing-layer count, so no GPU/compositing-cost claim is made.

## 2026-11-15 · Independent timeout and buffering-race probes (validation pending)

- Split 068's real 8s timeout/stale completion and provider-wait/pause/Return cases into separate fresh pages. This avoids carrying a replaced Video.js store and synthetic timer state into the buffering fixture.
- The timeout case still waits the actual production 8s deadline and resolves the old promise after failure. The buffering case now starts from a clean player and mirrors the already-verified waiting fixture before pausing and returning. No product behavior was relaxed.

## 2026-11-15 · Waiting-fixture alignment (validation pending)

- Run 43698360905 again passed every pre-existing browser/package gate, step 067 and the real 8s timeout/stale-completion portion of 068. Only the newly added buffering visibility assertion failed.
- The older verified provider-waiting fixture freezes both `readyState` and the native clock while dispatching `waiting`; the new subcase had frozen only `readyState`. Aligned the subcase exactly with that established fixture, then deletes both temporary properties before Return. This keeps the test focused on pause intent and recovery rather than creating a second, subtly different buffering simulator.

## 2026-11-15 · Buffering-race probe correction (validation pending)

- Run 43697966802 passed the new 067 duration/range test and the existing duplicate/manual/source-swap 068 stress. Its only Phase 7 failure was the new buffering subcase because it dispatched `waiting` while the media was already paused; the player correctly did not present active buffering in that state.
- Corrected the probe to enter `waiting` while playing, wait for the real buffer indicator, pause through the actual play control, restore native readyState and then Return. The asserted requirement remains unchanged: pause must win, and recovery must never restart playback. The preceding real 8s Return-timeout/stale-completion assertions had already passed before that failed visibility assertion.

## 2026-11-15 · Exact-head Phase 7 green baseline and remaining difficult-state probes

- Exact source `88e442377b30e053c7b1ac0404daed90b4b0ac8d` passed [Actions run 43697253579](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43697253579): architecture, packed external host, full Chromium/Firefox/WebKit regressions, footprint budget and all Phase 7 probes. End-key snapshots were **63.95/64.00s** in all three desktop engines. The Phase 7 screenshot artifact is 14154867955.
- Added direct step 067 evidence for duration expansion/shrink/restoration with a held mark, live classification, out-of-range Return and NaN/Infinity absence. Added step 068 timeout evidence that waits for the real 8s Return deadline, resolves the stale promise afterward, and confirms time/mark/pause intent are untouched; it also exercises paused buffering followed by Return. These additions are pending a new exact-head CI run.
- Physical Android Chrome/iPhone Safari (062), NVDA/VoiceOver (064), and native browser 200% zoom (065) remain unavailable in this executor and are explicitly not replaced by Playwright emulation.

## 2026-11-15 · WebKit final-frame seek correction (exact-build CI pending)

- [Actions run 43696833543](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43696833543) passed both desktop Chromium/Firefox full suites, the complete **10/10 independent Phase 7 probes**, 25 responsive screenshots, emulated iPhone landscape and Pixel tap, 066/068 stress, 1,812 B incremental gzip, and 10 no-long-task Chromium traces. Its only failure was desktop WebKit's End key remaining at 0.000/64.000 seconds.
- The first keyboard boundary override still sought the exact 64.000s end; changed it to request the final decodable frame (last seekable edge minus 50 ms) and capture the keystroke at document level only if its composed path includes this player's seek slider, preventing native WebKit from overriding it. Native Home and End remain keyboard actions, source/timer guards remain in place. A fresh WebKit run must confirm actual arrival before checking Phase 7 keyboard certification.

## 2026-11-15 · Phase 7 regression fixes (exact-build CI pending)

- At [Actions run 43696239741](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43696239741), Chromium and Firefox full suites passed. Desktop WebKit failed Home/End: native playhead was still **0.000s** after End with duration and seekable end both 64.000s. Added an explicit, capability-checked Home/End keyboard boundary path to the ordinary media shell, using the actual Video.js store seek and a source-scoped manual-seek cancellation event for pending Returns. It does not replace arrow-key behavior or autoplay.
- The Phase 7 duplicate-Return probe incorrectly used Playwright's delayed click before repeated DOM clicks; the 8s pending deadline expired and permitted a **new valid retry**. Corrected it to dispatch four clicks synchronously inside the 8s deadline. The test still requires exactly one store seek, and still checks manual-seek cancellation, stale resolution and source replacement. Behavior and test both await fresh CI.
- 43696239741 otherwise passed 25/25 Chromium state captures, landscape iPhone-descriptor WebKit, Pixel emulated touch, 063 keyboard probes, long 9:59:59 RTL/dense chapters, five fresh-context and five repeat-context performance traces, and 1,781B gzip delta. Ten traces recorded zero observed tasks >50 ms. All are Linux-hosted/browser-emulated, not physical QA.

## 2026-11-15 · 25 responsive screenshots and capability-aware landscape verification

- [Run 43695753935](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695753935) passed the full **5 widths × 5 states = 25** Chromium responsive player matrix, keyboard-only signature, Shift+Tab/rejected-Return focus, reduced-motion/forced-colors/CSS-zoom, emulated Pixel touch (landed 19.199s), gzip budget (1,781 B), and five no-long-task signature loops. Uploaded 28 screenshot files in Actions artifact 14154059762. This is browser emulation evidence, not physical-device proof or accepted screenshot design review.
- The emulated iPhone landscape probe exposed that WebKit legitimately reports fullscreen unsupported and hides its control. Changed the geometry validator to require visibility only when `fullscreenAvailability` reports `available`; this preserves capability truthfulness rather than forcing a decorative disabled fullscreen button.
- Desktop WebKit's Home/End scenario still failed its end-interval assertion after 10s; added an exact native clock/seekable-end diagnostic before asserting. This is an unresolved **software/browser test issue** until the next run reveals whether End is ignored or frame-clamped.
- Extended Phase 7 tests with a synthetic 9:59:59 clock/RTL/dense-chapter case, duplicate Return/manual-seek/source-swap cancellation, and five fresh-context plus five repeat-context Chromium scripting/layout/layer observations. Newly added cases are **not yet verified**.

## 2026-11-15 · First independent Phase 7 probe results and precision fixes

- GitHub Actions [run 43695310958](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695310958) independently ran the Phase 7 tests even after a desktop-WebKit regression failure. The import-graph gzip measurement passed **1,781 B incremental** (base 81,155 B; enhanced 82,936 B) against **15,360 B**. Five 320px Chromium signature loops observed **zero long tasks >50ms** (290–314 ms wall time per iteration; not a device-speed claim). Keyboard-only, Shift+Tab/rejected Return, reduced motion, forced colors and emulated CSS zoom probes passed.
- Responsive matrix and iPhone-landscape probes exposed a **test harness error**: a button within a hidden parent retained its computed display but its rectangle was zero. Changed visibility checks to actual rendered rectangles. The emulated Pixel probe previously tapped the inner slider role instead of the time-slider surface and timed out; it now uses the player slider geometry, logs landed time and asserts a bounded seek.
- Desktop WebKit's Home/End test was using a 50ms tolerance against a potentially frame-clamped duration; updated to a measured seekable-end tolerance of 0.5s and added exact arrival diagnostics. Native ended behavior remains an independent assertion and must pass on the next run. No Phase 7 box is checked by these fixes.

## 2026-11-15 · WebKit cross-browser diagnostics and independent Phase 7 evidence (pending)

- Run 43694806349 reached desktop WebKit, failing the fullscreen Escape assertion, a geometry invariance check and the native end-of-media wait. Added an explicit zero-minimum grid column to stop dynamic min-content sizing from shrinking the seek rail when held actions appear. The browser regression now logs the natural-end stage and allows a bounded 15s native-ended wait; this is instrumentation, **not** a manufactured ended event or a pass.
- Previously committed capture-phase Escape interception addresses the native fullscreen/Settings ordering, pending WebKit confirmation. Phase 7 footprint/responsive steps now execute even when preceding browser tests fail; both probes and capture artifacts will be available for diagnosis rather than silently skipped.

## 2026-11-15 · Firefox fullscreen menu Escape fix (validation pending)

- GitHub Actions run 43694723080 failed Firefox's full-screen Settings Escape path: menu stayed visible after Escape while fullscreen/native transition was in flight. Added focus-scoped, capture-phase Escape handling to close the playback disclosure before native fullscreen handling, and allowed asynchronous visibility settlement in the regression test. Do not mark this pass until exact-head Firefox CI confirms it.
- Added iPhone-descriptor **landscape WebKit emulation** and Shift+Tab plus controlled rejected-Return focus tests to Phase 7. These are software emulation and keyboard checks, not physical iPhone or screen-reader certification.

## 2026-11-15 · Phase 7 footprint and five-repeat interaction probe (validation pending)

- Added reproducible, equal-target gzip compilation of the detached base and DETOUR entries and a 15 KiB incremental budget assertion. Common scoped CSS is identical across entries (zero incremental CSS); the total CSS is not claimed as zero. This import-graph estimate does not replace actual network trace byte accounting.
- Added five 320px Chromium hold → two seeks → Return traces collecting PerformanceObserver long tasks and reporting wall time per run; no verified performance results are claimed until exact-head CI passes. Physical or budget-hardware results remain open.

## 2026-11-15 · Phase 7 browser-probe implementation (validation pending)

- Added `tests/phase7.test.mjs` with an exact 240/320/375/768/1280px embedded-player matrix for idle, held, real captions, Settings and delayed Return, plus optional real Playwright screenshots; keyboard-only Hold → Home/End → Return and Stay → Escape/focus; reduced motion, forced colors and emulated CSS zoom; and Pixel Chromium emulated touch tap/seek/return.
- CI now invokes the distinct Phase 7 probes after existing build/architecture/packed-host/full-browser regressions, and uploads screenshot artifacts on both success and failure. This is implementation, **not yet a verified passing run**. Existing checklist boxes 061–070 stay open until actual evidence is reviewed.
- Physical iPhone Safari, Android Chrome, NVDA/VoiceOver and real browser zoom cannot be inferred from Playwright descriptors. They remain explicit device/AT gates. Next action: inspect exact-head CI output and screenshots, fix failures, and only then promote supported steps.

## 2026-11-15 · Phase 6 step 058 reconciliation and Phase 7 handoff

- Verified the already-committed iPhone-shaped Playwright WebKit packaged-base consumer at source `15bd747d57285eb7be236577aff7b41e688cc6fc`, successful [Actions run 43693510683](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43693510683). The executable test reads media-store volume/mute availability, tests either supported volume-setting or unsupported-slider state, and toggles native mute on and off. It explicitly does **not** require nonzero maxTouchPoints in Linux WebKit and is **not** real iPhone/touch/Safari evidence.
- Reconciled 058 to verified, bringing Phase 6 to 10/10 executable and previously evidenced checklist items. Existing desktop Chromium/WebKit external-host coverage includes transport, caption toggle, playback-rate selection, Escape/focus restoration, and capability-conditional fullscreen. This is a tracking/evidence reconciliation, **not** a new browser run or feature patch.
- Next actionable: 061 responsive state matrix and real screenshots. 062 physical iOS/Android touch, 064 AT, and 070 real-device browser gate remain unverified. Owner dependencies 002 and 017 remain open. The CI progress validator must pass on this reconciliation commit.

## 2026-11-15 · Phase 6 core implementation checkpoint

- Verified 051, 055, 056, 057, 059 and 060 at `524bac5fb73aaf0568e559c4e08342137c443da7` / Actions run 43692857813. The run passed 5 architecture checks, 3 packed-consumer tests, 17 Chromium scenarios and the 10-run desktop-WebKit signature check.
- Split generic media lifecycle from held-place behavior. `detour-video-skin/base` now proves the five ordinary controls can load from the packed artifact without importing or registering `detour-place`.
- Added a true stale-after-dismissal race and a 20-cycle pending-Return remount stress test. All 20 cycles cleared the marker and one-shot deadline; the final Return dispatched exactly once.
- Packed Chromium and desktop WebKit now cover the signature path plus Stay, play/pause, mute, captions, rate and Settings focus restoration. Dense 64-cue metadata does not add rail clutter.
- Step 058 stays open because its work text specifically requires mobile user-agent volume behavior. Compact desktop emulation is not being counted as that evidence. See [Phase 6](design/PHASE-6.md).

## 2026-11-15 · Phase 5 architecture and portability gate

- Verified steps 042–050. The core, styles and optional Mux helper have separate package exports; `npm pack` excludes demo/test/fixture material and includes Apache-2.0 licensing. A fresh external host installed the tarball and supplied its own video and caption track.
- GitHub Actions run 43691495087 at `012482415ecb706d246646f0f9b95dbe780d91dc` passed 4/4 architecture checks, 2/2 packed-host checks, 16/16 Chromium scenarios, and the focused desktop-WebKit round trip with 10/10 arrivals at 42.350s. The packed host itself returned to 42.350s in both engines with native and Video.js store clocks agreeing.
- Fixed the pending-Return reconnect defect by keeping persistent label/pending nodes instead of destructively replacing button children. Two packed player instances isolate marks; explicit live/audio cases hide DETOUR; stale provider completions and source epochs remain guarded.
- Added deterministic portrait media, a 64-cue chapter track and a synthetic 40,000-second state case. Existing local harnesses cover chapterless/no-poster, captions, throttling, error/retry, source swap and delayed/rejected seeks. No paid media calls are needed.
- Technical decision: **go**. Estimated submission-ready core work is 12–18 active engineering hours against roughly 45 hours of calendar reserve to the planned Nov 17 10:44 NPT freeze. Keep optional Mux/public-site extras behind the core gate. Desktop WebKit is not claimed as physical Safari/iPhone, and Mux URL-helper resolution is not claimed as HLS playback.
- Full architecture, capability, event budget, fixture table and limits: [Phase 5 acceptance](design/PHASE-5.md#2026-11-15-phase-5-acceptance). Next actionable step: 051.

## 2026-11-15 · Phase 4 visual system

- Implemented the opaque graphite shelf, separate white playhead and safety-lime bracket, and tabular Return ticket. The stem holds its exact rail position as its arms flip inward near the end.
- Verified 240, 320, 375, 600, 768 and 1100 px layouts, including the 600 px inline threshold. The regular Hold transition preserves transport geometry. Reduced-motion and forced-colors cases were measured in Chromium.
- Added visible loading, waiting, ended, no-time and retry treatments. A separate bright fixture demonstrates the same controls, native captions and kept-place behavior.
- Locked the [visual acceptance sheet](design/PHASE-4.md) with three paired player-only boards and a forced-colors sample. See the [test evidence](submission-report/EVIDENCE.md#2026-11-15-phase-4-visual-proof).

## 2026-11-15 · Phase 3 interaction and release decisions

- Kept required controls exposed at desktop and compact widths. Settings offers real playback speed below the picture while native two-line captions remain inside it. Escape closes settings and restores focus.
- Tested Home/End and emulated touch seeking, paused/playing/ended return, missing captions, unavailable time, and long RTL copy. Added seekable-range and source-epoch guards. Controlled rejection and late completion confirmed the UI preserves a valid mark, including a new mark after a same-URL reload.
- Adopted a DETOUR-specific Cloudflare host, optional Mux HLS bonus path and milestone-based Google Drive archive. The proposed hostname and service paths are release work. See the [interaction contract](design/PHASE-3.md), [browser evidence](submission-report/EVIDENCE.md#2026-11-15-phase-3-interaction-proof) and [release plan](submission-report/RELEASE-PLAN.md).

## 2026-11-15 · Phase 2 visual decision and backup

- Compared live player-only crops at 320 and 768 px with the bracket present and hidden. Retained the raised bracket and the explicit Return button. Current and held markers stay distinct even at the same timestamp.
- Ran the isolated Pausepoint proof. Set 18.3s using the keyboard picker, observed one pause at 18.380s, resumed playback, and verified that seeking across armed targets while paused and while playing skips the point. The backup has a 2–4 hour switch estimate.
- Locked the single-place scope and prepared the first-use moderator guide. Step 017 remains unchecked. The next independently actionable step is 021.
- See the [crops and backup proof](design/PHASE-2.md), [concept scope](design/SCOPE.md), and [test evidence](submission-report/EVIDENCE.md#2026-11-15-phase-2-design-proof).

## 2026-11-15 · Competition refresh and playable prototype

- Rechecked the public terms and documented the open second-entry question. Reviewed 58 entries across both feed orderings, inspected seven related designs, and found no described full match for the exposed hold/explore/return flow in the sample. Direct demo playback was unavailable in the capture environment for Plate and Arcade.
- Recomputed all 30 candidate scores. Proceeded with DETOUR and kept Pausepoint as backup. Added a milestone run sheet, source-independent use cases and the first player state table.
- Built the first reusable local skin with pinned v10 components, real buffered ranges, a chapterless 64-second fixture and a source-scoped origin. Chromium returned to 42.350s in all ten runs after seeking through 18s and 24s. Playback, mute, captions, fullscreen, narrow keyboard Stay and same-element source reload passed. See [evidence](submission-report/EVIDENCE.md#2026-11-15-first-prototype).
- Start the next session at step 018. Record uncoached observations when available rather than treating automated success as discovery evidence.

## 2026-11-15 · Branch setup

- Imported the 100 original IDs and acceptance conditions into the [living checklist](CHECKLIST.md). Added the [master direction](README.md), [resumption rules](CONTINUE.md), and the [submission report](submission-report/README.md).
- Verified step 001 with the dated [public rules and requirement map](submission-report/RULES.md). Initialization does not verify any implementation steps.
- Next artifact to produce: an eligibility evidence note or a precise unresolved status, then the timed run sheet for step 003.

For each checkpoint, place the newest dated entry above older entries. Record step IDs, changes, meaningful test/evidence links, any open dependencies and the exact next action. Set the two fields at the top to the current phase and first actionable unchecked step. Identify remaining gaps in the same update when resuming past a blocked item.
