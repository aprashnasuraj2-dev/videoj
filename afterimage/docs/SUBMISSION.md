# AFTERIMAGE submission packet

This file is form-ready copy and evidence pointers for the Video.js v10 skin challenge. It deliberately separates demonstrated behavior from optional bonus work.

## Public candidate

- URL: https://afterimage.aafnaipatro.com/
- Video.js: v10.4.0
- Serving source: `f0bed46afe912b43af657841b0a2897742e9f4ff`
- Runtime marker: `0.3.3-webkit-handoff`
- Film: **The Waterline**, 18-second original matched-camera proof

## Short design description

**AFTERIMAGE turns time into a spatial layer.** A viewer pins a real decoded frame while the film keeps running; the earlier image stays registered to the current picture, and one seam reveals what changed without opening a second player or hijacking normal transport.

The Waterline makes the idea readable immediately: the same locked architecture is dry at 00:05 and wet at 00:13. Copper marks the remembered frame; pale blue marks the live playhead. Manual pinning never seeks, pauses, or reloads media. **Try a comparison** is the single authored shortcut and intentionally seeks to one demonstrated pair before handing control back to the same reusable Temporal Lens.

The skin is built around host-owned Video.js v10 media rather than demo-specific playback logic. It includes captions, signed time deltas, keyboard range semantics, 44px primary targets, reduced-motion behavior, forced-colors treatment, dual-codec WebM/MP4 delivery, bounded frame capture, and clean teardown.

## Judge-visible engineering evidence

- Exact public release passed Chromium, Firefox and WebKit in browser matrix run `43801027232`.
- At 240px: no horizontal overflow; every visible primary target is at least 44px.
- Keyboard control text contrast: 14.80:1; focus outline contrast: 12.07:1.
- Authored keyboard flow reaches the reveal slider and restores focus correctly after Escape in all three engines.
- 20 repeated pins reuse one 919,601-pixel canvas (~3.68MB raw RGBA) rather than growing buffers.
- First observed capture latency in the stress probe: 41ms Chromium, 59ms Firefox, 79ms WebKit.
- Comparison/seam operations added zero pause, seek, waiting, or stalled events in all three engines.
- Repeated pin and seam operations generated zero application fetch/XHR requests.

## Primary visual

Use the split matched pair showing:

- Pinned: **00:05**
- Now: **00:13**
- Interval: **+00:08**
- Seam near center
- Limestone gauge, circular inspection opening, and copper gate simultaneously visible

The dedicated submission-capture workflow exports:
- `afterimage-primary-still.png`
- `afterimage-submission-page.png`
- `afterimage-mobile-390.png`
- `afterimage-submission-reel.mp4`
- `capture-report.json`
- `reel-report.json`

## Reel intent

The reel is recorded directly from the exact public candidate and is designed to remain understandable with audio off. Sequence: identity → ordinary playback → authored 00:05/00:13 pair → real pointer seam drag → Pinned/Now/Split presets → captions → Close/Compare → resume → Clear → final matched pair.

## Claims not to make yet

Do not claim Mux bonus, live-site bonus, physical-phone testing, screen-reader testing, native fullscreen verification, or signed-in form acceptance until separately evidenced.
