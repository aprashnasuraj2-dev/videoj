# नेपाली / Nepali-first newsroom production

This is a **first-class Nepali path**, not an English subtitle overlay. The story, voice, lower thirds and caption timing are authored in Nepali. Mixed Nepali–English technical terms are allowed when a natural Nepali speaker would use them. The renderer never silently translates prose, changes reported numbers or imitates another newsroom.

## Language selection

| Manifest `metadata.language` | Voice locale | Script | Typography | Caption treatment |
| --- | --- | --- | --- | --- |
| `en` (default for older projects) | chosen English locale | English | Lato / DejaVu Sans | English captions |
| `ne` | `ne-NP` required | Nepali Devanagari | Noto Sans Devanagari + Latin fallback, RAQM + libass | नेपाली captions and `।` phrase punctuation |
| `ne-en` | `ne-NP` required | natural Nepali with English terms | Grapheme-safe script runs, Noto + Lato | Preserve bilingual wording verbatim |

Source numbers may legitimately remain `$1.77T` or be written `१७ खर्ब ७० अर्ब`; the editor must choose a consistent, mathematically equivalent convention. **Never** automatically convert lakh/crore/kharab to western notation. A number formatted correctly is not evidence that its underlying source is true.

## Start a new Nepali reel

```bash
python -m newsroom new newsroom/my_nepali_story.json --language ne
python -m newsroom validate newsroom/my_nepali_story.json
python -m newsroom preflight newsroom/my_nepali_story.json --voice /secure/voice/ne-NP.wav

# Preferred: exact word timings from a trusted speech/aligner output.
# JSON format: {"words": [{"text":"के", "start":0.0,"end":0.18}, ...]}
python -m newsroom timing newsroom/my_nepali_story.json /secure/word_times.json \
  newsroom/my_nepali_story_timed.json --srt newsroom/voice_ne_aligned.srt

python -m newsroom render newsroom/my_nepali_story_timed.json \
  --voice /secure/voice/ne-NP.wav --subs newsroom/voice_ne_aligned.srt \
  --preview --strict
python -m newsroom render newsroom/my_nepali_story_timed.json \
  --voice /secure/voice/ne-NP.wav --subs newsroom/voice_ne_aligned.srt \
  --strict --out newsroom/output/analysis_ne_FINAL.mp4
```

For Nepali with intentional code-switching, use `--language ne-en`. Character-timecode format also remains supported for providers with `original_characters` arrays. Never claim perfect word synchronization from a word-count estimate. A **non-strict preview** may be used to identify layout issues when exact timing isn't ready; only `--strict` with verified timings and an actual natural voice is for publication.

## Natural Nepali narration — what to use

Provider support is **not the same as quality**. As verified on November 20, 2026, Microsoft Azure's published locale table lists `ne-NP-HemkalaNeural` (female) and `ne-NP-SagarNeural` (male). ElevenLabs lists Nepali in its multilingual models. These are options to audition, not an assurance that either sounds like a Nepal-based broadcaster. Availability, access, pricing and quality may change.

- Microsoft documentation: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=text-to-speech
- ElevenLabs supported languages: https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support
- A consenting Nepali-native human voiceover remains the quality benchmark.

**Short audition script (read before spending on the full video):**

> आजको मुख्य प्रश्न—एआईको मूल्यांकन कति टिकाउ छ? कम्पनीको आम्दानी बढ्दै जाँदा लगानीकर्ताको अपेक्षा पनि बढेको छ। तर एउटै सेयरको मूल्य र प्रविधिको वास्तविक उपयोग एउटै कुरा होइनन्। सन् २०३० सम्मको खर्च अनुमान हो, निश्चित परिणाम होइन। अब तथ्य, जोखिम र सम्भावना छुट्याएर हेरौँ।

Listen to sample voice at normal playback speed and score these items 1–5: natural Nepali prosody, consonant/conjunct clarity, proper `छ`, `छन्`, `ऋ`, `त्र` and nasal sounds, numerals/currency, English acronym handling, factual restraint, and absence of a Hindi-register accent. **Require all items ≥4/5; otherwise reject the provider/voice**. This is a human editorial gate, not something measured by FFprobe.

## Nepali editing rules

1. Rewrite **for Nepali listeners**, not literal English-to-Nepali substitution. Simple sentences, one central idea per scene, correct grammatical honorifics, no dramatic certainty on future events.
2. Keep a date and provenance for every reported statistic. Show assumptions and labels; separate *reported*, *inference*, *scenario* and *speculation*.
3. Use familiar loanwords selectively: `AI/एआई`, `data center/डाटा सेन्टर`, `cash flow/नगद प्रवाह`. Never replace an unfamiliar term with an inaccurate everyday word.
4. Prefer natural questions and punctuation `।` and `?`. Limit subtitles to short, timed Nepali phrases. The script and captions must remain verbatim with the spoken audio.
5. Check smartphone preview for clipping, matras above the line, `क्ष`, `ज्ञ`, `श्र`, numerals, `$`, brackets, italic references and long compounds. The renderer rejects overflow rather than truncating claims.
6. Verify fonts: `fonts-noto-core` / `Noto Sans Devanagari`, RAQM-enabled Pillow, FFmpeg with libass. No font redistribution; font paths refer to the production environment.
7. Render and listen at least at beginning/middle/end. Treat listening and factual review as required **manual** acceptance gates even if the automated codec/loudness checks pass.

## Why no automatic translation or unknown TTS fallback?

A wrong Nepali financial unit can change a reported number by **10× or 100×**. Hindi voices can read Devanagari text while sounding plainly non-Nepali. Automatic translation can also erase qualifiers such as `अनुमान`, `सम्भावना`, or `अझै पुष्टि नभएको`. Preserving precise figures, uncertainty and an intelligible local accent matters more than generating audio without human review.