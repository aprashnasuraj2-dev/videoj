# SUTRA session 0017 implementation evidence — reusable player controls and media-error coverage

- Observed: 2026-11-23T17:59:22+05:45.
- Tested SUTRA source candidate: `b8ef8baef4ff8176eb13290e021e9db50b4c8a7a`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45171777112
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45171777094
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45171777302
- Scope: Phase 042 control/focus/media-error work. No original lesson footage or physical-device claim.

## SUTRA adapter boundary

`apps/sutra/src/player-adapter.js` remains a thin host boundary over `createDhagoPlayer` and native media state.

The adapter now forwards host-provided:

- source;
- compatibility source;
- fallback URL;
- poster;
- chapters;
- captions.

It also exposes bounded host helpers for source replacement, volume and caption mode without importing preview/demo or DETOUR code.

## Browser-observed controls

On the 8-second synthetic timing fixture, Chromium observes the actual shipped custom elements and native media state:

- the DHAGO play control starts playback and a second activation pauses it;
- the mute control changes the native `muted` property and restores it;
- ArrowDown on the real volume slider reduces native `volume`;
- the caption control changes the actual caption TextTrack to `showing` and then off;
- the validated timing cue seek lands within the existing one-second tolerance and reads actual `currentTime`;
- the same mounted media element can load a replacement URL, receives fresh `loadedmetadata`, retains the player controls and still reports the expected 8-second duration.

## Fullscreen boundary

A first attempt required real fullscreen in headless Chromium and timed out:

https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45170786460

That failure is retained. Headless fullscreen availability is a browser/platform limitation and is not converted into a false visual-fullscreen success claim.

The corrected SUTRA test uses a controlled Fullscreen API shim and activates the **real shipped `media-fullscreen-button`** twice. It verifies the control dispatches `requestFullscreen()` and then `exitFullscreen()`.

Separately, the reusable DHAGO root suite contains real browser fullscreen tests, including `tests/dhago-fullscreen-geometry.spec.ts`, which enters fullscreen and checks control geometry at 1280×800, 1920×1080 and 667×375. That component evidence supports the player control itself; it is not substituted for future physical SUTRA-device acceptance.

## Media error and retry surface

At the end of the SUTRA browser journey, Chromium replaces the media source with deliberately invalid MP4 bytes, observes the native media `error`, and verifies the shipped `.dhago-retry` control is visible.

The reusable player itself performs a deliberate user retry by closing the error dialog, calling `video.load()`, and focusing the play control. Existing DHAGO deep tests also exercise explicit recovery after an aborted media request.

## 360px and focus

At a 360×800 viewport, SUTRA verifies:

- document width does not exceed the viewport;
- play, mute, captions and fullscreen controls remain inside the viewport;
- each remains programmatically/keyboard focusable.

The player remains independent of model/agent state.

## Retained build-test failure

A later candidate added a structural adapter test but initially matched the adapter's explanatory comment “No imports from apps/preview or DETOUR” and failed its own negative regex. The implementation was not coupled to those modules.

The failed candidate is retained in run **45171517257**. The corrected test inspects actual import lines only; final candidate `b8ef8ba...` passes the complete shell/Chromium workflow above.

## Missing-codec limit

SUTRA does **not** yet have a genuine alternate-codec fixture proving the `compatibilitySource` branch under a browser that cannot decode the primary H.264 source.

The reusable player contains the capability-selection mechanism (H.264 probe, WebM probe, compatibility source selection), and SUTRA forwards the option, but component mechanism is not system acceptance.

Therefore P042-06 remains open for the missing-decode case even though source replacement and native media-error handling are now demonstrated.

## Checklist interpretation

Current evidence supports:

- **P042-05** — ordinary play, pause, volume/mute, seek and captions are actual native behavior; fullscreen control dispatch is observed, with headless visual-fullscreen limitation explicitly retained and reusable real-fullscreen component tests separately identified.
- **P042-08** — SUTRA host styles preserve core player focus and 360px control geometry.
- **P042-09** — this revision-linked adapter/control/error artifact.

P042-06 and P042-10 remain open. Phase 042 does not close.
