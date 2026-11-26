# SUTRA pre-registered measurement protocols

Created 2026-11-26 **before** the live 20-run reliability sample and before the manual-vs-SUTRA participant comparison.

This document defines methods only. It contains **no measured result**, no participant outcome, no provider cost, no latency claim and no human-study completion claim.

## A. Hero-path live-run success definition — P073-02

### Measurement unit

One run is one fresh browser session executing one complete hero task against the same frozen candidate, content profile and approved inference configuration.

A later run must not inherit:
- browser session approval for inference;
- previous model result/action authority;
- previous local review result;
- hidden provider retry state.

The benchmark record must identify the exact source revision, release/content identity, provider/model identifier and local/UTC date before results are interpreted.

### Start and stop

**Start:** immediately before the clean viewer initiates the hero question/action sequence after the candidate is loaded and ready.

**Stop — success:** when all required success conditions below are visibly complete.

**Stop — failure:** when a terminal failure condition occurs or the run exceeds the benchmark timeout. Do not silently restart the run and keep only the retry.

### Per-run success conditions

A run is successful only when **all** of the following occur in that same fresh session:

1. the learner loads without a credential/account prompt;
2. the intended hero question is submitted exactly once to the approved configured inference path;
3. there is no automatic provider retry;
4. a terminal completed interpretation is returned rather than a partial/truncated/error state;
5. at least one source receipt used for the answer is independently revalidated as `catalog_matched` against the active source catalog;
6. source/content/inference-contract identity remains current for the run;
7. the completed evidence can enable the intended review/seek action only through the current validated receipt boundary;
8. the intended evidence action completes successfully;
9. no stale prior result is used to satisfy the current run;
10. no unexpected origin is contacted.

A fluent answer without an independently catalog-matched receipt is a **failure**, not a degraded success.

A local zero-model answer is useful product fallback but is **not** a successful live-inference benchmark run for Phase 073.

### Failure classification

Preserve every failed run and assign the first material failure mechanism that prevents completion, with additional secondary mechanisms if useful:

- candidate/static load failure;
- provider discovery/configuration failure;
- consent cancelled/denied;
- source/content/inference-contract drift;
- provider/network timeout;
- quota/concurrency denial;
- malformed/partial/terminal stream failure;
- token/accounting inconsistency;
- no independently valid receipt;
- evidence action unavailable/stale;
- unexpected origin/contact;
- browser/runtime error;
- benchmark timeout;
- other, with a bounded factual description.

Cancellation/denial is not a provider failure; it is a non-completed run and should be reported separately if included in the sample.

### Benchmark-level success criterion

Pre-registered target from the checklist:
- **at least 19 of 20** fresh-session journeys successful;
- **p95 elapsed time <= 25 seconds**.

This target is not a guarantee and is not yet achieved. The actual success fraction and actual p50/p95 must be reported even when worse.

No failed run may be replaced merely to improve the fraction.

### What is not pre-approved

This protocol does not authorize:
- provider spend;
- a public deployment;
- changing model/backend mid-sample;
- increasing quotas after seeing failures;
- silently changing the source/content pack;
- deleting inconvenient runs.

Those require their own approved/frozen conditions.

---

## B. Equivalent manual transcript-search baseline — P075-01

### Purpose

Compare SUTRA against a **manual evidence-finding workflow**, not against an artificially weak baseline and not against “time to any answer.”

Both conditions must use the same underlying lesson/transcript version and the same evidence question.

### Fixed task

Given the same lesson/transcript and the same question used for the SUTRA task:

> Locate the source passage that directly supports the requested lesson point, identify the exact source cue/excerpt and its time interval, and state what the source evidence does and does not establish.

The exact final question text must be frozen before the participant comparison begins and used unchanged in both conditions.

### Manual condition

Allowed:
- open/read the supplied transcript;
- browser/editor native text find;
- manual scrolling;
- the supplied video/player for checking the located time interval.

Not allowed:
- SUTRA local search/source tools;
- SUTRA model inference;
- another AI/search assistant;
- hidden researcher hints;
- a pre-highlighted answer;
- a different transcript/source version.

The manual participant receives the same source material needed to complete the task without a private account or credential.

### SUTRA condition

Use the frozen SUTRA candidate and its normal evidence-finding workflow under the study configuration. Do not add researcher-only shortcuts or hidden setup.

If optional inference is part of the compared SUTRA workflow, the provider/model/configuration must be fixed for the paired study and its availability/cost must be reported separately.

### Valid completion — both conditions

The task is complete only when the participant produces/identifies:
1. the intended source/cue identity;
2. an exact or independently checkable source excerpt;
3. the relevant time interval when the source is timed media;
4. no invented citation;
5. a statement that does not overclaim factual truth beyond the supplied source evidence.

“Found an answer” without valid source evidence is not completion.

### Timing

**Start:** participant receives the frozen question and both the source interface/materials for that condition are ready.

**Stop:** valid completion is produced, or the study timeout/failure rule is reached.

Do not stop the timer at the first plausible answer when source validation is still incomplete.

### Equivalence controls

Hold constant where possible:
- participant;
- question;
- source/transcript version;
- source language;
- device/browser class;
- access to video/transcript bytes;
- validity rubric.

Task order should later be counterbalanced where feasible; this protocol does not claim that counterbalancing has occurred.

### Outcome fields to collect later

For each condition and participant:
- completion / non-completion;
- elapsed time to **valid evidence**;
- source/cue correctness;
- excerpt correctness;
- invented/incorrect citation count;
- assistance/intervention;
- observed error mechanism;
- condition order.

No values are filled in until an actual authorized study occurs.

### Interpretation limits

A short same-corpus comparison can estimate task performance under those study conditions. It does not establish:
- long-term learning;
- general market demand;
- population-wide productivity;
- performance on unseen domains;
- superiority outside the measured sample.

The phase target of >=30% median task-time reduction with no evidence-accuracy loss remains a target, not a result. If manual search performs better, that counterevidence must be preserved and the product/workflow revised rather than redefining success after measurement.

## Protocol freeze rule

Any material change to:
- per-run success definition;
- benchmark timeout;
- hero question;
- manual task;
- valid-evidence rubric;
- study source/content version;
must be revision-dated **before** collecting the affected sample. Do not retroactively change the rule to improve observed results.
