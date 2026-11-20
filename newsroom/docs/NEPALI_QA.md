# Nepali release verification — 20 November 2026

- **Scope:** engine only, not a published news report or natural Nepali audio.
- **Regression tests:** 17/17 passed locally (`pytest -q newsroom/tests`).
- **Manifest:** `example_ai_bubble_ne.json` validates with `language=ne` and `voice.locale=ne-NP`.
- **Text shaping:** RAQM-enabled Pillow + Noto Sans Devanagari; mixed-script spans `$1.77T` and Nepali conjuncts passed visual inspection.
- **Captions:** Hindi-accent/unknown-language TTS fallback not permitted; Nepali `।` punctuation preserved; exact word and character timestamps supported.
- **Video render:** 3-scene strict technical smoke at 1080×1920, 24fps H.264 with AAC, 10.0 seconds, 1.08MB, −16.0 LUFS.
- **Safe-area correction:** changed libass `FontSize` to script-resolution units (`10`); originally `50` produced huge subtitles covering the upper frame. Rerendered and inspected frame with legible lower-third captions.
- **Cache:** second render reused 3/3 clips and re-encoded zero scenes.
- **Important limit:** the smoke test uses a **synthetic tone**, not Nepali speech. No human or TTS voice was auditioned in this technical test. Listening to an actual `ne-NP` voice and verifying number pronunciations remain mandatory before publication.
- **Publication:** factual sources and story translation need verification as of the publication date. The sample is for pipeline demonstration only.