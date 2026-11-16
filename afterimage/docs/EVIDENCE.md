# AFTERIMAGE observed evidence

Evidence here is limited to what was actually exercised. A code path existing is not treated as a pass.

## Exact-source build

- Source: `09cdfb59ac0a39eb158edb5d2696c8e9a2501c6c`.
- GitHub Actions run: `43796465564`, job `133066299025`.
- Passed: checkout exact commit; Node 22; `npm ci`; architecture tests; standalone regeneration with zero diff; production Vite build; `npm pack --dry-run`.

## Live release

- URL: `https://afterimage.aafnaipatro.com/`.
- Worker: `afterimage-preview`.
- First deployed artifact before CI-only follow-up: Worker deployment `5228a40a01d54d6780360065f3a22603`, serving the committed standalone artifact from `31df9ddb...`.
- Custom-domain attach ID: `6560877dee1ca221779ea6d3f9b7ab7d9366b790`.
- Existing apex and DETOUR routes were inventoried before attachment and were not changed.

## Desktop browser instrumentation

Cloudflare Browser Rendering, Chromium-family environment:

- Real media: duration `46.613333s`, decoded `960×400`, `readyState=4`, no media error.
- Required controls found: play, seek, time, mute, volume, captions, fullscreen, pin.
- Playback advanced from start to `1.734962s` and remained unpaused.
- Pin opened. First observed relationship: Pinned `00:02`, Now `00:02`, Interval `+00:01`.
- After another 2.6s, Pinned remained unchanged while Now advanced to `00:05`.
- Pinned/Now/Split presets set seam values 100/0/50 and preserved playback.
- Close hid the reference while playback advanced; Compare reopened it; Clear returned the UI to `Pin moment`.

## Mobile layout

### 390×844

- Player width: 374px.
- No horizontal overflow before or during comparison.
- Seam control width: 372px.
- Minimum visible primary target: 44px.
- Initial Pin action width: 348px.

### 320×700

- Player width: 304px.
- No horizontal overflow before or during comparison.
- Seam control width: 302px.
- Minimum visible primary target: 44px.
- Initial Pin action width: 278px.

## Accessibility tree

At 390px, before comparison the tree exposed:

- region `AFTERIMAGE player`;
- group `Media player`;
- Seek slider;
- Play;
- current time and duration;
- Mute;
- Enable captions;
- Enter fullscreen;
- Pin moment.

With comparison open, it additionally exposed:

- slider `Pinned frame reveal`;
- Pinned / Now / Interval values;
- Pause;
- Pin current frame;
- Close comparison;
- Pinned / Split / Now buttons;
- Clear pin;
- live status text: `Pinned at 00:01. Comparison opened.`

## Remaining evidence gaps

Do not infer passes for pause toggling, real seek edge cases, fullscreen transition, caption rendering over the image, keyboard-only end-to-end flow, failure states, teardown stress, cross-browser coverage, final WATERLINE media, or submission-form acceptance until those are separately observed.

## Final WATERLINE candidate · 2026-11-16

### Serving identity

- Public URL: `https://afterimage.aafnaipatro.com/`
- Source: `f4d7c1be2eb574ddf1792ec89040e515ff897890`
- Exact-source CI: run `43797686805`, job `133070134400`, all steps passed.
- Cloudflare Worker: `afterimage-preview`
- Current deployment: `f32ad97e53134c4a8753b0de94f633e5`
- Startup time reported by Cloudflare: 1 ms.
- Custom domain remains isolated from the apex Patro worker and DETOUR hosts.

### WATERLINE media

- Runtime: exactly 18.000s.
- Video: H.264, 1280×720, 24 fps.
- Audio: AAC; procedural brown-noise water bed + 58 Hz low sine; no third-party recording.
- Final MP4: 1,873,808 bytes.
- MP4 SHA-256: `aff1d6bf979c36c3cd81ef278659b9272d0eed4ab69c32be642793fad83813c8`.
- Authored pair: 00:05 dry reference → 00:13 wet state.
- Keyframes, captions, chapters, poster, six sampled frames, and hashes are committed under `public/media/`.

### Final browser proof

Cloudflare Browser Rendering executed the final public candidate, not the former ocean fixture.

- Media decoded: 18.000s, 1280×720, readyState 4, no media error.
- `Try a comparison`: pinned `00:05`; now `00:13`; interval `+00:08`; playing intent remained playing.
- After another ~1.2s, Pinned remained fixed while Now advanced and delta increased.
- Captions: 2 text tracks present; caption track loaded 3 cues; mode `showing`; active cue over wet state: `[Shallow water settles beneath the same locked architecture.]`.
- Paused manual pin: playback stayed paused; displayed `≈00:15`; status announced the approximate capture.
- Reverse seek: relation showed `−00:13`.
- Arbitrary seam: value 37; reference clip `inset(0px 63% 0px 0px)`; seam line `37%`.
- Escape: comparison closed, Compare remained available, and focus restored to Compare.
- Final assertion set returned `pass: true`.

### Delivery proof

- MP4 range request: HTTP 206, `Content-Type: video/mp4`, `Content-Range: bytes 0-63/1873808`, `Accept-Ranges: bytes`.
- Caption and chapter files: `text/vtt; charset=utf-8`.
- Poster: `image/jpeg`.
- Manifest: `application/json; charset=utf-8`.
- All responses carry `x-afterimage-release: f4d7c1be...`.

### Evidence still not claimed

Not yet promoted: full keyboard-only traversal, 240px/200% zoom, touch-cancel/scroll behavior, repeated-pin memory stress, two-instance lifecycle, Firefox/WebKit, fullscreen transition behavior, caption visual contrast in fullscreen, failure/cross-origin paths, screenshot/reel artifacts, Mux bonus, or signed-in submission-form acceptance.
