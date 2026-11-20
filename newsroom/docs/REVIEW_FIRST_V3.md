# Newsroom Engine v3 — review-first production, not render-first

## Why this change was necessary

The Balen India reel failed **editorial quality**, despite a technically valid MP4. The previous process optimized for whether FFmpeg produced an H.264 file rather than whether a Nepal-based viewer would understand the words, trust the evidence or want to watch. It used repetitive static slides, unsuitable eSpeak narration, broken or unidiomatic Nepali, and visual regression tests that checked for **any bright caption pixels**, not the right words.

**New definition of done: a video must pass three separate gates.**

| Gate | Machine can verify | Human must check | Failure action |
| --- | --- | --- | --- |
| Evidence and script | Sources dated, reported claims cite source IDs, no broken replacement glyphs, story cutoff consistency | Source actually supports the precise number, counterexample, native Nepali idiom and editorial balance | Rewrite before any narration purchase |
| 14-second audition | Audio/video is playable, sample and storyboard hashes recorded, SRT timecodes valid, text/caption coverage | Sound like a real Nepali speaker, actual pronunciation, visual originality, mobile readability and punchy opening | Reject voice/script/style BEFORE 70-second full render |
| Publication | Same approved hashes, consent recorded, source recheck <24h old, valid H.264/AAC 1080×1920 with loudness and proper runtime | Final playback and word accuracy, event-date risk, clip rights, no synthetic footage passed off as real | Do not label as final; regenerate only affected stage |

### CLI commands

```bash
# 1. Editorial/source facts first (requires typography packages)
python -m newsroom validate newsroom/stories/your-story.json

# 2. Create all-scene stills even without a voice
python -m newsroom review-pack newsroom/stories/your-story.json \
    --out newsroom/output/your-story-review

# 3. Add a previously auditioned, licensed ne-NP voice and exact timing SRT
python -m newsroom review-pack newsroom/stories/your-story.json \
    --voice /private/your-voice.wav --subs /private/your-captions.srt \
    --out newsroom/output/your-story-review --seconds 14

# 4. Open review.html LOCALLY. Listen + inspect the story. Sign the *existing*
#    assets manually and click Download sign-off. Every checkbox starts false.
#    Keep your consent record private; NEVER upload a speaker's sample to GitHub.

# 5. Make the release decision. By design, no approved sample => exit 2.
python -m newsroom release-check newsroom/stories/your-story.json \
    --voice /private/your-voice.wav --subs /private/your-captions.srt \
    --opening newsroom/output/your-story-review/opening_14s.mp4 \
    --approval /private/human_review_approved.json

# 6. Strict full render is BLOCKED before approval, and re-checked afterward.
python -m newsroom render newsroom/stories/your-story-timed.json \
    --voice /private/your-voice.wav --subs /private/your-captions.srt \
    --strict --release \
    --approval /private/human_review_approved.json \
    --review-opening newsroom/output/your-story-review/opening_14s.mp4 \
    --out newsroom/output/your_story_RELEASE.mp4
```

**Important:** If you approve a story manifest, then create a different `-timed.json` manifest for release, its SHA-256 changes and approval is invalid. Create the final timed manifest *before* the sample and review it as the same file. The output includes hashes of the script, voice, subtitles and 14-second sample, so changes to any one require a fresh review.

## Voice policy: sample ≠ permission to clone

Use a consented 30–60s voice reference to study pacing, rhythm, accent and phoneme errors. It does **not** automatically authorize cloning. To clone any identifiable person's voice, receive explicit separate consent and check provider cloning permissions. Keep source recordings in a private directory, never commit them to a public repository. `voice_owner_consent` confirms audio usage permission; `voice_clone_permission` is separately required when the manifest states a voice clone was used. A real human narrator with a normal voice is preferable to synthetic narration that performs poorly.

Model support does not establish quality. An `ne-NP` label is necessary but not sufficient. Preflight requires a human to actually listen and reject unnatural cadence, Hindi-influenced delivery, incorrect names/dates and wrong pronunciation even if the provider emits word timestamps.

## Quality criteria with real costs

- **One 14s audition versus a 70s master:** the audition is 20% of the duration and uses low-resolution preview frames. This avoids spending full-render resources on a rejected idea. Actual speed and voice-provider cost savings depend on pricing and caching; this is not a verified 80% cost saving.
- Cache source evidence, audio by hash, source frames and high-resolution segments. Changing only a corrected caption must not regenerate original media or regenerate paid voice unnecessarily. Never regenerate paid voice if only the graphics are changed.
- The human review must score **Nepali copy, pronunciation, visual storytelling and narration naturalness ≥4/5**. Every checklist item must be signed, no default approvals. The note must document concrete observations. The quality review is an editorial attestation, not an AI-generated score.
- **Alternative rejected:** automatic full render plus pixel checks. It is fast to program but repeatedly shipped bad narration and unidiomatic text. The 14-second review gate produces an extra deliverable but is operationally cheaper than repeatedly redoing a 70-second video.

## Known technical boundaries

1. No text checker can prove that a Nepali sentence is idiomatic, that a Reuters source truly supports a statistic, or that a voice sounds natural. These require editorial human review; do not auto-approve the HTML form.
2. Script/SRT text coverage compares written text, not the actual words *spoken* in audio. Exact word timings or independent speech transcription are necessary to prove audio/script alignment. Even correct SRT can be mistimed.
3. Review hashes prevent accidental use of stale approvals, but this JSON review is **self-attested, not a cryptographic signature**. A malicious operator can forge it. Keep review records and media in controlled storage.
4. FFprobe, loudness, and bright-pixel subtitle checks alone do not guarantee the correct words on screen; inspect actual exported frames at the beginning, middle and end. The UI review explicitly places all scenes side by side.
5. Full render currently favors stylized cards and charts. To achieve documentary quality, the story must plan maps, licensed documentary B-roll, and distinctive motion design; software cannot fabricate authentic diplomatic footage.
6. Do not continue calling a pre-visit news explainer "upcoming" after the visit begins. Verify source/meeting status again before publishing.

## Publishing handoff requirements

A release folder contains the full verified MP4, .srt, evidence ledger, QA report, reviewer signoff and source manifest. Also retain a project/source ZIP for reproducibility. Back up the verified MP4 to ChatGPT Library or a user-selected Drive folder; only claim saved after receiving confirmation. The GitHub repository stores code, manifests and tests—not large MP4s or private voice samples. The `main` branch remains untouched.