# तीन ढोका, एउटै परीक्षा — Production handoff

Date and evidence cutoff: **2026-11-20**. The official Nepal-India visit discussed here is scheduled for November 22–23, **not completed** at the time of editorial production.

## Editorial originality
This film measures the India visit by three structural access gates rather than photographs and protocol: the **electricity market**, **air-route access**, and **quality of financial commitments**. Its counterexample matters: India's additional electricity-market approvals show real cooperation, while the extra Bangladesh-route transaction remains approval-dependent. Grid constraints and aviation safety are real interests, not invented political motives. The final question is not whether a ceremony occurred, but whether Nepal has **less recurring permission dependence** afterward.

## Files
- `Balen_India_Three_Doors_SUBTITLED_DRAFT.mp4`: 69.96s 1080x1920, H264/AAC, Nepali synthetic narration and 26 burnt captions.
- `Balen_India_Three_Doors_MUSIC_AND_CAPTIONS.mp4`: same story and captions; original music without robotic speech.
- `Balen_India_Three_Doors_Subtitles_REPAIRED.srt`: clean, nonoverlapping Devanagari cues. These are scene-timed, not forced-aligned to a human/neural voice.
- `Balen_India_Three_Doors_SOURCES.md`: URLs, publication dates, and claim distinctions.
- `story.json`: original reusable newsroom manifest with source ids and classifications.
- Scripts + 9 original Pillow artworks + procedural score.

## Publication blockers
**This is an editorial draft, NOT final broadcast audio.** The currently accessible connected voice services do not supply a ready natural native `ne-NP` narrator; an eSpeak Nepali temporary track was used for timing, and is audibly synthetic. Replace with a licensed native narrator or tested natural ne-NP neural voice before distributing the voice version. Resynchronize captions to actual audio word timings after replacement; even the repaired current subtitles use estimated intrascene timing.

This film uses original static graphics and cinematic cuts; it does not claim to depict meetings that have not occurred.

## Reproduction
Use the parent repository `aprashnasuraj2-dev/videoj`, `newsroom-reel-engine` branch. Install Python dependencies from `newsroom/requirements.txt`, and FFmpeg/FFprobe with Noto Sans Devanagari. The included ChatGPT production helpers contain runtime-local `/mnt/data` paths: adjust `BASE` and the engine import path when building elsewhere, or use `python -m newsroom render` after updating the voice reference and adding professionally aligned SRT.

Example (from repo root):

```bash
python -m newsroom validate path/to/story.json
python -m newsroom preflight path/to/story.json --voice assets/native_ne_np.wav
python -m newsroom render path/to/story.json --voice assets/native_ne_np.wav --subs assets/native_aligned.srt --strict --out output/Balen_India_Three_Doors_BROADCAST.mp4
```

Do not use the old SRT after recording new voice; align new timestamps.