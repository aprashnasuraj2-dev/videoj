# AFTERIMAGE hardening evidence

This pass hardens the reusable AFTERIMAGE / Temporal Lens implementation without changing its central interaction, copper/limestone visual language, WATERLINE submission story, or conventional transport contract.

## Baseline, exact source and public freeze

- Baseline branch: `afterimage`
- Baseline head: `d4d913af16717c07f11b46f45fc912cb6f39187c`
- Hardening branch: `afterimage-hardening`
- Verified hardening product/test source: `b8003a74d43c382b3011b8094f16bbc37397ee80`
- Generated `standalone.html` bytes from that successful run were reconciled in `5e8825b9ecfcc0c600aff1d0fcb393ae40b7a057`.
- Exact product hardening run: GitHub Actions `43825696674` — **success**.
- Evidence artifact: `14206631544`, digest `sha256:29442e5621ad770b27301d4dce98c19832e0188d9116c9f1c74a2ed08c303c97`.
- Frozen public competition product remains `2316dc7f07f5b73a2d30d7e95fc5b09e6f83fb69`, runtime `0.3.10-control-fit`, at `https://afterimage.aafnaipatro.com/`.
- No hardening build was promoted to the public hostname. Independent Cloudflare Browser Rendering still observed `x-afterimage-release: 2316dc7...` and no DETOUR terminology on the public page.

## Exact executable gates

Run `43825696674` passed, in order:

1. `npm test` — architecture and concept-boundary tests.
2. `npm run build:standalone` — canonical standalone regeneration.
3. `npx vite build` — production build.
4. `npm pack --dry-run` — package-surface inspection.
5. `AFTERIMAGE_HARDENING_ENGINE=chromium node --test tests/source-lifecycle.test.mjs`.
6. The same lifecycle gate in Firefox.
7. The same lifecycle gate in desktop Playwright WebKit.
8. `node --test tests/package-external-host.test.mjs`.
9. `node --test tests/difficult-media.test.mjs`.
10. `node --test tests/performance-footprint.test.mjs`.
11. Hardened-local browser regression: Chromium, Firefox and WebKit `public-candidate.playwright.mjs`, headed Chromium official keyboard/accessibility gates, touch robustness, headed fullscreen and judge-first-use.

For the local hardened regression only, CI temporarily hides the committed WebM so the unchanged standalone naturally falls through to its committed MP4 source. This avoids treating Vite's CI-specific WebM metadata/range behavior as production delivery evidence. The frozen public Worker already has independent MIME/range/WebM/MP4 delivery proof.

## Truthful capture-state model

The Temporal Lens now distinguishes and exposes both a state and a reason rather than collapsing every unavailable case into one bucket.

Covered executable states/reasons include:

- source error;
- no currently declared source;
- metadata pending, including the normal pre-metadata `duration=NaN` state;
- unknown/NaN duration after metadata;
- infinite duration;
- zero/invalid duration;
- live and live/DVR-like stream classification;
- seeking;
- waiting/current-frame pending;
- missing capturable picture;
- ended-but-capturable final picture;
- ordinary VOD ready state;
- native seekable range available versus empty.

An empty seekable range does not automatically disable manual Pin when a real current frame is already rendered: manual Pin does not seek. Instead, seekability is recorded in `data-capture-seekability`. Source eligibility follows the host's currently declared `src`/`<source>`, not a browser's briefly stale `currentSrc` after source removal.

The UI does not present `NaN`, `Infinity`, stale timestamps, stale old-source frames or false successful pins. Capture failure does not disable ordinary playback.

## Lifecycle, isolation and stale work

The dedicated lifecycle gate passes in Chromium, Firefox and desktop Playwright WebKit.

Observed/asserted:

- two simultaneous players own independent videos, timestamps, canvases and seam state;
- A can be cleared while B remains pinned unchanged; moving B's seam does not revive A;
- 20 detach/reinsert cycles pass, with deliberately pending frame work in cycles 5, 10, 15 and 20;
- after the stress cycle there is exactly one Temporal Lens and one reference canvas;
- no duplicate completion handler effect and no browser runtime exception is accepted;
- a callback completing after disposal cannot commit;
- stale work after Close cannot win over a later valid same-source pin;
- stale work after Clear cannot commit;
- source replacement invalidates pending work;
- an old-source callback cannot overwrite the new-source pin;
- same-URL reload clears the prior source epoch/reference;
- failed invalid-frame and source-error re-pins retain the previous valid reference and leave focus on the active Pin action;
- pause while waiting remains paused after recovery.

Chromium and Firefox lifecycle fixture seeks use the real Video.js store. On the Linux Playwright WebKit lifecycle fixture, WebKit sometimes exposes decoded current data while duration/seekability are not stable; lifecycle-race assertions therefore record a synthetic host clock for that gate only. This is **not** claimed as real WebKit seeking. Real ordinary WebKit playback/seek behavior is separately exercised by the hardened standalone WebKit regression, which passed 31/31 checks.

## Real packed external consumer

The external-host gate runs real `npm pack`, installs the tarball into a fresh temporary application, and supplies unrelated generated video, poster and captions.

Verified:

- `afterimage-video-skin/base` mounts a conventional player and does not import/register Temporal Lens;
- the enhanced package mounts two independent AFTERIMAGE instances;
- normal Play/Pause, Seek, Mute and real captions operate on host-owned media;
- manual playing Pin does not pause or move media backward;
- the seam is reopened and moved to 73%;
- Close → Compare → Clear works;
- after A is cleared, B can pin independently without reviving A;
- dispose/remount leaves one lens, no inherited reference and an enabled Pin action;
- `THIRD_PARTY_NOTICES.md` is packed;
- demo/public/tests/docs/artifacts are excluded;
- runtime text contains no WATERLINE/Apollo/Aafnai/DETOUR/challenge-host dependency, no known public playback identity and no Mux management/bearer credential.

