# Evidence ledger

Use one row per material result. Include the source SHA, browser and OS or device, date, observed result and a link to the exact test, trace or media. Status values: Pending, Pass, Fail, Blocked, and Not tested. A passing parser or emulation check is evidence only for that check.

| Capability | Acceptance steps | Status | Revision, environment, artifact |
| --- | --- | --- | --- |
| Signature discovery and first successful return | 012, 017, 018, 090 | Partial | [Controlled crops](../design/PHASE-2.md#visual-signature) and browser trace. Uncoached viewer results remain open. |
| Held origin survives multiple real seeks; Return lands; Stay does not seek | 043, 052–055, 060 | Pass in core automated gate | Packed Chromium/WebKit return and Stay pass; stale completion after actual dismissal cannot reopen the mark. |
| Source swap, stale event, duplicate input and retry | 059, 067–068 | Core lifecycle pass; later QA still open | Same-element reload, stale provider guards and 20/20 pending-return remount cycles pass with zero tracked deadline leaks and one final Return dispatch. |
| Genuine playback and all essential controls | 051, 058, 070, 092–093 | Partial | Base-only packed shell and desktop Chromium/WebKit transport/settings pass. Step 058 mobile-UA volume/mute evidence and later physical-device QA remain open. |
| Narrow embeds, real mobile, keyboard, assistive tech and contrast | 035, 038, 061–066, 070 | Partial | [Visual grid and contrast](../design/PHASE-4.md). Physical-device and assistive-technology sessions remain open. |
| Core payload and interaction performance relative to Scaffold | 069 | Pending | |
| Same skin on arbitrary replacement media | 060, 074 | Core packed-host pass; broader later integration gate pending | Fresh tarball consumer supplies its own MP4/VTT, two isolated instances, signature path, Stay and ordinary controls in Chromium/WebKit. |
| Authentic wide, mobile and interaction captures | 082–089 | Pending | |
| Public bonus playback and fallback, if claimed | 075–077, 097 | Pending | |
| Genuine second context, if claimed | 078, 097 | Pending | |

For functional tests, record current and held times before and after, playback mode, and the source identity where relevant. For a failed capability, record the environment and smallest reproducible sequence. Keep public images and clips matched to their source build. Do not copy DHAGO's prior results into the DETOUR evidence column.

## 2026-11-15 Phase 6 core implementation checkpoint

- Source: `524bac5fb73aaf0568e559c4e08342137c443da7`; GitHub Actions run 43692857813. **5/5 architecture**, **3/3 packed consumer**, **17/17 Chromium**, and **10/10 focused desktop-WebKit Return** checks passed.
- The packed `./base` entry proves ordinary shell playback without held-place registration. The full packed entry independently mounts two host-owned players; both desktop engines return to 42.350s and run Stay, play/pause, mute, captions, rate and settings focus paths.
- Lifecycle stress: **20/20** pending Return remounts clear the marker, stale promise effect and tracked 8-second deadline. The post-loop counted Return dispatch equals one.
- Failure/metadata evidence includes observed loading/waiting, measured buffered gaps, 404/retry, rejected Return with the mark retained, stale completion after Stay dismissal, no-caption fallback, and a 64-cue chapters track that leaves the rail at its normal two children.
- Step 058 is intentionally not claimed complete: mobile user-agent volume behavior remains to be recorded. Desktop WebKit is not physical Safari/iPhone.

## 2026-11-15 Phase 5 package and cross-engine proof

- Source: `012482415ecb706d246646f0f9b95dbe780d91dc`. Environment: GitHub-hosted Ubuntu, Node 24, pinned `@videojs/html` 10.4.0, Playwright 1.62.1, Chromium and desktop WebKit. [GitHub Actions run 43691495087](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43691495087) completed successfully.
- Architecture suite: **4/4 pass**. It checks the demo/fixture/Mux import boundary, public Mux playback-ID validation, an AbortController-owned event lifecycle with no frame/poll loop, and host-scoped CSS/client credential seams.
- Packed consumer: **2/2 pass**. `npm pack` produced `detour-video-skin-0.1.0.tgz`; a fresh external package installed it, supplied its own generated 64-second MP4 and VTT, and mounted two players. The archive excludes demo, integration, tests, design, submission reports and fixture media.
- Cross-engine result: the packed host returned to **42.350s in Chromium and desktop WebKit**. Tests compared native `video.currentTime` with `player.store.state.currentTime` and exercised `player.store.seek`. Player A's mark never appeared on player B. Host captions loaded; explicit live and audio instances did not expose the held-place action.
- Reconnect regression: while Return was held in a controlled pending seek, `detour-place` disconnected and reconnected. The active attempt cleared, the button markup remained complete, and the next hold rendered a normal `Return to 00:42` label. A second whole player also survived remove/reappend and a subsequent seek.
- Full Chromium suite: **16/16 pass**. It includes the new 360×640 portrait fixture, a generated 64-cue chapters VTT, and a controlled 40,000-second duration rendering `Return to 10:00:42`, in addition to prior loading/error/retry/source/range/input cases. The focused desktop-WebKit test separately recorded **10/10 arrivals at 42.350s**.
- Limits: this is desktop WebKit on Linux, not physical Safari/iPhone. No screen-reader or uncoached-user claim is made. The optional Mux entry is proven as an isolated public-ID helper; this run did **not** play a Mux HLS asset. Registry publication and public-host qualification remain later gates.

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

## 2026-11-15 Phase 4 visual proof

- Source: the exact commit with this entry, the [built visual system](../skin/player.css) and the [browser suite](../tests/browser.test.mjs). Debian Linux, Chromium 143.0.7499.0 headless. Build and 15/15 scenarios passed.
- Actual player widths 240, 320, 375, 600, 768 and 1100 px. Geometry measured relative to the player. Core transport had no displacement on Keep, no target overlap and no clipped keyboard ring. Return and Stay retained 44 px targets. Long Arabic QA copy with an extended timestamp fit the 240 px embed.
- Tested actual range anchors near zero and the end, a closely spaced seek, motion reduced to none and emulated forced colors. Contrast tested against solid runtime CSS tokens. The weakest audited text pair was 7.12:1 and weakest component boundary pair 3.18:1.
- A held HTTP response exposed loading and the unavailable clock. A controlled decoder-wait state verified delayed buffer UI. Real playback exercised ended and replay. A 404 followed by native retry verified source recovery, and a rejected Return retained the labeled point.
- [Six player-only captures and a forced-colors sample](../design/PHASE-4.md#contrast-and-visual-evidence) record local design evidence. Desktop WebKit, physical devices, independent first-use results and public-release qualification remain pending.


## 2026-11-15 Phase 7 responsive, difficult-state and browser-core acceptance

- Exact source: `9eeeb770b4f7cc7d7d5ba4c766095f05c2116be2`. [Actions run 43698982276](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43698982276) passed architecture, packed external consumer, full Chromium, full Firefox, full desktop WebKit, footprint and Phase 7 probe suites.
- Capture artifact **14155597667** (SHA-256 `ff23070578f510008a8c499e5607fceb88745fb576621d7da805467cefdb6151`) contains the responsive evidence. Representative 240px held/settings/pending, 1280px settings, forced-colors, CSS 200%-layout and long Arabic 9:59:59 captures were visually inspected after download.
- WebKit Home/End was a real regression found during this phase. The final fix routes boundary keys through the actual player store at the final decodable frame; exact-head snapshots were 63.95/64.00s in Chromium, Firefox and WebKit.
- Direct hard-state probes pass: duration/range changes preserve truthful mark position and disable out-of-range Return; duplicate Return dispatches once; manual seek wins; source replacement clears state; a real 8s timeout keeps the mark and ignores late completion; pausing during a provider waiting state prevents later Return from resuming playback.
- Performance: enhanced-vs-base import-graph gzip delta **1,815 bytes**, below the 15 KiB gate. Five fresh-context and five repeat-context 320px Chromium signature runs observed zero Long Tasks >50ms. CI records scripting/layout/task metrics; headless LayerTree did not produce a stable compositing-layer count, so no GPU-layer-cost claim is made.
- Checked 061, 063, 066, 067, 068, 069 and 070. **Not checked:** 062 physical devices, 064 real screen readers, 065 native browser zoom. Playwright emulation/CSS zoom are not presented as those missing sessions.


## 2026-11-15 Phase 8 media strategy and local bundle

- Source `87afdf6a740bbcce95caaa04e2c02886071c895c`, [Actions 43699914256](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43699914256).
- The selected showcase is a deterministic 56s in-repository FFmpeg composition, not external stock and not DHAGO media. It includes generated visual states, a low-level generated tone, a poster extracted from 42s, descriptive captions and a provenance manifest.
- The media suite passed 2/2. ffprobe confirms H.264/AAC 1280×720; the MP4 is fast-start; 18s and 42s frame hashes differ; a fresh browser mount seeks to 18.000s then 42.000s over local HTTP.
- Step 071 is verified. Step 072 remains pending until the same bundle plays and seeks from the eventual HTTPS public origin.


## 2026-11-15 Phase 8 judge demo and portability

- Source `34261f03c8df75bbeed847879de7269ab794fb55`; [Actions 43701045585](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43701045585).
- 073 passed on 320×640, 375×667 and 1280×900: player visible immediately, paused, no gate, correct showcase source/poster.
- 074 passed from the separately built `/integration/` entry using `daylight-study.mp4` and its own captions. The unchanged skin completed Hold 42.35 → arbitrary seek 18 → Return 42.350.
- The main showcase, independent host and Phase 7 QA fixture are now three separate host/media concerns; none requires a media-name branch inside the reusable skin.
