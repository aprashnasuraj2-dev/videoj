# Semantic corpus execution and human review protocol (2026-11-28)

## Evidence inventory

| Artifact | Records | Scope and provenance |
|---|---:|---|
| AmbiEnt full | 1,645 | External human NLI ambiguity labels; 3,290 statement sides |
| AmbiEnt category | 100 | External human category artifact; 23 IDs overlap full |
| TempAmbiQA | 8,162 | External human temporal ambiguity only, 8,161 distinct questions |
| SUTRA model-authored v1 | 4,000 | 2,860 distinct question strings; 438 distinct candidate-meaning pairs; no human annotation |
| SUTRA contrast v1 | 40 | Two distinct scenarios per family; 120 original and explicit target-distinction prompts; synthetic witnesses |

The raw human annotation artifacts contain 9,907 records in total before cross-source deduplication; the AmbiEnt files are known to overlap. Do not sum them as independent examples. No hidden model training corpus is claimed.

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

## Remaining release evidence

- Exact integrated CI success and actual full-engine report, including independent arithmetic and baseline checks.
- Context-grounded candidate-meaning comparison and independent adjudication.
- Cross-source overlap and contamination audit beyond exact strings; held-out split by semantic scenario rather than repeated template.
- End-to-end semantic convergence, actual human review time, residual error after review, and measured runtime/resources.
