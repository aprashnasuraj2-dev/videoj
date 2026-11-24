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
- [x] `SUTRA-X006-07` Reconcile browser network instrumentation when explicit media playback succeeds but the reported media encoded-byte counter is zero. Require a deterministic media-specific measurement or mark that component unknown; do not infer zero post-click transfer from the inconsistent counter.

## X007 — No-model local answers and explicit self-hosted inference

- [x] `SUTRA-X007-01` Provide a zero-model natural-language question path that returns only catalog-matched local cue receipts, zero query-time API calls and explicit unsupported abstention.
- [x] `SUTRA-X007-02` Snapshot primitive source and cue data for local retrieval; reject stale caller mutations and preserve Nepali Unicode combining marks.
- [x] `SUTRA-X007-03` Evaluate 20 answerable, 10 unsupported and 10 adversarial/ambiguous authored synthetic local cases, retaining honest development-only status.
- [x] `SUTRA-X007-04` Support explicitly enabled self_hosted or hosted Worker model backends but no implicit paid fallback; retain quota, catalog version and secret controls.
- [x] `SUTRA-X007-05` Exercise the same bounded multi-agent source workflow on a simulated self-hosted OpenAI-compatible SSE tool stream, never leaking the gateway secret.
- [x] `SUTRA-X007-06` Provide a separate operator-owned loopback gateway with model/token allowlist, request/stream/time/concurrency limits, cancellation and no automatic retries.
- [x] `SUTRA-X007-07` Complete fresh-visitor citation-to-review-card save/reload/delete via zero-model route, and verify local lookup still works offline after content validation.
- [!] `SUTRA-X007-08` Verify an authorized real open-weight model on owned hardware with correct tool-call stream, source accuracy, latency p50/p95, concurrency, costs and secure externally reachable operator TLS gateway. Simulated source and model tests never constitute real hardware acceptance.

- [x] `SUTRA-X007-09` Ensure browser inference and source-tool POSTs omit browser cookies, including when a same-origin cookie canary is present; no BYOK or personal key is forwarded.
- [x] `SUTRA-X007-10` Verify the entire simulated local inference pipeline: browser-facing adapter → Worker quota → authenticated loopback gateway → fake local SSE model → bounded agent runtime, including abort propagation, quota release and no retry.
- [x] `SUTRA-X007-11` Reject unknown nested tool-call and tool-definition metadata at the Worker boundary before a quota reservation or provider request.
- [x] `SUTRA-X007-12` Provide translated Nepali and English labels, local question results, and receipt actions for the primary zero-model workflow, preserving explicit working-draft translation status.
- [x] `SUTRA-X007-13` Render an accessible pending-content loading view before asynchronous profile/catalog/transcript validation, never expose model/media/review controls while pending, and map HTML changes to affected browser, performance and security checks.
- [x] `SUTRA-X007-14` Validate self-hosted gateway message roles, nested model tool calls, context size and tool definitions independently of Worker validation; reject unknown metadata before the local model.

- [x] `SUTRA-X007-15` Reject a truncated HTTP-200 local model SSE stream end-to-end: no completed answer, no automatic retry and eventual quota lease release.

- [x] `SUTRA-X007-16` Refuse incomplete lexical coverage and preserve single-digit, single-letter and oversized unknown query constraints rather than silently stripping them; verify unit cases and the visible no-result Chromium regression without network or model calls.
- [x] `SUTRA-X007-17` Treat all fully matching cues as ambiguous regardless of phrase-rank distance; expose the bounded five-receipt display and preserve complete match count and truncation metadata.
- [x] `SUTRA-X007-18` Reject rewritten terminal SSE finish reasons, duplicate/early or inconsistent terminal token usage; verify protocol units and full fake local HTTP chain refusal with no retry and released quota lease.

- [x] `SUTRA-X007-19` Bind every snapshot-aware inference POST to the server-issued opaque configuration version; reject changed backend, exact gateway, credentials, model, limits or missing/malformed contract before quota/provider contact; no implicit retry. Portable calls without either snapshot header are a distinct interface.
- [x] `SUTRA-X007-20` Preserve existing completed evidence through a later cancelled inference preflight; clear only on actual new model execution, keep old detached review actions inert, and never merge previous and new run evidence.

- [x] `SUTRA-X007-21` Snapshot validated source tool arguments before asynchronous initialization; pre-aborted requests must not contact transport, cancelled handshakes must not proceed, and late source results must not enter a timed-out or cancelled runtime.
- [x] `SUTRA-X007-22` Independently validate and freeze final provider-result receipts against the mounted catalog; invalid or stale receipts must prevent completed interpretation even if the transport observer error is swallowed, and only still-valid receipts may survive an incomplete run.

- [x] `SUTRA-X007-23` Prevent detached transcript/comparison controls from initiating source fetch or seek, suppress stale action results, preserve literal transcript query across media mounting and accept valid 128-character cue IDs; verify native duration before enabling media actions.
- [x] `SUTRA-X007-24` Require exactly one bound source in schema-1 content profiles, exact digest path segments for reviewed artifacts and primitive string identities without implicit coercion or caller conversion hooks; reject cancelled profile loads.
- [x] `SUTRA-X007-25` Revoke inference authority and outstanding asynchronous operations on pagehide, preserve validated local transcript and media for persisted navigation, and prove delayed discovery cannot overwrite a fresh operation; actual browser BFCache eligibility remains separate.
- [x] `SUTRA-X007-26` Require observed native seek to land inside the exact half-open cited cue interval, not just within a one-second tolerance; independently guard transcript, receipt, comparison and featured-cue paths and verify browser fault injection plus recovery.

## X008 — Candidate identity and publication boundary

- [x] `SUTRA-X008-01` Reject release-candidate evidence measured for another source revision or reviewed content identity; verify exact manifest, links, canonical graph bytes, graph membership and worker quota validity. Structural fixture only; not live measurement or release readiness.
- [x] `SUTRA-X008-02` Materialize only recognized release files; omit all stale development graph versions and synthetic publication inventory/content, reject unknown public files, traversal, symlink roots/ancestors and aliased source/output overlap. Trusted stable build tree required; not secret scanning.

## X009 — Review persistence trust and navigation outcome classification

- [x] `SUTRA-X009-01` Reject executable/accessor-backed or mutable caller source catalogs before review storage/action creation; preserve the exact mounted primitive source and cue snapshot.
- [x] `SUTRA-X009-02` Treat a local review mutation cancelled after its effect begins as an unknown outcome, not success or proven rejection; pre-entry revocation must make zero writes.
- [x] `SUTRA-X009-03` Reject persisted review envelopes with unknown private fields before re-saving them; keep standalone export's existing secret-stripping behavior and explicit recovery.

The three checks cover local, cooperative browser review operations. Storage access from unrelated same-origin scripts remains outside the app-owned Web Locks boundary; explicit source truth, human rights and cross-site production constraints are unchanged.
