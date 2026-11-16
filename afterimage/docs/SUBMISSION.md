# AFTERIMAGE submission packet

## Recommended Contra fields

**Public URL**  
https://afterimage.aafnaipatro.com/

**Short design description**

AFTERIMAGE makes elapsed time visible without replacing the normal player. A viewer pins one real decoded frame while the Video.js playhead remains conventional; the remembered frame stays registered over the moving picture, a copper mark records its origin on the real seek rail, and one seam reveals past against present with a signed interval and Pinned / Split / Now views.

THE WATERLINE makes the mechanism readable immediately: the same locked architecture is dry at 00:05 and wet at 00:13. This is not a pre-rendered split screen—the viewer can pin an arbitrary eligible VOD frame, move the reveal without seeking, close and reopen the comparison, or clear it while ordinary playback controls remain independent.

Accessibility is part of the mechanism rather than an afterthought: 44px primary targets, keyboard operation and deterministic focus return, high-contrast focus, touch/scroll recovery, reduced-motion behavior, real WebVTT captions that remain readable above the pinned canvas and in wrapper fullscreen, and a base package export that works without Temporal Lens.

## Primary visual

**Recommended:** `afterimage-primary-still.png` from GitHub Actions artifact **14209146581** / run **43831838485**.

Observed final state:

- 1181×812 PNG
- 1,005,556 bytes
- SHA-256 `3787cf177be243260f1b15331dc28e96e9be1512e4414ca11a0bf263d2a3e6ff`
- Pinned **00:05**
- Now **00:13**
- Interval **+00:08**
- centered 50% seam
- exact playing-frame pin, not an approximate paused capture
- captions intentionally off for the clean hero

**Wide alternate:** `afterimage-submission-page.png` — 1280×720, 873,581 bytes, SHA-256 `9b010ec8bf1f5a22747fc05f080d40b09c853c7f4f8899816fc19f9285de683d`.

If the signed-in form crops aggressively to a landscape frame, prefer the 1280×720 alternate. If it preserves the uploaded aspect ratio, use the tighter primary player crop.

## Revised submission reel

Use `afterimage-submission-reel.mp4` from artifact **14209146581**.

- **28.60 seconds**
- **3,007,617 bytes**
- **1280×720**
- H.264 / yuv420p / fast-start MP4
- intentionally audio-free
- SHA-256 `bec156851f76df79785ec48818bbaf6a8504b5d6967fe84c2c5ba8758d48da13`
- exact public release header `a01a62fa5ef8c75850d285656254bb741bd31061`
- runtime `0.3.10-control-fit`
- capture report: **14/14 checks passed**

Judge-facing sequence:

1. AFTERIMAGE identity and ordinary Video.js playback.
2. Real WebVTT captions enabled.
3. The authored 00:05 → 00:13 Temporal Lens comparison opens while playback continues.
4. Caption stays visually above the pinned canvas.
5. Real wrapper fullscreen keeps comparison + caption + controls together.
6. Fullscreen exits back to the same comparison.
7. Pointer seam movement and Pinned / Now / Split presets.
8. Keyboard Escape closes the comparison and visibly restores focus to Compare; Enter reopens it.
9. Clear returns to ordinary playback.
10. Clean exact 00:05 / 00:13 / +00:08 hero closes the reel.

The earlier 52.28-second reel is superseded.

## Supporting screenshots

All are in artifact **14209146581**.

| File | Size | Purpose |
| --- | ---: | --- |
| `afterimage-accessibility-comparison.png` | 1181×812 | Real active WebVTT cue over an open Temporal Lens comparison. |
| `afterimage-accessibility-fullscreen.png` | 1280×720 | Comparison + active cue + controls in real wrapper fullscreen. |
| `afterimage-keyboard-focus.png` | 1181×812 | Clean Escape → Compare focus restoration with the pin retained. |
| `afterimage-mobile-390.png` | 390×844 | Captioned comparison and controls at phone width with no horizontal overflow. |
| `afterimage-primary-still.png` | 1181×812 | Recommended exact matched-pair hero. |
| `afterimage-submission-page.png` | 1280×720 | Wide alternate primary visual. |

