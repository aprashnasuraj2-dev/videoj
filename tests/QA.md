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
