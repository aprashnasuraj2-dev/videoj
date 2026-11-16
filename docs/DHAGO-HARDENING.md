# DHAGO hardening ledger — post-submission enhancement only

Start: `fddbfdbc2ea9f9aa26bf3d72bac88b17a557b560` (remote `main` observed 2026-11-16).
Work branch: `dhago-hardening-20261116`. Submission entry, submission video and reports are frozen; neither DETOUR nor AFTERIMAGE is in scope.
Statuses: `done`, `in progress`, `blocked`, `open`. A code edit is not a browser pass.

## Evidence ledger

| ID | Verifiable gate | Status | Evidence or blocker |
|---|---|---|---|
| D001 | Identity and architecture: Baseline remote main SHA recorded | done | GitHub main at fddbfdbc2ea9f9aa26bf3d72bac88b17a557b560. |
| D002 | Identity and architecture: Protected woven timeline remains primary | open | No current-run executable evidence. |
| D003 | Identity and architecture: Actual WebVTT drives chapter cue model | open | No current-run executable evidence. |
| D004 | Identity and architecture: Real media currentTime drives active stage | open | No current-run executable evidence. |
| D005 | Identity and architecture: No DETOUR navigation concepts | open | No current-run executable evidence. |
| D006 | Identity and architecture: No AFTERIMAGE frame-comparison concepts | open | No current-run executable evidence. |
| D007 | Identity and architecture: Normal transport controls retained | open | No current-run executable evidence. |
| D008 | Identity and architecture: Studies in Thread remains demo-only | open | No current-run executable evidence. |
| D009 | Identity and architecture: Metadata optionality preserved | open | No current-run executable evidence. |
| D010 | Identity and architecture: Telemetry never fabricated | open | No current-run executable evidence. |
| D011 | Fullscreen: 1280x800 actual fullscreen geometry | open | No current-run executable evidence. |
| D012 | Fullscreen: 1920x1080 actual fullscreen geometry | open | No current-run executable evidence. |
| D013 | Fullscreen: Constrained laptop fullscreen geometry | open | No current-run executable evidence. |
| D014 | Fullscreen: Landscape mobile fullscreen behavior | blocked | Requires actual supported device/assistive technology; emulation is not equivalence. |
| D015 | Fullscreen: Woven ribbon visible and useful | open | No current-run executable evidence. |
| D016 | Fullscreen: Chapter map opens and navigates fullscreen | open | No current-run executable evidence. |
| D017 | Fullscreen: Captions render within media stage | open | No current-run executable evidence. |
| D018 | Fullscreen: Settings speed submenu works fullscreen | open | No current-run executable evidence. |
| D019 | Fullscreen: Focus returns after exit | open | No current-run executable evidence. |
| D020 | Fullscreen: Repeated fullscreen labels settle | open | No current-run executable evidence. |
| D021 | Fullscreen: No horizontal/player vertical overflow | open | No current-run executable evidence. |
| D022 | Fullscreen: Safe area and 200% text fullscreen | open | No current-run executable evidence. |
| D023 | Keyboard: Space and K play/pause | open | No current-run executable evidence. |
| D024 | Keyboard: J L and left right seek | open | No current-run executable evidence. |
| D025 | Keyboard: M toggles mute | open | No current-run executable evidence. |
| D026 | Keyboard: Up down volume outside overlays | open | No current-run executable evidence. |
| D027 | Keyboard: Digits seek proportionally | open | No current-run executable evidence. |
| D028 | Keyboard: Home End on native timeline | open | No current-run executable evidence. |
| D029 | Keyboard: Rate shortcuts work outside menus | open | No current-run executable evidence. |
| D030 | Keyboard: F fullscreen C captions I PiP | open | No current-run executable evidence. |
| D031 | Keyboard: Inputs and editable hosts exempt | open | No current-run executable evidence. |
| D032 | Keyboard: Settings submenu consumes keys | open | No current-run executable evidence. |
| D033 | Keyboard: Caption menu consumes keys | open | No current-run executable evidence. |
| D034 | Keyboard: Error dialog consumes keys | open | No current-run executable evidence. |
| D035 | Keyboard: Chapter map Up Down focus movement | in progress | Implementation 5c78c169; Playwright test 258dcd81, pending CI/browser execution. |
| D036 | Keyboard: Chapter map Home End focus movement | in progress | Implementation 5c78c169; Playwright test 258dcd81, pending CI/browser execution. |
| D037 | Keyboard: Chapter map Enter Space activation | in progress | Implementation 5c78c169; Playwright test 258dcd81, pending CI/browser execution. |
| D038 | Keyboard: Chapter map Escape focus return | in progress | Implementation 5c78c169; Playwright test 258dcd81, pending CI/browser execution. |
| D039 | Keyboard: Visible focus follows visual order | open | No current-run executable evidence. |
| D040 | Caption and accessibility: Native WebVTT remains native | open | No current-run executable evidence. |
| D041 | Caption and accessibility: Multiline captions near control shelf | open | No current-run executable evidence. |
| D042 | Caption and accessibility: Caption state survives fullscreen | open | No current-run executable evidence. |
| D043 | Caption and accessibility: Caption track mode survives exit | open | No current-run executable evidence. |
| D044 | Caption and accessibility: 200% text at 320px | open | No current-run executable evidence. |
| D045 | Caption and accessibility: 200% text at 375px | open | No current-run executable evidence. |
| D046 | Caption and accessibility: 200% text at 390px | open | No current-run executable evidence. |
| D047 | Caption and accessibility: 200% text at 768px | open | No current-run executable evidence. |
| D048 | Caption and accessibility: Forced colors control legibility | open | No current-run executable evidence. |
| D049 | Caption and accessibility: Reduced motion preserves functionality | open | No current-run executable evidence. |
| D050 | Caption and accessibility: Keyboard focus contrast measurable | open | No current-run executable evidence. |
| D051 | Caption and accessibility: 44px actionable targets checked | open | No current-run executable evidence. |
| D052 | Caption and accessibility: Deployed accessibility tree captured | open | No current-run executable evidence. |
| D053 | Caption and accessibility: Physical VoiceOver validation | blocked | Requires actual supported device/assistive technology; emulation is not equivalence. |
| D054 | Caption and accessibility: Physical NVDA validation | blocked | Requires actual supported device/assistive technology; emulation is not equivalence. |
| D055 | Lifecycle and isolation: 20 mount/remove/remount cycles | open | No current-run executable evidence. |
| D056 | Lifecycle and isolation: Teardown during metadata loading | open | No current-run executable evidence. |
| D057 | Lifecycle and isolation: Teardown during text track loading | open | No current-run executable evidence. |
| D058 | Lifecycle and isolation: Teardown during playback | open | No current-run executable evidence. |
| D059 | Lifecycle and isolation: Teardown during seeking | open | No current-run executable evidence. |
| D060 | Lifecycle and isolation: Teardown during chapter map open | open | No current-run executable evidence. |
| D061 | Lifecycle and isolation: A to B MP4 replacement | open | No current-run executable evidence. |
| D062 | Lifecycle and isolation: Same URL reload epoch | open | No current-run executable evidence. |
| D063 | Lifecycle and isolation: Invalid source and recovery | open | No current-run executable evidence. |
| D064 | Lifecycle and isolation: Mux to MP4 transition | open | No current-run executable evidence. |
| D065 | Lifecycle and isolation: MP4 to Mux transition | open | No current-run executable evidence. |
| D066 | Lifecycle and isolation: Old sampled weave cleared | open | No current-run executable evidence. |
| D067 | Lifecycle and isolation: Old chapter list cleared | open | No current-run executable evidence. |
| D068 | Lifecycle and isolation: Old metadata lanes cleared | open | No current-run executable evidence. |
| D069 | Lifecycle and isolation: Old telemetry cleared | open | No current-run executable evidence. |
| D070 | Lifecycle and isolation: Two simultaneous isolated players | open | No current-run executable evidence. |
| D071 | Lifecycle and isolation: Destroy A while B plays | open | No current-run executable evidence. |
| D072 | Lifecycle and isolation: Remount A without affecting B | open | No current-run executable evidence. |
| D073 | Touch media and recovery: True pointer horizontal scrub | open | No current-run executable evidence. |
| D074 | Touch media and recovery: Touchcancel clears dragging | open | No current-run executable evidence. |
| D075 | Touch media and recovery: Vertical scroll unaffected | open | No current-run executable evidence. |
| D076 | Touch media and recovery: Chapter list scroll does not seek | open | No current-run executable evidence. |
| D077 | Touch media and recovery: Settings gesture isolation | open | No current-run executable evidence. |
| D078 | Touch media and recovery: Chapter map gesture isolation | open | No current-run executable evidence. |
| D079 | Touch media and recovery: Double tap video seeks only as designed | open | No current-run executable evidence. |
| D080 | Touch media and recovery: Double tap center behavior | open | No current-run executable evidence. |
| D081 | Touch media and recovery: User initiated retry success | open | No current-run executable evidence. |
| D082 | Touch media and recovery: Retry failure remains truthful | open | No current-run executable evidence. |
| D083 | Touch media and recovery: Fallback link conditional | open | No current-run executable evidence. |
| D084 | Touch media and recovery: Error dialog focus restoration | open | No current-run executable evidence. |
| D085 | Touch media and recovery: Audio-only graceful mode | open | No current-run executable evidence. |
| D086 | Touch media and recovery: No-chapter linear timeline | open | No current-run executable evidence. |
| D087 | Touch media and recovery: Gapped and overlapping VTT cues | open | No current-run executable evidence. |
| D088 | Touch media and recovery: 120 chapter cap truthful | open | No current-run executable evidence. |
| D089 | Touch media and recovery: Long RTL chapter labels | open | No current-run executable evidence. |
| D090 | Touch media and recovery: Unknown and ten-hour durations | open | No current-run executable evidence. |
| D091 | Portability performance release: External host without sampled weave | open | No current-run executable evidence. |
| D092 | Portability performance release: External host with sampled weave | open | No current-run executable evidence. |
| D093 | Portability performance release: Independent media and VTT host | open | No current-run executable evidence. |
| D094 | Portability performance release: No demo-origin dependency | open | No current-run executable evidence. |
| D095 | Portability performance release: Mux public playback ID only | open | No current-run executable evidence. |
| D096 | Portability performance release: Host text rendered safely | open | No current-run executable evidence. |
| D097 | Portability performance release: No credentials shipped to browser | open | No current-run executable evidence. |
| D098 | Portability performance release: Production JS and gzip measured | open | No current-run executable evidence. |
| D099 | Portability performance release: CSS bytes measured | open | No current-run executable evidence. |
| D100 | Portability performance release: DOM nodes measured | open | No current-run executable evidence. |
| D101 | Portability performance release: Mount performance measured | open | No current-run executable evidence. |
| D102 | Portability performance release: Chapter layout cost measured | open | No current-run executable evidence. |
| D103 | Portability performance release: Seek drag scripting measured | open | No current-run executable evidence. |
| D104 | Portability performance release: Long tasks over 50ms measured | open | No current-run executable evidence. |
| D105 | Portability performance release: 20-remount memory trend measured | open | No current-run executable evidence. |
| D106 | Portability performance release: Cross-engine Chromium pass | open | No current-run executable evidence. |
| D107 | Portability performance release: Cross-engine Firefox pass | open | No current-run executable evidence. |
| D108 | Portability performance release: Cross-engine WebKit pass | open | No current-run executable evidence. |
| D109 | Portability performance release: Anonymous public release smoke | open | No current-run executable evidence. |
| D110 | Portability performance release: Rollback revision identified | open | No current-run executable evidence. |

## Promotion gate

No live deployment unless real DHAGO product behavior has changed materially, exact candidate build/typecheck and relevant browser gates pass, serving revision is verified, and rollback exists.

## Source checks already performed

- `src/create-player.ts` confirms one true WebVTT-backed chapter model, native `media-time-slider`, optional sampled weave, dynamically imported Mux adapter.
- Original chapter list implemented Escape but not explicit Up/Down/Home/End; targeted fix is on the isolated branch.
- Existing tests in `tests/player.spec.ts` cover normal playback, captions, error dialog, basic fullscreen and narrow layouts, but those checks do not establish complete matrix coverage.
- Public origin could not be fetched by the available web interface; public serving identity and accessibility tree remain unverified.

## Latest reconciliation

No submission assets changed. No public deployment made. Follow each test with actual run URL/ID; never mark unexecuted gates done.
