# AFTERIMAGE

**Temporal Lens** for Video.js v10: pin one rendered frame, let the real film continue, and compare the fixed moment with the moving picture through one registered seam. The seek rail keeps the pinned time, current playhead, and their signed interval visible together.

## Development

```bash
cd afterimage
npm ci
npm run build
npm run dev
```

The reusable package is under `skin/`. The studio in `demo/` is only a host. A host owns its native `<video>`, sources, poster, captions and lifecycle.

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

The optional `example` pair adds **Try a comparison**. It is host-supplied and media-agnostic. It performs the one documented authored seek sequence; the manual Temporal Lens itself never programs play, pause, seek, rate or audio state.

## WATERLINE proof film

The checked-in studio uses the original 18-second **THE WATERLINE** proof under `public/media/`: locked dry architecture → first flow → reflective wet state. The film is H.264/AAC at 1280×720/24 fps. Its procedural sound bed, captions, chapters, cue pair, hashes and source provenance are recorded beside the media.

## License

Apache-2.0 for the entry code. Media provenance and rights notes are recorded in `public/media/the-waterline-v1.json` and `media-plan.json`.
