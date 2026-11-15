# First Video.js prototype

This is the first playable core, using the pinned `@videojs/html@10.4.0` components and store. The player markup and detour state live under [skin/](../skin/). The [demo](../demo/main.js) independently creates a native media element and captions before passing it to the skin.

## Try it

From `detour/` with Node 22+ and FFmpeg with libx264 and drawtext:

```sh
npm ci
npm run dev
```

For the production bundle and browser tests:

```sh
npm run build
npx playwright install chromium
npm test
```

Set `DETOUR_BROWSER` to use an installed compatible browser. Set `DETOUR_ENGINE=webkit` or `DETOUR_ENGINE=firefox` after installing the corresponding Playwright browser. `DETOUR_SCREENSHOT=/absolute/path.png` captures the held player in the first test. The browser suite serves the built `dist/` over localhost. The [fixture generator](../scripts/make-fixture.mjs) uses geometric frames and an elapsed-time stamp to make 18, 24 and 42 seconds visibly different. It contains no downloaded footage or sound.

## Portable boundary

The skin imports no fixture, page branding, or streaming SDK. A host creates, configures and supplies the native media element:

```js
import { createDetourPlayer } from './skin/player.js';

const video = document.createElement('video');
video.src = '/media/example.mp4';
video.preload = 'metadata';
video.playsInline = true;
document.querySelector('#player').append(createDetourPlayer(video, { sourceKind: 'vod' }));
```

The host opts in when it knows the source is ordinary video on demand. Actual metadata, finite duration and a seekable range are required before a hold can be created. The signature action is hidden by default for audio or undeclared sources. For same-element source replacement set `video.src`; `emptied` and `loadstart` invalidate the stored point and pending result. Replace the complete mount if replacing the media node. Host code supplies any other source, tracks and any needed CORS settings.

## Behavior and failure boundaries

| State | Enter when | User actions and outcome |
| --- | --- | --- |
| Unavailable | Metadata, finite duration, a seekable point or host VOD capability is missing | Allow ordinary transport as supported, leave the signature unavailable. |
| Idle | VOD has a valid position | Keep reads exact native current time and never issues a seek or changes paused state. |
| Held | The viewer keeps a point | Ordinary seeks move the playhead while the held mark stays fixed. Stay clears the point, and Return invokes one Video.js seek. |
| Returning | The request belongs to this active held point | Wait for the Video.js seek result. Accept only a matching current source, attempt and real arrival within 0.5s. An explicit later rail input takes precedence. |
| Retry | The request times out, rejects, or resolves short of the point | Keep the point for Return or Stay if the underlying source still supports it. The result of an old attempt is ignored. |
| Reset | Media changes or the mount disconnects | Invalidate the point and cancel its timeout. Clear source-specific UI. |

The prototype uses Video.js play, time, seek, mute, volume, captions and fullscreen components. It renders real native buffered ranges as separate segments and never calls Play or Pause during a return. On very narrow embeds the controls stack and the numeric volume slider yields to mute. Browser capabilities still determine fullscreen and programmatic volume support.

## Next checks

- Ask five uncoached viewers to identify the action from a player-only crop and complete the find-and-return task. Keep real or simulated mobile input separate in the notes.
- Repeat the same seek trace on Firefox and Safari/WebKit. Test a distinct second clip and two simultaneous mounts. Exercise delayed responses, replaced sources and return during actively playing media.
- Compare marker visibility and focus in bright media, forced colors and physical devices before final styling. Record the exact build and authoritative evidence in the [ledger](../submission-report/EVIDENCE.md).
