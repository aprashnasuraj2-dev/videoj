# DETOUR — final competitive positioning

**Snapshot:** 2026-11-15, late competition field.

## Executive direction

DETOUR should not try to beat the late field at decorative spectacle. The public feed now contains strong camera, film-strip, tactile-hardware, transit, game, glass and gesture metaphors, many with accessibility claims and polished showcase media.

The defensible lane is a new playback behavior that remains understandable because it preserves the conventional seek bar:

> **Most video players let you seek. DETOUR lets you leave without losing where you came from.**

## What the judge must understand in five seconds

1. **Hold 00:42** — keep the current moment without seeking or pausing.
2. **Explore 00:15** — the white playhead moves; the lime origin bracket stays.
3. **Return 00:42** — one explicit action restores the held point.
4. **Stay here** — deliberately discard the mark instead of returning.

That is stronger than describing DETOUR as a bookmark, anchor, note or history feature.

## Late collision risk

The Recent feed now includes a late entry describing viewers anchoring a moment on the timeline. Earlier sampled entries already included timestamp notes and precision-seeking tools. Therefore the generic concept of “remember a point in time” is not unique enough by itself.

DETOUR's differentiation must be the **complete visible reversible-seek flow** plus its implementation discipline:

- one familiar timeline rather than a second navigation system;
- current and held positions remain visually distinct;
- the held origin survives unrelated seeks;
- Return is explicit and one-shot;
- Stay here is an explicit discard;
- manual seek wins over an in-flight Return without destroying the mark;
- source changes clear stale state;
- no chapters, transcript, thumbnails or special footage are required;
- host-owned media/captions and an independently packed skin prove reuse.

## Presentation decision

Preferred primary visual: a three-state board derived from authentic browser frames, reading **Hold → Explore → Return**.

Preferred optional video: an 8.20-second silent H.264 judge reel that wraps the authentic browser interaction with a minimal intro/outro. Keep the raw player screenshot and raw 6.08-second WebM as non-composited evidence fallbacks.

## What not to build now

Do not add chapters, thumbnail previews, AI/voice commands, decorative 3D hardware, another visual theme or a second signature behavior. Those changes would move DETOUR into crowded categories and create last-minute regression risk.

## Engineering story

The reusable package is part of the competitive argument, not a hidden appendix. Its important claims are:

- host owns media and tracks;
- core/base/styles/Mux helper exports are separated;
- VOD capability is explicit;
- state is scoped to one player and one source epoch;
- pending Return is guarded against duplicate activation and stale completion;
- manual seek has precedence;
- failed/out-of-range Return preserves user intent;
- live/audio/non-seekable media degrade to the ordinary shell;
- Mux management credentials never enter the browser/package contract.

The submission copy should explain the interaction first, then use this engineering depth as proof that DETOUR is a real skin primitive rather than a demo trick.

## Current owner artifact

`DETOUR_COMPETITION_MASTERPACK_v2.zip`  
SHA-256: `7154d62cc07a348dc6e1f51d539d06dce797f2b0746cdad2c24f370669f52bd2`

The pack contains the preferred primary visual, judge reel, raw fallbacks, form/community copy, reusable package, engineering brief, supporting visuals and owner checklist. It does not replace the signed-in Contra form check required by 091/097.
