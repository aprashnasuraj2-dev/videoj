# SUTRA uncertainty, abstention and conflict guidance — 2026-11-24

Implementation under observation: `09deac5725b3e7e0b45b1cf7e5249305920c019f`.

## Purpose

A cautious-looking UI is insufficient if it can still invent a citation or implicitly choose a winner. SUTRA therefore maps comparison state to a deterministic claim disposition outside model preference.

## Policy states

`buildUncertaintyGuidance(comparison)` accepts only known comparison outcomes:

| Comparison state | Disposition | Meaning |
| --- | --- | --- |
| `missing_source` | `abstain` | Required evidence is absent. |
| `unresolved_conflict` | `abstain` | Sources disagree; no winner selected. |
| `incomparable` | `abstain` | Scope/question differs; agreement cannot be inferred. |
| `invalid_source` | `abstain` | Source record cannot support a claim. |
| `consistent_unverified` | `unverified_match` | Structured values match, but semantic support/reliability/truth remain unverified. |

An unknown state such as `verified` is rejected rather than receiving generic confident guidance.

Every guidance result carries `certification: "none"`.

## Citation/source identity rule

Guidance derives source references only from source records that actually exist in the comparison result.

- missing guide -> only the video source identity can appear;
- unresolved conflict -> both separate source identities remain visible;
- invalid source -> no fabricated source reference is emitted;
- no placeholder citation is invented merely to avoid abstention.

The source excerpts remain in their separate source cards; guidance does not merge them into a synthetic consensus.

## Visible next human step

The comparison UI now renders an explicit `Next human step:` message:

- missing source -> connect/review the missing original source before deciding agreement;
- conflict -> inspect the separate original excerpts and use a human reviewer; do not choose a winner automatically;
- incomparable -> align question and source scope;
- invalid source -> repair/replace the invalid source record;
- matching values -> review semantic support and source reliability before treating the match as factual.

This guidance is deterministic UI policy, not model-authored advice.

## Safety/claim boundary

The comparison engine already:

- preserves `missing_source`, `unresolved_conflict`, `incomparable`, `invalid_source`, and `consistent_unverified`;
- keeps video and guide identities/excerpts separate;
- snapshots results so later caller mutation cannot rewrite the comparison;
- rejects malformed claims without copying their text into the output;
- treats type mismatch as conflict;
- never labels a matching structured value as factual truth.

The evidence validator separately rejects invented sources/cues and altered quotations, so abstention cannot be bypassed by a fabricated reference.

## Tests

Unit tests require:

- missing evidence -> abstain, one real source identity only, no absent-guide reference;
- conflict -> abstain, both identities, explicit no-auto-winner guidance;
- incomparable/invalid -> abstain;
- matching values -> `unverified_match`, never certification;
- unknown `verified` state -> rejected.

Browser assertions require the visible missing-source and conflict views to carry `data-disposition="abstain"` and the appropriate human next step.

## Phase-055 status

This supports:

- P055-01 visible unsupported/conflict states;
- P055-02 abstention when required evidence is missing;
- P055-03 separate source identities;
- P055-04 interpretations/matches remain unverified rather than facts;
- P055-05 no technical certification/guarantee;
- P055-07 no fabricated citations to avoid refusal;
- P055-08 useful next human step;
- P055-09 this reviewed artifact.

**P055-06 remains open:** the 40-case human-reviewed held-out evaluation set from phase 053 does not yet exist, so SUTRA cannot claim “all unanswerable/conflicting evaluation fixtures” were tested. Consequently P055-10 also remains open.

## Counterexample / limit

A synthetic conflict fixture can prove the UI preserves disagreement, but it cannot prove robust behavior across real held-out cases. That is why the phase exit remains gated on the evaluation set rather than treating a few deterministic fixtures as comprehensive safety evidence.
