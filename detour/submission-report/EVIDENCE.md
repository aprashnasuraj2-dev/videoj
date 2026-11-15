# Evidence ledger

Use one row per material result. Include the source SHA, browser and OS or device, date, observed result and a link to the exact test, trace or media. Status values: Pending, Pass, Fail, Blocked, and Not tested. A passing parser or emulation check is evidence only for that check.

| Capability | Acceptance steps | Status | Revision, environment, artifact |
| --- | --- | --- | --- |
| Signature discovery and first successful return | 012, 017, 018, 090 | Partial | [Controlled crops](../design/PHASE-2.md#visual-signature) and browser trace. Uncoached viewer results remain open. |
| Held origin survives multiple real seeks; Return lands; Stay does not seek | 043, 052–055, 060 | Chromium pass; wider gate pending | See local test below. |
| Source swap, stale event, duplicate input and retry | 059, 067–068 | Partial | Same-element reload passes. Delayed provider responses and repeated remounts remain open. |
| Genuine playback and all essential controls | 051, 058, 070, 092–093 | Partial | Local Chromium play, pause, seek, time, mute and fullscreen. Broader volume and device checks open. |
| Narrow embeds, real mobile, keyboard, assistive tech and contrast | 061–066, 070 | Pending | |
| Core payload and interaction performance relative to Scaffold | 069 | Pending | |
| Same skin on arbitrary replacement media | 060, 074 | Pending | |
| Authentic wide, mobile and interaction captures | 082–089 | Pending | |
| Public bonus playback and fallback, if claimed | 075–077, 097 | Pending | |
| Genuine second context, if claimed | 078, 097 | Pending | |

For functional tests, record current and held times before and after, playback mode, and the source identity where relevant. For a failed capability, record the environment and smallest reproducible sequence. Keep public images and clips matched to their source build. Do not copy DHAGO's prior results into the DETOUR evidence column.

## 2026-11-15 first prototype

- Source: the repository commit containing this evidence section and its sibling `skin/` and `tests/` files. Environment: Debian Linux, Node 24, Vite 7.2.2, `@videojs/html` 10.4.0, headless Chromium 143.0.7499.0. Browser loaded the built bundle and a same-origin 854×480 H.264 fixture with a duration of 64.000 seconds.
- Clean `npm ci --offline` using the populated npm cache and `npm run build` passed. The built entry was 39.31 kB gzip for JavaScript and approximately 2 kB for CSS. This measurement includes the shared Video.js runtime; the incremental performance gate is open.
- [Four local browser tests](../tests/browser.test.mjs) passed. At a paused 42.350s, Keep caused no time change. Seeking to 18s and 24s preserved the held marker, with Return landing at 42.350s on every one of ten runs and one observed seeking event per action. Keep did not pause or change the position. A separate playing return stayed playing.
- At 240 and 375 px viewport widths, the accessible seek thumb responded to the arrow key and Stay did not move the playhead. Tests measured at least 44px targets and no horizontal overflow. A same-element source reload discarded the saved place. Captions, mute and Chromium fullscreen toggled from the real player.
- Boundaries: Chromium headless and viewport tests, no physical-device or assistive-technology claims. Stock system Chromium was blocked by this executor's Unix-socket restriction; a compatible headless build instead ran the suite. Firefox, Safari/WebKit, user discovery and the public deployment remain open.

## 2026-11-15 Phase 2 design proof

- Source: the commit containing this entry and the [browser suite](../tests/browser.test.mjs). Debian Linux, Chromium 143.0.7499.0 headless, real 64s H.264 fixture. `npm run build` and all six browser scenarios passed.
- [Matched player crops](../design/PHASE-2.md#visual-signature) show the same real frame and controls, with a documented A/B toggle of the held mark. Test measured the actual player widths and preserved distinct positions and shapes at coincidence. These are design comparison images.
- [Isolated Pausepoint](../design/PHASE-2.md#pausepoint-backup) armed via keyboard, paused at 18.380s after a natural 18.3s crossing and resumed. Paused and playing seeks over an armed timestamp caused no extra pause.
- Phase 2's [first-use study](../design/FIRST-USE.md) is ready to run. Participant recognition and completion rates have no observations yet.

## 2026-11-15 Phase 3 interaction proof

- Source: the commit with this entry and [the browser suite](../tests/browser.test.mjs). The production build and 11/11 Chromium scenarios passed on Debian Linux with Chromium 143.0.7499.0.
- At 320 and 768 px the required transport remained visible while holding 42.350s. A native two-line caption stayed inside the picture with the settings below it. Escape restored focus inline and during document fullscreen. Selecting 0.75× changed native playback rate and returned focus to Settings. Long Arabic QA strings fit both widths with the rail still left-to-right.
- Home and End reached the VOD bounds. A real Chromium touch-emulation tap sought near 19s and Return landed at 42.350s. Paused, playing and ended paths preserved intent. Stay cleared without seeking and focus returned to Keep.
- Controlled provider fixtures covered malformed durations, finite live classification, empty and moving seekable ranges, disjoint buffers, rejected seeks, manual-seek precedence and a stale completion after reloading the same URL. A preserved mark could be retried. The source-reload test also exercised real loading. Empty media and a removed caption track were checked separately.
- Physical-device, desktop WebKit, screen-reader and human discovery checks remain open.
