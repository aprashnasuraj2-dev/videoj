# DHAGO skin-first design refinement — 2026-11-14

## Competition priority
The judging experience must be convincing **inside the real media player**. Design, interaction and visual polish are not an excuse to replace native playback with animation. The media remains the original 64-second Studies in Thread film.

## Architecture inspected
- The real `@videojs/html` v10.4.0 components own play/pause, volume, seek, captions, settings, keyboard shortcuts and fullscreen.
- `src/create-player.ts` is the portable mounting boundary.
- `src/video/skin.html` supplies the single real control shelf and chapter ribbon.
- `src/video/dhago.css` supplies the visual identity and media-state decorations; no external CSS library is required for the player itself.
- `src/video/living-loom.ts` derives four reversible stages from `currentTime/duration`, including reverse seeks and replay. It has no synthetic clock.
- `src/video/stream-history.ts` shows only supported dropped-frame, buffering and decoded-dimension data.
- Demo/Journal/Ribbon/Stress Lab reuse the same original film.

## Visual decisions
1. **Poster.** Added `media/dhago-studies-poster.svg` (~74 KB SVG), a vector sunset of overlapping warp/weft ridgelines. Its design uses a palette related to the original video's warm hills, woven sun and abstract textile geography. It is a *designed illustration*, **not** an extracted video frame or a claim of actual Nepali filming. Historical `poster.webp` is retained for rollback. Film MP4, audio, original cues and duration are immutable.
2. **Focal hierarchy.** Warm image, opaque linen/ink/paper controls, one prominent woven play button, a single full-width chapter track, clear current time and durable captions/Settings/fullscreen labels. No supplementary fake play button was introduced.
3. **Interaction polish.** Native play button uses a matte woven grain; the shuttle-shaped seek thumb has focus/hover/drag states. The ribbon has a framed material texture; the chapter map is typographically distinguished from ordinary settings.
4. **Motion discipline.** Hover/press are bounded micro-interactions, dragging visibly tensions the actual seek ribbon, and the selvedge fill follows real media progress. Reduced-motion and forced-colors keep controls operable and legible.
5. **Small viewports.** The existing second-row essential controls are kept, using the host container's actual width. Demo gallery chapters remain navigable at 320/375px. Existing Lab/Tools instrumentation stays separate from the scored skin.

## Alternatives considered
- Full-screen translucent overlay controls: rejected because they obscure the film, have footage-dependent contrast and complicate narrow/touch captions and Settings.
- Replacing the player with a CSS-driven simulated timeline: rejected because it would be misleading when scrubbing, stalled, chapterless or seeking backward.
- Larger cinematic replacement footage: rejected by owner decision; would harm consistency and introduce unrelated assets, audio and attribution risks.

## Verification boundaries
- [x] Source inspection and poster/skin engineering committed on the reconciliation branch.
- [x] New poster is a file used by Demo, Journal, Ribbon, and original Stress Lab fixture (missing-poster fixture remains intentionally broken).
- [ ] Exact-head typecheck/build/Playwright (must pass before merge).
- [ ] Production screenshots for desktop, 375px and 240px player crops.
- [ ] Physical-device and assistive-tech verification.
- [ ] Owner rights check and competition submission.
