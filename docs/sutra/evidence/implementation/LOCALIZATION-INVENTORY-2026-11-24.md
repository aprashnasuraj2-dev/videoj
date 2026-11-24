# SUTRA core localization inventory — 2026-11-24

Reviewed against exact code `2686e3cacdd3e4d552820ccaf57b968a7544ddb4` and https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45297219581/job/138120560126.

## Policy

English is the complete canonical/default interface. Nepali is an explicitly labeled **working draft** until a human reviews technical terms and ambiguity. Localization is a presentation concern only: switching language must not remount media, mutate source evidence, reset consent/run state, rewrite provenance or imply factual review.

The current fixed catalog contains **52 English keys and 52 matching Nepali draft keys**.

## Localized core inventory

| Area | Localized now | Data deliberately not translated |
| --- | --- | --- |
| Language/header | language label/options, local-shell stage, Nepali review notice | build/version identities |
| Hero | task eyebrow, two-line heading, introduction, synthetic-example notice | none |
| Lesson | section/title, original-lesson pending notice, load/seek/playback control labels | actual cue text, source IDs/versions |
| Evidence | section/title/help text, check/alter controls | receipt excerpt and validation codes |
| Transcript | heading, search label and placeholder | cue wording, cue IDs, MM:SS source anchors |
| Comparison | section/title/help text, actions, card headings, metadata field labels, missing-source note | source excerpts, structured values, provenance values, versions, observed timestamps |
| Review | section/title/help text, preview/confirm/cancel controls | receipt/source payload values |
| Peer | run control | origin, network/tool/agent identifiers and diagnostic detail |

## Diagnostics still intentionally English

Dynamic runtime/peer/MCP error/status sentences are not partially machine-translated in this checkpoint. Their stable codes and security meaning are more important than cosmetic coverage before terminology review. This is an intentional P048-08 scope cut, not an assumption that the bilingual phase is complete.

The inventory therefore still requires follow-up for:

- human review of Nepali technical vocabulary and ambiguous terms (P048-03);
- a deliberate timestamp/unit/date presentation policy (P048-06);
- dynamic status/error localization after that terminology review;
- a final reviewed terminology artifact (P048-09).

## Source isolation

Only nodes explicitly carrying `data-i18n` or `data-i18n-placeholder` are mutated by the locale function. Source excerpts and cue wording do not carry those attributes.

The exact-head browser evidence switches to Nepali after selecting evidence and confirms:

- the source cue text is byte-for-display unchanged;
- the selected cue remains selected;
- validation state remains matched;
- a comparison rerender keeps the selected locale while its hypothetical source excerpt remains original-language text;
- a completed scripted local run and its sanitized trace remain present after switching languages.

No locale preference is persisted to localStorage, sessionStorage, IndexedDB or cookies.

## Fallback behavior

- unsupported locale -> English catalog;
- missing Nepali key -> matching English key;
- globally unknown key -> stable key identity rather than invented wording;
- every current Nepali key is unit-tested to have a non-empty English equivalent.

This fail-open-to-English behavior keeps the judge/builder surface usable without silently manufacturing a translation.

## Human-review boundary

Machine-authored Nepali text must not be described as reviewed. The visible language control exposes `data-nepali-reviewed="false"` and the page states that terminology review is pending. P048-03 and P048-09 remain open until a human reviewer signs off.
