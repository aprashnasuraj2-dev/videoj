# The Signal — Newsroom Reel Engine

A standalone, **evidence-led** Python/FFmpeg production workflow for short vertical news-analysis videos. This directory belongs to the isolated `newsroom-reel-engine` branch: it does **not** modify the existing DHAGO or DETOUR app. It is a production tool, not a publishing service, current-news feed, or fully autonomous fact checker.

## What changes from the earlier one-off reel

| Earlier bottleneck | Engine response | Boundary |
| --- | --- | --- |
| Voice sounds robotic | **Natural external/human WAV or MP3 required**; no FFmpeg flite fallback | Voice quality is evaluated by listening, not merely by file presence |
| Voice and visuals become out of sync | **Use precise TTS character timestamps** or provide verified SRT; timestamps build scene cues | Untimed rendering allowed only as draft; QA flags estimated alignment |
| Work lost during tool/session disconnects | Content-hash PNG/clip cache + persistent scene manifest | Final mixing still reruns for safe output reproducibility |
| Same hand-edited script each time | Topic-neutral JSON storyboard, styles & scripts | Human/editor or LLM must research, verify and author claims |
| Missing source transparency | Claim classification (`reported`, `inference`, `scenario`, `speculation`) and dated URL ledger | Validator checks citation presence, not actual truth of a news report |
| Video exported but damaged/silent | Automatic FFprobe stream, codec, frame-size, duration, and audio-level checks | Visual editorial judgment and listening remain manual |
| Share/download interruptions | Save MP4 + captions + ledger + QA together; optionally upload via ChatGPT Library/Drive | GitHub hosts **code**, not huge generated MP4 binaries |

## Local setup

Requires **Python 3.11+**, FFmpeg/FFprobe, fonts (Lato or DejaVu Sans). Install with:

```bash
python -m pip install -r newsroom/requirements.txt
python -m newsroom validate newsroom/templates/example_ai_bubble.json
```

Place natural-quality licensed narration into `newsroom/assets/natural_narrator.wav` **outside source control**. The example is an editorial template, not a current-news report: update its sources, figures, as-of date, narration and illustrations before publication.

## One-cycle workflow

```bash
# 1. Start a new storyboard with source+claim gates
python -m newsroom new newsroom/my_story.json
# 2. Author and verify the input (manifest includes scene narration, dated sources)
python -m newsroom validate newsroom/my_story.json
# 3. Obtain one calm, well-paced natural voiceover outside the renderer
#    Prefer one TTS generation with character timestamps; cache the voice file.
python -m newsroom preflight newsroom/my_story.json --voice /path/to/narration.wav
# 4. Optional exact timestamp import from HeyGen's withTimestamps=true JSON
python -m newsroom timing newsroom/my_story.json /path/to/provider_timestamps.json newsroom/my_story_timed.json --srt newsroom/captions_aligned.srt
# 5. Cheap QA draft, then full resolution render
python -m newsroom render newsroom/my_story_timed.json --voice /path/to/narration.wav --subs newsroom/captions_aligned.srt --preview --strict
python -m newsroom render newsroom/my_story_timed.json --voice /path/to/narration.wav --subs newsroom/captions_aligned.srt --strict --out newsroom/output/story_final.mp4
```

If you only have a narrated WAV and no timecodes, run a **non-strict preview**. It will allocate scene timing and subtitles from narration word counts, mark the captions **estimated**, and make you responsible for reviewing them. Do **not** represent those captions as exact. For publication, **both** voice cues and an aligned speech-relative SRT are required by `--strict`; the `timing` command creates both from one HeyGen timestamp record. The renderer adds the intro-lead offset to that SRT automatically.

The engine preserves the visual template while improving the voice. The provided voice track must contain the exact storyboard narration, as confirmed manually or by aligned timestamps; the renderer cannot magically check the spoken words without ASR.

## Smart automation contract (for AI assistants)

1. Research 3+ independent, relevant, dated sources; compare publication dates, event dates, and figure scope. If fewer sources genuinely exist, report that limitation. Do not fabricate sources.
2. Draft 45–75s analysis with an arresting question, one quantified fact, one counterexample, bull/bear mechanisms, and a non-predictive conclusion. Classify factual versus interpretive claims, attribute dates and source URLs in JSON.
3. Produce a manifest with 6–10 scenes; no screenshots of copyrighted news articles. Use graphs only with attributable numbers; illustrative images clearly labelled, never fake a data series.
4. Generate a **natural** English newsroom voice via licensed TTS (e.g., HeyGen) or human narration. Do not silently substitute robotic offline voices. Prefer whole-script synthesis with character timestamps; cache remote URL download with hash, record `voice.provider`.
5. Feed the exact narration and timestamps into `python -m newsroom timing ...`. Render 9:16 preview first; inspect subtitles and key frames, fix font overflow and bad pronunciation. If transfer or synthesis fails, **do not** change providers multiple times unpredictably; stop and report the recoverable stage.
6. Run `render --strict` then check `*_QA.json` and listen to opening, midsection and conclusion. Only an MP4 with `passed: true` can be reported as complete.
7. Deliver MP4, .srt, source ledger and QA.json; save the exact verified MP4 to user-selected Library/Drive destination on request. Never claim upload until the service confirms it.

## Outputs and caching

`render` writes `story_final.mp4`, `story_final.srt`, `story_final_QA.json`, `story_final_SOURCES.md` next to each other. The hidden `.my_story-production-cache` stores deterministic PNGs, encoded H.264 scene clips, a scene fingerprint ledger, a generated low-level score and an intermediate visuals file. Unmodified scenes are reused on subsequent runs. A `--preview` produces 432 × 768, 15 FPS; full is 1080 × 1920, 24 FPS.

**Privacy/security:** no credentials in JSON or commits; no runtime network requests; no remote TTS requests in the renderer; user-provided file paths only. No publishing tokens, Mux secrets, API keys or user private context in Git. GitHub Actions runs only basic tests with synthetic stand-in audio, not expensive external speech synthesis.

**Rights:** original Pillow/NumPy graphics and procedural soundbed. Any added photos, video, music or voice require licence and attribution. Voice is synthetic when generated by TTS and must be disclosed. An independent editorial project should not pose as Al Jazeera, Reuters, or another organisation.

## Alternative evaluated

Creating a completely new standalone repository would provide a cleaner project boundary, but the available GitHub integration is limited to existing repositories. The dedicated branch is therefore a practical, reversible solution for versioning and interrupt-resume handoffs. Existing `main`, player packages, demos and deployment paths are unchanged. Generated videos belong in Library/Drive, not Git history.

## Engineering limitations

- Captions are proportional estimates unless real timecodes/aligned SRT are supplied. Exact character offsets are imported only when TTS output exactly matches the manifest; the `timing` command also exports truly aligned caption timings. The renderer may succeed technically while the editorial narrative or delivery is wrong; a listening pass remains required.
- Static editorial cards receive subtle motion, not true scene footage. This can be compelling for explanatory data, but field reporting benefits from licensed live footage and professional human editing.
- FFmpeg subtitle filtering requires a build with libass. Rendering takes longer at 1080 × 1920. Scene-cache input signatures exclude renderer source-code changes: clear the hidden cache after modifying `graphics.py` or FFmpeg visual effects.
- News verification, social-media upload, and app tokens live outside this code. The engine is deliberately not a fact-checker, ASR system or background automation.