# DETOUR — final competitive positioning

**Snapshot:** 2026-11-16, final checkpoint release.

## Executive direction

DETOUR should not chase the crowded field of decorative player metaphors. Its strongest lane is a **bounded memory layer built directly into the familiar seek rail**.

> **A seek bar that remembers.**

The supporting explanation is equally important: most players give you one playhead; DETOUR adds up to four reusable places without adding a second navigation surface.

## Five-second interaction

1. Save moments as compact **C1–C4** lime brackets.
2. Move the white playhead anywhere.
3. Hover/focus a checkpoint to reveal its time, e.g. **C1 00:42 ↩**.
4. Click/tap/Enter to return without consuming it.
5. Remove one with Delete/Backspace or clear them all.

The four-point cap is deliberate. Unlimited bookmarks or a side list would turn DETOUR into a generic database/navigation panel.

## Defensible differentiation

- one conventional seek rail, not a second timeline;
- current and saved positions remain visually distinct;
- checkpoints survive unrelated seeks and successful returns;
- near-identical saves deduplicate;
- timestamps disclose only on hover/focus;
- one Return transaction locks competing checkpoint actions;
- marker re-renders preserve keyboard focus;
- source changes clear stale checkpoints;
- no chapters, transcript, thumbnails, notes or authored metadata are required;
- default hosts still retain the simpler one-place Return/Stay mode.

## Presentation

**Primary visual:** direct public-browser capture with C1–C4 visible, white playhead near 00:15, and focused C1 expanded to **00:42 ↩**.

**Video:** 6.28-second authentic browser recording. The H.264 copy is a codec/container transcode only of the raw VP8 WebM—no overlays, cuts, compositing or simulated interaction.

This is stronger than the earlier three-state composite because the shipped player itself now explains the idea.

## Engineering argument

The host owns media/poster/tracks; core/base/styles/Mux helpers stay separated; checkpoint state is player- and source-scoped; manual seek precedence, failed-return preservation, live/audio degradation and credential boundaries remain explicit. Multi-place mode is opt-in via `maxPlaces: 4, returnUi: 'marker'`.

## Rejected alternative

**Unlimited checkpoints plus a drawer/list** was rejected. It adds capacity but also collisions, a second navigation surface, more focus complexity and worse compact behavior. Four bounded rail checkpoints deliver much more utility than one point without losing DETOUR's identity.

## Freeze

Do not add chapters, thumbnails, AI/voice commands, notes, 3D hardware or another theme before submission.

## Final evidence authority

- Public runtime: `d430f2ee49fa93a460c150fd90205b13fe5327be` / `detour-dist-d430f2ee49fa`
- Final handoff head: `11e00e6d4a2c2708eda4ce172d43ea81ec007571`
- Full validation: **43772874561** — success
- Evidence capture: **43772874624** — success
- Runtime→handoff: zero `detour/skin/*` changes
- Exact reusable tarball SHA-256: `fbcffda21a0d4adc3f12fb265f8ac94f53bf0a4a3b222940e4290bde8fa2b999`

## Canonical owner artifact

`DETOUR_COMPETITION_MASTERPACK_v4.zip`  
**617,835 B**  
SHA-256: `6f036b80834a5cdcb68c6e43eae4d65f7cd88f54854a21b498f049638683dc54`

The pack contains the authentic visual/video, paste-ready copy, exact final-head validated package, engineering brief, supporting public-browser evidence, route roles, provenance and checksums. It does not close 091/097, 090, physical-device, native-zoom or assistive-technology gates.
