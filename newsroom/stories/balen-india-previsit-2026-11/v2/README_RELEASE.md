# Three Doors: Balen’s upcoming India visit — corrected Nepali release

**Editorial cutoff:** 20 November 2026. **Visit scheduled:** 22–23 November 2026, not yet held at the cutoff. This is pre-visit analysis, not a fabricated outcomes report.

## Correction record

- Removed eSpeak. Neural narration: Microsoft `ne-NP-HemkalaNeural` via an Edge TTS interface, tempo +8%, 72.18 seconds. It is AI-generated, not a real person's recorded voice. **Check Microsoft service/voice commercial usage terms before third-party or monetized distribution.**
- Rewrote and manually proofread Nepali headlines, body copy and spoken narration (126 words). Original factual claims and source dates preserved.
- Rebuilt 9 original 1080×1920 scenes with Devanagari-aware Pillow/libraqm shaping and improved line spacing.
- Fixed an FFmpeg compositing defect: applying SRT subtitles to *single still frames* before FPS expansion caused captions to disappear. The correct pipeline first produces a 24 fps H.264 video, then overlays timed captions on that video.
- Captions: 26 individually proofread events, verified word-for-word against the exact neural narration script. Provider word-boundary timing was available for eight scenes; scene four received manually checked phrase-level estimates.
- Final QA: seven actual-frame subtitle-presence tests passed, plus 72.208-second video, 1080×1920, H.264/24fps + AAC/48 kHz, approximately −15.8 LUFS; subtitle visibility reviewed on representative frames; actual video playback has been inspected via extracted frames and stream probes.

## Editorial facts versus claims

- **Fact:** State visit to India was scheduled for 22–23 November 2026.
- **Fact:** India approved an additional 615.02 MW of Nepali electricity exports around 19 November 2026; additional 20 MW to Bangladesh still lacked Indian approval.
- **Fact/intent:** 10,000 MW over ten years is a target, not actual power delivered; 1,650 MW reflects a transfer capacity agreement, not energy sold.
- **Analysis:** Diplomatic benefit should be evaluated against practical market access, air-entry routes and financing terms, with public deadlines. No claim is made that any meeting outcome or deal has occurred.

Refer to `SOURCES.md` for citations and publication dates.

## Files and workflow

- `story.json`: verified storyboard and edited Nepali text
- `voice_script_ne.txt`: exact spoken words
- `tts_ne.py`: remote neural TTS generator (needs Edge TTS and FFmpeg)
- `audio/neural_ne_np.wav`: successful generated narration
- `audio/timing_ne.json`: scene timings and provider boundary verification
- `audio/captions_ne_PROOFREAD.srt`: actual corrected captions
- `design_corrected.py`: Pillow images, need Noto Devanagari and repo `newsroom` engine
- `render_neural_master.py`: **two-pass** FFmpeg render that actually burns captions
- `verify_caption_burn.py`: regression detector for missing captions in actual H.264 frames
- `Balen_India_Corrected_QA.json`: output technical checks

**Rebuild from repo branch:** `python -m pip install -r newsroom/requirements.txt`, `python newsroom/stories/balen-india-previsit-2026-11/v2/design_corrected.py`. Download the GitHub Action voice artifact into `v2/audio`, then `python v2/curate_subtitles.py` and `python v2/render_neural_master.py`. The included ZIP contains required audio and scene stills, but the GitHub repository intentionally contains source code only, not generated media.

**Publication warning:** after 22 November 2026, update the analysis and verify the latest outcomes before presenting this pre-visit reel as current.