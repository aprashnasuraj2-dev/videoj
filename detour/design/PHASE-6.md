# Phase 6 — core player implementation

## 2026-11-15 verified core gates

Executable baseline: `524bac5fb73aaf0568e559c4e08342137c443da7`, GitHub Actions [run 43692857813](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43692857813). Environment: GitHub-hosted Ubuntu, Node 24, pinned Video.js HTML 10.4.0, Playwright 1.62.1, Chromium and desktop WebKit.

| Step | Evidence | Result |
| --- | --- | --- |
| 051 shell | Packed `detour-video-skin/base` imports only the ordinary shell; `detour-place` is neither registered nor mounted. Play/seek/time/mute/captions/fullscreen and a compact 360px load pass in the fresh consumer. | Pass |
| 055 Stay/cancel | Stay preserves current time and restores the base action. A controlled delayed Return is cancelled, Stay dismisses the mark, and resolving the old promise cannot reopen it. Source replacement also invalidates stale work. | Pass |
| 056 buffering/errors | Held HTTP loading, provider waiting, real measured buffered ranges with an unpainted gap, 404/retry, rejected Return and retry through the still-valid Return action all pass. | Pass |
| 057 tracks/metadata | Real VTT captions toggle; removing captions hides the control; chapterless playback is unchanged; a generated 64-cue chapters track adds no cosmetic rail markers. | Pass |
| 059 lifecycle | 20/20 pending-Return remove/reinsert cycles leave zero held markers and zero tracked 8s deadlines. A final counted Return dispatch is exactly one, ruling out duplicate handler accumulation in the tested path. | Pass |
| 060 outside-demo core | Fresh `npm pack` consumer owns its MP4/VTT, mounts two isolated DETOUR instances, and runs hold → multi-seek → Return, Stay, play/pause, mute, rate and captions in Chromium and desktop WebKit. Packed Return arrival is 42.350s in both. | Pass |

The same run reports **5/5 architecture tests, 3/3 packed-consumer tests, 17/17 full Chromium scenarios, and 10/10 focused desktop-WebKit Return attempts at 42.350s**.

## 2026-11-15 step 058 mobile-UA and transport reconciliation

Desktop Chromium and desktop WebKit now pass packaged play/pause, seek/time, mute, caption, playback-rate, Settings Escape and focus-restoration behavior. Fullscreen is exercised when the runtime reports the Fullscreen API available; capability mismatch is rejected.

The checklist also asks to verify **mobile user-agent volume behavior while keeping mute operable**. A narrow desktop viewport is not equivalent to that evidence, and desktop WebKit is not a physical iPhone/Safari test. The packaged external-host suite now contains `proveMobileWebKitBase()`: it launches Linux Playwright WebKit with the iPhone 13 UA/viewport/device-scale/mobile/touch descriptor, records `store.volumeAvailability` and `store.mutedAvailability`, verifies `mutedAvailability === 'available'`, accepts only `available` or `unsupported` volume capability, checks the unavailable slider state or an actual supported volume set as appropriate, then toggles native `video.muted` true and false. The test was successful in [GitHub Actions run 43693510683](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43693510683) at `15bd747d57285eb7be236577aff7b41e688cc6fc`.

**Evidence boundary:** Linux WebKit with an emulated iPhone descriptor can still report `maxTouchPoints=0`; this test is a browser-UA/capability test, not a physical touch or iOS Safari session. Full native-device QA remains open in Phase 7. With the earlier desktop external-host suite covering all normal controls and capability-aware fullscreen, step 058 is now verified to its software integration scope. This reconciles the prior checkpoint's open status without inventing physical-device coverage.

## Limits

This phase does not close physical-device Safari/mobile, assistive-technology, performance, public-host or optional Mux-HLS gates. Those remain later phases. The Phase 6 tests prove core software behavior in the named automated environments only.
