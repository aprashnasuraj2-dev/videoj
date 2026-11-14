# Portable Skin Stress Lab

Public tool: https://creative.aafnaipatro.com/stress.html

Stress Lab has two layers:

- the DHAGO specimen gallery, which demonstrates the competition skin under real and controlled edge states;
- a host-neutral browser instrument that can load another compatible player through a tiny adapter and return structured resilience results.

The reusable harness lives at `src/stress-lab/harness.ts`. It does not import DHAGO or Video.js.

## Browser loader

### Built-in reference

Choose **Use built-in DHAGO** to restore the known-good reference adapter. This is both an example and a sanity check that the lab itself is functioning.

### ESM adapter URL

Paste a browser-loadable ESM URL. The module must default-export the adapter contract below.

Remote code is **not** imported into the parent Stress Lab page. It executes inside an iframe with:

```html
sandbox="allow-scripts"
```

There is intentionally no `allow-same-origin`.

The iframe uses an opaque origin and communicates through a small `postMessage` protocol. The parent validates both `event.source` and a cryptographically random session identifier before accepting a result.

A URL module can fail before the skin is tested:

- CORS/network blocked → adapter **NOT RUN**;
- invalid JavaScript/module → adapter **NOT RUN**;
- missing default adapter contract → adapter **NOT RUN**;
- `mount()` throws after a valid load → fixture **FAIL**.

All dependencies imported by a remote ESM adapter must also be browser-loadable under their own CORS policy.

### Local .js / .mjs

Choose a local JavaScript module. The browser reads it with `File.text()`, sends the text to the isolated iframe, creates a Blob module **inside that iframe**, and imports it there.

**The file is not uploaded to a DHAGO backend.**

Because a local adapter is imported from a Blob URL, relative imports inside that local file do not have a filesystem-relative module base. For a local test, use a single-file adapter or browser-resolvable absolute module URLs.

## Adapter contract

```ts
export default {
  name: 'My Video.js skin',

  async mount(host, input) {
    const root = await mountMyPlayer({
      host,
      source: input.source,
      poster: input.poster,
      chapters: input.chapters,
      captions: input.captions,
    });

    return {
      root,
      media: root.querySelector('video'),
      destroy() {
        root.remove();
      },
    };
  },
};
```

The source API can also be used directly:

```ts
import { createSkinStressHarness } from './src/stress-lab/harness';

const harness = createSkinStressHarness({
  source: '/fixture.mp4',
  missingSource: '/__stress-fixtures/missing.mp4',
  adapter,
  reporter(result) {
    console.table(result.assertions);
  },
});

const run = await harness.run(
  document.querySelector('#fixture'),
  'narrow-240',
);

console.log(run.result);
```

## Result schema

A run never collapses all evidence into one boolean.

```ts
interface StressResult {
  caseId: string;
  caseLabel: string;
  adapterName: string;
  status: 'pass' | 'fail' | 'warning' | 'not-run';
  assertions: StressAssertion[];
  environment: {
    userAgent: string;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    forcedColors: boolean;
    reducedMotion: boolean;
    online: boolean;
  };
  durationMs: number;
  notes: string[];
}

interface StressAssertion {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning' | 'not-run';
  expected?: string | number | boolean;
  observed?: string | number | boolean | null;
  evidence?: string;
}
```

The public tool can copy JSON, download JSON, or copy a Markdown report. Reports include browser/environment data and results, but not adapter source, secrets, or local filesystem paths.

## Fixture catalogue

The shipped portable matrix includes:

- baseline;
- real 240 / 320 / 375 / 768 / wide host containers;
- no chapters;
- 40 and 100 cue density;
- uneven chapters;
- long English title;
- Devanagari, Arabic/RTL and CJK text;
- malformed WebVTT;
- late chapter metadata;
- no captions;
- multi-language captions with a long cue;
- missing poster;
- missing media / 404;
- audio-only media;
- source replacement;
- rapid seeks;
- forced colors;
- reduced motion;
- real-browser zoom boundary;
- live/DVR boundary.

The matrix is intentionally finite. Thousands of cues would benchmark DOM volume rather than normal skin resilience.

## Network fixture architecture

