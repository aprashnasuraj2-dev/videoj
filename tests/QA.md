# DHAGO candidate verification

## Verified browser baseline

Revision `1cae2171eb523142279f70c258378537fa34c818`: [GitHub run 43420343473](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43420343473), **17/17 passing**. Chromium on Ubuntu, Playwright 1.65.0, axe 4.14.0. Clean npm install, typecheck and production build also pass. Later mobile label/layout refinement is verified by its own run before release.

| Scope | Observed result |
|---|---|
| Play/pause, seek, mute, focused-thumb volume | PASS: actual media state changes |
| Captions, chapter seek/readout, speed, ended/replay | PASS |
| Fullscreen | PASS: actual document fullscreen element enters/exits; no mocked API |
| 320/375/768/1280px | PASS: no document overflow; essential controls visible; screenshots retained |
| Linen, Ink, Paper | PASS: focus, 44px essential targets, reduced motion and scoped axe scans |
| No chapters | PASS: linear seek remains operable |
| Error / open menu / resting player | PASS: serious/critical axe scan; error dialog appears for unavailable source |
| Isolated bright/dark footage | Captured and visually inspected: shelf, chapter readout and ribbon remain legible |
| Physical phone / VoiceOver / NVDA | NOT TESTED |
| Forced colors / zoom / long captions / slow loading / rapid input | NOT TESTED: broader matrix remains incomplete |
| Public production / Mux playback / genuine-site bonus | NOT VERIFIED |

The deterministic suite uses `?local`. It does not establish the Mux bonus. A successful automated scan is not WCAG certification or proof of real assistive-technology usability.

## Retained failures and corrections

Local browser download was corrupt; system Chromium then failed at launch because socket creation is prohibited. GitHub's runner supplied the browser evidence instead.

Initial CI: 5/6 passed, with a critical unnamed Settings button. Added explicit name. Visual review found an invisible woven track despite passing keyboard seek; restored the full-width absolute chapter coordinate system. Horizontal volume thumb retained vertical geometry; corrected it. Fullscreen initially lost the shelf because state was reflected on the button rather than the container; native :fullscreen now governs the layout. Slider keyboard tests now focus the actual thumb. Speed/captions submenus now follow documented sibling composition. Relevant baseline checks pass.

## Contrast measurements

Calculated using sRGB relative luminance from the actual fixed palette. These measure solid foreground/background pairs, not every hover, texture or user-customized accent.

| Pair | Ratio |
|---|---:|
| Linen text / shelf | 14.95:1 |
| Linen muted text / shelf | 5.91:1 |
| Linen focus / shelf | 4.69:1 |
| Ink text / shelf | 13.43:1 |
| Ink muted text / shelf | 9.51:1 |
| Ink focus / shelf | 8.28:1 |

Opaque shelf surfaces isolate text/icons from changing footage. Weave patterns, text labels, time and thumb carry information without color alone.

## Dependency and loading scope

`npm audit --omit=dev` reported zero vulnerabilities in its production dependency scope on 2026-11-13. It does not cover all development dependencies or every bundled optional adapter. The local player shared entry is about 72 KB gzip; the optional Mux chunk is about 197 KB gzip. No measured phone startup time is claimed.

## Mobile refinement confirmed

Revision `2ed92ded44831acb29a512700ad76d7720b33939`: [run 43420845834](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43420845834) passed the same 17 checks after the labelled mobile-control row was introduced. Open settings is now captured in the evidence set. No new production/Mux/device claim follows from this run.

The fdcc1a45 run retained 15 passing behaviors but two narrow-label tests failed from an ambiguous test locator: Captions also exists inside hidden menus. The selector was narrowed to the actual visible control labels. This is a test-selection correction, not a hidden player failure or a claimed passing run.

## Exact-head candidate and production boundary — 2026-11-13

- **Candidate:** commit `4f3f86cb795f3a21d787c1f8a0567d2242eca29a`, [CI run 43430986626](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43430986626): clean install, typecheck, build and **26/26 Chromium tests PASS**. This includes `tests/mux.spec.ts` observing Mux HLS video playing and seeking with local chapter/caption cues, forced-colors + 200% root text case, 320px long titles, explicit network recovery, 4x-CPU/1.6Mbps simulated startup measurement and the 30s proof recording.
- **Evidence archive:** [Google Drive 1j7FHURfdYk6Wn0LlNrF8jDLjixnC4ml7](https://drive.google.com/file/d/1j7FHURfdYk6Wn0LlNrF8jDLjixnC4ml7/view), stored in the project folder. Contains CI screenshots, movie, Playwright report and built assets for this revision. It is not a complete source-code archive; GitHub remains the canonical source.
- **Public hosts:** https://creative.aafnaipatro.com/ and https://dhago.aafnaipatro.com/ return the DHAGO English homepage. The separate https://creative.aafnaipatro.com/journal.html is now live after an R2 release (formerly 404). The public homepage requests the documented Mux HLS ID, with a functioning verified HLS manifest.
- **Browser counterexample:** the external automated browser can see `mux-video` and requests the Mux URL but cannot decode any returned H.264/AAC variants, reporting `no level with compatible codecs found`. The same external browser previously failed on the local H.264 MP4 with a demuxer error. CI Chromium plays the Mux stream successfully; this is a browser codec-availability discrepancy, not evidence that all users can or cannot play it. Branded Chrome/Safari/WebKit real-device checks remain open.
- **Deployment gap:** static public R2 was surgically patched with a versioned Mux bootstrap, textile refinements and a journal module. **It has not been proven byte-for-byte identical to the complete 4f3f86c production dist**. Step 84 remains unfinished; judge-facing production acceptance is not claimed. Live scene-note seeking in the external browser was blocked by the codec error.
- **Mux provisioning:** previous manual GitHub workflow failed because `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` runner secrets are unset. The existing public playback ID is configured and the HLS manifest works; do not rerun an upload blindly or create duplicates.

## Production-only live smoke gate

The `public-smoke` job runs after a successful source verification on pushes to `main` and only then. It uses `DHAGO_LIVE_URL=https://creative.aafnaipatro.com` and tests public Mux frame advancement and the separately deployed journal scene note. Pull requests skip these tests by design, so failures of a deployed environment cannot masquerade as code changes in the candidate. This gate was added after confirming HTTP success alone had masked a local-MP4 playback failure and a missing journal. **Its result is not claimed until the main push run finishes.**

## Full-source production parity audit — 2026-11-13

- PR #4 exact head `09352e53d5e9247c7cea8c47d33a94b1af51bf5a` passed **30/30 Playwright Chromium tests**, including four new end-of-film / no-chapters / initial scene / touch-emulation checks: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43439977940 .
- Merged as `72ec6c324f646c6dcb18708bc86d3f0d415f39c2`; source CI verify and **pre-publish** public-smoke jobs passed in https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43440355195 . Preserve distinction: the smoke job ran before the exact full R2 publication.
- Immutable branch `dist-72ec6c324f64` contains 78 files and SHA-256 manifest. Exact public release passed **76/76 text SHA-256 checks** and **2/2 binary ETag-MD5/size checks**. Previous HTML entry points are available for rollback.
- Independent public HTTP retrieval confirmed DHAGO landing, alternate domain and full Studio Journal. Automated third-party browser reports codec incompatibility with both source MP4 and Mux HLS; passing Ubuntu CI Chromium is counterevidence that the media is inherently corrupt, not a guarantee of broad device support.
- New owner's 5-step real-phone/desktop plus VoiceOver/NVDA walkthrough: `docs/owner-review.md`. **Still unverified** on actual physical hardware and screen readers.
