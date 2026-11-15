# Phase 7 — responsive, access, difficult states and browser verification

## Evidence policy

The automated tests run on GitHub-hosted Ubuntu, Node 24, Video.js HTML 10.4.0 and Playwright 1.62.1. Chromium desktop and emulated Pixel descriptors are not physical Android Chrome; desktop Linux WebKit with an iPhone descriptor is not iOS Safari. Browser DOM attributes and accessibility trees are not a substitute for NVDA or VoiceOver sessions.

## Implemented probe matrix — pending CI validation

| ID | Executable check | Known gap before acceptance |
| --- | --- | --- |
| 061 | Real Vite-built player at 240, 320, 375, 768 and 1280 CSS px; idle, held, native VTT caption, Settings, pending Return; each state screenshot saved on CI. Required control visibility, 44px signature hit boxes and horizontal overflow asserted. | Now includes a distinct emulated iPhone WebKit landscape hold/Return path; inspect images and physical iOS landscape remains separate. |
| 062 | Emulated Pixel Chromium touch taps Hold, timeline and Return. | Physical Android Chrome and iPhone Safari, pointercancel, drag and page-scroll interruption remain. |
| 063 | Keyboard-only Hold, slider Home/End, Return, Stay and Escape focus restore. | Added desktop Chromium Shift+Tab and controlled rejected-Return focus paths; obtain exact CI outcome; perform AT checks separately. |
| 064 | No AT sessions recorded. | NVDA/Firefox or Chrome and VoiceOver/Safari, with versions. |
| 065 | Reduced-motion animation, forced colors, and 200% *CSS zoom emulation*, with screenshots. | Actual browser zoom, contrast re-measure and bright/dark caption inspection remain. |
| 066 | Previous Phase 5/6 synthetic duration, dense chapter, portrait and audio cases. | Full content/language matrix at this phase. |
| 067 | Prior guards for unseekable/invalid/live and range expiry. | Extended fluctuating-range phase-specific matrix. |
| 068 | Prior cancellation, rejected/late seek and remount evidence. | Independent Phase 7 stress plus manual-seek race confirmation. |
| 069 | [Actions 43695310958](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695310958): incremental gzip **1,781 B / 15,360 B** limit; five 320px Chromium loops 290–314 ms wall time, no observed long task >50 ms. | No five-cold/five-warm dedicated hardware/network traces; don't infer production speed. |
| 070 | Three desktop engines were added to CI before this phase. | Full passing exact SHA, physical coverage and accessibility sign-off. |

**No Phase 7 checklist items are automatically verified by adding tests.** Only promote after a passed exact-source run and sufficient acceptance evidence. The physical/AT dependencies cannot be cleared by headless automation.

## Initial Phase 7 measurements — 2026-11-15

The first independent `footprint.test.mjs` passed: 81,155 B gzip baseline, 82,936 B enhanced, incremental 1,781 B. CSS is common to both package entries and therefore has zero **incremental** CSS, not zero absolute CSS. The five same-process Chromium traces reported no Long Tasks API entries; the test environment is an Ubuntu hosted CI runner rather than a constrained mobile device. This does **not** meet all of checklist 069's cold/warm and real-hardware requirements.

The responsive and mobile-UA probes initially failed on a hidden-ancestor measurement error and wrong slider target respectively; both were fixed in code and require a fresh exact-head run. The 061 screenshots from that failing run are incomplete. No screenshots are represented as accepted unless a corresponding probe passed.

## Responsive capture checkpoint

The first full Chromium matrix passed 25 distinct width/state checks (240/320/375/768/1280 × idle/held/captions/settings/pending) and wrote 28 player images to [Actions artifact 14154059762](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695753935/artifacts/14154059762). This artifact link is evidence of the captured run, not proof that someone visually accepted every crop. The separate Linux WebKit iPhone-configuration run found no document fullscreen capability; the control was hidden. The next test explicitly maps required visibility to the engine's truthful fullscreen availability.
