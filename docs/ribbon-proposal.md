# Proposal — Woven Time Ribbon as a reusable Video.js v10 component

DHAGO began as a competition skin, but the timeline idea is useful outside its visual theme. This repository therefore includes a host-neutral proof at `src/ribbon/ribbon.ts` and a public demo at https://creative.aafnaipatro.com/ribbon.html.

## Small API

```ts
const ribbon = createWovenRibbon({ chapters, tracks, onSeek });
ribbon.update({ currentTime, duration, buffering, droppedFrames, renditionHeight });
const { progress, activeChapterIndex } = ribbon.getState();
```

The component takes chapter/metadata geometry and playback state, and returns normalized progress plus the active chapter. It has no Video.js or DHAGO import.

## Why discuss this upstream

Video.js v10 already models chapters through time-slider chapter sections and models streaming quality through rendition state. The open question is whether a reusable multi-track timeline primitive belongs in the component layer: a component that can visualize chapter intervals and optional media metadata without owning media truth or inventing player state.

A related long-running community question is discussion #8235, “YouTube style chapters timeline in video.js”. DHAGO's proof goes a step further by keeping continuous seek semantics while allowing layered cue tracks and optional telemetry.

## Constraints worth preserving

- the standard seek thumb remains the continuous navigation control;
- cue gaps remain gaps rather than synthetic chapters;
- speaker/sponsor/custom tracks appear only when supplied;
- quality/dropped-frame data is capability-gated;
- reduced motion and forced colors do not depend on decorative effects;
- nonvisual users get a chapter map with ordinal, title and start/end time.

## What I would ask the Video.js maintainers

1. Should this remain a skin-level composition around `media-time-slider`, or is a generic segmented/multi-track timeline component useful?
2. Would a data API shaped as `chapters/tracks in + playback state in + active chapter/progress out` fit v10 component conventions?
3. Should stream telemetry remain completely separate from timeline metadata even when a skin chooses to render both in one surface?

This is a proposal and working proof, not a request to merge competition-specific styling.
