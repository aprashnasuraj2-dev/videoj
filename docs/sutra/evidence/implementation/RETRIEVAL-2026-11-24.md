# SUTRA deterministic transcript retrieval evidence — 2026-11-24

Exact observed implementation: `35be38bc80cade335110c6f38c1966123c7707d9`  
Green job: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45299131018/job/138126934790

## Scope

The retrieval layer is the existing `packages/sutra-source-tools` package. It is deterministic, read-only and catalog-bound. It runs before any optional semantic/model behavior; model prompts are not used to decide which cue exists.

## Contract

`search_lesson` accepts:

- literal query: 1–120 characters;
- optional exact source ID;
- optional finite ordered start/end interval within 0–86,400 seconds.

It returns at most **5** receipt candidates. Catalogs are snapshotted and bounded to at most 20 sources, 500 cues/source and 2,000 characters/cue. Serialized output is capped at 16 KiB.

Each result is a source receipt containing stable source ID/version/hash/media hash, cue ID, exact start/end interval and exact excerpt. Every returned receipt is passed through the separate evidence validator against the host-owned catalog before it can leave the tool.

Truth status remains `unverified`.

## Search semantics

- matching is literal case-insensitive substring search; regex/evaluation is not performed;
- source filtering is exact source ID equality;
- time filtering requires the whole cue to be contained in the requested interval;
- result ordering follows the stable snapshotted catalog/cue order;
- identical fixed query/filter input produces identical receipt output when the injected retrieval timestamp is fixed;
- absent/irrelevant text returns an empty receipt list, not a guessed answer;
- exact `read_cue` returns one cue or a NOT_FOUND error.

Source text is returned as the exact receipt excerpt. No model-authored summary is mixed into the retrieval result.

## Failure cases observed in tests

The exact tested suite covers:

- unknown tool names;
- URL/DOM/script/code-like extra arguments;
- missing required fields;
- whitespace-only and >120-character queries;
- duplicate/ambiguous catalog entries;
- duplicate cue IDs;
- invalid duration/hash/cue metadata;
- >2,000-character cue text;
- regex-like query `.*` producing no match rather than evaluation;
- missing exact cue;
- source and interval filters;
- incomplete, inverted, negative and over-bound intervals;
- fixed-query reproducibility and exact excerpt preservation.

These failure cases are defined in tool/schema tests, not “fixed” by changing model prompts.

## Phase-051 mapping

- P051-01 deterministic retrieval: implemented by literal `search_lesson`.
- P051-02 stable IDs: every candidate is a validated source/cue receipt.
- P051-03 bounds: query/candidate/cue/output limits are enforced.
- P051-04 filters/boundaries: exact source and containing time interval.
- P051-05 no match: empty candidate set.
- P051-06 source/model separation: source tool emits excerpts/receipts only.
- P051-07 reproducibility: fixed query/filter regression is deep-equal.
- P051-08 failure cases: explicitly enumerated and tested independent of prompts.
- P051-09 artifact: this report plus package README/tests.
- P051-10 exit: corpus-backed cue IDs only; irrelevant material returns no supported match.

## Limitations

The corpus is synthetic. Deterministic retrieval quality on real educational content remains dependent on rights-cleared ingestion and later evaluation. Literal search can miss paraphrases; that is an intentional precision-first tradeoff before optional semantic retrieval. A component returning valid source references does not establish that the source itself is factually correct.
