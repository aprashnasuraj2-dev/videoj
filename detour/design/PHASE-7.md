# Phase 7 — responsive, access, difficult states and browser verification

## Evidence policy

The automated tests run on GitHub-hosted Ubuntu, Node 24, Video.js HTML 10.4.0 and Playwright 1.62.1. Chromium desktop and emulated Pixel descriptors are not physical Android Chrome; desktop Linux WebKit with an iPhone descriptor is not iOS Safari. Browser DOM attributes and accessibility trees are not a substitute for NVDA or VoiceOver sessions.

## Implemented probe matrix — pending CI validation

| ID | Executable check | Known gap before acceptance |
| --- | --- | --- |
| 061 | Real Vite-built player at 240, 320, 375, 768 and 1280 CSS px; idle, held, native VTT caption, Settings, pending Return; each state screenshot saved on CI. Required control visibility, 44px signature hit boxes and horizontal overflow asserted. | Review images and inspect real iOS landscape before claiming the full row. |
| 062 | Emulated Pixel Chromium touch taps Hold, timeline and Return. | Physical Android Chrome and iPhone Safari, pointercancel, drag and page-scroll interruption remain. |
| 063 | Keyboard-only Hold, slider Home/End, Return, Stay and Escape focus restore. | Inspect failure focus and Shift+Tab path; perform AT checks separately. |
| 064 | No AT sessions recorded. | NVDA/Firefox or Chrome and VoiceOver/Safari, with versions. |
| 065 | Reduced-motion animation, forced colors, and 200% *CSS zoom emulation*, with screenshots. | Actual browser zoom, contrast re-measure and bright/dark caption inspection remain. |
| 066 | Previous Phase 5/6 synthetic duration, dense chapter, portrait and audio cases. | Full content/language matrix at this phase. |
| 067 | Prior guards for unseekable/invalid/live and range expiry. | Extended fluctuating-range phase-specific matrix. |
| 068 | Prior cancellation, rejected/late seek and remount evidence. | Independent Phase 7 stress plus manual-seek race confirmation. |
| 069 | No current comparable 5× cold/warm byte/long-task budget. | Five-repeat runtime traces and compressed incremental bytes. |
| 070 | Three desktop engines were added to CI before this phase. | Full passing exact SHA, physical coverage and accessibility sign-off. |

**No Phase 7 checklist items are automatically verified by adding tests.** Only promote after a passed exact-source run and sufficient acceptance evidence. The physical/AT dependencies cannot be cleared by headless automation.
