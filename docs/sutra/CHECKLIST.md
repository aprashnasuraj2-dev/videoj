# SUTRA master checklist

[Start here](README.md) | [Progress register](PROGRESS.md) | [Machine handoff](progress.json) | [Continue procedure](CONTINUE.md) | [Evidence and coverage](COVERAGE.md)

This is the active, user-requested SUTRA work plan. It expands the attached 100-phase PDF into **1,000 initial verifiable checklist items**: eight specific work checks plus an artifact and a phase-exit check in each phase. It applies to SUTRA, not routine maintenance of other players.

## What is authoritative

- The checkbox on each numbered task is the source of truth for that task's state.
- `progress.json` is the machine-readable resume cursor, task evidence, blockers, decisions and release/submission state.
- `PROGRESS.md` is the current readable handoff, not a substitute for checking code and evidence.
- `SESSIONS.md` is append-only session history. Correct prior claims by appending a correction and reopening affected tasks.
- The PDF is the design baseline. The repository checklist is the living execution plan; log changes in `DECISIONS.md`.

No SUTRA product task is completed merely because this checklist exists. The initial implementation state is 0 verified of 1,000. Later totals must come from the actual files, not this historical sentence.

## Workstreams

| # | Detailed checklist | Original phases | Initial tasks | Original target window |
| --- | --- | --- | --- | --- |
| 01 | [Strategy and competition fit](checklists/01-strategy.md) | 001-010 | 100 | 23-26 Nov 2026 |
| 02 | [Repository and source foundations](checklists/02-foundations.md) | 011-020 | 100 | 27-30 Nov 2026 |
| 03 | [Browser agent runtime](checklists/03-browser-runtime.md) | 021-030 | 100 | 1-5 Dec 2026 |
| 04 | [Peer composition and trust](checklists/04-peer-trust.md) | 031-040 | 100 | 6-10 Dec 2026 |
| 05 | [Coherent learner experience](checklists/05-learner-experience.md) | 041-050 | 100 | 11-15 Dec 2026 |
| 06 | [Grounding and community tools](checklists/06-grounding-community.md) | 051-060 | 100 | 16-20 Dec 2026 |
| 07 | [Resilience and cost control](checklists/07-resilience-cost.md) | 061-070 | 100 | 21-25 Dec 2026 |
| 08 | [User and interoperability validation](checklists/08-validation.md) | 071-080 | 100 | 26-30 Dec 2026 |
| 09 | [Public release and open-source handoff](checklists/09-public-release.md) | 081-090 | 100 | 31 Dec 2026-4 Jan 2027 |
| 10 | [Submission and final ZIP](checklists/10-submission.md) | 091-100 | 100 | 5-9 Jan 2027 |

[Added scope and regressions](checklists/11-added-scope.md) is where newly discovered work is appended. Keep Phase 100 as the final ZIP/report handoff, even as additional checks are discovered.

## Task state contract

| Checkbox | Meaning | Required register data |
| --- | --- | --- |
| `[ ]` | Not completed; may be ready or waiting on a dependency | Named blocker if an actual dependency was attempted and cannot proceed |
| `[~]` | Work currently in progress, not verified | Current task in `progress.json`, concrete next action, changed paths |
| `[!]` | Work blocked after identifying a real missing dependency/input | Task record with blocker ID, reason, unblock condition and independent alternatives |
| `[x]` | Applicable acceptance observed and verified | Dated evidence, source revision, actual result and a reproducible artifact/observation |
| `[-]` | Intentionally omitted in the current documented scope | Decision/rationale, optionality or scope-change basis and practical effect; never a disguised failed mandatory gate |

Only one task may be marked active at once for this single-agent workflow. Work may satisfy multiple task checks in a session, but each checked task needs its own applicable evidence reference. A reused evidence artifact is valid only when it actually supports each cited claim.

Do not check `Pnnn-10` before the phase's preceding tasks are complete or justified omissions. A phase with waived optional work must be reported as “complete with omissions”, not fully implemented.

## Run the register commands

```bash
node docs/sutra/tools/progress.mjs status
node docs/sutra/tools/progress.mjs next
node docs/sutra/tools/progress.mjs phase 001
node docs/sutra/tools/progress.mjs check
node docs/sutra/tools/progress.mjs status --json
```

These commands audit/report the records. They do not mark tasks done, deploy, call models, contact testers or submit an entry. They have no external dependencies. A successful metadata audit establishes register consistency, not product correctness.

## Milestone exit gates

| Gate | Phases | Exit evidence |
| --- | --- | --- |
| Strategy | 001-010 | Defined audience, compliance map, community scope and honest target baseline |
| A: foundations | 011-020 | Isolated app build, reviewed corpus/media rights and selected runtime spike |
| B: interoperability | 021-040 | Browser graph execution, exact peer loading, grounded calls, consent/privacy/limit checks |
| C: product | 041-050 | Complete visible learner task including denied/conflict states |
| Community candidate | 051-060 | Validated evidence and standalone reusable tools with runnable examples |
| D: resilience | 061-070 | Privacy, errors, spend, media and route controls working together |
| E: release candidate | 071-080 | Actual model/user/builder/browser evidence; unresolved limitations disclosed |
| F: public release | 081-090 | Verified public artifacts, community release, reproducibility and rollback |
| Submission package | 091-100 | Genuine entrant-led video, final truthful copy and verified ZIP/report handoff |

## No false completion

A completed design document does not prove runtime execution. An HTTP response does not prove a business action completed. Same-owner origins do not prove outside adoption. A synthetic load does not prove production capacity. An emulator does not prove physical-device behavior. A delivered ZIP does not prove official Devpost submission.

Required release gates cannot be omitted to improve completion percentages: valid portable publication, actual browser execution, funded accessible judge path, consent before contact, secret isolation, bounded execution, accurate evidence/outcomes, required public materials and genuine entrant explanation.