Detailed byte sizes and SHA-256 values are recorded in `submission-manifest.json` and `docs/SUBMISSION_ASSET_REPORT.md`.

## Bonus fields

**Mux public playback ID**  
`kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`

**Real live-site URL**  
https://aafnaipatro.com/on-this-day/afterimage/apollo-11/

The Apollo page demonstrates the reusable AFTERIMAGE skin with a different 46.94-second NASA Apollo 11 visualization delivered directly from Mux, its own lime host theme, Mux poster, captions, chapters and Aafnai Patro navigation. It intentionally omits the WATERLINE authored shortcut and proves manual, media-independent pinning.

The bonus page currently identifies the earlier compatible `2316dc7...` / `0.3.10-control-fit` skin build. Do **not** describe it as the exact `a01a62fa...` accessibility release. The primary competition URL is the accessibility-corrected release.

## Current release record

- Video.js: **v10.4.0**
- public candidate: https://afterimage.aafnaipatro.com/
- serving release header: `a01a62fa5ef8c75850d285656254bb741bd31061`
- runtime: `0.3.10-control-fit`
- verified accessibility product/test head: `6443599439c7d39728c0b582c6e433149f74d4ad`
- hardening run: **43827669182** — passed
- hardening artifact: **14207153589**
- official headed accessibility gate: **48/48**
- public Worker deployment: `c382985b-f3d9-44e0-8c35-a5e488095731`
- public Worker version: `5d408fca-2d53-4bf7-bbcc-d0bc050e8a46` at 100%
- prior public deployment `0b1d5abb-07ae-4c97-87e8-66512216bcfa` retained for rollback
- final revised submission capture: **43831838485**
- final revised capture artifact: **14209146581**

Public post-deploy checks observed HTTP 200 plus headers `x-afterimage-release: a01a62fa...` and `x-afterimage-accessibility: comparison-captions`. The public accessibility tree exposes named Play, Seek, Mute, Volume, Enable captions, Enter fullscreen, Try a comparison and Pin moment controls.

## Demonstrated engineering boundaries

The candidate has executable evidence for:

- ordinary Play/Pause, Seek/time, Mute/Volume, captions and Fullscreen;
- Chromium, Firefox and desktop Playwright WebKit regression coverage;
- keyboard-only comparison and deterministic focus restoration;
- touch reveal with vertical scrolling preserved;
- 240/320/390/768/1280 responsive coverage plus mobile landscape;
- reduced motion and Chromium forced-colors coverage;
- two simultaneous enhanced instances and repeated detach/reinsert lifecycle stress;
- stale frame/source work invalidation and failed re-pin retention;
- a real packed external consumer with unrelated host media;
- bounded one-canvas capture and no seam-generated seeking/network requests;
- the comparison-caption correction, including 16.61:1 measured inline/fullscreen caption contrast.

## What not to claim

Do not claim:

- physical iPhone Safari or Android Chrome testing;
- NVDA or VoiceOver testing;
- low-end-phone performance;
- numbered-frame accuracy tolerance;
- genuine tainted cross-origin / expired-provider failure coverage;
- separately throttled authored-seek network testing;
- signed-in Contra upload acceptance;
- verified submission status before the form shows confirmation.

Browser accessibility-tree evidence and Playwright keyboard checks support semantics, but they are not substitutes for real assistive-technology sessions.

## Remaining account action

Open the signed-in Contra challenge form, select the visual, paste the public URL and short description above, add the Mux playback ID and Apollo live-site URL where available, attach the revised 28.60-second reel if the form exposes a video/media field, review the preview, and submit.

After successful submission, record the confirmation/status without changing the serving release unless Contra exposes a real product defect. Keep the Mux asset live through judging.