`apps/preview/public/stress-sw.js` provides controlled same-origin responses only under:

```text
/__stress-fixtures/*
```

Available behaviors include:

- 404 media/poster;
- delayed VTT;
- malformed VTT;
- delayed first media byte;
- slow chunk delivery;
- a mid-stream delivery pause;
- wrong MIME;
- truncated delivery.

The worker forwards HTTP `Range` requests to the original fixture media and preserves the upstream response status/headers where applicable. Every fixture response sets `Cache-Control: no-store`.

The worker is registered only by Stress Lab and is unregistered when the page is left. Its registration scope is the site root because a service worker can only intercept media requests made by a controlled document. **Its fetch handler returns without interception for every path outside `/__stress-fixtures/`.** This is the important isolation boundary.

A service-worker pause is not automatically reported as a buffering success. A media test may call it a stall only if the media element emits the relevant real `waiting` / `stalled` state.

## Forced colors and reduced motion

These are environment capabilities.

```js
matchMedia('(forced-colors: active)').matches
matchMedia('(prefers-reduced-motion: reduce)').matches
```

If the relevant query is false, Stress Lab returns **NOT RUN**. A CSS class or visual preview may be useful for design work, but it is not accessibility proof.

Playwright can emulate the media features in a separate automated test:

```ts
await page.emulateMedia({
  forcedColors: 'active',
  reducedMotion: 'reduce',
});
```

Real 400% browser zoom is also not relabeled from a shrunken viewport. It remains a real-browser/manual gate unless the automation environment genuinely changes zoom.

## Cleanup lifecycle

Before a new fixture or adapter is mounted, Stress Lab:

1. calls the prior adapter's optional `destroy()`;
2. removes the prior root;
3. revokes temporary VTT/caption object URLs;
4. clears the host geometry;
5. creates a new sandbox session when switching adapter origins.

Old iframe messages are rejected by both source and session ID.

## Plain HTML video adapter

```js
export default {
  name: 'Native video',
  mount(host, input) {
    const root = document.createElement('div');
    const media = document.createElement(
      input.mediaKind === 'audio' ? 'audio' : 'video'
    );
    media.controls = true;
    media.src = input.source;

    if (input.poster && media instanceof HTMLVideoElement) {
      media.poster = input.poster;
    }

    root.append(media);
    host.append(root);

    return {
      root,
      media,
      destroy() {
        media.pause();
        root.remove();
      },
    };
  },
};
```

## Basic Video.js adapter

The adapter owns whatever setup its player needs; the harness only supplies inputs.

```js
import videojs from 'https://cdn.example/video.js';

export default {
  name: 'My Video.js skin',
  mount(host, input) {
    const media = document.createElement('video');
    media.className = 'video-js';
    media.controls = true;
    media.src = input.source;
    host.append(media);

    const player = videojs(media);

    return {
      root: player.el(),
      media,
      destroy() {
        player.dispose();
      },
    };
  },
};
```

Use a CDN URL that actually permits browser ESM/CORS; the placeholder above is not a claimed working CDN.

## Add a custom case

The public fixture definitions are exported as `portableStressFixtures`. A project-specific test can call the harness around its own setup/assertions without modifying DHAGO. Keep the invariant: fixture input may be synthetic, but the observed outcome must come from the real mounted media/player state.

## Automated self-tests

`tests/stress-lab.spec.ts` covers:

- built-in DHAGO adapter;
- true 240px host measurement;
- forced-colors NOT RUN behavior when inactive;
- local file loading;
- ESM URL loading;
- invalid contract;
- throwing mount;
- missing media element;
- adapter switching cleanup;
- stale-message rejection;
- reserved network-fixture routing;
- JSON/Markdown serialization;
- keyboard reachability;
- axe serious/critical filtering.

## Security boundary

The sandbox reduces trust; it does not make arbitrary JavaScript harmless in every sense. A third-party adapter can still make network requests available to its sandbox environment and consume CPU/memory while it runs. Do not load code you would never execute at all.

The important system boundary is that arbitrary adapter JavaScript is not executed in the parent DHAGO application origin, cannot receive `allow-same-origin`, and cannot directly inject arbitrary HTML into the parent result UI.
