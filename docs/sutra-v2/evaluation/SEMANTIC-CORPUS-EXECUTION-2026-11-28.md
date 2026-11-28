# Semantic corpus execution and human review protocol (2026-11-28)

## Evidence inventory

| Artifact | Records | Scope and provenance |
|---|---:|---|
| AmbiEnt full | 1,645 | External human NLI ambiguity labels; 3,290 statement sides |
| AmbiEnt category | 100 | External human category artifact; 23 IDs overlap full |
| TempAmbiQA | 8,162 | External human temporal ambiguity only, 8,161 distinct questions |
| SUTRA model-authored v1 | 4,000 | 2,860 distinct question strings; 438 distinct candidate-meaning pairs; no human annotation |
| SUTRA contrast v1 | 40 | Two distinct scenarios per family; 120 original and explicit target-distinction prompts; synthetic witnesses |
| McGill Scope Ambiguity 1B/2A/2B | 2,230 base rows | External human-validated scope constructions; 1A excluded for upstream copyright restrictions; 8,553 matched crowdsourced judgments retained only as identifier-minimized aggregates |

The raw AmbiEnt/TempAmbiQA artifacts contain 9,907 records before cross-source deduplication; the AmbiEnt files are known to overlap. McGill scope evidence is tracked separately because its base rows and crowdsourced judgments have different units of analysis. Do not sum these as independent examples. No hidden model training corpus is claimed.

## Offline execution and evidence

Run from repository root:

```sh
SUTRA_SEMANTIC_CORPUS_REPORT=corpus.json SUTRA_SEMANTIC_CONTRAST_REPORT=contrast.json SUTRA_TEMPORAL_CORPUS_REPORT=temporal.json node --test packages/sutra-knowledge/test/semantic-corpus-execution.test.mjs
python3 packages/sutra-knowledge/reference/verify-semantic-corpus-report.py corpus.json contrast.json
python3 packages/sutra-knowledge/reference/verify-temporal-corpus-report.py temporal.json
python3 packages/sutra-knowledge/evaluation/acquire-tempambiqa.py --verify-local packages/sutra-knowledge/evaluation/tempambiqa-human-full-v1.json
```

Reports are stratified by family/domain and record-vs-distinct-question count. Gold labels are not supplied to the actual engine; its constant neutral alias fixture is deliberately not a source of question-specific evidence. NLI statement-side cue agreement and temporal reporting-period cue distributions do not establish entailment, context-aware intent resolution or empirical truth. The temporal baseline is evaluation-only, developed with public examples already visible. On 8,162 rows it classified 795 (9.74% coverage), of which 636 were correct (80% selective accuracy); 7,367 abstentions remain visible. No checklist closure or held-out accuracy claim follows from those development results.

## Blinded review (SEM-008 / SEM-009)

Export the packet once:

```sh
python3 packages/sutra-knowledge/evaluation/semantic-human-review.py export review-packet.json
```

Distribute only the exported packet, the taxonomy and instructions below to at least two independent human reviewers. Do not distribute candidate interpretations, expected family, model outputs or conditional answers. Reviewer pseudonyms must differ. The packet removes model labels; independence and blinding are self-attested, not automatically proven.

For each question and hypothetical context, reviewers should independently determine whether different plausible meanings materially affect the answer; identify the main ambiguity family or OTHER; record at least two plausible meanings for MATERIAL_AMBIGUITY; note missing context, ambiguity of the rewrite, or reasons for disagreement. Record actual active review time in seconds. Do not reconstruct timing after the fact. A separate adjudicator should inspect disagreements before any human-gold label is accepted. Preserve each original annotation and adjudication separately.

Each reviewer submits JSON of this shape (one annotation per packet case):
```json
{
  "packetSha256": "SHA-256 printed by export",
  "reviewerCode": "reviewer-pseudonym",
  "independentReviewAttested": true,
  "goldNotViewedAttested": true,
  "annotations": [
    {
      "caseToken": "opaque token from packet",
      "disposition": "MATERIAL_AMBIGUITY",
      "family": "reporting_period",
      "elapsedSeconds": 45,
      "candidateMeanings": ["First plausible meaning", "Second plausible meaning"],
      "notes": "Reasoning or missing evidence"
    }
  ]
}
```

