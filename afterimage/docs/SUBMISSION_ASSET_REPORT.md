# AFTERIMAGE revised submission asset report

## Decision

The prior 52.28-second submission reel and artifact `14200790244` are superseded.

Final accepted judge-facing capture:

- GitHub Actions run: **43831838485**
- artifact: **14209146581**
- capture script head: `8a6ba307821a39fcb5c9ca5d5340d31b7b727d3b`
- public release captured: `a01a62fa5ef8c75850d285656254bb741bd31061`
- runtime: `0.3.10-control-fit`
- capture report: **14/14 checks passed**
- public release stayed unchanged during capture

## Asset manifest

| Asset | Dimensions | Bytes | SHA-256 | Recommended use |
| --- | ---: | ---: | --- | --- |
| `afterimage-primary-still.png` | 1181×812 | 1,005,556 | `3787cf177be243260f1b15331dc28e96e9be1512e4414ca11a0bf263d2a3e6ff` | **Primary visual** when the form preserves aspect ratio. |
| `afterimage-submission-page.png` | 1280×720 | 873,581 | `9b010ec8bf1f5a22747fc05f080d40b09c853c7f4f8899816fc19f9285de683d` | Wide primary alternate. |
| `afterimage-accessibility-comparison.png` | 1181×812 | 987,512 | `4d04f6b54cd79caad6d9086c47eb599157145b75dc83c6c8ccfbf1de8bd907e7` | Caption-over-comparison evidence. |
| `afterimage-accessibility-fullscreen.png` | 1280×720 | 781,374 | `d819abc2e5ba163aa7940e03d98519b31cae5bb27ebf5ad5d6c6f8a103e488e5` | Fullscreen accessibility evidence. |
| `afterimage-keyboard-focus.png` | 1181×812 | 991,440 | `f0d54884f0c5bc6c8de092502b2dd63f1ae51c0251fcb27d5d09b80e2d5155b1` | Keyboard/focus support evidence. |
| `afterimage-mobile-390.png` | 390×844 | 220,787 | `7e5f8e8bd526c604acaf49e29c8dccef244bd975978341ce3ee3742cdc2c5962` | Mobile responsive evidence. |
| `afterimage-submission-reel.mp4` | 1280×720 | 3,007,617 | `bec156851f76df79785ec48818bbaf6a8504b5d6967fe84c2c5ba8758d48da13` | **Final support reel**. |
| `afterimage-submission-reel.webm` | 1280×720 | 3,175,900 | `74e99eba0c9f11fd70efc5072497b03559be5911f7b99edde4b3161068b868cb` | Raw browser recording / fallback. |
| `capture-report.json` | — | 5,715 | `3351d7bd1cd03b2b5bd5fdd9db40f38812cf0c47df843d22f0a130f89ef4a972` | Machine-readable capture assertions. |
| `reel-report.json` | — | 152 | `9cf74351f782817aa69ceb4edc01e777eb0557b4ea26a8d87b4cef9d10a0b580` | Duration/release record. |

## Primary visual review

The accepted `afterimage-primary-still.png` is a clean exact matched pair:

- Pinned **00:05**
- Now **00:13**
- Interval **+00:08**
- seam **50%**
- media paused only after the playing-frame pin completes
- no approximation marker
- captions off to keep the hero visually uncluttered
- conventional Play, Seek, time, Mute/Volume, Captions and Fullscreen remain visible
- the copper origin marker and pale current playhead are simultaneously readable

The image exposes the mechanism without relying on page copy: one fixed past frame, one current frame, one real timeline and one reveal seam.

## Accessibility screenshot review

### Inline comparison

`afterimage-accessibility-comparison.png` shows the real active WATERLINE cue above the pinned canvas while the comparison remains open. The underlying real WebVTT track stays in `showing` mode.

### Fullscreen

`afterimage-accessibility-fullscreen.png` shows the same comparison and active cue in real wrapper fullscreen with the complete control deck inside the 1280×720 viewport.

The hardened accessibility gate measured the comparison-caption foreground/background at **16.61:1** both inline and fullscreen.

### Keyboard

`afterimage-keyboard-focus.png` intentionally uses the cleaner Escape → Compare focus-restoration state. The earlier draft reel briefly exposed the native range visualization for the focused seam; that was valid accessibility UI but visually distracting, so it was removed from the judge-facing capture without removing the independently tested seam keyboard behavior.

### Mobile

`afterimage-mobile-390.png` shows the captioned comparison at a 390×844 viewport. The capture gate requires no horizontal document overflow and an active real cue mirrored above the comparison.

## Reel review

Final MP4:

- duration: **28.60s**
- size: **3.01MB**
- codec: H.264
- pixel format: yuv420p
- fast-start enabled
- audio: none
- resolution: 1280×720

The reel is deliberately shorter than the previous 52.28-second cut. It avoids repeating edge-case demonstrations already covered by executable evidence and keeps attention on the memorable behavior.

Visible flow:

1. identity;
2. ordinary playback;
3. captions;
4. matched temporal comparison;
5. comparison-caption proof;
6. real wrapper fullscreen;
7. seam movement;
8. Pinned / Now / Split;
9. keyboard Escape → Compare focus restoration;
10. keyboard reopen;
11. clear;
12. exact clean hero.

Frame review specifically checked that the earlier distracting seam-focus strip is not present in the accepted cut.

## Why these are stronger than the previous assets

The revised package improves the submission in four ways:

1. **Exact hero evidence** — the final pin is captured while playing, so the hero reads `00:05`, not `≈00:05`.
2. **Accessibility is visible** — comparison captions are demonstrated inline and in real fullscreen rather than merely claimed in a report.
3. **Shorter proof density** — 28.60s versus 52.28s while preserving the complete signature story.
4. **Cleaner keyboard presentation** — visible focus restoration is shown on the Compare action without letting an implementation-level range visualization dominate the frame.

## Remaining external constraint

The signed-in Contra form's exact image/video acceptance limits are still not exposed by the public challenge interface. The files are technically verified and ready, but checklist item 85 remains blocked until the actual signed-in uploader accepts the selected visual.

No submission confirmation is claimed.
