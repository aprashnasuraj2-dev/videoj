# SUTRA performance laboratory profile — 2026-11-24

This is a **laboratory CI measurement**, not a field/mobile-network benchmark or proof of internet-scale capacity.

## Exact tested revision

- Code revision: `e1122ec58c7a773b41e4470dc0139a897049f912`
- GitHub Actions run: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45294044575
- Job: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45294044575/job/138109800543
- Run completed: 2026-11-24T00:04:41Z
- Browser: Chromium Headless 151.0.7922.34
- Viewport: 1280 × 800 CSS px
- CDP network shaping: 1 Mbps download, 1 Mbps upload, 150 ms latency
- Public learner mode: static synthetic lesson, no paid model/provider request

## Observed measurements

| Measurement | Observed |
| --- | ---: |
| Gzipped static shell files excluding MP4/source maps | **393,302 bytes** |
| Transcript search usable after navigation start | **1,378 ms** |
| Encoded bytes observed when transcript became usable | **128,007 bytes** |
| MP4 requests before explicit viewer action | **0** |
| Video ready after explicit “Load synthetic timing fixture” | **3,448 ms** |
| Encoded bytes observed after video ready | **508,487 bytes** |
| Incremental encoded transfer after video action | **380,480 bytes** |
| MP4 encoded transfer reported by CDP | **8,502 bytes** |
| Native evidence-seek feedback | **64 ms** |

The shell target was <=700 KiB gzip. The measured 393,302 bytes are ~55% of that ceiling and conservatively include bundled learner/runtime JavaScript; the test excludes MP4 and source maps. The transcript target was <5 seconds under the stated 1 Mbps / 150 ms profile; observed time was 1.378 seconds.

## Mechanism

The source catalog transcript is mounted before the optional MP4 player. Searching and reading transcript cues does not initiate a media request. Selecting a cue before media load reports that native seek is unavailable instead of loading the video implicitly. Video transfer begins only after explicit viewer action.

Once media is loaded, the player verifies the downloaded bytes against the receipt-bound SHA-256 before mounting a Blob URL. The browser then uses actual native metadata/currentTime. The seek measurement is therefore an observed media operation, not a synthetic timer.

## Related failure and recovery evidence

The same exact CI revision passed:

- missing MP4 -> explicit unavailable state and manual retry;
- HTTP 200 with wrong/stale media bytes -> hash mismatch and no player mount;
- missing poster -> valid media/transcript remain usable;
- live/unknown-duration, empty/gapped seek ranges -> explicit non-seekable rejection;
- native play/pause, mute, volume, caption track, fullscreen and seek;
- 360 px horizontal-overflow check;
- 200% Chromium CSS zoom check;
- reduced-motion preference;
- offline startup and network-loss recovery.

## Limits

These numbers do **not** measure:

- a physical phone, cellular carrier or Wi-Fi radio;
- Firefox/Safari rendering or hardware decoding;
- production CDN/TLS/DNS latency;
- an original rights-cleared lesson;
- a real large video host;
- a live model call;
- a public peer/MCP origin;
- field Core Web Vitals.

The test intentionally reports the achieved numbers and does not redefine the targets after measurement.