Other dispositions: NO_MATERIAL_AMBIGUITY and INSUFFICIENT_CONTEXT. Family may be OTHER or NONE when appropriate.

```sh
python3 packages/sutra-knowledge/evaluation/semantic-human-review.py score review-packet.json review-a.json review-b.json
```

The scoring utility validates the pinned packet and completeness, rejects same-reviewer submissions, calculates agreement and Cohen's kappa for disposition/family, measures mean/median/p90/total elapsed review time, and identifies cases needing adjudication. It never overwrites model-authored source records or labels. No real human review times or independent SUTRA contrast labels have yet been collected. The engine's abstention rate and human review burden must remain separate.

## 2026-11-28 deep semantic execution results

The bounded semantic engine now separates **reviewable natural language** from **executable closed-grammar candidates**. On the current semantic candidate, all 4,000 SUTRA synthetic questions and all 3,290 AmbiEnt statement sides enter `SEMANTIC_REVIEW` rather than falling through as unsupported. TempAmbiQA has 8,161 reviewable questions and one fail-closed input. Review-only language still creates zero arithmetic candidates.

Evidence context is now a first-class input to semantic obligations. On the 40 model-authored material contrast scenarios, target-family review is triggered in 20/40 question-only cases and 40/40 when the supplied evidence context is included. This is development evidence, not independent human accuracy.

Temporal selector v2 keeps abstention explicit. On all 8,162 TempAmbiQA records: 1,136 resolved (13.92% coverage), 83.10% selective accuracy, 86.65% precision, with 7,026 abstentions. This improves the previous 9.74% coverage / 80.0% selective accuracy baseline. Rules were developed after public-corpus inspection; scenario-disjoint fold results are post-hoc robustness measurements, **not unseen-test estimates**.

External scope-structure results:
- Experiment 1B: 809/837 target sentences detected (96.65% recall; positive-only dataset, so no meaningful specificity claim).
- Experiment 2A: 87.5% precision, 72.41% recall, 81.03% accuracy against upstream lexical controls.
- Experiment 2B: 93.59% precision, 66.97% recall, 81.19% accuracy against upstream lexical controls.

Human-response burden evidence is kept separate from runtime review flags. For Experiment 1B, 796 final items have matched crowdsourced responses with 94.41% mean majority share and 0.203 mean binary entropy bits. Experiments 2A/2B have mean within-item Likert standard deviations of 1.476 and 1.383 respectively. Upstream data do not contain elapsed review time; actual SUTRA human elapsed time therefore remains unmeasured rather than estimated.

Residual structural-detection errors are explicit: 28 false negatives in 1B; 8 false negatives + 3 false positives in 2A; 36 false negatives + 5 false positives in 2B. These are **not** residual errors after a completed human-review workflow.

Scenario grouping masks years, numbers and content words and hashes the structural key to 70/15/15 folds. TempAmbiQA yields 5,784 distinct scenario keys; McGill scope yields 621; both have zero cross-fold scenario-key overlap. The 4,000 model-authored records collapse to only 70 structural keys and therefore remain **development-only**; no synthetic held-out generalization claim is permitted.

Measured in an isolated Linux x64 Node v26.12.1 process on 12,134 unique inputs, the context analyzer processed ~84.5k inputs/s with p50 8.35 µs, p95 10.70 µs and p99 13.47 µs. A full reviewed-preview path sampled over 2,000 questions processed ~4.25k/s with p50 196 µs, p95 272 µs and p99 936 µs. Memory deltas are allocator/GC-sensitive; the observed peak heap was ~23.3 MiB for the analyzer and ~29.7 MiB for full preview. CI now records a fresh performance artifact instead of treating these host-specific numbers as universal.

The focused semantic gate runs before the full knowledge regression so unrelated subsystem failures cannot suppress semantic evidence artifacts. The integration branch independently repaired its EIA revision fixture by supplying complementary threshold predicates; this semantic integration preserves that stricter multi-candidate contrast contract.

## Evidence still not established

- Actual active human review time for SUTRA's blinded contrast packet.
- Independent adjudication of the 40 model-authored contrast labels.
- Absence of model-training contamination in public human datasets.
- End-to-end semantic resolution accuracy across all 20 families; the current engine measures review obligations and bounded executable candidates, not general semantic truth.
