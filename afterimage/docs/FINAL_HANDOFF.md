# AFTERIMAGE final submission handoff

## Current challenge state

The recorded challenge deadline is **2026-11-17 07:59 UTC** (Nov 16 11:59 p.m. PST / Nov 17 1:44 p.m. NPT). Required submission material remains a public Video.js v10 player URL, a visual and a short design description. Minimum player expectations are Play/Pause, Seek, time, Volume/Mute, Fullscreen, responsive layout and keyboard operation. Bonus evidence is a public Mux playback ID plus a real live site using the skin.

## Serving candidate — current source of truth

The earlier public freeze was superseded only for the verified comparison-caption accessibility defect. The competition URL did not change.

- URL: https://afterimage.aafnaipatro.com/
- serving release header: `a01a62fa5ef8c75850d285656254bb741bd31061`
- runtime: `0.3.10-control-fit`
- verified accessibility product/test head: `6443599439c7d39728c0b582c6e433149f74d4ad`
- hardening run: **43827669182** — pass
- hardening artifact: **14207153589**
- headed official accessibility gate: **48/48**
- Worker: `afterimage-preview`
- deployment: `c382985b-f3d9-44e0-8c35-a5e488095731`
- Worker version: `5d408fca-2d53-4bf7-bbcc-d0bc050e8a46` at 100%
- rollback: prior deployment `0b1d5abb-07ae-4c97-87e8-66512216bcfa`

Public verification observed HTTP 200 plus `x-afterimage-release: a01a62fa...` and `x-afterimage-accessibility: comparison-captions`. The public accessibility tree exposes named Play, Seek, Mute, Volume, captions, Fullscreen, Try a comparison and Pin moment controls.

## Exact form-ready handoff

1. **URL** — https://afterimage.aafnaipatro.com/
2. **Primary visual** — `afterimage-primary-still.png` from artifact **14209146581**.
3. **Wide alternate visual** — `afterimage-submission-page.png` from the same artifact.
4. **Description** — use the recommended short design description in `docs/SUBMISSION.md`.
5. **Mux playback ID** — `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`.
6. **Real live-site URL** — https://aafnaipatro.com/on-this-day/afterimage/apollo-11/
7. **Optional video/media field** — `afterimage-submission-reel.mp4` from artifact **14209146581**.

## Final judge-facing assets

Final revised capture:

- run: **43831838485**
- artifact: **14209146581**
- capture script head: `8a6ba307821a39fcb5c9ca5d5340d31b7b727d3b`
- release captured: `a01a62fa5ef8c75850d285656254bb741bd31061`
- capture assertions: **14/14 passed**

### Primary still

`afterimage-primary-still.png`

- 1181×812
- 1,005,556 bytes
- SHA-256 `3787cf177be243260f1b15331dc28e96e9be1512e4414ca11a0bf263d2a3e6ff`
- exact Pinned 00:05 / Now 00:13 / +00:08
- 50% seam
- exact playing-frame pin
- clean caption-off hero

### Revised reel

`afterimage-submission-reel.mp4`

- 28.60 seconds
- 3,007,617 bytes
- 1280×720
- H.264 / yuv420p / fast-start
- no audio
- SHA-256 `bec156851f76df79785ec48818bbaf6a8504b5d6967fe84c2c5ba8758d48da13`

The old 52.28-second reel is superseded.

### Supporting screenshots

- `afterimage-accessibility-comparison.png` — active real cue over the open Temporal Lens.
- `afterimage-accessibility-fullscreen.png` — real wrapper fullscreen with comparison + caption + controls.
- `afterimage-keyboard-focus.png` — clean Escape → Compare focus restoration.
- `afterimage-mobile-390.png` — captioned comparison at 390×844 without horizontal overflow.
- `afterimage-submission-page.png` — 1280×720 wide primary alternate.

Complete sizes, hashes and visual-review notes: `docs/SUBMISSION_ASSET_REPORT.md`.

## Evidence ledger

| Gate | Run / evidence | Result |
| --- | --- | --- |
| Earlier exact product CI | 43810424989 | pass |
| Keyboard + touch/race + judge first-use | 43810603770 | pass |
| Chromium / Firefox / WebKit release matrix | 43810610298 | pass |
| Headed fullscreen label settlement | 43812044536 | pass |
| Final lifecycle/package/difficult-media hardening | 43827669182 | pass |
| Comparison-caption inline/fullscreen accessibility | 43827669182 | pass, 48/48 official headed checks |
| Public post-deploy release/accessibility headers | Cloudflare Browser Rendering | pass |
| Public accessibility tree | Cloudflare Browser Rendering | named standard + signature controls present |
| Revised submission capture | 43831838485 | pass, 14/14 capture assertions |
| Apollo / Mux live-site proof | 43810653422 | pass |

## Accessibility correction now visible to judges

Temporal Lens intentionally places a pinned canvas above the moving video. That could obscure the browser-painted native cue on the pinned side.

The serving correction:

- keeps the genuine WebVTT track in `showing` mode;
- mirrors only the active real cue into an `aria-hidden` visual layer above the pinned canvas;
- suppresses duplicate native visual cue paint only while comparison is open;
- restores native cue paint immediately when comparison closes;
- preserves playback, seek, pin, seam and focus semantics.

Measured comparison-caption contrast is **16.61:1** inline and in wrapper fullscreen.

This is browser/runtime accessibility evidence. Physical iPhone/Android and NVDA/VoiceOver remain unclaimed.

## Bonus proof

The Apollo page still demonstrates the reusable AFTERIMAGE skin with:

- direct `stream.mux.com` playback;
- public playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`;
- a different 46.94-second NASA Apollo 11 visualization;
- host lime theme;
- Mux poster;
- host captions and chapters;
- Aafnai Patro navigation and NASA attribution;
- manual pinning without the WATERLINE authored shortcut.

Important release distinction: the Apollo page currently reports the earlier compatible `2316dc7...` / `0.3.10-control-fit` build. It proves reuse/live-site integration, but it is **not** represented as the exact primary `a01a62fa...` accessibility release.

## Rollback

Primary `afterimage-preview` deployment history is isolated from DHAGO, DETOUR and apex Patro routing.

Current:
- `c382985b-f3d9-44e0-8c35-a5e488095731`
- version `5d408fca-2d53-4bf7-bbcc-d0bc050e8a46`

Immediate predecessor retained:
- `0b1d5abb-07ae-4c97-87e8-66512216bcfa`
- version `05caf0d5-26c7-432a-abbf-ed77fe092e6b`

Do not alter DETOUR, DHAGO or general Aafnai Patro routes to roll back AFTERIMAGE.

## Remaining external gates

Still not claimed:

- signed-in Contra uploader acceptance for the chosen visual/video;
- submission confirmation/status;
- physical iPhone Safari;
- physical Android Chrome;
- NVDA;
- VoiceOver;
- low-end-phone performance;
- numbered-frame tolerance;
- genuine tainted cross-origin / expired-provider failure;
- separately throttled authored-seek network testing.

## Next action

Use the exact form-ready fields and artifact **14209146581**. Complete the signed-in form, verify the preview, submit, then record the confirmation/status. No further player or capture changes are justified unless that form or the live URL exposes a concrete defect.

Keep the Mux asset live through judging.
