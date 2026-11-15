# DETOUR

Build a reusable Video.js v10 skin where viewers can **keep their place, explore any other moment, and return in one action**. One conventional seek bar shows the current position and a separate held mark. The visible “Return to [time]” action is the player’s signature. “Stay here” clears the mark without seeking.

## Start here

1. Read the current [100-step checklist](CHECKLIST.md) and [progress](PROGRESS.md) from the same freshly fetched `detour` head.
2. Use the [continuation instructions](CONTINUE.md) to resume the current phase and next actionable step.
3. Update the checklist and progress with evidence as work lands. Keep release evidence in [submission-report/](submission-report/README.md).

## Reuse boundary

The reusable surface is the package root plus scoped styles. A host creates and owns its native `<video>` or `<audio>` element and any `<track>` children, then passes that media element to `createDetourPlayer(media, { sourceKind })`. Media URLs, captions, titles and publication paths remain host concerns. The package is currently pack-installable but intentionally not registry-published.

```js
import { createDetourPlayer } from 'detour-video-skin';
import 'detour-video-skin/styles';

const video = document.createElement('video');
video.src = '/my-video.mp4';
document.querySelector('#mount').append(
  createDetourPlayer(video, { sourceKind: 'vod' }),
);
```

For hosts that want the same visual shell and ordinary Video.js controls without loading the held-place behavior, `detour-video-skin/base` exports `createBasePlayer(media)`. Its module graph does not import or register `detour-place`; the packed-consumer test exercises this mode separately at a compact width.

Mux support is a separate optional `detour-video-skin/mux` entry. The core entry does not import Mux, fixtures or showcase code, and no management credential belongs in a browser bundle. See [Phase 5](design/PHASE-5.md) for the packed-host and cross-engine proof.

## Package quick-start

DETOUR is **pack-installable** but intentionally not registry-published. From this directory:

```bash
npm ci
npm pack
# In another project:
npm install /path/to/detour-video-skin-0.1.0.tgz
```

Then mount a host-owned native media element:

```js
import { createDetourPlayer } from 'detour-video-skin';
import 'detour-video-skin/styles';

const video = document.createElement('video');
video.src = '/interview.mp4';
video.preload = 'metadata';

const captions = document.createElement('track');
captions.kind = 'captions';
captions.srclang = 'en';
captions.label = 'English';
captions.src = '/interview.vtt';
video.append(captions);

document.querySelector('#player').append(
  createDetourPlayer(video, { sourceKind: 'vod' }),
);
```

### Build and verification

- `npm run build` — generate the deterministic demo media and build the multi-page showcase.
- `npm run test:architecture` — verify package/import boundaries and credential separation.
- `npm run test:package` — pack the exact package, install it into a fresh temporary host, replace the media/captions and exercise the skin in Chromium, Firefox and desktop WebKit.
- `npm test` — run the core browser regression in Chromium; set `DETOUR_ENGINE=firefox` or `webkit` for the other engines.

### Reuse limits

- Held-place behavior is enabled only when the host declares `sourceKind: 'vod'` on a native video with finite, seekable media.
- DETOUR stores one held position per mounted player instance. A source change clears it; successful Return or **Stay here** consumes it.
- Live streams, non-seekable media and audio keep the ordinary player shell but do not expose the held-place action.
- Media URLs, poster, captions, titles, hosting and optional streaming providers are host concerns. The packed artifact excludes demo/showcase media and test fixtures.
- `detour-video-skin/mux` contains public URL helpers only. Mux management credentials are never part of the package/browser contract.

### License and media

The DETOUR package source is Apache-2.0; see `LICENSE`. The package tarball contains no showcase video, poster or captions. The public demonstration media is project-authored procedural test/showcase material with separate provenance in `submission-report/RIGHTS.md`.

## Product direction

- **Player first.** Keep one source-scoped held point, five essential controls and real player state. Preserve normal play/pause, seeking, captions, keyboard and touch. The mark survives arbitrary seeks and clears on successful return, deliberate dismissal or a source change.
- **Own identity.** Use graphite, a bright angular hold marker and tabular time. Lead with a playable player or a real capture. Keep DHAGO’s woven interaction, footage, visual system, live routes and release workflows out of DETOUR.
- **Prove the behavior early.** First build a rough real v10 MP4 prototype. Demonstrate a 42s → 18s → 42s round trip, held origin through two seeks, and “Stay here” without movement. Test first-use recognition, narrow touch and keyboard before adding polish. Backup: [Pausepoint](CHECKLIST.md#02--concept-definition-and-signature-interaction), an explicit one-time pause at a viewer-chosen timestamp.
- **Ship in order.** Core skin → replacement-media mount → public anonymous playback and real-device evidence → optional Mux or real-site bonus → owner handoff. See the [rules register](submission-report/RULES.md) for release constraints. DETOUR can develop and rehearse while second-entry eligibility is being resolved.

The original [planning PDF](https://chatgpt.com/library?file_id=libfile_d2f57bf1472081918779a4349d0ed582&account_id=personal) is a historical reference. Checklist state, wording and resume position live on this branch.
