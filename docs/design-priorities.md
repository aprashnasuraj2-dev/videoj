# DHAGO competitive design direction

User direction, 2026-11-13: optimize the entry's craft and competitive quality; checklist completion is supporting evidence, not the objective. Upload to Mux only after the skin is ready. Awards are judged; no internal checklist or score predicts a win.

## Priority order

1. A recognizable player crop: the woven chapter ribbon must remain visible and useful without the showcase page. Different weave patterns distinguish chapter intervals without relying on color. A conventional seek thumb preserves precision.
2. Honest, intelligible state: chapter name and ordinal come from timed cues. No fake waveform, invented previews, quality choices or telemetry.
3. Deliberate small layouts: comfortable targets, readable time and reachable sound/captions/fullscreen. Fix cramped composition before adding features.
4. Finish across states: keyboard focus, open settings, errors, bright/dark imagery, reduced motion and real fullscreen matter as much as the first screenshot.
5. Reuse: warm linen, dark ink and quiet paper use identical controls and behavior. Host branding can change accent/radius without preview imports.

## Concrete critique of first candidate

Observed CI screenshots: the chapter track was invisible because a local position override collapsed an empty flex track. The vertical volume-thumb placement also survived the horizontal redesign. These are design failures despite passing seek/mute behavior. Fix both before adding decorative features. The settings trigger lacked an accessible name because its label was display:none; give it an explicit name.

Alternative considered: an elaborate animated loom or A–B loop editor. Deferred because it increases discovery cost, touch complexity and failure surface without strengthening essential watching. The signature should explain time, not require learning another interaction model.

## Review standard

Judge the isolated player at 320, 375, 768 and 1280px, with real chapter content, no chapters, open menu and error. A chapter readout must disappear when cues are absent. Automated screenshots are artifacts, not visual approval. Retain physical-device and assistive-technology gaps. Prepare the Mux and genuine-site bonuses after the core is resolved; do not claim them before observed playback.

## Loading cost

The optional Mux HLS engine is lazy-loaded only when a playback ID is configured. The local-film player bundle is approximately 72 KB gzip, versus 268 KB when the HLS engine was eagerly imported: about 73% less in that shared entry chunk. This is a build-size comparison, not measured phone startup time. The workbench remains a separate, heavier development page.
