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
document.querySelector('#player').append(createAfterimagePlayer(video));
```

## Current engineering slice

The checked-in demo intentionally uses a temporary public Video.js fixture while the original **THE WATERLINE** film is produced. That fixture is not part of the reusable package and is not the intended submission media.

The implemented manual Temporal Lens path performs no programmed play, pause, seek, rate, or audio action. It captures one bounded frame, keeps it registered over the real video, and changes only presentation while the seam moves. Source replacement and teardown invalidate pending capture work.

## License

Apache-2.0. Final film/media rights and hashes will be recorded separately before release.
