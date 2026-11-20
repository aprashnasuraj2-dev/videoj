# Production QA checklist (per story)

- [ ] Timestamp stories and facts, verify publication time versus event time
- [ ] Source evidence: every reported figure has URL + clear temporal scope
- [ ] Explain valuation vs revenue vs capital expenditure; no conflation
- [ ] Distinguish verified fact, inference and scenario in all narration
- [ ] Include plausible counterexample; no exact-date or price prophecy
- [ ] Confirm independent newsroom label, no imitation of network branding
- [ ] Confirm licensing of voice, music, photos and any supplementary assets
- [ ] Generate one consistent natural broadcaster voice; listen to preview
- [ ] Confirm exact voice/script match and meaningful pronunciation
- [ ] Import provider timestamps or verified aligned SRT, run strict mode
- [ ] Scan 9:16 safe areas for text, cut-offs, captions, and typography
- [ ] Check sources on screen and in generated sources ledger
- [ ] Read QA JSON (all passes true) and inspect sample frames
- [ ] Listen at first 5s, middle, last 5s, and with headphones
- [ ] Export final MP4 H.264/AAC, 1080 × 1920 at 24 FPS
- [ ] Save MP4, SRT and sources/QA in persistent Library/Drive on request
- [ ] Leave original apps/main branch untouched

## Nepali and multilingual production checks

- [x] Language routes `en`, `ne`, `ne-en`; old English manifests still valid
- [x] Locale gate requires `ne-NP` for Nepali voice tracks
- [x] RAQM shaping and Noto Sans Devanagari typography preflight
- [x] Real mixed-script Latin/Devanagari font rendering; `$` and financial figures remain legible
- [x] Unicode grapheme-aware wrapping; no cutting conjuncts/diacritics
- [x] Subtitles use libass with Noto font and Nepali sentence boundaries `।`
- [x] Generic exact character and exact word timestamps (external voice remains separate)
- [x] Nepali and code-mixed sample templates and spoken-voice acceptance checklist
- [ ] For every **published** story, confirm a native-sounding Nepali voice by listening
- [ ] For every **published** story, visually proofread subtitle density on mobile
- [ ] For every **published** story, verify number unit translations and source dates

## Engineering verification evidence (2026-11-20)

- [x] 17 tests: English regression, Nepali glyph geometry, nativeness manifest, word/character timestamp alignment and MP4 preview cache reuse
- [x] Full-resolution 1080 × 1920 strict-timing technical test generated a valid 10.0s H.264/AAC MP4 at −16.0 LUFS
- [x] Inspected a rendered video frame: corrected ASS script-unit caption scaling, no glyph clipping, no headline overlap
- [ ] Native-sounding Nepali **voice** acceptance is a separate human QA gate (technical test intentionally uses a synthetic tone)