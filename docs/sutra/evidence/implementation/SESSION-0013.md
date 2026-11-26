# SUTRA session 0013 — grounding backlog reconciliation and source-drift hardening

- Exact observed implementation: `09deac5725b3e7e0b45b1cf7e5249305920c019f`.
- Passing full learner/build/browser job: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45300306959/job/138130900092
- Standalone evidence-package job: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45299599195/job/138128506874
- Observation: 2026-11-24T06:35:53+05:45.
- Development branch: `sutra/caller-peer-failure-boundary`, draft PR #49; **development only, no release**.
- Prior machine register: 371 / 1,000 verified checks, 27 / 100 fully verified phases, 1 intentional omission.

## Exact-head validation

The full job passed:

- **67 learner/app tests**, 67 pass / 0 fail;
- **49 consent/inference/source/API tests**, 49 pass / 0 fail;
- all 10 pinned upstream module hashes;
- **97 runtime/peer/privacy tests**, 97 pass / 0 fail;
- **7 independent peer-publication tests**, 7 pass / 0 fail;
- nine Chromium profiles: learner, standalone consent, two-origin peer, MCP, accessibility, CSP/security, resilience, low-bandwidth performance and visible hero journey.

The same exact code therefore carries the previously observed Session 0012 locale/date semantics, immutable rollout retention, milestone-C hero journey and peer-denial/local-evidence behavior together with the new stale-card and uncertainty changes.

The standalone evidence package additionally passed **27/27** tests, including exact v1 quotation-fidelity regressions.

## Session 0012 work now credited

The machine register had intentionally not credited the Session 0012 artifact until a stable exact head existed. This checkpoint credits:

- P048-06 deterministic Gregorian UTC date/unit presentation across English/Nepali draft;
- P068-06 retention of prior immutable hashed assets/content-addressed graphs while mutable pointers remain fresh;
- P050-01, P050-03 through P050-09 for the visible local hero-state journey, review consistency, peer-refusal resilience, 360px keyboard path and milestone risk artifact.

P050-02 remains open because paid/default inference discovery cannot be demonstrated while live funded inference is intentionally disabled. P050-10 therefore remains open.

## Phase 051 — deterministic transcript retrieval

The existing `packages/sutra-source-tools` implementation was materially complete but stale in the checklist.

Observed behavior:

- literal deterministic `search_lesson` before optional semantic/model behavior;
- stable source/cue/version/hash/media-hash/time/excerpt receipts;
- query <=120 chars, <=5 candidates, <=2,000 chars/cue, <=16 KiB result;
- host catalog <=20 sources and <=500 cues/source;
- exact source filter and containing time interval;
- empty list for absent/irrelevant literal text;
- exact `read_cue` or NOT_FOUND;
- fixed query/filter result reproducibility with injected fixed retrieval time;
- source excerpt remains separate from model-authored output;
- invalid URL/DOM/script/unknown-tool/interval/catalog inputs fail before retrieval.

This closes P051-01 through P051-10. Evidence: `RETRIEVAL-2026-11-24.md`.

## Phase 052 — answer/evidence validation

The standalone validator validates source/cue existence, exact time interval, source/media hashes, source version and exact quotation against an independent catalog. Without a catalog, a receipt can only be `shape_only`.

Renderable source excerpts require exact catalog-backed quote equality. Interpretations remain explicitly `interpretation_unverified`. Unsupported claims remain `unsupported`. The validator returns stable source/cue references consumed by the visible comparison/native-seek path.

The standalone evidence workflow passed fabricated-cue, altered-quote, impossible interval/date, changed hash/version/media, self-verification, ambiguous source, no-catalog and exact-whitespace/case quotation regressions.

This closes P052-01 through P052-10. Evidence: `EVIDENCE-VALIDATION-PIPELINE-2026-11-24.md`.

## Phase 056 — source/media drift and stale saved reviews

Receipts were already bound to source version/hash, media hash, cue interval and exact text. This session adds a first-class stale saved-review path.

The review store now separates structurally readable local storage from current evidence validity:

- `inspect()` returns valid or stale;
- stale records preserve old source ID/version/source hash/media hash/cue/interval plus stable mismatch codes;
- valid `list()` refuses collections containing stale evidence;
- stale records remain explicitly deletable;
- stale evidence cannot be mixed into a new confirmed valid save until removed;
- no source ID/version/hash is silently rewritten to make an old card fit a new source.

Unit tests cover source-version, media-hash, transcript/source-hash, duration and receipt-schema drift.

Chromium mutates a persisted card to a retired source version, reloads, observes a visible stale warning and old provenance, confirms that the normal valid-download action is absent, and deletes the stale card explicitly.

This closes P056-01 through P056-10. Evidence: `VERSION-DRIFT-2026-11-24.md`.

## Phase 055 — uncertainty advances but remains open

A deterministic uncertainty policy now maps comparison state to claim disposition:

- missing source -> abstain;
- unresolved conflict -> abstain;
- incomparable -> abstain;
- invalid source -> abstain;
- matching structured values -> unverified match, not fact.

It derives source references only from actual source records; it cannot invent an absent guide/citation. Every state exposes a concrete next human step and `certification: none`. The visible comparison renders this next step.

This supports P055-01 through P055-05 and P055-07 through P055-09.

P055-06 remains open because phase 053's 40-case **human-reviewed held-out evaluation set** does not exist. A few synthetic deterministic fixtures cannot substitute for “all unanswerable/conflicting evaluation fixtures.” Therefore P055-10 remains open. Evidence: `UNCERTAINTY-GUIDANCE-2026-11-24.md`.

## Human/external gates prepared but not converted into passes

- Fresh-viewer protocol exists, but no genuine participant result exists.
- Nepali terminology review queue exists, but no human terminology sign-off exists.
- Physical touch/screen-reader acceptance remains unperformed.
- Original rights-cleared lesson and reviewed written guide remain absent.
- Live funded inference remains disabled pending provider/budget authorization.
- Independent public HTTPS peer/MCP, production route/headroom and real rollout/rollback remain unverified.
- No package delivery or Devpost submission occurred.

## Register result

Newly credited relative to the prior machine register: **48 checks**.

Result: **419 / 1,000 verified checks**, **1 intentional omission**, **30 / 100 fully verified phases**.

No checklist percentage is treated as effort-weighted release readiness.
