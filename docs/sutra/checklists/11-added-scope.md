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

## X005 — Local action confirmation identity and resource boundaries

- [x] `SUTRA-X005-01` Prove a cancelled, consumed or failed action proposal identity cannot be reused for another payload during the registry lifetime; stale confirmation never executes a later action. The 4,096-identity ceiling must fail closed, not evict identities.
- [x] `SUTRA-X005-02` Charge the aggregate 16 KiB serialized UTF-8 JSON budget during argument traversal; reject shared expansion, oversize Unicode and escapes, sparse arrays and non-index array fields before handler invocation.
- [x] `SUTRA-X005-03` Directly execute standalone action regression tests in learner CI and trigger that workflow on action-package changes; revalidate the standalone publisher starter and Open Kit consumer against the same single-use contract.

## X006 — Source snapshot coherence and asynchronous evidence boundaries

- [x] `SUTRA-X006-01` Bind inference approval to the mounted profile/catalog/transcript snapshot and exact validated graph; a changed source or graph must result in zero model POSTs before a fresh explicit check.
- [x] `SUTRA-X006-02` Send the public catalog precondition on snapshot-aware inference and source-tool POSTs; stale requests must be rejected before quota/tool execution, and a mid-run rejection must not claim a completed answer.
- [x] `SUTRA-X006-03` Reject encoded traversal, control characters, ambiguous path segments and noncanonical artifact names before content fetch or player mount.
- [x] `SUTRA-X006-04` Fail closed on mixed or corrupted content at startup without mounting actionable controls or causing model/media requests; permit explicit revalidation by reload.
- [x] `SUTRA-X006-05` Bound decoded source response bytes during streaming, not after allocation; cancel oversized or held-open body reads and prevent cross-origin or pre-cancelled fetches.
- [x] `SUTRA-X006-06` Discard obsolete asynchronous guide-check and seek messages when comparison selection changes; parse hash-matched source HTML in a detached inert template.
- [ ] `SUTRA-X006-07` Reconcile browser network instrumentation when explicit media playback succeeds but the reported media encoded-byte counter is zero. Require a deterministic media-specific measurement or mark that component unknown; do not infer zero post-click transfer from the inconsistent counter.
