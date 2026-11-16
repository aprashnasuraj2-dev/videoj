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
