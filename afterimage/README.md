# AFTERIMAGE

**Temporal Lens for Video.js v10.** Pin one rendered frame, let the real film continue, and compare the remembered moment with the moving picture through one registered seam. The normal seek rail remains the transport: it shows the fixed pin, live playhead, and signed interval together.

**Public proof:** https://afterimage.aafnaipatro.com/

The challenge candidate uses Video.js v10.4.0 and the original 18-second **THE WATERLINE** proof film. Its authored example compares the same locked architecture dry at 00:05 and wet at 00:13. Manual pinning remains media-agnostic.

## Install and integrate

```bash
cd afterimage
npm ci
npm run build
npm run dev
```

The reusable package is under `skin/`; `demo/` is only a host. A host owns its native `<video>`, sources, poster, captions, playback state, and lifecycle.

```js
import { createAfterimagePlayer } from 'afterimage-video-skin';
import 'afterimage-video-skin/styles';

const video = document.createElement('video');
video.src = '/film.mp4';
video.preload = 'metadata';
video.playsInline = true;

document.querySelector('#player').append(createAfterimagePlayer(video, {
  example: { pinnedSeconds: 12, currentSeconds: 28 },
}));
```

The optional `example` pair adds **Try a comparison**. It is host-supplied and performs the one documented authored seek sequence. The manual Temporal Lens itself does not program play, pause, seek, rate, volume, or mute state.

For a skin without the Temporal Lens enhancement, use the exported base player:

```js
import { createBasePlayer } from 'afterimage-video-skin/base';
import 'afterimage-video-skin/styles';

document.querySelector('#player').append(createBasePlayer(video));
```

## What is reusable

AFTERIMAGE is one player, not a second synchronized video. A committed reference is a bounded canvas copied from the host-owned video frame. The reveal seam changes only the clip boundary over that canvas; ordinary seam movement does not seek media or make network requests.

The skin exposes familiar Video.js v10 controls for play/pause, seek/time, mute/volume, captions, and fullscreen. The enhancement adds Pin moment, Compare/Close, Clear pin, Pinned/Split/Now presets, a keyboard-operable reveal range, signed interval readout, and an optional authored pair.

Removing the mounted player aborts enhancement callbacks and releases its reference surface with the DOM. No object URLs or ImageBitmap objects are created by the skin.

## WATERLINE proof film

The checked-in studio uses the original **THE WATERLINE** proof under `public/media/`: locked dry architecture → first flow → reflective wet state. It is delivered at 1280×720/24 fps as VP9/Opus WebM with H.264/AAC MP4 fallback. Its procedural sound bed, captions, chapters, cue pair, hashes, and source provenance are recorded in `public/media/the-waterline-v1.json` and `media-plan.json`.

## Verification

The public candidate is pinned by release identity in browser tests rather than trusting a hostname alone. The exact candidate has been exercised in Chromium, Firefox, and WebKit for playback, authored/manual comparison, keyboard operation, narrow layout, reduced motion, captions, failure fallback, repeated pinning, and clean teardown.

Submission evidence and quantified browser results live in `docs/EVIDENCE.md`; form-ready copy lives in `docs/SUBMISSION.md`. Internal implementation status is tracked in `CHECKLIST.md` and `PROGRESS.md`.

## License and notices

AFTERIMAGE entry code is Apache-2.0. Video.js v10 is consumed as the Apache-2.0 `@videojs/html` dependency. Media provenance and rights notes are separate from the code license and are recorded with the WATERLINE assets. See `THIRD_PARTY_NOTICES.md` and `LICENSE`.
