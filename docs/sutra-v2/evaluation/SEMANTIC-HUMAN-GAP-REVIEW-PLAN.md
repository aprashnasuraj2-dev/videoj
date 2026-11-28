# Direct-human evidence gap review plan

SUTRA currently has direct external human task/annotation evidence for 4/20 semantic ambiguity families. The other 16 families cannot be upgraded to “human validated” by generating more model-authored labels.

This plan converts those gaps into a reproducible blinded review workload.

## Statistical planning assumption

For a binomial review outcome with 95% normal-approximation confidence and no assumed event rate, use the worst-case variance p(1-p)=0.25:

`n = ceil(1.96^2 × 0.25 / margin^2)`.

- Pilot precision ±15 percentage points: **43 cases/family**.
- Tighter precision ±10 percentage points: **97 cases/family**.

For 16 gap families and two independent reviewers:
- Pilot: 688 blinded cases, **1,376 judgments**.
- Tighter plan: 1,552 cases, **3,104 judgments**.

At 20 / 45 / 90 seconds active review per judgment, the pilot alone implies about **7.6 / 17.2 / 34.4 reviewer-hours**. The tighter plan implies about **17.2 / 38.8 / 77.6 reviewer-hours**. These figures exclude adjudication.

## Blinding

`semantic-gap-review-plan.mjs --packet <file>` deterministically selects the lowest SHA-256-ranked 43 model-authored cases in each gap family. Selection uses case ID only. The exported packet contains only an opaque token, question text and a neutral “question-only” context note. It excludes family, expected review state, candidate meanings and material-distinction labels.

The existing `semantic-human-review.py score` format can score two complete independent review files against the packet because it keys only on `caseToken`. Reviewers must record actual elapsed seconds per case, candidate meanings when material ambiguity is found, and a family classification; disagreements require adjudication.

**No human review has been performed by this generator.** Actual elapsed time, inter-reviewer agreement for this packet, adjudicated labels and residual error after review remain empirical work, not inferred values.
