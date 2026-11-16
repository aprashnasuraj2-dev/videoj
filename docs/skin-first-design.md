# Player-first design principles

Visual distinction belongs **inside the media player**, but never at the expense of accurate playback. The signature should remain understandable when the player is embedded on another page with a different poster or background.

## DHAGO

- Keep the seek control conventional: visible track, one clear thumb and an accurate clock. Use chapter-derived textile swatches as context, not as a second competing seek surface.
- Keep a readable control shelf: play/pause, volume, captions, speed, fullscreen and time remain recognisable on warm, dark and minimal surfaces.
- Reflow at 320px and below without hiding essential actions. Respect focus, forced colors, reduced motion and keyboard/touch targets.
- If source chapters, descriptive captions or playback telemetry are unavailable, omit those details instead of fabricating them.
- Keep theme tokens host-configurable and test foreground/background contrast combinations in the actual surrounding application.

Compare the player itself, not only its surrounding showcase page. Real browser screenshots and interaction tests are stronger evidence than a static mockup. See [the design notes](design.md), [installation](../INSTALL.md) and [manual accessibility checks](../tests/manual-accessibility.md).