## Difficult-media matrix

The dedicated browser matrix passes all 7 subtests.

Responsive widths and primary measured targets:

| Width | Play | Seek | Mute | Fullscreen | Pin |
| --- | ---: | ---: | ---: | ---: | ---: |
| 240px | 46×46 | 208×44 | 46×46 | 46×46 | 208×44 |
| 320px | 46×46 | 280×44 | 46×46 | 46×46 | 280×44 |
| 390px | 46×46 | 350×44 | 46×46 | 46×46 | 350×44 |

Also passed:

- 768px and 1280px;
- 667×375 mobile landscape;
- 4:3 media with 640×480 reference canvas;
- 9:16 media with 360×640 reference canvas;
- ordinary 16:9;
- no poster / no captions;
- a real long caption cue;
- RTL host direction plus long Arabic control text with no document overflow;
- `9:59:59` synthetic long-clock rendering;
- synthetic >1-hour VOD state;
- native seekable-range available → empty mutation;
- zero-duration unavailable state while Play remains usable;
- ended media that remains truthfully pinnable;
- source removal classified `timeline-unavailable / source-missing` while standard controls remain usable;
- displayed buffered extent derived from the actual native `video.buffered` range, not an invented percentage.

## Performance and footprint

Measured on the GitHub-hosted Linux CI runner with Playwright Chromium. These are CI/browser measurements, **not** low-end-phone claims.

| Metric | Exact result |
| --- | ---: |
| Base ESM gzip | 80,121 bytes |
| Enhanced ESM gzip | 83,940 bytes |
| Incremental JS gzip | 3,819 bytes |
| Shared scoped CSS gzip | 2,652 bytes |
| Incremental CSS over base entry | 0 bytes |
| Repeated pins | 20 |
| Mean pin wall time | 34.95 ms |
| Max pin wall time | 48.41 ms |
| Reference canvas | 1279×719 |
| Reference canvases after repeated pins | 1 |
| Raw RGBA estimate | 3,678,404 bytes |
| 200 seam inputs scripting wall | 3.0 ms |
| Seam-generated `seeking` events | 0 |
| Seam-generated `seeked` events | 0 |
| Seam-generated application network requests | 0 |
| Fresh-context traces | 5 |
| Repeat-context traces | 5 |
| Observed interaction Long Tasks >50ms | 0 |

The seam test also observed unchanged media `currentTime`.

## Hardened accessibility and browser regression

Against the regenerated hardened standalone:

- Chromium report: 33/33 checks passed.
- Firefox report: 31/31 checks passed.
- desktop Playwright WebKit report: 31/31 checks passed.
- headed Chromium official gate: 44/44 checks passed.
- touch robustness: 15/15 checks passed.
- headed fullscreen: 4/4 checks passed.
- judge-first-use automation: 9/9 checks passed.

Key measurements/behaviors:

- fresh page has no artificial prefocus; first Tab lands on Play;
- Play is 44×44; Seek is 710.94×44; Volume is 76×44;
- focus outline is 3px, measured at 12.07:1 against the opaque deck;
- representative control foreground measures 14.80:1;
- keyboard authored pair resolves to Pinned 00:05 / Now 00:13 / +00:08 with seam focus and playback still running;
- Escape comparison → Compare; Compare → seam; Close → Compare; Clear → Pin;
- failed re-pin → Pin focus, with the prior valid frame retained;
- native wrapper fullscreen in headed Chromium keeps stage/deck registered and controls inside the 1280×800 viewport;
- captions remain usable through the established fullscreen regression;
- reduced-motion passes Chromium/Firefox/WebKit; forced-colors is explicitly Chromium-only coverage;
- touch seam tap/drag/cancel and vertical scroll recovery remain bounded;
- automated first-use walkthrough completes the normal Play → comparison → seam → Close → Clear journey in 1.317s. This is an engineering automation metric, not human usability evidence.

## Playback Settings decision

Playback-rate/Settings UI is intentionally **not** added. The current direct controls plus Try a comparison / Pin remain uncluttered at 240/320/390px, focus order is clear, and another first-use menu would add density without strengthening the Temporal Lens thesis.

**Intentionally excluded to prevent concept drift.**

## Known limits

Still unverified and therefore not claimed:

- physical iPhone Safari;
- physical Android Chrome;
- NVDA;
- VoiceOver;
- real low-end-phone performance;
- genuine tainted cross-origin canvas and expired-provider failure;
- separately throttled slow-network authored-seek behavior;
- the numbered-frame tolerance fixture;
- signed-in competition-form submission/acceptance.

The Linux Playwright WebKit lifecycle fixture limitation described above remains explicit; it does not substitute for physical Safari.

## Regression and concept-drift audit

Architecture and hardened browser tests prove:

- manual Temporal Lens contains no programmed `.play()`;
- manual Temporal Lens contains no programmed `.pause()`;
- manual Temporal Lens contains no `currentTime =` mutation;
- exactly one committed reference canvas is reused;
- one registered seam reveals the fixed reference over the moving current video;
- Pinned / Split / Now remain intact;
- standard transport remains independent;
- the authored comparison helper remains the sole documented intentional seek exception;
- WATERLINE identity remains unchanged;
- no Return/Stay/checkpoint/navigation-history behavior or DETOUR visual language entered AFTERIMAGE.

**Concept drift result: No.**

## Promotion decision

**KEEP FROZEN PUBLIC RELEASE**

The hardening objectively improves lifecycle truthfulness, portability and evidence. It does not create a competition need strong enough to justify replacing an already-qualified public candidate at the deadline. The protected public build remains `2316dc7...` / `0.3.10-control-fit`.
