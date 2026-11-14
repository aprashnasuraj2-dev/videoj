# Portable Skin Stress Lab

The public DHAGO Stress Lab is also packaged as a **host-neutral test harness**. The harness does not import DHAGO or Video.js; a skin author supplies one adapter that knows how to mount their player.

Public tool: https://creative.aafnaipatro.com/stress.html

Source API: `src/stress-lab/harness.ts`

## Adapter contract

```ts
import { createSkinStressHarness } from './src/stress-lab/harness';

const harness = createSkinStressHarness({
  source: '/fixture.mp4',
  missingSource: '/definitely-missing.mp4',
  adapter: {
    name: 'My skin',
    async mount(host, input) {
      const root = mountMyPlayer({
        host,
        source: input.source,
        chapters: input.chapters,
      });

      return {
        root,
        media: root.querySelector('video')!,
        destroy: () => root.remove(),
      };
    },
  },
});

await harness.run(document.querySelector('#fixture')!, 'narrow-240');
```

## Portable cases

| Case | What the harness changes | What remains honest |
| --- | --- | --- |
| `baseline` | working media | no fault injection |
| `narrow-240` | real host width = 240px | not viewport emulation |
| `malformed-cues` | real malformed WebVTT URL | the skin decides how to validate/fail |
| `missing-media` | deliberately missing source | exercises actual error path |
| `forced-colors` | **does not fake the OS mode** | reports whether `forced-colors: active` is genuinely on |

## Forced-colors automation

Forced colors is an environment capability, not a CSS class. In Playwright:

```ts
test('skin survives forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', contrast: 'more' });
  await page.goto('/stress.html?case=original');
  await expect(page.locator('media-play-button')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Seek' })).toBeVisible();
});
```

A page that merely adds a `.forced-colors` class is a counterexample: it can test custom CSS, but it cannot prove the browser's actual forced-colors behavior.

## Why this is separate from DHAGO

Stress Lab is intended to improve the skin ecosystem, not to make DHAGO look uniquely robust. The reusable harness knows only about a host element, a media source, optional chapter metadata and an adapter. Skin-specific assertions belong in the consuming project's tests.
