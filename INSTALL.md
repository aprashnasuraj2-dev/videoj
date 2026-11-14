# Install DHAGO

DHAGO is a portable **Video.js v10 HTML skin**. It is not published to npm and is not an official Video.js catalog entry. The supported adoption path for this challenge release is to vendor the `src/` skin files into a Vite-compatible application and install the matching Video.js HTML runtime.

## 30-second setup

```bash
npm install @videojs/html@10.4.0
```

Copy this repository's `src/` directory into your application, preserving the relative paths used by `src/create-player.ts`.

### HTML / Vite

```html
<div id="player"></div>
<script type="module" src="/src/player.ts"></script>
```

```ts
// /src/player.ts
import { createDhagoPlayer } from './dhago/create-player';

const player = createDhagoPlayer({
  source: '/film.mp4',
  poster: '/poster.webp',
  chapters: '/chapters.vtt',
  captions: '/captions.vtt',
  surface: 'warm',
});

document.querySelector('#player')!.append(player);
```

Minimal chapter VTT:

```text
WEBVTT

00:00.000 --> 00:16.000
Opening

00:16.000 --> 00:32.000
Second chapter
```

If you do not provide `chapters`, DHAGO hides the chapter chooser instead of inventing chapter data.

### React

DHAGO mounts imperatively because the player itself is a standards-based custom-element tree.

```tsx
import { useEffect, useRef } from 'react';
import { createDhagoPlayer } from './dhago/create-player';

export function DhagoVideo() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const player = createDhagoPlayer({
      source: '/film.mp4',
      poster: '/poster.webp',
      chapters: '/chapters.vtt',
      captions: '/captions.vtt',
      surface: 'warm',
    });

    mount.current!.append(player);
    return () => player.remove();
  }, []);

  return <div ref={mount} />;
}
```

## Mux delivery

To use Mux instead of a direct file, install the adapter used by this release and pass a public playback ID:

```bash
npm install @videojs/mux-video@10.4.0
```

```ts
mount.append(createDhagoPlayer({
  source: '/film.mp4',          // local fallback source
  compatibilitySource: '/film.webm',
  playbackId: 'YOUR_PUBLIC_PLAYBACK_ID',
  fallbackUrl: location.href + '?local',
  chapters: '/chapters.vtt',
  captions: '/captions.vtt',
}));
```

Never put a Mux API secret in browser code. A playback ID is public; an API token secret is not.

## Supported theme tokens

Set tokens on the returned `video-player` element or on a containing element that the CSS variables inherit through.

| Token | Purpose | Default |
| --- | --- | --- |
| `--media-accent-color` | active thread, progress and emphasis | Linen: `#b44332` |
| `--media-accent-text-color` | text/icon on accent | Linen: `#fff` |
| `--media-border-radius` | player/frame radius | `14px` in DHAGO |
| `--dhago-surface-color` | control-shelf/textile surface override | surface preset |
| `--dhago-foreground-color` | primary text/control color | surface preset |
| `--dhago-muted-color` | secondary labels | surface preset |
| `--dhago-border-color` | shelf/control borders | surface preset |
| `--dhago-focus-color` | keyboard focus ring | accent color |
| `--dhago-control-density` | Video.js spacing unit used by DHAGO | `4px` |
| `--dhago-weave-density` | base Linen ribbon warp interval | `5px` |

The per-chapter sampled variables `--dhago-weave-color` and `--dhago-weave-thread` are generated internally when optional authored weave metadata matches the chapter cues. They are not part of the stable host-theming surface.

### Copy-paste retheme

```css
#player {
  --media-accent-color: #e8c078;
  --media-accent-text-color: #171918;
  --dhago-surface-color: #202321;
  --dhago-foreground-color: #f4ebdd;
  --dhago-muted-color: #d2c7b7;
  --dhago-border-color: #77786c;
  --dhago-focus-color: #e8c078;
  --media-border-radius: 12px;
  --dhago-control-density: 4px;
  --dhago-weave-density: 6px;
}
```

Contrast remains the host's responsibility. A token combination can be syntactically valid and still fail WCAG contrast; the repository's Ink example pairs `#e8c078` with `#202321`, not with a white shelf.

## Options

`createDhagoPlayer(options)` accepts:

- `source` — required direct video/audio source.
- `compatibilitySource` — optional WebM fallback for environments without H.264/AAC decoding.
- `playbackId` — optional public Mux playback ID.
- `fallbackUrl` — optional explicit link shown when Mux delivery is in use.
- `poster` — optional poster.
- `chapters` — optional WebVTT chapters.
- `captions` — optional WebVTT captions/descriptions.
- `surface` — `warm`, `dark`, or `minimal`.
- `mediaKind` — `video` or `audio`.
- `weave` — optional precomputed DHAGO weave metadata from authored media.

## Accessibility contract

DHAGO keeps the native Video.js v10 control semantics and adds a keyboard/touch chapter chooser. Do not remove focus outlines, visible labels, caption tracks or the standard seek thumb when retheming. Reduced motion, forced colors and high-contrast preferences have explicit fallbacks in the skin.

## Verify your integration

```bash
npm run typecheck
npm run build
```

The challenge repository additionally uses Playwright for player behavior, stress states and public-release smoke checks.
