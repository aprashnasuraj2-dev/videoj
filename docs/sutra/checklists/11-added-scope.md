# Added scope, incidents and regressions

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md)

Append discovered requirements here rather than renumbering the original 1,000 tasks. Use `SUTRA-X001-01`, `SUTRA-X001-02` for the first discovery group, then `X002`, and so on. Each item needs a concrete result, acceptance condition, dependency/scope note and evidence when completed.

New security or correctness issues affecting an already completed task must also reopen that task or mark its evidence stale in `progress.json`. Do not bury a regression in a session note while leaving the completion claim intact.

Required items discovered after the original plan remain release blockers until completed or explicitly resolved within the authorized scope. The total task count is allowed to grow. “1,000 checks” is the initial coverage baseline, not a claim that all future issues are known.

## X001 — Newly discovered correctness checks

- [x] `SUTRA-X001-01` Verify successful local review writes with readback, rejecting ambiguous storage outcomes and preventing duplicate persisted IDs after reload.
- [x] `SUTRA-X001-02` Verify runtime and learner action registration use explicit effects and reject stale export snapshots.
- [x] `SUTRA-X001-03` Verify quota daily resource limits and retain unexpired leases across UTC midnight without refund or new provider contact after rejection.

## X002 — Evidence-library and receipt-action regressions

- [x] `SUTRA-X002-01` Reject executable or hidden ordinary JavaScript data descriptors in receipt, claim, catalog and source arguments without invoking getters or serialization hooks; executable Proxy traps are outside the wire-data contract.
- [x] `SUTRA-X002-02` Bound source catalog registration and aggregate text; index exact scoped reads and test 20 sources × 500 short cues with five-result cap and duplicate rejection.
- [x] `SUTRA-X002-03` Verify the provider's independently catalog-matched receipts use the same local seek/review actions as direct retrieval; no implicit transfer or persistence, no extra provider call, and no stale actions after question changes.

## X003 — Held-out evaluation review protocol

- [x] `SUTRA-X003-01` Generate a blind 40-case review packet that excludes expected dispositions and source/cue references before human adjudication; verify with synthetic protocol tests only until real corpus review occurs.
- [x] `SUTRA-X003-02` Freeze a human-reviewed held-out set only after a complete structural attestation, binding exact 20/10/10 case content to a SHA-256 while explicitly stating the tool cannot prove reviewer identity or review quality.
- [x] `SUTRA-X003-03` Preserve all scored rows, failures and errors; require corrections to create a new version with parent hash, changed IDs and reason instead of rewriting prior frozen evidence.

## X004 — Fail-closed live provider measurement readiness

- [x] `SUTRA-X004-01` Validate a bounded provider-cost record with exact source revision, provider/model, explicit-timezone price basis, run/request outcomes, unique request sequences and complete-or-null token usage; include failed/cancelled attempts in the observed spend record.
- [x] `SUTRA-X004-02` Refuse mean, p95, monthly projection and sensitivity when any request usage is unknown; when complete, project from all observed runs rather than completed runs only, and report doubled-prompt plus one-full-run-retry sensitivity.
- [x] `SUTRA-X004-03` Provide an offline bounded CLI, unmistakably synthetic example, dedicated CI and verification-impact mapping; the tool performs no provider contact and cannot be cited as live-cost evidence.
