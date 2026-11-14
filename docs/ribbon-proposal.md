# Proposal — Woven Time Ribbon as a reusable Video.js v10 composition

DHAGO began as a competition skin, but the timeline idea is useful outside its visual theme. This repository includes a host-neutral proof at `src/ribbon/ribbon.ts` and a public demo at https://creative.aafnaipatro.com/ribbon.html.

## Current upstream position — checked 2026-11-14

This proposal does **not** claim that Video.js lacks timed metadata.

The current `videojs/video.js` v10 work has already completed the generic timed-metadata stack:

- issue #9277, **Feature: Timed Metadata**, is closed as completed;
- design issue #9279, **Timed Metadata Model in the Store**, is closed as completed;
- PR #9618, **add time slider markers**, is merged/closed and exposes marker composition including `<media-time-slider-markers>`, filtered text tracks, active marker state, point/range geometry and live-slider positioning.

That upstream layer is the correct source for generic timed metadata. DHAGO should compose with it rather than duplicate it.

## What the ribbon adds

The additive experiment is deliberately narrower:

1. **Multi-lane composition.** Chapters, captions and explicitly authored speaker/sponsor/custom tracks can occupy separate visual lanes over one time warp.
2. **A nonvisual chapter map.** The decorative marker layer can remain `aria-hidden` while chapter navigation separately exposes ordinal, total, title, start and end time.
3. **Viewing history as a second data class.** Buffer intervals, decoded-quality changes and dropped-frame observations are historic playback telemetry, not authored timed metadata.
4. **A host-neutral primitive.** `chapters/tracks in → playback state in → normalized state out`; no Video.js or DHAGO dependency.
5. **A resilience tool around the component.** Stress Lab tests cue density, malformed input, narrow containers, accessibility modes and media failures without requiring DHAGO.

## Small API

```ts
const ribbon = createWovenRibbon({ chapters, tracks, onSeek });

ribbon.update({
  currentTime,
  duration,
  buffering,
  droppedFrames,
  renditionHeight,
});

const { progress, activeChapterIndex } = ribbon.getState();
```

The component does not own media truth. A host decides where chapters, metadata and telemetry come from.

## Boundaries

- The standard seek control remains the continuous navigation mechanism.
- Cue gaps remain gaps; the component does not invent chapters.
- Speaker/sponsor/custom tracks appear only when supplied.
- Decoded dimensions are rendered-resolution evidence, not bitrate. Two 1080p encodes at different bitrates are a counterexample that dimensions cannot distinguish.
- Dropped frames are shown only when the browser exposes a real counter.
- Buffer history comes from actual media waiting/stalled state, not a CSS loading flag.
- Reduced motion and forced colors must be proved by the environment, not simulated and relabeled.
- The component is not a second player library and should not absorb transport, ABR or text-track ownership.

## Upstream outreach

The first choice is to contribute to an existing relevant discussion or issue, because the generic timed-metadata problem is already solved upstream. A new issue would only be justified if maintainers want a **distinct component-level discussion about multi-lane timeline composition or accessible chapter-map navigation**.

No duplicate upstream issue should be opened merely to promote the competition entry.
