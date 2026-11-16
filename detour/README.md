# DETOUR — A seek bar that remembers

DETOUR is an open-source Video.js v10 skin for holding a moment, exploring elsewhere in a video, and returning without losing the original position. The familiar seek rail remains the primary navigation control.

**[Four-checkpoint demo](https://detour-entry.aafnaipatro.com/mux/)** · **[Single-place demo](https://detour.aafnaipatro.com/mux/)** · **[Engineering and media provenance](docs/ENGINEERING.md)** · **[Repository overview](../README.md)**

## Use DETOUR in another application

The host owns the native media element and its source/track tags. The package owns the control shell and held-position behavior; it does not import showcase media, Mux management APIs, or the host application's router.

```bash
cd detour
npm ci
npm pack
# Install the generated detour-video-skin-0.1.0.tgz in your host project.
```

```js
import { createDetourPlayer } from 'detour-video-skin';
import 'detour-video-skin/styles';

const video = document.createElement('video');
video.src = '/my-video.mp4';
video.preload = 'metadata';
document.querySelector('#player').append(
  createDetourPlayer(video, { sourceKind: 'vod' }),
);
```

A four-checkpoint mode is opt-in; the default remains one held position with explicit Return/Stay actions.

```js
const checkpointPlayer = createDetourPlayer(video, {
  sourceKind: 'vod',
  maxPlaces: 4,
  returnUi: 'marker',
});
```

In marker mode, C1–C4 remain on the seek rail. Hover or focus exposes timestamps, click/tap returns, Delete/Backspace removes a focused point, and Clear removes all. A source change resets source-scoped positions. Duplicated saves near an existing point are coalesced.

For a plain player shell without held-place behavior use `detour-video-skin/base` and `createBasePlayer(media)`. The separate `detour-video-skin/mux` export provides public playback-URL helpers, not media-management operations.

## Boundaries

- The held-place action requires `sourceKind: 'vod'`, a finite duration and genuinely seekable video. Live streams, unseekable media and audio keep normal controls but not a nonfunctional Return action.
- Captions, posters, titles, source URLs and hosting belong to the host. The published demonstration is not part of the npm pack artifact.
- Each player instance owns its state. A source replacement or disconnected player invalidates old holds and in-flight returns.
- The current distribution is **pack-installable, not published to the npm registry**. Browser-native behavior, DRM, codecs and accessibility need validation in the adopting application.
- The package is Apache-2.0. Demo media provenance and third-party licenses are distinct; see [engineering notes](docs/ENGINEERING.md).

## Develop and verify

```bash
npm ci
npm run build
npm run test:architecture
npm test
npm run test:package
npm pack
```

Use `DETOUR_ENGINE=firefox npm test` or `DETOUR_ENGINE=webkit npm test` for additional engines. The public Mux route and alternate-media page provide integration examples, not a requirement to adopt a streaming provider.

To reproduce historical project experiments, inspect Git history; old task boards and one-off release packets are not active product documentation.
