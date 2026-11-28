# Independent semantic review protocol — pending actual reviewers

Status: **NOT EXECUTED**. No human approval is asserted.

Use the frozen source items and scenario folds, keeping synthetic development data separate. Existing public annotations are external evidence but are not review of SUTRA's answers. Select a reproducible, stratified pilot from all 20 ambiguity families and include unambiguous controls; where no independent gold case exists, label the item as newly authored and require adjudication rather than assuming its answer.

1. Freeze the exact engine revision, input corpus digest, case IDs, and prediction file before distributing packets.
2. Recruit two independent reviewers. Hide system identity, predicted family, predicted disposition, and the other reviewer's answers. Randomize order with a recorded seed, preserving source context required by each item. Do not show benchmark labels.
3. For each item record: case ID; reviewer ID; intended interpretation(s); ambiguity family/families or none; source quote with location if applicable; justified action (answer, clarify, abstain); uncertainty; elapsed review seconds; free-text reason. Record missing context as a distinct outcome, not an error to be guessed away.
4. Preserve each original review unmodified. Report exact agreement, family agreement, disagreement and missing-context counts, and Cohen's kappa for single mutually exclusive dispositions where appropriate. Adjudicate discrepancies separately; include an adjudicator identifier and rationale. Do not replace initial disagreement in the raw results.
5. Only then join predictions with the adjudicated results. Report recall, precision, specificity, coverage, selective error, missed materially ambiguous questions and review burden. Bootstrap confidence intervals at scenario-group level, not paraphrase level. Report any unresolved disagreements and both raw and adjudicated denominators.
6. Do not use these items for tuning and then call them a blind holdout. Freeze a separate follow-up sample before tuning if necessary.

Acceptance: independent reviewers submit actual dated records; no fabricated timing, inter-rater reliability or sign-off. The existing 40 context controls are development tests, not substitutes for this pilot. The experimental first-pass queue heuristic and temporal V3 are rejected as defaults on current comparative results.
