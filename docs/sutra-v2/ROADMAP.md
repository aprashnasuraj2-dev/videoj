# Dependency-aware engineering roadmap — V2-203

> **Execution-queue note (2026-11-26):** This roadmap remains the broad gate/dependency register, but task selection is controlled by [`CHECKLIST.md`](CHECKLIST.md). The 379 former SUTRA1 pending tasks are retired and must not be used as a continuation queue.

This is the broad phase/dependency and engineering-gate register; it is not an execution queue. The original requirement IDs, descriptions, checkboxes and historical evidence remain in [CHECKLIST.md](CHECKLIST.md), [SESSIONS.md](SESSIONS.md) and [progress.json](progress.json); see [roadmap.json](roadmap.json) for structured records and crosswalk. Historical checkboxes are not equivalent to formal verification. New gates close only with their own observed evidence. P0 = blocking safety/correctness; P1 = product/verification; P2 = deferred/conditional. Risk is independent of priority. No percentage-complete metric.

## Phase 00 — Repository integrity and reproducibility

Prior IDs: V2-M01, V2-M02.

### V2-P00-REPRO — Pin applicable toolchains and verify artifacts on clean checkout

- **Status:** Researching. **Priority/risk:** P0/high. **Dependencies:** V2-M02.
- **Implementation:** `docs/sutra-v2/; .github/workflows/sutra-v2-knowledge.yml`.
- **Acceptance:** Two clean builds yield documented hashes or reproducibility differences; record tool versions and lock identities.
- **Positive tests:** Clean locked npm build and SHA256 verification.
- **Adversarial tests:** Alter lockfile, binary or checkout identity; reject stale evidence.
- **Verification:** Clean CI and artifact manifest.
- **Evidence:** None; no credit claimed.
- **Limitations:** CI runner image and several toolchain versions still float.

### V2-P00-EVIDENCE — Enforce source-bound evidence ledger

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-M02.
- **Implementation:** `docs/sutra-v2/progress.json`.
- **Acceptance:** Every promoted status has source revision, exact command and observed run/job; failure history append-only.
- **Positive tests:** Import verified job with exact source identity.
- **Adversarial tests:** Wrong SHA, skipped job and missing artifact cannot earn credit.
- **Verification:** Schema and semantic validator in CI.
- **Evidence:** None; no credit claimed.
- **Limitations:** Historical entries require migration without loss.

## Phase 01 — Threat model and security architecture

Prior IDs: none.

### V2-P01-THREAT — Define principals, trust boundaries, capability and threat-to-test mapping

- **Status:** Researching. **Priority/risk:** P0/critical. **Dependencies:** V2-M01.
- **Implementation:** `docs/sutra-v2/; packages/sutra-runtime; packages/sutra-knowledge/action-protocol`.
- **Acceptance:** Explicit authority for browser host, signer, receiver, provider and peer; confidentiality/integrity/availability threats mapped to reproducible tests.
- **Positive tests:** Trace consented source request and signed action.
- **Adversarial tests:** Confused deputy, compromised adapter, replay, rollback, equivocation, supply-chain and exhaustion.
- **Verification:** Threat review plus regression matrix.
- **Evidence:** None; no credit claimed.
- **Limitations:** Threat review not security certification.

## Phase 02 — Browser-native agentic runtime

Prior IDs: V2-A01, V2-A04, V2-A05.

### V2-P02-RUNTIME — Verify host-owned closed admission, origin, nesting, cancellation and run budgets

- **Status:** Not started. **Priority/risk:** P0/critical. **Dependencies:** V2-A04, V2-P01-THREAT.
- **Implementation:** `packages/sutra-runtime; packages/sutra-knowledge/agent-bridge.js`.
- **Acceptance:** No unauthorized nested dispatch; denied contact zero; expired or incomplete run not successful.
- **Positive tests:** Actual browser scripted runtime, admitted peer and cancellation.
- **Adversarial tests:** Adapter ignores abort; nested delegation and parallel budget exhaustion.
- **Verification:** Browser transport instrumentation and unit checks.
- **Evidence:** None; no credit claimed.
- **Limitations:** Existing scoped runtime verified; global hard budgets not verified.

## Phase 03 — Untrusted input and prompt-injection isolation

Prior IDs: V2-K01.

### V2-P03-TAINT — Preserve typed untrusted provenance; isolate data from authority

- **Status:** Not started. **Priority/risk:** P0/critical. **Dependencies:** V2-P01-THREAT, V2-K01.
- **Implementation:** `packages/sutra-consent/strict-json.js; packages/sutra-runtime; packages/sutra-knowledge/agent-bridge.js`.
- **Acceptance:** Closed schemas, bounded bytes/depth, Unicode and key checks; peer text cannot authorize contact, writes or disclosure.
- **Positive tests:** Valid typed observation admitted.
- **Adversarial tests:** Duplicate/escaped keys, prototype names, malformed Unicode, nested executable values, credential canary and malicious DOM.
- **Verification:** Parser corpus and real browser contact trace.
- **Evidence:** None; no credit claimed.
- **Limitations:** Semantic prompt injection remains possible even with schema validation.

## Phase 04 — Capability-scoped execution and consent

Prior IDs: V2-RUNTIME-01, V2-RUNTIME-03.

### V2-P04-CONSENT — Bind exact operation, destination, lifetime and authority to approval

- **Status:** Not started. **Priority/risk:** P0/critical. **Dependencies:** V2-RUNTIME-01, V2-P01-THREAT.
- **Implementation:** `packages/sutra-knowledge/action-protocol; packages/sutra-consent; packages/sutra-actions`.
- **Acceptance:** Immutable approval digest; expiry/revocation enforced before dispatch; discovery not execution consent.
- **Positive tests:** Approved original action succeeds.
- **Adversarial tests:** Modified inputs, revoked approval, new-key replay and nested denied requests refused without contact.
- **Verification:** Go adversarial and browser integration tests.
- **Evidence:** None; no credit claimed.
- **Limitations:** Current signed fixture approval has no expiry or revocation.

## Phase 05 — Durable idempotency and failure recovery

Prior IDs: V2-RUNTIME-02.

### V2-P05-STORE — Atomic signed snapshot for owned finite synthetic effect and ledger

- **Status:** Integration verified. **Priority/risk:** P0/critical. **Dependencies:** V2-RUNTIME-01.
- **Implementation:** `packages/sutra-knowledge/action-protocol/durable_linux.go`.
- **Acceptance:** Identical receipt on same-key retry across restart; lock exclusive; malformed or mismatched snapshot fails closed.
- **Positive tests:** 64 concurrent duplicates, restart and process exits before rename, after rename, after sync.
- **Adversarial tests:** Changed input, invalid snapshot, missing store, budget reset, second owner.
- **Verification:** Go race CI and actual subprocess tests.
- **Evidence:** [23c45faab775](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45523248637/job/138900133257); [58a5f96456c4](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45523546697/job/138901145733).
- **Limitations:** Linux trusted private directory; no physical power loss test, stale temporary file cleanup, distributed lock or upstream arbitrary side effects. Signed rollback protection requires independently retained receipt..

### V2-P05-RECOVERY — Exercise durable receiver through existing wire protocol and preserve unknown outcomes

- **Status:** Implementation in progress. **Priority/risk:** P0/critical. **Dependencies:** V2-P05-STORE.
- **Implementation:** `packages/sutra-knowledge/action-protocol/transport.go`.
- **Acceptance:** Lost reply plus server restart reconciles same approval; delayed request and status absence not terminal; bounded contacts.
- **Positive tests:** Actual loopback TCP drop followed by reopen and reconciliation.
- **Adversarial tests:** I/O failure, response reorder, invalid receipt, retry with new approval; no unapproved second effect.
- **Verification:** Race-enabled transport integration and failpoint tests.
- **Evidence:** [58a5f96456c4](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45523546697/job/138901145733); [e96734190870](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524456423/job/138904189960); [88ab00000eaf](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524767453/job/138905253653); [45ea97969ff5](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524868505/job/138905589669). Exact results and failed gate in SESSIONS.md; [1951512e9f9a](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45527040306/job/138912849718). Exact scope and counterexamples in SESSIONS.md.; [e64e35c73f7](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45550654471). Exact mount/method/legacy-route hardening passed both knowledge runs and all auxiliary workflows
- **Limitations:** Authenticated loopback authority now owns action history and per-caller/global contact accounting atomically, and stale local caller state cannot reset quota. Still a synthetic single-authority fixture: no approval expiry/revocation, generic new-key lifecycle, hostile-network replay protection, provider spend accounting, physical power-loss certification or arbitrary upstream side effect.

### V2-P05-ROLLBACK — Prevent replay of older valid snapshots and clone-induced equivocation relative to trusted external head

- **Status:** Implementation in progress. **Priority/risk:** P0/critical. **Dependencies:** V2-P05-STORE, V2-P01-THREAT.
- **Implementation:** `packages/sutra-knowledge/action-protocol; packages/sutra-knowledge/checkpoint`.
- **Acceptance:** External anchor/CAS rejects stale signed store and fork; compensation separate approval.
- **Positive tests:** Head advancement and recovery.
- **Adversarial tests:** Replace state by valid earlier snapshot; clone signer/store; denied compensation.
- **Verification:** Multi-process integration and independent verifier.
- **Evidence:** [58a5f96456c4](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45523546697/job/138901145733); [e96734190870](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524456423/job/138904189960); [45ea97969ff5](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524868505/job/138905589669). Exact results and failed gate in SESSIONS.md; [1951512e9f9a](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45527040306/job/138912849718). Exact scope and counterexamples in SESSIONS.md; [322e05892ecf](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45527762530/job/138915235534). Independent witness rejects authority-only rollback; coordinated authority+witness rollback remains an explicit counterexample; [f2e5d2ed646d](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45528425615/job/138917422848). Hardened witness rejects revisiting seen heads and same-key re-genesis relative to pinned genesis.
- **Limitations:** A separately protected witness detects rollback of the authority store alone, but a privileged attacker able to restore both independently signed stores can recreate an old consistent pair. No public transparency log, quorum, trusted time, independently operated third party, key rotation/distribution protocol or separately authorized compensation exists yet.

## Phase 06 — TLA+ formal state-machine verification

Prior IDs: V2-F11b.

### V2-P06-MODEL — Check two-caller atomic action recovery and negative split-effect model

- **Status:** Formally verified within stated assumptions. **Priority/risk:** P0/high. **Dependencies:** V2-RUNTIME-01.
- **Implementation:** `packages/sutra-knowledge/action-protocol/formal/`.
- **Acceptance:** Safe TypeOK, AtMostOnce, ReceiptSound, AtomicLedger pass; unsafe produces AtMostOnce trace; pin exact TLC.
- **Positive tests:** Safe finite exploration.
- **Adversarial tests:** Crash between effect and ledger permits duplicate.
- **Verification:** TLC and independent Python exploration.
- **Evidence:** [23c45faab775](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45523248637/job/138900133257).
- **Limitations:** One approved logical key/two callers; bounded pending set and crash abstraction; no liveness/fairness, budgets, signature verification, physical storage behavior or Go refinement..

### V2-P06-REFINE — Model multi-key authorization, contact budgets, anti-equivocation, fairness and map Go transitions

- **Status:** Implementation in progress. **Priority/risk:** P1/high. **Dependencies:** V2-P06-MODEL, V2-P05-RECOVERY, V2-P05-ROLLBACK.
- **Implementation:** `packages/sutra-knowledge/action-protocol/formal; packages/sutra-knowledge/checkpoint`.
- **Acceptance:** Bounded model and negative mutants distinguish safety from conditional liveness; implementation trace mapping reviewed.
- **Positive tests:** Concurrent approved operations and CAS.
- **Adversarial tests:** Unauthorized key, rollback, lost acknowledgement and exhausted budget.
- **Verification:** TLC, trace refinement and implementation race tests.
- **Evidence:** [9f1d5fb793f8](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524578358/job/138904607388); [45ea97969ff5](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524868505/job/138905589669); [20e68b77ae86](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45525009986/job/138906066673). Exact results and failed gate in SESSIONS.md; [1951512e9f9a](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45527040306/job/138912849718). Exact scope and counterexamples in SESSIONS.md.
- **Limitations:** One actual Go trace is independently replayed against the bounded transition mapping and budgets now match the TLA per-caller 2/global 3 profile. This is a trace witness, not a universal refinement theorem: Go collapses dispatch+delivery once bytes arrive, cryptography/binary parsing/storage are outside TLA, and authority snapshot rollback remains possible without an external monotonic witness.

## Phase 07 — Rust and WebAssembly high-assurance computation

Prior IDs: V2-F12a, V2-F12b, V2-F12c.

### V2-P07-WASM — Measure and harden deterministic bounded WASM profile

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-F12c, V2-P00-REPRO.
- **Implementation:** `packages/sutra-knowledge/support-lattice; apps/sutra-v2/src/support-wasm.js`.
- **Acceptance:** Identity, zero imports, malformed ABI/resource limits and errors invalidate stale authority; compare JS/native/WASM.
- **Positive tests:** Reference fixtures on browser and native.
- **Adversarial tests:** Changed bytes, invalid inputs, missing module, excessive work.
- **Verification:** Rust tests, browser matrix, size/startup benchmark.
- **Evidence:** None; no credit claimed.
- **Limitations:** Existing bounded support tests are not general policy execution or physical hardware tests.

## Phase 08 — Cryptographic receipts and causal provenance

Prior IDs: V2-F11, V2-F11a, V2-F11b, V2-K04.

### V2-P08-CAUSAL — Bind exact approval, policies, manifest/network version, output and causal parent links

- **Status:** Not started. **Priority/risk:** P0/high. **Dependencies:** V2-F11a, V2-P05-ROLLBACK.
- **Implementation:** `packages/sutra-knowledge/checkpoint; packages/sutra-knowledge/action-protocol`.
- **Acceptance:** Independent external trust anchors; altered, missing, reordered or truncated links refused relative to observed head.
- **Positive tests:** Export and independently verify parent-child chain.
- **Adversarial tests:** Self-certified key, cloned anchor, rollback, forged timestamp.
- **Verification:** Go independent consumer and fork fixtures.
- **Evidence:** None; no credit claimed.
- **Limitations:** Signatures prove key-relative statements, not truth or time.

## Phase 09 — Typed knowledge compiler

Prior IDs: V2-K02, V2-K03, V2-K05, V2-K06, V2-K07, V2-K08, V2-K09, V2-D01, V2-D02, V2-D03, V2-D04, V2-E01.

### V2-P09-IR — Refine typed obligation semantics and reverse dependency indexing

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-K09, V2-K06.
- **Implementation:** `packages/sutra-knowledge/index.js; packages/sutra-knowledge/scope.js; packages/sutra-knowledge/reference`.
- **Acceptance:** Separate formal/numeric/empirical/interpretive claims, exact quantity semantics and assumptions; independently check canonical representation.
- **Positive tests:** Same results from full and incremental computation.
- **Adversarial tests:** Same dimension different semantic kind, cycles, inconsistent assumptions, stale dependencies.
- **Verification:** Independent replay and scaling benchmark.
- **Evidence:** None; no credit claimed.
- **Limitations:** No rewrite or new compiler language absent measured benefit.

## Phase 10 — Lean 4 mathematical verification

Prior IDs: V2-F12d.

### V2-P10-LEAN — Machine-check finite-world support, conflict and closure properties

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-F12a.
- **Implementation:** `packages/sutra-knowledge/formal-support/ (proposed)`.
- **Acceptance:** Nonvacuity, minimal versus minimum cardinality, bounded completeness, withdrawal and recurrence; no sorry/admit; enumerate axioms.
- **Positive tests:** Compile pinned Lean files and inspect axioms.
- **Adversarial tests:** Inconsistent evidence cannot support arbitrary proposition; triple-vs-pair witness.
- **Verification:** Lean compiler plus independent finite reference and refinement mapping.
- **Evidence:** None; no credit claimed.
- **Limitations:** Lean not installed locally; proof cannot certify empirical applicability.

## Phase 11 — Evidence Frontier and uncertainty

Prior IDs: V2-F01, V2-F02, V2-F04, V2-F05, V2-F07, V2-F08, V2-F09, V2-F10, V2-F12.

### V2-P11-UNCERTAINTY — Handle interval observations, incomplete worlds and out-of-model values

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-F10, V2-F12c.
- **Implementation:** `packages/sutra-knowledge/frontier.js; packages/sutra-knowledge/evidence-session.js`.
- **Acceptance:** Distinguish measurement uncertainty and epistemic incompleteness; explicit abstention; recompute after withdrawal.
- **Positive tests:** Interval narrows worlds; restoration requires new observation.
- **Adversarial tests:** Contradiction, copied lineage, unknown world and no matching value.
- **Verification:** Independent exhaustive bounded oracle and adversarial tests.
- **Evidence:** None; no credit claimed.
- **Limitations:** Existing exact finite world profile remains conditional.

## Phase 12 — Observation economics and investigation planning

Prior IDs: V2-F13.

### V2-P12-ECON — Model shared source acquisition, bundled observations, privacy and value of information

- **Status:** Not started. **Priority/risk:** P1/medium. **Dependencies:** V2-F01, V2-F10.
- **Implementation:** `packages/sutra-knowledge/frontier.js`.
- **Acceptance:** Optimal bounded worst-case policy; expected-cost only with explicit probabilities; compare greedy and exhaustive baselines.
- **Positive tests:** Shared source reduces marginal read cost.
- **Adversarial tests:** Greedy counterexample, impossible distinction and omitted probability assumptions.
- **Verification:** Independent policy enumeration and scaling tests.
- **Evidence:** None; no credit claimed.
- **Limitations:** No calibrated probabilities or external cost estimates yet.

## Phase 13 — Open-web interoperability

Prior IDs: V2-A02, V2-A03, V2-F03, V2-F06.

### V2-P13-INTEROP — Discover previously unknown compatible publisher under actual browser consent

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-P02-RUNTIME, V2-P03-TAINT, V2-P04-CONSENT, V2-F06.
- **Implementation:** `apps/sutra-v2/; packages/sutra-runtime`.
- **Acceptance:** Pinned identity, locally derived partitions, version drift and unavailable peer handled; independently operated publisher evidence separate.
- **Positive tests:** Actual cross-origin discovery and typed read.
- **Adversarial tests:** Forged authority, redundant capability, changed bytes and denied origin.
- **Verification:** Browser tests; later authorized HTTPS and independent publisher trial.
- **Evidence:** None; no credit claimed.
- **Limitations:** Current same-owner scripted browser origins do not establish independent adoption.

## Phase 14 — BYOK, provider independence and hard budgets

Prior IDs: V2-RUNTIME-04.

### V2-P14-BUDGET — Reserve spend/tokens before dispatch and reconcile actual usage across concurrency

- **Status:** Not started. **Priority/risk:** P0/critical. **Dependencies:** V2-P01-THREAT, V2-P02-RUNTIME.
- **Implementation:** `packages/sutra-inference; packages/sutra-runtime`.
- **Acceptance:** Provider-independent limits, no oversubscription, unknown charges reserved, BYOK not disclosed, free deterministic judge path.
- **Positive tests:** Concurrent calls under quota, cancellation and actual usage reconciliation.
- **Adversarial tests:** Malicious cost estimates, timeout, rate limit, credential canary.
- **Verification:** Fake provider contract plus authorized real free route only.
- **Evidence:** None; no credit claimed.
- **Limitations:** No paid inference authorized; provider charging semantics vary.


### V2-P14-BYOK-UX — Nontechnical multi-provider credential workspace without secret propagation

- **Status:** Not started. **Priority/risk:** P0/critical. **Dependencies:** V2-P14-BUDGET, V2-P03-TAINT, V2-P04-CONSENT.
- **Implementation:** `apps/sutra-v2; packages/sutra-inference; packages/sutra-runtime; services/sutra-api`.
- **Acceptance:** An extensible connection registry supports arbitrary provider labels, custom compatible endpoints/manual model IDs, multiple credential/model profiles, and provider-independent agent assignments; at least two mock profiles coexist; secret values never enter graph, prompt, peer payload, trace, export, URL, telemetry or plaintext browser storage; provider/model choice and per-profile limits require explicit host UI; deterministic no-AI mode remains usable; removal clears the credential handle.
- **Positive tests:** Fake provider profiles, masked onboarding, provider/model switching and independent bounded reservations; no live paid inference.
- **Adversarial tests:** Credential canary, malicious peer/model asks for key, unapproved endpoint/redirect/DNS rebinding/private network access, model-selected provider switch, stale handle, reload/export/log/DOM leakage and cross-profile confusion. See [open model connectivity](OPEN-MODEL-CONNECTIVITY.md).
- **Verification:** Browser integration + fake-provider relay/adapter + credential-canary scans + backend budget contract. Any real-provider validation is a separate authorized gate.
- **Evidence:** None; no credit claimed.
- **Limitations:** Current service intentionally reports `byok:false` and rejects visitor credentials. Vault/relay design, XSS/browser-extension exposure, CORS, persistence and provider billing semantics require threat review.

## Phase 15 — Distributed supervision and resilience

Prior IDs: none.

### V2-P15-SUPERVISE — Decide whether distributed supervision is required and bound worker ownership/backpressure

- **Status:** Deferred with justification. **Priority/risk:** P2/high. **Dependencies:** V2-P05-RECOVERY, V2-P14-BUDGET.
- **Implementation:** `packages/sutra-knowledge/; services/sutra-api (review before change)`.
- **Acceptance:** Partition/restart semantics, bounded mailboxes, dedup and ordering; compare simpler Go/Rust to BEAM only with measured workload.
- **Positive tests:** Recover worker after synthetic crash.
- **Adversarial tests:** Partition, repeated effect, mailbox exhaustion and out-of-order message.
- **Verification:** Fault harness and measured architecture decision.
- **Evidence:** None; no credit claimed.
- **Limitations:** No demonstrated distributed workload warrants another runtime.

## Phase 16 — Integrated investigative learning experience

Prior IDs: V2-U01, V2-U02, V2-L01, V2-L02, V2-L03, V2-L04, V2-L05, V2-L06, V2-L07, V2-L08.

### V2-P16-LEARN — Meaningful prediction, evidence, revision and transfer with accessible written alternative

- **Status:** Not started. **Priority/risk:** P1/medium. **Dependencies:** V2-L08, V2-P11-UNCERTAINTY.
- **Implementation:** `apps/sutra-v2/; packages/sutra-content-profile`.
- **Acceptance:** Exact source intervals and alternate support sets; mobile/keyboard usable; measured learning outcomes against matched baselines.
- **Positive tests:** Learner prediction and revision with transfer question.
- **Adversarial tests:** Tampered source, withdrawal, incompatible evidence and incomplete model.
- **Verification:** Browser/a11y checks and ethical learner study.
- **Evidence:** None; no credit claimed.
- **Limitations:** Synthetic fixtures do not establish educational efficacy.

## Phase 17 — Recursive Observatory

Prior IDs: V2-O01, V2-O02, V2-O03, V2-O04.

### V2-P17-OBSERVE — Executable capability declarations with independent falsifiable challenges

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-P00-EVIDENCE, V2-P08-CAUSAL.
- **Implementation:** `packages/sutra-knowledge/examples/observatory.mjs; docs/sutra-v2/`.
- **Acceptance:** Versioned declaration maps to oracle, observed results and retained failures; no circular self-certification.
- **Positive tests:** Independent consumer replays sealed challenge.
- **Adversarial tests:** Artifact replacement, false claim, stale version and synthetic-vs-real incident confusion.
- **Verification:** Frozen fixture and independent deployed probe after authorization.
- **Evidence:** None; no credit claimed.
- **Limitations:** No live HTTPS Observatory verification yet.

## Phase 18 — Standalone open-source engineering primitives

Prior IDs: V2-C01.

### V2-P18-KIT — Extract stable reusable contract only after verification

- **Status:** Not started. **Priority/risk:** P2/medium. **Dependencies:** V2-P05-RECOVERY, V2-P08-CAUSAL, V2-F12c.
- **Implementation:** `packages/sutra-knowledge/; existing Open Kit`.
- **Acceptance:** Separate consumer works without SUTRA UI, licensed sources, docs, pinned build and limitations.
- **Positive tests:** Independent sample consumer.
- **Adversarial tests:** Tampered receipts, missing dependencies, stale schema.
- **Verification:** Clean package test and consumer replay.
- **Evidence:** None; no credit claimed.
- **Limitations:** No package release authorized.

## Phase 19 — Performance, scalability and resource limits

Prior IDs: none.

### V2-P19-PERF — Measure startup, memory, support scaling, receipt and network recovery overhead

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-P00-REPRO, V2-P07-WASM, V2-P09-IR, V2-P12-ECON.
- **Implementation:** `packages/sutra-knowledge/; apps/sutra-v2/; docs/sutra-v2/`.
- **Acceptance:** Report exact environment, repeated samples, p50/p95, peak memory, bounded workloads and meaningful baselines.
- **Positive tests:** Compare full/incremental and native/WASM.
- **Adversarial tests:** Worst-case enumeration and resource exhaustion.
- **Verification:** Reproducible benchmark scripts and CI artifacts.
- **Evidence:** None; no credit claimed.
- **Limitations:** No measured performance advantage claimed.

## Phase 20 — Adversarial evaluation and independent benchmarks

Prior IDs: V2-B01.

### V2-P20-BENCH — Freeze independently specified holdout adversarial benchmarks

- **Status:** Not started. **Priority/risk:** P1/high. **Dependencies:** V2-P01-THREAT, V2-P17-OBSERVE, V2-P19-PERF.
- **Implementation:** `packages/sutra-knowledge/reference; docs/sutra-v2/`.
- **Acceptance:** Matched budgets and metrics against ordinary tool/prompt/multi-agent baselines; report errors and abstentions.
- **Positive tests:** Correct exact and uncertain cases.
- **Adversarial tests:** Poisoned data, forged receipt, wrong model, exhausted budget, irrelevant agent.
- **Verification:** Sealed test set and independent oracle; report selection bias.
- **Evidence:** None; no credit claimed.
- **Limitations:** No representative population or baseline outcome yet.

## Phase 21 — Research and prior-art differentiation

Prior IDs: none.

### V2-P21-RESEARCH — Link prior art to engineering obligations and verify official protocol/challenge rules

- **Status:** Researching. **Priority/risk:** P1/medium. **Dependencies:** V2-M01.
- **Implementation:** `docs/sutra-v2/PLAN.md; docs/sutra-v2/ROADMAP.md`.
- **Acceptance:** Compare ATMS, diagnosis/MUS, provenance, typed logic, VOI, transaction/idempotency, transparency, proof-carrying and capability security; document known mechanism versus integration.
- **Positive tests:** Reproduce a relevant baseline or counterexample.
- **Adversarial tests:** Reject unsupported world-first, outdated rule and cherry-picked baseline.
- **Verification:** Primary-source register with dates and executable comparison.
- **Evidence:** None; no credit claimed.
- **Limitations:** Only idempotency/fsync research currently added; competition rules not verified.

## Phase 22 — Flagship demonstration and release readiness

Prior IDs: V2-R01, V2-R02.

### V2-P22-RELEASE — Prepare reproducible two-site investigative demonstration without release

- **Status:** Deferred with justification. **Priority/risk:** P2/critical. **Dependencies:** V2-P13-INTEROP, V2-P05-RECOVERY, V2-P16-LEARN, V2-P17-OBSERVE, V2-P20-BENCH, V2-P14-BUDGET.
- **Implementation:** `apps/sutra-v2/; docs/sutra-v2/`.
- **Acceptance:** Blocked malicious action, exact consent, real controlled failure/recovery, evidence revision, portable receipt and honest uncertainty; free judge and HTTPS gates.
- **Positive tests:** Independent consumer verifies exported evidence.
- **Adversarial tests:** Unauthorized write, duplicated effect, stale artifact and broken judge route.
- **Verification:** Recorded timed demo, privacy/security review and separately authorized release.
- **Evidence:** None; no credit claimed.
- **Limitations:** Release and submission explicitly not authorized; 120 seconds design target only.

## Prior-art decision notes

- AWS Builders' Library, [Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): logical request identity must be caller-provisioned and atomically recorded with owned effects; equal inputs are not necessarily equal intent. SUTRA reuses this established mechanism rather than claiming invention.
- Linux [fsync(2)](https://man7.org/linux/man-pages/man2/fsync.2.html) and [rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html): syncing file data alone does not ensure the directory entry is durable. The finite snapshot design syncs both and fails closed on uncertain persistence. No power-loss certification.
- [TLA+ v1.8.0](https://github.com/tlaplus/tlaplus/releases/tag/v1.8.0): pinned released TLC binary digest, safe/unsafe model gate. No claim of production proof.

## Immediate dependency order

Extend the independently keyed witness into a reviewed anti-rollback design: model witness/authority two-phase failure states, define key distribution/rotation and decide whether an independently operated witness or append-only transparency service is required → expiry/revocation and separately approved compensation → threat/consent review → provider-independent budget reservation → nontechnical multi-provider BYOK workspace. The current dual-store witness is not consensus and its coordinated rollback counterexample must remain. Preserve deterministic no-AI operation and all existing verified primitives. No deployment, release or paid inference.

All 62 original IDs retain their historical checkboxes. Together with 28 new gates, the 90-ID dependency graph remains free of missing nodes, duplicate IDs and cycles.


## V2-012 continuation — 2026-11-25

Actual starting head: `626bbfadec32df5542981370cd9dee77c678e9b6`; final verified **code** candidate: `8998fceab17b09ec8d1911945fd5bd90b7b26c89`. Draft PR #50 remains open and unmerged. This documentation commit has the code candidate as its parent; its own immutable SHA is obtainable from Git (not self-embedded). Exact code candidate passed seven workflows, including both knowledge race/formal jobs: [push](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45537116625/job/138946313221) / [PR](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45537124323/job/138946337538). The documentation revision must receive its own exact CI reconciliation.

| Exact source SHA | Outcome of knowledge | Push job | PR job | Observation |
| --- | --- | --- | --- | --- |
| `626bbfadec32df5542981370cd9dee77c678e9b6` | failure | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45535527606/job/138941062192 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45535533186/job/138941081260 | GrantLifecycle.tla parser rejects malformed two-backslash comment |
| `798ed3514215c8912b59d1841b1b68442b431767` | success | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536175061/job/138943197014 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536181153/job/138943218881 | Corrected parser comment only; all existing gates pass |
| `0cab8b43cc211fe048136a03382ee70fbdaf24ae` | failure | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536284728/job/138943559498 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536290952/job/138943579310 | Stage D regression incorrectly regenerated randomized approval instead of reusing original logical request |
| `007de560ac7cecbba833313fb98d1959f428f48c` | success | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536350420/job/138943773101 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536361271/job/138943811211 | Exact approval bytes persist across process death; stage D and eleven intent tamper cases pass |
| `35fb32d4b5b684a0164a24175137ca884707b9d4` | success | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536415006/job/138943990544 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536419827/job/138944008167 | Lossy model adds later contact without prior acknowledgement, three-contact profile, named temporal negative controls |
| `8ffaa2dc1f8c0f0d4ea024d3561b56c480e090dc` | failure | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536567342/job/138944505246 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536572251/job/138944522284 | Real HTTP final response loss exposes invalid exact +1 client sequence restriction |
| `085ae0d98159e894c90b2567100f8feaa058b867` | success | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536736996/job/138945076172 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536743777/job/138945095390 | Fresh monotonic stale-pin reconciliation with exact composite contact invariants |
| `96d23fee6ca8f346e0e75694f26e214813323028` | success | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536871915/job/138945521399 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45536880225/job/138945545605 | 65 actual trace observations across eight cases and five independent checker mutants |
| `8998fceab17b09ec8d1911945fd5bd90b7b26c89` | success | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45537116625/job/138946313221 | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45537124323/job/138946337538 | Immutable grant preflight and concurrent-clone counterexample; all seven workflows pass |

All seven workflow IDs for each listed revision and all final-code job IDs are in progress.json / reconciledCI. Previous failureHistory and verified evidence remain intact. This continuation reconciles the nine listed source candidates; earlier inherited V2-012 failure runs are indexed separately, not asserted to have been individually root-caused.

**Formal evidence.** Original safe TLC 33 distinct states; anchored 995 distinct (6,642 generated), independently 995 states/6,641 edges; strict bridge TLC 11 distinct and Python 11/12; lossy bridge TLC 28 distinct (65 generated, zero queued), Python 28/36; grant TLC 40 distinct and Python 40/80. Strict bridge negative controls: WitnessNotAhead (early witness), GapBound (double authority advance), RecoverableGap (early clear), AckNotAhead (early acknowledgement). Grant negative controls: expired/revoked consent and epoch/revocation dispatch race violate DispatchAuthorized, missing admission violates ReconcileRequiresAdmission, duplicate effect violates AtMostOneEffect. Anchored negatives: Authorized, BoundedContacts, NoRollback, NoFork and unfair ConditionalRecovery; original AtMostOnce remains. Original strict unfair PreparedEventuallySettles fails. Wider lossy model permits PrepareWithoutAck: weak fairness alone allows repeated Prepare/AbortPrepared disabling acknowledgement intermittently, so SettledEventuallyAcknowledged is false; quiescent eventual acknowledgement with fairness passes, unfair quiescent property fails. All expected negative results are exact named diagnostics, not generic parser/tool failures. Full traces are printed in the exact knowledge logs above.

**Implementation evidence.** Actual subprocess death after intent fsync, authority persistence, witness persistence and intent deletion; exact request bytes retained across process reopen. Witness-response and final-client-response loss exercised via actual loopback HTTP. Independent checker maps 65 Go observations in eight scenarios, rejects missing intent, witness ahead, digest equivocation, counter reset and premature acknowledgement. See protocol/formal/REFINEMENT.md and uploaded sutra-v2-bridge-traces / sutra-v2-bridge-refinement.json in the knowledge artifact. Eleven malformed-intent controls include symlink and FIFO. The bounded bridge assumes a trusted directory and independent witness state; no physical power-loss certification.

**New permanent counterexample.** Sequential clone blocked before mutation. Two simultaneous cloned authorities can both pass the old-head check and persist one local synthetic effect each before either CASes the witness. The single retained witness accepts only one branch; losing intent remains and recovery refuses rollback. This is acknowledgement uniqueness, NOT cross-clone effect uniqueness. Coordinated rollback/cloning of both authority and witness still creates valid alternate histories. No generic external side effects until independently enforced fencing or upstream idempotency and failure recovery contract.

**Approval/provider boundary.** Existing fake-provider and exact grant laboratories pass bounded tests; consent uses host epoch, not trusted time, and grant-book rollback remains a counterexample. The ephemeral opaque credential rehearsal is a safe development choice, not a production BYOK design. Production browser-only vault exposes key to XSS/extensions; same-origin relay moves custody to server and requires tenant isolation, operator/access controls and encryption; ephemeral session avoids at-rest storage but requires re-entry after every refresh. No cost/re-entry numbers are measured; choose ephemeral fake-only until threat review and real host budget/durability contract. No real secrets, paid inference, deployment, merge, release or submission. Raw authority route remains a standalone test path; must not be mounted as a bypass in future externally writable runtime. No proof of universal freshness if nonce source or trust keys compromised. No real provider timeout/idempotency billing guarantee.

**Integrity.** All 22 protected original blobs remain identical to `f2e5d2ed646dccf7ca6becf9a3a583a81f6c1d4d`. 62 historical IDs + 28 gates = 90 nodes, zero missing dependencies, duplicates or cycles. No historical completion or gate accepted by this continuation. Recovery, rollback, refinement, F11b, consent, budget and BYOK remain open.

## V2-012 current admission-fence candidate — 1704e7c3

Current branch work has moved independent reservation ahead of synthetic authority persistence and added formal/runtime challenges for cloned authorities, grant-policy freshness and exact returning-client ancestry. This is **implementation-in-progress**, not a closed roadmap gate. Five non-knowledge workflows have passed; exact knowledge PR `45542920604` and push `45542913848` are still running. The previously verified source remains `8998fcea` until both knowledge jobs succeed.

Critical counterexamples retained: coordinated rollback of locally controlled trust domains; newly provisioned client with no retained historical pin; bounded-model versus general implementation gap; and lack of an independently deployed fence for arbitrary upstream effects.


## V2-013 — admission availability, finite ancestry and exact-source reconciliation

Exact verified kernel source: `a9dd3fc62ad35bd14ec8cd4ebdd35bfac7fcd051`. Required exact workflows: knowledge push 45546486966, knowledge PR 45546494248, impact 45546494229, Open Kit 45546494226, publisher 45546494245, engineering 45546494239, browser compatibility 45546494225; all completed successfully. Knowledge jobs: push 138977247427, PR 138977269672.

The successful formal gate is deliberately bounded. ClientPolicyAncestry safe TLC explored 15,830 distinct states (66,661 generated); independent Python explored 15,830 states / 50,830 edges. Numeric-only ancestry produced the named `NoUnpinnedEffect` counterexample after rollback to an alternate branch. Fresh provisioning produced the required `Advance -> CoordinatedRollback -> ProvisionFresh -> ProvisionCheck -> Dispatch` witness, proving that a client with no retained newer pin can accept a rolled but internally consistent history. FenceAvailability safe Python explored 15 states / 18 edges; TLC and Python both retain the orphan liveness counterexample, and the steal-orphan mutant violates `AtMostOneEffect` by delivering delayed effects from two authorities.

The implementation now distinguishes `ErrFenceOrphaned` and `ErrFenceExhausted`; neither path mutates the synthetic authority in its regression. This is safety-over-liveness: an orphaned reservation is not auto-aborted because arbitrary delayed external effects make such stealing unsafe. The remaining design problem is a trustworthy resolution/idempotency contract, not a shorter timeout.

Failure chain retained: `cd6e2962` knowledge jobs were cancelled at the historical five-minute timeout after Go passed; `2303f261` extended CI capacity but retained the unbounded ancestry counter discovered by review and its exact knowledge runs remained stale/in-progress at reconciliation; `f4f80f1`, `6aa0609b` and `79e2241` failed exact knowledge CI on the ancestry predicate parser conflict; `9d0b8661` fixed ancestry and reached the intended ancestry witnesses but failed because FenceAvailability reused the same bound symbol across weak-fairness clauses. `a9dd3fc6` scopes that quantifier correctly and is the first revision in this chain with all seven required workflows green.

No gate is completed. Coordinated trust-domain rollback, fresh-client provisioning, orphan availability, arbitrary external-effect fencing, physical power-loss semantics, durable provider accounting and BYOK remain open. Next dependency-ready hardening is to make lower raw/post-effect network mutation layers non-mountable by default while preserving them as explicit in-package negative-control laboratories.


## V2-013 network write-surface checkpoint — e64e35c73f7d

Exact source `e64e35c73f7dcef09d4457a24d9963c1a7deeb73` passed knowledge push 45550645649, knowledge PR 45550654471, impact 45550654371, Open Kit 45550654523, publisher 45550654402, engineering evaluation 45550654330 and browser compatibility 45550654389. The lower raw receiver/durable receiver/shared authority/post-effect witness/legacy grant effect layers no longer implement `http.Handler` directly. The current anchored composite no longer exports unpinned `Commit`, `Status` or `ProcessAttested`; its external mutation surface requires the signed policy pin and retained-history membership. The composite also rejects legacy write routes without changing authority, fence or policy state.

This is partial V2-RUNTIME-02 evidence, not gate closure. Deliberate custom wrappers around lower in-process laboratory operations remain possible, and the synthetic fence does not establish arbitrary upstream exactly-once behavior. Orphan liveness, coordinated rollback/fresh provisioning, expiry/revocation, separately authorized compensation, physical power loss and provider-global spend remain open. Next work remains RUNTIME-02/P05 recovery semantics before RUNTIME-03 browser integration; no external write, deployment or release is authorized.


## V2-013 permanent non-application recovery checkpoint — 5b2e9e686bed

Exact source `5b2e9e686bed23590ef433cb9c06d54157b842a3` passed both knowledge workflows and all five auxiliary PR workflows. The recovery path no longer treats elapsed time or a transient status absence as proof. A pre-effect orphan may be aborted only after a separately keyed authority signs permanent non-application of the exact admission/idempotency identity, binding reservation hash, request hash, authority before/after heads and random token. The closure key is forbidden from reusing either the action-authority or fence key. Forged/tampered closure is refused; a closure cannot rewind a locally persisted effect; valid pre-effect closure restores fresh admission in the bounded synthetic fixture.

Finite formal/reference evidence: truthful closure keeps the closed identity durable; independent Python explored 36 states / 44 edges and checked four unresolved plus four already-closed orphan states. A deliberately lying closure authority produces the expected delayed two-effect counterexample after the old dispatched effect and a newly admitted identity both deliver. This is the counterexample, not a passed safety claim for a dishonest issuer.

RUNTIME-02 and P05 remain in progress. No actual provider currently supplies the required permanent non-application contract, so this is a protocol boundary and falsification harness, not production exactly-once evidence. Expiry/revocation, explicit compensation authority, coordinated trust-root rollback/fresh provisioning, physical power-loss behavior and provider-global budget remain open. No external write, deployment or release is authorized.


## V2-013 — durable upstream APPLIED/CLOSED receiver contract — 2026-11-25

Exact verified source: `9b83295062ba8059ad1fa7590988ab4a86ef895b`. Required evidence is green on the immutable source: knowledge push 45555362744, knowledge PR 45555367970, impact 45555367794, Open Kit 45555367759, publisher 45555367847, engineering 45555367760 and browser compatibility 45555367798.

The receiver-contract laboratory now makes the previous permanent non-application promise executable within one durable authority history. One exact idempotency identity becomes either **APPLIED** or **CLOSED**, never both; APPLIED retries return the same signed receipt, CLOSED retries return the same closure proof, and signed status is terminal rather than treating point-in-time absence as evidence. The authority persists a bounded effect budget with the terminal ledger and the loopback client preserves unknown outcomes until reconciliation. A concrete fenced-orphan recovery path obtains durable CLOSED from this authority before the admission fence is released.

Recovery evidence covers injected failure before and after rename, restart, actual lost Apply/Close HTTP responses, concurrent Apply-versus-Close, durable budget accounting, strict transport validation and an upstream restart before orphan resolution. The upstream server remains package-private and cannot be mounted directly as `http.Handler`.

**Counterexamples remain first-class.** Two cloned signer+snapshot authorities can each apply the same identity, and restoring a valid older signed snapshot after a physical effect permits reapplication across histories. The receipts can be cryptographically valid and even identical. Therefore this establishes neither global freshness, consensus nor arbitrary-provider exactly-once semantics.

RUNTIME-02 remains **Implementation in progress**. The new receiver is synthetic and same-project; normal fenced dispatch still uses the synthetic SharedAuthority effect, no real provider implements the contract, and dedicated UpstreamTerminal formal/refinement evidence has not yet been promoted. Expiry/revocation, separate compensation approval, external monotonic rollback resistance, physical power-loss certification and provider-global spend remain open.


## V2-013 — upstream terminal formal model and implementation trace — 2026-11-25

Corrective exact source `149d11407bbf4033ac2252474d53c255d1bfbeb9` passed all seven required workflows. Failed predecessor `48a41453bfac11418b90f77873196d753c3af467` is intentionally retained: its push knowledge run 45556172530 failed the executable threat register before Go/TLA because T25 used an unsupported category label. No evidence was transferred from that revision.

The dedicated `UpstreamTerminal` abstraction separates signed-store state from outside-world physical effects. Within one current authority history, APPLIED/CLOSED is terminal and the safe bounded machine produced 8 states / 3 distinct with no TLC error. Restoring a valid older store while the physical effect remains reaches the named `Apply -> RollbackStore -> Apply` two-effect witness; cloning signer+snapshot reaches `Apply -> CloneApply`. Independent Python independently reproduces safe 3 states/7 edges, rollback 6/11 and clone 4/8.

Implementation refinement is separately evidenced rather than inferred from the model. The Go race suite exports actual APPLIED and CLOSED traces; `refine_upstream_trace.py` maps each init/transition/retry/status sequence to the model relation, and a separate mutation control rejects seven corruptions including effect loss and terminal rollback. This supports the single-authority terminal design but remains a bounded two-trace witness, not general refinement.

The next RUNTIME-02 problem is transaction coupling. Existing `FencedCoordinator.recoverLocked` may safely abort when only its local synthetic authority is authoritative, but that exact rule becomes unsafe if a remote upstream Apply may already be delayed or ambiguous. The external-effect path therefore needs a durable full request+reservation intent and recovery that resolves the exact upstream identity by APPLIED-vs-CLOSED competition before either committing local acknowledgement or releasing the fence. Status absence alone remains non-authoritative.


## V2-013 — transactional upstream Apply-vs-Close coupling — 2026-11-25

Exact verified source: `b60fc4fee0f1bc3603b0cabbdb0fcd5b13998854`. Both knowledge workflows and all five auxiliary PR workflows are green. Failed predecessor `7d52edd85498a01514a9fb84ef98532886cac480` is preserved because both knowledge runs failed before tests on typed intent-size compilation; the corrected source only adds explicit `int64` conversions.

The private transaction coordinator now closes the key recovery gap between pre-effect admission and a durable upstream idempotency authority. It persists the full signed caller request plus exact signed reservation before admission; after the fence reserves that identity, the upstream authority may atomically make it APPLIED. Only then is the deterministic local authority plan persisted and the fence finalized. The returned laboratory result binds the upstream receipt, reservation, local response and final fence head.

Ambiguous dispatch uses **Apply-vs-Close**, not a status-absence heuristic. If an Apply request never took effect, `CloseUnapplied` makes the exact identity terminally CLOSED and recovery can abort the fence. If the receiver already APPLIED before a reply was lost, Close conflicts, signed status identifies APPLIED, exact receipt retry is idempotent, and recovery completes the local acknowledgement plus finalization. A delayed Apply cannot cross a CLOSED terminal state in the single upstream-authority history.

Exact Go race evidence covers interruption after intent, after reserve, lost TCP request before effect, lost reply after effect, process restart after effect before local acknowledgement, lost finalize response, upstream effect-budget exhaustion, concurrent cloned local authorities and on-disk intent tamper. The upstream budget test shows a second external effect cannot exceed the single-authority limit: recovery closes the blocked identity and aborts without local acknowledgement.

This is still not the production/external path. The coordinator is package-private and deliberately non-mountable. It does not yet require the anchored exact-current grant/policy ancestry composite, and the upstream authority remains synthetic. Upstream signer/store rollback, coordinated trust-root rollback, physical power loss, explicit compensation approval, real provider billing and global freshness remain open. Next work is consent/policy composition before any browser/external-write integration.


## V2-013 — pinned consent/policy transaction composition — 2026-11-25

Exact verified source `dea58567d68d07c50eb31e9175db3f2a3619aa8e` composes the private upstream APPLIED/CLOSED transaction with the strongest current consent/policy primitives without creating a second HTTP write route. Before any grant-admission mutation, the caller's signed exact `ClientPolicyPin` must be a member of the **current** independently witnessed policy history. Active grant/class/epoch checks then run under the GrantBook mutex; that lock remains held through independent fence admission and upstream dispatch, so legitimate revocation/epoch mutation cannot interleave after the final consent check.

The positive path returns one private causal envelope binding the current signed policy decision and retained-history membership, the upstream receipt bound to the exact reservation/request, the local authority response and a fresh challenge-bound final fence attestation. Revoked/expired grants, wrong caller pins, wrong authority heads, alternate policy-history pins and unavailable fence all produce zero upstream effect. Alternate ancestry is rejected before the grant is marked admitted.

Consent and recovery are intentionally separate. Once an identity was durably admitted and upstream APPLIED became ambiguous, later revocation blocks **new** effects but does not prevent exact reconciliation: `checkReconcileLocked` requires prior admission, retained ancestry is rechecked against the current policy history, and transaction recovery completes the one existing effect without redispatch. A never-admitted grant cannot gain this recovery authority.

This remains scoped evidence. The composed guard is package-private/non-mountable; the existing externally mountable composite still owns only the established local synthetic effect path. Coordinated policy book+witness rollback, fresh provisioning after rollback, upstream rollback/cloning, real provider semantics, physical power loss, explicit compensation authority and provider-global billing remain open. Next work is concrete implementation-to-policy-model trace refinement.


## V2-013 — pinned consent/policy concrete refinement — 2026-11-25

Exact verified source `e581a0a5cae0e942821af18b4e547cb65efa9763` passed both knowledge workflows and all five auxiliary PR workflows. The predecessor `57dbdc6bd2f59eb0fbd062aeca5c807fe303fbee` is retained as failed evidence: its knowledge job stopped at Go compilation because the new refinement test omitted the `crypto/ed25519` import; no refinement credit transfers from that SHA.

The implementation trace now demonstrates both forms of legitimate ancestry use. A current pin authorizes the ordinary active path, while a caller pin retained from policy sequence 0 remains acceptable after an independently witnessed epoch advance when its exact head is still present at the claimed sequence. Alternate heads remain rejected before effect. Trace records include the exact pin sequence/head rather than only a derived membership boolean.

The independent mapper was tightened to match transition semantics rather than broad state monotonicity. Admission must advance the witnessed policy exactly once without changing the grant window or epoch; the exact caller pin must remain stable; revocation must produce its own single policy transition; exact reconciliation after an already-applied ambiguous effect must not mutate policy; a fresh revoked dispatch remains a stutter. New mutation controls target epoch/window drift, sequence jumps, fake historical ancestry, lost ancestry, missing revoke transition and recovery-side policy mutation.

This advances V2-P06-REFINE and supports V2-P04-CONSENT within the private transaction laboratory. It does not establish universal Go refinement, coordinated-rollback resistance, fresh-client trust after rollback, clone-safe physical effects, real provider semantics or production release safety. The next security target is an independently retained monotonic upstream head that can detect receiver-store rollback while preserving clone and coordinated receiver+witness rollback as explicit counterexamples.


## V2-013 — upstream terminal monotonic rollback witness — 2026-11-25

Exact verified source `6e0ff79354a10520a9c9a4f84a40584d75cfa460` passed both knowledge workflows and all five auxiliary PR workflows. The strongest private pinned transaction fixture now sends the upstream APPLIED/CLOSED wire protocol through an `upstreamWitnessCoordinator`, which couples each durable terminal append to an independently keyed `AuthorityWitness` head. The receiver snapshot itself exposes a deterministic content-bound state head; the witness genesis pins the exact empty upstream state.

The crash boundary is explicit. A signed intent is persisted before receiver mutation. If the receiver snapshot advances but witness CAS is lost, the operation remains unknown; reopening verifies that the current receiver state is exactly the intended one-record append and advances the witness once. If the receiver store alone is rolled back to an older valid signed snapshot while the witness remains ahead, recovery fails closed with `ErrWitnessRollback`. A lower raw mutation without a corresponding witness transition is likewise refused by the witnessed composition.

This is **rollback detection, not physical-effect fencing**. A deterministic race regression pauses two cloned upstream authorities after each has durably performed the same synthetic effect but before either witness CAS. One witness CAS wins and one caller becomes ambiguous, yet both clone stores already contain one effect. Because the clones generated the identical after-head, the loser can later reconcile to the accepted witness head; a post-effect witness cannot infer that two physical effects occurred. A separate regression rolls back both receiver and witness snapshots together and reapplies the same identity, preserving the coordinated-rollback two-effect counterexample.

Formal evidence matches this scope. UpstreamWitness safe TLC generated 11 states / 5 distinct and found no invariant error. The clone mutant reaches `Prepare -> ApplyStore -> CloneApply`; the coordinated mutant reaches `Prepare -> ApplyStore -> AdvanceWitness -> CoordinatedRollback -> Prepare -> ApplyStore`, each violating `AtMostOnePhysicalEffect`. Independent Python reports safe 5 states/10 edges, clone 7/11 and coordinated 8/16.

This advances V2-P05-ROLLBACK/F11b and strengthens RUNTIME-02's private composition, but does not close them. The next dependency-ready work is V2-P06-REFINE for this new wrapper: export actual normal, store-ahead recovery and rollback-refusal Go traces, independently map them to the UpstreamWitness transition relation, and preserve mutants. No external write route, provider credential, paid effect, deployment, merge, release or submission is authorized.


## V2-013 — upstream witness concrete implementation refinement — 2026-11-25

Exact verified source `dbba396c6cca16c324975c86ed9ad234b7a619d8` passed both knowledge workflows and all five auxiliary PR workflows. This closes the specific model-versus-implementation gap left by the preceding rollback-witness checkpoint: the Go race suite now exports actual states at the witness coordinator's durable seams, and a separate Python checker maps those states to the bounded `UpstreamWitness` relation.

Three executions are mapped. **Normal:** `Prepare -> ApplyStore -> AdvanceWitness`. **Store-ahead restart:** the receiver persists APPLIED while the witness remains behind, restart is a stutter that preserves intent and physical effect, and recovery maps to the witness advance. **Receiver-only rollback:** after a fully witnessed APPLIED state, the signed receiver file is externally restored to version 0 while witness version and the modeled irreversible physical-effect count stay at 1; `Recover` returns rollback and is mapped as a stutter.

The refinement checker deliberately treats physical effect as separate from the rollback-able receiver file. Ten mutation controls include `rollback-erases-physical-effect` and `rollback-also-rewinds-witness`, preventing the safe profile from silently absorbing coordinated rollback or deleting the outside-world effect when state is restored. Other mutants challenge missing intent, missing effect, unwitnessed success, restart loss, recovery intent cleanup and state mutation on refusal.

This advances V2-P06-REFINE for the upstream witness wrapper but remains a finite three-trace witness. It does not establish arbitrary-schedule refinement, clone safety, coordinated rollback resistance, physical filesystem semantics or real-provider guarantees. The next dependency-ready RUNTIME-02 gap is compensation: `GrantCompensation` exists as a signed class, but there is no explicit compensating operation that cryptographically links a separately authorized new action to the exact prior APPLIED effect it is intended to offset.


## V2-013 — causal compensation authority — 2026-11-25

Exact verified source `b70312dfac3bcb2c4c5197270fad622e00d5df72` passed both knowledge workflows and all five auxiliary PR workflows. The private transaction laboratory now treats compensation as a **new causally bound action requiring a distinct authorization authority**, rather than interpreting the existing `GrantCompensation` label as sufficient.

The signed compensation authorization binds one exact prior reservation, the digest of its signed APPLIED receipt, the compensation grant ID and the exact new AuthorityRequest hash. Before fresh compensation dispatch, the guard verifies the prior receipt against the upstream signer and requires current upstream status to remain APPLIED. The compensation key is prohibited from reusing consent, caller, grant-book, action-authority, fence, upstream or policy-witness keys. Ordinary primary dispatch rejects compensation-class grants, so the causal guard cannot be bypassed by calling the primary path directly.

Recovery remains narrower than fresh compensation. It validates the same causal authorization and prior signed receipt, then can reconcile only the exact compensation grant already admitted by policy/transaction state; it does not create a new compensation authority after an ambiguous outcome.

This closes the **synthetic explicit-compensation sub-gap** inside V2-RUNTIME-02, not RUNTIME-02 itself. A compensation effect may fail, overcorrect or fail to reverse the real-world primary effect. No real provider semantics, physical power-loss certification, clone-safe physical-effect fencing, coordinated rollback resistance, provider-global billing/spend or public external-write route is established. The next runtime work should target physical durability/provider semantics or another dependency-ready P0 boundary rather than browser exposure.

## V2-014 — V2 static CSP / WASM candidate (pending exact CI)

Observed parent `9c6aaa593e99c5c469a28d154f611d2e57e3ae69`: eight PR workflows and push knowledge run 45565038532 all reported success. Four intervening commits from `b70312dfac3bcb2c4c5197270fad622e00d5df72` reconcile navigation, compensation registration, V2 Pages entry and restored build evidence marker. The parent browser used a hand-written CSP while packaging copied V1 headers; it does not establish packaged WASM execution.

- [ ] V2-only static policy permits WASM but not JS eval; V1/API policies unchanged.
- [ ] Built headers are checked byte-for-byte against V2 source; legacy, unsafe-eval and weakened directive mutants rejected.
- [ ] Actual Chromium external-script probe compares WASM compilation under V1 and V2 CSP; JS eval refused in both; main journey uses actual built policy plus explicit test peer.
- [ ] Pages candidate must preserve all original assets and change only the exact approved guide origin; no deployment.
- [ ] Exact source push/PR knowledge and ingress CI required before promotion or new product surface. Next: attackable conclusion product objective and vertical slice using existing conflict/lineage engine.


## V2-015 — Conclusion debugger (candidate pending exact CI)

Exact source 68c32ae70c523daf1e8e70a125ba6c5738bba4d9 passed knowledge push 45566732763, PR 45566742207 and Pages ingress 45566742003; all nine observed runs succeeded, including both Chromium CSP probes and independent replay. Scope: local packaged candidate, no HTTPS deployment. Prior marker failure 39207bc454ec74afaa15f3ebf08d8867b2275614 is retained (job 139037256767, T16 build evidence marker).

SUTRA is a debugger for conclusions. Product objective: falsification-first investigative reasoning and reproducibility. Trust/runtime infrastructure: consent, causal integrity, monotonic witnesses, compensation and bounded recovery, as a separate second act. Competition objective: attack a conclusion, expose declared ancestry, compute what survives and a decisive next observation, then verify a portable Proof Capsule offline. No paid inference required.

SUTRA MUST BE MORE INFORMATIVE WHEN ITS CONCLUSION FAILS THAN A NORMAL AI SYSTEM IS WHEN ITS ANSWER SUCCEEDS. Failed conclusions expose cause, changed and surviving claims, decisive dependencies, remaining worlds, and a next observation when one exists; contradictions must never be presented as an ordinary low-confidence vote.

The first bounded slice composes the existing evidence-session, graph verifier, frontier planner and Rust support module. Ten supporting artifacts (one original plus nine exact anchored copies) enter one declared lineage; a conflicting root is not outvoted. Separate control provides a genuine nondependent claim. Exact minimum lineage withdrawals are enumerated; restoring availability is not evidence restoration. Conflict repairs are hypothetical, not authorization to discard evidence. Unknown copying, correlated errors and external truth are not established. The fixture has eight worlds, four computational observations and at most thirteen artifacts, with a 24-event limit. No global bounds are increased. Export is a replay state, not yet a signed/fresh Proof Capsule. Full independent browser replay remains pending CI.


## V2-016 — Proof Capsule (candidate pending exact CI)

All nine exact-source workflows succeeded: knowledge PR 45567774777 and push 45567766279, ingress 45567775133, impact 45567774809, evaluation 45567774773, Open Kit 45567774881, legacy release 45567774749, publisher 45567774972, browser matrix 45567774784. Actual Chromium produced six attack exports; independent Python refused 40 mutations (6+6+7+7+7+7). Three targeted Node groups also reproduced locally with exact Git blob hashes. Synthetic, declared ancestry only; no deployment.

The D01 attack slice is promoted only for exact source `6ad7b85dbc56406d38b84385cb58bae5128fe737`. D02 implements a bounded 256 KiB capsule with an independently retained SHA-256 pin, exact source bytes, fixed case identity, explicit algorithm identifiers, event history, result and mandatory limitations. The browser exports the capsule and pin separately, checks imported or local bytes, demonstrates one-byte refusal and restores the exact original. Independent Python replay reconstructs the finite synthetic case instead of trusting the supplied result. Four targeted Node test groups passed locally; browser and independent Python candidate evidence remains pending exact CI.

Hard counterexample: an old valid capsule and its old trusted pin still verify; a pin is not a monotonic witness. A sender-supplied pin cannot authenticate the sender. Rehashed fabricated conclusions, lineage, observations and case substitutions must fail independent replay even if their new digest is accepted. No physical truth, source independence, signer identity, freshness or deployment is claimed. See [Proof Capsule](PROOF_CAPSULE.md).


## V2-017 — Conditional diagnosis and decisive observation (candidate pending exact CI)

All nine exact-source workflows succeeded: knowledge PR 45569144216 and push 45569135925, ingress 45569144227, impact 45569144194, evaluation 45569144290, Open Kit 45569144212, legacy release 45569144200, publisher 45569144195, browser matrix 45569144271. Chromium exported exact old/current capsules and independent pins; verified current, rejected one-byte tamper, restored and reverified, and imported in fresh tab. Python independently verified actual bytes, rejected old snapshot against current pin, accepted old with old pin, refused six rehashed semantic/schema mutations and duplicate keys/UTF8/missing pin/oversize. Four targeted Node groups also passed locally with matching Git blobs. Scope is exact synthetic snapshot, not freshness or external truth.

D02 is promoted at exact source `0d6305526d28df4064360162f1125835ca8f9962`. D03 fixes the distinction between a global inconsistency (no admissible world) and a consistent subset's conditional support. The control observation alone still supports the control claim under contradiction; this does not label the global claim supported or authorize removing evidence. If original and alternative readings disagree and the second-variable read is available, both minimal support and refutation subsets remain visible. The UI also separates a model-invariant decision, an optimal finite observation plan, an explicit impossibility witness, and a conflict that needs adjudication. The recommended fixture action actually executes the selected observation, not a fixed second-variable read. State-changing withdrawals are not falsely described as decision flips.

Two local Node test groups passed. The exhaustive direct binary truth-table oracle checks 108 distinct active/available/withdrawn and copy-presence configurations, including every 3^4 computational evidence configuration, minimum state-changing root withdrawals, minimal consistent supports/refutations, minimal conflicts and observation-plan cost/availability. Browser-generated diagnosis exports and independent Python negative controls remain pending exact CI. The Proof Capsule v1 wire remains unchanged; the new diagnosis is a separate replayable derived artifact.


## V2-018 — Preserve browser download boundary failure; correct test isolation

Both knowledge jobs passed, both Chromium jobs failed awaiting the eleventh download in the combined document (PR job 139052995250, push 139052971382). Seven auxiliary runs passed. SHA-256 verified failed artifact 15001537818 contained resolved debugger export byte-identical to prior green state; local capsule generation/replay of those bytes succeeded. Separate isolated Chromium reproduction accepted ten downloads then timed out on the eleventh for both direct links and programmatic anchors. Full browser and independent diagnosis replay credit withheld.

The diagnosis journey now uses a separate fresh Chromium context, preserving all six debugger exports, both capsule/pin pairs, all four actual diagnosis exports, all semantic assertions, and independent Python replay. This is an observed browser/document resource boundary, not a claim that every Chromium installation has an identical quota. Capsule UI reports download requested, not browser save completion. No security or verification test is weakened; exact candidate CI required.


## V2-019 — Promote diagnosis; guided challenge candidate

All nine exact-source workflows succeeded: knowledge PR 45570334106 and push 45570324195, ingress 45570334100, impact 45570334101, evaluation 45570334144, Open Kit 45570334105, legacy release 45570334117, publisher 45570334103, browser matrix 45570334116. Both browser jobs passed; independent Python accepted four actual diagnosis exports and rejected 28 mutations (7+8+7+6). Both knowledge jobs passed exhaustive 108-configuration direct oracle. Separate contexts preserved six original attack exports, two capsule/pin pairs, and four diagnosis exports. Scoped synthetic model.

The `5f680cce` combined-document download failure remains recorded and resolved only at `dc50b83369478f6ee2c96186a8c1e14bd18ce004`. The prior browser artifact showed the initial mobile start action below the fold, with extensive unevaluated content preceding the investigation. This candidate prioritizes a compact guided investigation, with advanced controls and existing engineering labs available through progressive disclosure. Its 12 actions delegate to real existing handlers; manually divergent history offers explicit reset rather than silently altering evidence. The guide demands exact current capsule, separately requested pin download, successful verification, PIN_MISMATCH on one-byte attack, and exact restoration. The guided export must equal the independently checked actual current capsule bytes. Browser assertions cover keyboard start, 360×800 primary action visibility throughout, 1440×900 supported state, zero external requests, and automated elapsed time below 60 seconds. Automated timing is not human usability evidence. Candidate only pending exact CI; no deployment.


## V2-020 — Promote first-screen guide; world trace candidate

All nine exact-source workflows succeeded: knowledge PR 45570855086 and push 45570848503, ingress 45570855153, impact 45570855061, evaluation 45570855254, Open Kit 45570855237, legacy release 45570855300, publisher 45570855074, browser matrix 45570855215. Actual 12-action guided route passed keyboard start, first-viewport checks at 360x800 and 1440x900, exact guided capsule equality to independently verified current bytes, pin mismatch, exact restoration, zero external requests. PR browser artifact 15001768812 SHA-256 2d54dc4a85610950e04a07af46a642c4e5b6fe6fec99d39e939a71fe96952699 verified locally; actual mobile and desktop screenshots inspected; elapsed 891 ms is automated Chromium timing, not a human usability study. No deployment.

The next candidate renders all eight hypotheses, the target outcome in each world, admitted observation matches, mismatched expected and observed values, and the exact set of blocking roots. A world returns under hypothetical withdrawal iff every blocking root is removed. This is not adjudication, permission to remove evidence, or a probability. The 108-configuration direct binary oracle tests every removal subset and exact copy invariance. Both local test groups passed; independent browser trace replay remains pending exact CI. A separate world trace export preserves all previous wire formats. An explicit reset starts a new guided proof ceremony even if the eventual history digest matches an old one; prior capsule remains inspectable, not a freshness claim. Five new browser exports use their own context to preserve all prior tests.


## V2-021 — Promote world trace; assumption sensitivity candidate

All nine exact-source workflows succeeded: knowledge PR 45571528317 and push 45571517657, ingress 45571528351, impact 45571528199, evaluation 45571528340, Open Kit 45571528083, legacy release 45571528114, publisher 45571528312, browser matrix 45571528245. Five actual Chromium world trace exports independently replayed with 50 adversarial mutations rejected. Both knowledge jobs passed 108 configurations with every blocker-removal subset. Actual browser checked all eight rows, expected/observed blocker values, copy invariance, withdrawal deltas and new guide ceremony after restart. PR artifact 15002476149 SHA-256 27e52b50e8c33b8ef3f1ef5fd279ad92fd1bd629d77afb9de655959fda005549 matched local download; conflict and resolved screenshots inspected. Scoped fixed binary model.

The assumption attack explicitly distinguishes changing the decision rule from withdrawing or changing evidence. Five exact rational limits (0, 1/2, 1, 3/2, 2) are evaluated by the exact graph kernel over all eight anchored worlds; the original variant retains its original case digest. Alternative limits introduce an isolated target_limit node, because changing the original shared one node would also change the control. All observed quantities and control receipts must remain byte-identical across variants. The surviving world set is unchanged. Nonempty surviving sums define exact boundaries: refuted below min, supported at/above max, mixed at/above min and below max. Empty survival remains conflicted under all thresholds. The smallest sampled change is measured only over the declared five limits. Browser selection is counterfactual, never adoption; the original proof stays unchanged. The direct 108-configuration oracle passed locally in two targeted test groups. Separate sensitivity artifact and independent Fraction replay are pending exact CI.


## V2-022 — Promote assumption sensitivity; distribute independent verifier

All nine exact-source workflows succeeded: knowledge PR 45572062202 and push 45572056458, ingress 45572062273, impact 45572062298, evaluation 45572062245, Open Kit 45572062403, legacy release 45572062208, publisher 45572062216, browser matrix 45572062262. Five exact thresholds and 108 configurations passed, including original control receipts and admitted quantity invariance. Four actual browser assumption sensitivity exports independently replayed; 44 mutations rejected. Browser artifact 15003001999 SHA-256 f90a222223179e7515bc7cf84b3e6b8f4163fbc77ac757705cd4363462b00f04 matched local download; resolved counterfactual screenshot inspected. Original model, evidence, result and Proof Capsule remain unchanged. Scoped fixed binary model.

The standalone offline verifier candidate packages the existing independent Python implementation as an inspectable deterministic ZIP application with sorted members, fixed metadata, source manifest, license and notice. It uses the standard library only and accepts an explicit externally retained digest or strict digest file; it never treats a self-declared digest as a trust anchor. The static build and Pages preparation preserve the exact bundle. The browser downloads the actual verifier and digest; CI executes those actual bytes in isolated Python with an import-shadow attempt, old/current Proof Capsules, one-byte corruption, exact restoration, recomputed-hash semantic forgery, malformed pins and missing input. The verifier distribution itself must be obtained or authenticated independently; a digest from the same untrusted publisher is not an authenticity guarantee. These checks remain pending exact CI. No deployment.


## V2-023 — Promote offline verifier; make root dependencies directly inspectable

All nine exact-source workflows succeeded: knowledge PR 45572793560 and push 45572786501, ingress 45572793255, impact 45572793322, evaluation 45572793369, Open Kit 45572793487, legacy release 45572793532, publisher 45572793338, browser matrix 45572793303. Actual browser downloaded exact independent 55,058-byte Python archive; archive SHA-256 e8ea6051acba24600fd75496c8b316b633770db6ba2f98aa81c2701f1fcd87be. Deterministic rebuild, exact member source manifest, isolated execution with import shadow, one-byte tamper/refusal/restoration, historical pin counterexample, rehashed forgery, strict pins and missing input all passed. Actual browser artifact 15003426534 SHA-256 e2a683d8ecdfc4404bc7f01c7e469302244543d40b0b3f3aa80382d107d21e83 matched downloaded bytes. Downloaded archive independently executed locally with current pin/current capsule (REFUTED), current pin/old capsule (PIN_MISMATCH), and old pin/old capsule (SUPPORTED). No publisher authenticity, truth, or freshness claim.

The next candidate moves surviving claims and decisive observation ahead of the advanced world and threshold tables, now accessible by explicit disclosure. Each active declared lineage exposes its exact reading, artifact count, predicted outcome for both claims if that one lineage is withdrawn, newly admitted world count, and inspectable original/copy identities with exact parent and digest. The preview uses the existing replayed world trace without editing evidence, decision rule, or proof. The fixed fixture explicitly checks one admitted computational reading per root. A local exact-kernel test compared 162 actual withdrawals across all 108 available/read/withdrawn and copy configurations; all matched, with additional bad ancestry and duplicate artifact refusal. The number of comparisons is derived from the four three-state readings (108 active roots) plus the 27 copy-enabled configurations (54 active roots). Exact candidate CI remains required. No new wire format or inferred source independence.


## V2-024 — Promote root impact; challenge cross-language wire parity

All nine exact-source workflows succeeded: knowledge PR 45573411050 and push 45573399840, ingress 45573411071, impact 45573411125, evaluation 45573411072, Open Kit 45573411243, legacy release 45573411108, publisher 45573411101, browser matrix 45573411052. The knowledge job passed all 48 tests, including 108 configurations and 162 actual exact-kernel root withdrawals, artifact parent refusal, and immutable replay. Both browser jobs passed root ancestry inspection, ten exact artifact identities, nine direct parents, contrasting withdrawal predictions, preserved conflicted state, progressive disclosure and all existing exports.

The differential candidate compares the browser-compatible JavaScript capsule verifier with the downloaded independent Python executable using actual browser-generated current and historical capsules. Each of 77 cases has an explicit expected result rather than treating mutual agreement as correctness. Local execution against downloaded exact D07 artifacts passed 13 accepted and 64 refused controls, including all four decision states, old/current external pin substitutions, the exact 256 KiB limit, malformed UTF-8, escaped duplicate keys, lone surrogates, nesting, invalid numeric fields, closed schemas, forged result/lineage/history and inadmissible event sequences. Accepted cases require all four digest identities and decision to agree; refused cases require exact refusal reason and exit code. Semantically equivalent outer/payload re-encodings are accepted only with the newly supplied byte digest; an earlier pin binds original bytes. Safe integral JSON values follow platform Number interpretation (including rounding boundary), not lexical canonicality. This tests bounded corpus parity, not universal parser equivalence or trust in a replaced pin. Exact candidate CI remains required.


## V2-025 — Promote capsule parity; general caller-pinned case candidate

All nine exact-source workflows succeeded: knowledge PR 45573886268 and push 45573875402, ingress 45573886271, impact 45573886357, evaluation 45573886529, Open Kit 45573886298, legacy release 45573886479, publisher 45573886242, browser matrix 45573886261. Actual Chromium-exported current/old capsules and downloaded independent Python verifier passed 77 explicit differential controls: 13 accepted, 64 refused; both verifiers agreed on every refusal reason and all accepted identities. Not universal parser equivalence.

The next slice removes the flagship fixture restriction from a separate single-claim investigation workspace, without changing the original guide/capsule. Caller supplies exact case text, a separately retained SHA-256 pin, and event history. The existing exact kernel validates every graph, source pin and observation. The adapter computes all inclusion-minimal consistent supports/refutations, conflicts and consistency repairs over up to eight roots (256 subsets), rather than treating observation counts as votes or returning only the shortest repair. A 12-world eight-root direct oracle checks every subset and replays unequal-size minimal repairs; a separate multi-offer-source test confirms one root and fresh read after restoration. It distinguishes unresolved computational worlds and empty intersections. Frontier labels are ordinal partition IDs, not values; exact rational values are recovered from graph receipts over the full surviving set. A six-world synthetic capacity fixture has load 10/20/30, capacity 20/40, two sources sharing one root, alternate reading, decisive capacity observation. Browser controls exercise baseline, conflict and refutation, export exact inputs/results, and clear stale results on edit. Independent Python reconstructs the generic case and diagnosis using sets; its fixture anchor is separately constructed. Five local Node test groups passed (exact Git blobs 7d531645d028072f762500775b05464ca84da31a and 1894c1ca92077541fa9670d5d38269aadd78d15d); the independent Python blob 161c31434224559886640126c6924af3df75377d accepted three local Node-generated states and refused 23 mutations. Actual browser and exact CI remain pending. Text input normalizes line endings; different bytes must fail the supplied pin. A case pin does not establish source truth, freshness, completeness, independence, or history integrity/authority to withdraw. No release.


## V2-026 — Promote general cases; enforce aligned typed-world profile

All nine exact-source workflows succeeded: knowledge PR 45574455950 and push 45574445279, ingress 45574456147, impact 45574455897, evaluation 45574456144, Open Kit 45574455918, legacy release 45574455928, publisher 45574455904, browser matrix 45574455913. Three actual nonbinary browser exports independently accepted with 23 mutated variants refused. Five targeted local Node groups passed with exact source blob hashes, including 256-subset oracle and larger inclusion-minimal repair, multiple offers and fresh reads. Scoped caller-pinned finite models, not model validity.

A correctly pinned case may still compare different equations under one decision label. The new `sutra-aligned-investigation/v1` profile keeps legacy generic v1 replay intact but requires all worlds to have the same graph node identities, typed dependencies, operators, target ID, basis and dimensions, allowing only input values to differ. Node and property order do not affect the schema digest. A separately pinned case is still not proof of semantic equivalence or external truth. Three targeted local Node test groups passed with exact blobs d2d25bbc65f89b1fb23370e35fb5d44c4b66dffb and ccb7807c7c54139f0842e086118599f18cfe829c; six legal legacy-v1 substitutions are refused in the aligned profile, and a division-by-zero world remains unverified even with aligned shape. The browser now defaults to the strict profile, displays alignment, and must refuse a changed operator even when the caller recomputes the case digest. Python independently reconstructs the alignment and refuses forged schema digest, false qualification and re-pinned mixed equations. Existing v1 exports remain replayable. Candidate until exact CI; no release.


## V2-027 — Promote aligned finite cases; exact portable case/history snapshot candidate

All nine exact-source workflows succeeded: knowledge PR 45575004185 and push 45574993655, ingress 45575004209, impact 45575004158, evaluation 45575004077, Open Kit 45575004140, legacy release 45575004181, publisher 45575004325, browser matrix 45575004147. Three actual aligned browser exports independently accepted; 29 mutated variants refused (10+10+9), plus independently recomputed mixed-equation substitution controls. The three targeted local Node groups were registered at V2-026; actual browser re-pinned operator change refused. Scoped structural alignment, not semantic validity.

A case digest binds a model, not the evidence history. This candidate adds a distinct `sutra-aligned-proof-capsule/v1` wire containing exact aligned case/event text, report, schema fingerprint and mandatory limitations. Verification requires both an independently retained case digest and an independently retained exact snapshot digest. The browser exports current/old snapshots and separate snapshot digest files; verification of imported bytes does not adopt or edit the current investigation. Verified snapshot context distinguishes matching, different, and absent current investigations. The same independently implemented Python reference is now packaged with the existing offline archive under explicit `--aligned --case-pin` selection; legacy fixed-fixture profile remains unchanged and no auto-downgrade is permitted. A 1 MiB capsule bound is stricter than unbounded export; oversized valid inputs may refuse capsule creation instead of silently truncating evidence. Cross-language controls include wrong/missing pins, tamper/restoration, valid alternate history, rehashed stale result, forged schema or event identity, source mutation, downgraded format, invalid wire, re-pinned mixed equation, and valid alternate case accepted only with its own trusted pins. Counterexample: if a verifier trusts both attacker-supplied new pins for a different valid case and history, that snapshot may verify; neither pin proves provenance or freshness. Actual candidate CI and local targeted tests have not yet been observed. No deployment, merge, external contact or paid inference.


## V2-028 — Preserve aligned capsule parser-boundary failure; correct aggregate contract

Both actual Chromium jobs failed at browser.cjs:388 waiting for valid aligned snapshot verification (push 139074648305, PR 139074670037). Push knowledge job 139074647736 failed all four new capsule groups (56 passed, 4 failed). The local exact blob 0063fa41d7aebdddfaad7bc0b5af34ed37e7f412 and test 85c326a1466467aacb2a205afd15781d65b671cc reproduced all four failures. Root cause: strict-json.js rejects maxChars > 262144 before parsing, so passing 1048576 refused every valid snapshot. Seven auxiliary workflows passed. Failed browser artifact 15004926225 digest sha256:51c9899a483c0e973b2bfe622f5e32e050f69ba8dfa06e2de090512a2a5bc51e preserved. No verification credit.

The original 1 MiB candidate is not a supported contract. Rather than broadening the shared parser or bypassing its duplicate-key/size guard, the corrected candidate makes the exact aligned capsule limit 262144 bytes in JS, Python and the browser. Existing per-input limits remain; valid individual inputs can exceed the aggregate envelope bound and must fail without truncation. Five local Node groups passed with corrected source hash f34d47d197289b0c3dec4ddd5e38e5522caa2993 and test hash fce58a5ae42c164bb88196c9fba052bbf1096cfc, including a valid nine-world, eight-observation-depth plan with minimax cost 8 and explicit aggregate oversize refusal. Independent Python corrected source hash 7ad0a2cd73b2e8634a6bd7d5c2d23c0ef0eddcf1 verified locally generated historical and refuted capsules (11642 and 12701 bytes). Actual Chromium and archive differential evidence remain pending exact CI; prior verified source unchanged. No prior checks removed or weakened.


## V2-029 — Preserve exact differential refusal-order failure; correct oracle

Both actual Chromium journeys passed their browser execution and all preceding independent replay steps, but the new aligned capsule differential step failed at aligned-capsule-parity.mjs:60 in jobs 139076301919 and 139076274007. Test expected ENVELOPE_SCHEMA from the legacy profile when fed the deeply nested aligned wire; the actual legacy depth-4 parser refuses before schema with WIRE_REFUSED. Both local JS and Python legacy verifiers reproduce WIRE_REFUSED. No downgrade/acceptance occurred. Seven auxiliary workflows passed; full exact-source credit withheld. PR failed artifact 15004078329 digest sha256:3c06d9c9e374445132e437a6efca49bf55cd4819c898e2a61084dd7c2e239270.

The fixed parser intentionally admits only depth 4 at the outer envelope. The nested aligned snapshot must be refused at the earlier wire stage, not accepted until schema comparison. The test now explicitly requires WIRE_REFUSED in both independent legacy verifiers, retains CLI mixed-mode rejection and adds the opposite direction: fixed capsule submitted to aligned profile must refuse CAPSULE_SCHEMA. No verifier or earlier assertion removed. The failed browser artifact 15004926225 was downloaded and SHA-256 checked against GitHub; its old/current capsules were byte-identical to the corrected local output (11642 and 12701 bytes). The corrected differential script (Git blob 194c0be5f9919c3a74660e75e5eb70b2bd6f79ed) ran against those actual browser bytes and a locally rebuilt independent archive: 27 explicit controls, 4 accepted and 23 refused, matching every expected reason and accepted identity. Archive SHA-256 f68e9b9fe9ca0a67d26cb953c6169c3a2f5e5894e2ab42559dcb69769476f3da. This is local replay of previous browser-produced bytes, not the new candidate's exact CI. Prior failure remains unresolved until exact candidate passes.


## V2-030 — Promote two-pin aligned capsule; attack measurement precision

All nine exact-source workflows succeeded: knowledge PR 45577083295 and push 45577073214, ingress 45577083241, impact 45577083299, evaluation 45577083367, Open Kit 45577083228, legacy release 45577083254, publisher 45577083528, browser matrix 45577083252. Both knowledge jobs passed 61 tests, including maximum eight-observation path and 256 KiB aggregate refusal. Actual Chromium current/old aligned capsules and independent snapshot pins verified in a fresh tab, one-byte tamper refused, exact restore, stale pin and case pin mismatch refused. Both browser jobs passed 27 explicit aligned parity controls (4 accepted, 23 refused), including both profile directions and exact expected refusal reasons. Actual downloaded 68379-byte independent verifier SHA-256 f68e9b9fe9ca0a67d26cb953c6169c3a2f5e5894e2ab42559dcb69769476f3da matched deterministic local rebuild. Failed revisions 12e2d7b and 88f9446 each had seven passing auxiliary workflows and both knowledge workflows failed. Scoped exact aligned snapshot with two caller-held pins, not authenticity or freshness.

The next product attack asks what happens if a point reading is only known within an inclusive rational interval. The interval must contain the original exact point: this is a hypothetical relaxation, not evidence replacement. The original case, admitted observations, history, aligned result and Proof Capsule remain immutable. The candidate separately relaxes only the selected observation and all admitted observations sharing the same declared lineage, quantity, value and dimensions. A copied exact point can keep the result artificially decisive when only its counterpart is widened; the explicitly relaxed cohort can expose ambiguity. A different declared root remains exact. Compatible worlds only expand; an unresolved computational world can be readmitted and must block a decisive conclusion. The next offered observation policy is recomputed over expanded worlds with the same current availability and exact declared costs; if no offered test distinguishes opposite conclusions, show the witness. No shared calibration or actual error bound inferred.

Five local Node groups passed with exact staged core a72b32fed69e75df7f0e2618c57cec0ec1e7ffc3 and test f66577cdd73390ee999d81733a1a6c6eb5aaee07, including all 81 source availability configurations and 432 interval policies against an independent direct finite-world oracle. Python staged source 3e7447dbc003cf43b267f16f012dc7557f536b5a independently accepted two Node-generated diagnoses and refused 22 mutations. Actual browser candidate exports and independent replay remain pending exact CI. The measurement report is a separate diagnostic artifact, not a new evidence source or portable truth claim. No release.


## V2-031 — Promote measurement range; attack finite model coverage

All nine exact-source workflows passed: knowledge PR 45577758522 and push 45577748118, ingress 45577758114, impact 45577758064, evaluation 45577758054, Open Kit 45577758189, legacy release 45577758213, publisher 45577758104, browser matrix 45577758185. Both browser jobs independently replayed actual conflict and resolved measurement exports, refusing 22 mutated reports. The 432-policy direct oracle covers 81 source availability configurations. Hypothetical range and declared matching cohort only; no empirical uncertainty or source truth inferred.

A decisive finite case may exclude a compatible alternative assignment. The next attack adds exactly one explicitly requested hypothetical world by taking an existing base and overriding only declared inputs. The normalized exact assignment must not duplicate any existing world; derived overrides and exceeding the twelve-world bound are refused. All existing receipts, observations, availability, history and original snapshot remain unchanged. The variant is separately identified by its case digest, with its own survivors, blockers, decision and offered observation policy. A compatible refuting candidate may make a supported case underdetermined; an incompatible candidate explains exactly which admitted observations exclude it. An unresolved candidate cannot create a decisive conclusion. Neither the candidate nor the diagnosis is adopted automatically.

Four local Node groups passed with staged exact core 230ad8c8a1c78787d7dc7103e2542cedcf5a1005 and test 8d1c1d72b6225461c86f12a517ad3b1d5ac8d146. Independent Python source 1fab8007cf2ee2a6b9b85bcbd7649a195689c5b7 accepted two Node-generated reports and refused 26 mutations. Actual browser export and replay pending exact CI. No release.


## V2-032 — Promote model coverage; challenge competing agent proposals

All nine exact-source workflows passed: knowledge PR 45578490574 and push 45578480882, ingress 45578490273, impact 45578490447, evaluation 45578491870, Open Kit 45578490751, legacy release 45578490464, publisher 45578490538, browser matrix 45578490495. Knowledge job 139082271514 passed 70 tests. Actual browser compatible omitted world yields UNDERDETERMINED and excluded candidate preserves SUPPORTED; independent Python replay accepted both reports and refused 26 mutants. Same exact original model, history, receipts and capsule. Hypothetical model coverage, not completeness.

The next product attack compares an untrusted agent proposal with the current pinned aligned investigation. Both histories are replayed, not merged. A valid opposed conclusion may arise from incompatible final readings: show exact common event prefix, divergent event tails, shared and branch-only receipts, declared roots, availability and survivors. Canonically identical event records can share a prefix even if exact history bytes differ; equal final evidence is not evidence of a common history. Show the recomputed state even when the proposal's claimed state is false; do not promote or adopt it. Recompute the common-prefix observation policy and branch minimum evidence sets. Opposite decisive states must have disjoint survivors. Foreign case, invalid reading and invalid event history fail closed. The example is synthetic; no remote provider calls, identity claims or independent corroboration.

Four local Node groups passed with exact staged core 233bdc60ea057aa4021fc3fc5fdaeac1107ea739 and test 2d783f4b93d2c7869a7c2fddc848cdfa09db4563. Independent Python 7add5efa3133507ac7ee37466497b7ffad821702 accepted two local reports, including a falsely asserted state correctly diagnosed, and refused 30 mutations. Actual browser export and independent replay pending exact CI. No release.


## V2-033 — Preserve proposal browser parse failure; strengthen independent oracle

Both browser jobs 139084725945 and 139084693222 failed before any browser journey due to browser.cjs:494 SyntaxError: Identifier 'opposite' has already been declared. Existing explanation journey at line 356 and new proposal journey used same lexical identifier. Seven auxiliary workflows completed successfully; knowledge jobs were still in progress when recorded. No browser or full exact-source credit.

Rename only the new variable to oppositeProposal, preserving the explanation journey. The complete corrected browser source was compiled in V8 before commit; add an explicit Node syntax preflight before dependency installation without renaming existing evidence-bearing steps. Add a direct arithmetic/set oracle for all 256 ordered pairs of the sixteen final reading subsets in the capacity fixture. It independently checks both conclusions, disjoint opposite survivors, common prefix replay, receipt and root differences, and asserted-state mismatch: 12 opposite decisive pairs and 128 intentionally false claims all passed locally. This does not cover arbitrary case inputs or all withdrawal orders. No exact-source credit until new workflows succeed.


## V2-034 — Promote competing proposals; diagnose cross-branch receipt clash

All nine exact-source workflows passed: knowledge PR 45579569479 and push 45579560377, ingress 45579569447, impact 45579569525, evaluation 45579569470, Open Kit 45579569509, legacy release 45579569500, publisher 45579569551, browser matrix 45579569465. Knowledge job 139085895176 passed 75 tests including 256 direct-oracle ordered pairs, 12 opposite decisive pairs and 128 false assertions. Actual Chromium replayed both histories, marked false asserted state, refused foreign case, left current history unchanged; independent Python accepted two reports and refused 30 mutants. Corrected previous duplicate lexical binding; Node syntax preflight passed.

The next refinement separates disagreement in asserted states from contradiction in underlying readings. An explicit receipt-only counterfactual uses deduplicated final admitted source bytes, replayed separately without either branch's withdrawal state; this is not a history merge. Shared readings alone must allow every survivor of either branch; joint readings must produce exactly the intersection of branch survivors. Show whether an individual branch was already conflicted or whether the clash occurs only when the two otherwise consistent sets are tested together. Report a deterministic minimum-cardinality observation conflict, inclusion-minimal declared-root conflict sets, and hypothetical consistency repairs; a single declared root can itself contain incompatible readings. If a reading is unavailable in the other branch, expose that explicitly. Do not expose a synthetic all-available observation policy as a real recommendation.

Five local Node groups passed, including the 256 ordered direct arithmetic/set oracle with 24 cross-branch clashes, independent source-byte test and unchanged capsule. Core 9cd77cf4218d693f7c9d5cf385a06266c9b9048e, test 0df2c75c29caed58959fd1a4198c20a9c0daf301 and Python 1d9a2564470bd708436fc16a83050fc42b5d45db; Python accepted two local reports and refused 30 mutations. Actual browser export and replay pending exact CI. No release.


## V2-035 — Promote receipt clash; systematically audit observed input combinations

All nine exact-source workflows passed: knowledge PR 45580198159 and push 45580185704, ingress 45580197942, impact 45580197908, evaluation 45580197861, Open Kit 45580197914, legacy release 45580197991, publisher 45580197853, browser matrix 45580197909. Knowledge job 139088020227 passed 80 tests including 256 direct-oracle ordered pairs and 24 cross-branch clashes. Actual browser receipt-only cross-branch clash and compatible false claim independently replayed; 30 mutants refused. Neither actual history nor availability changed.

The next refinement generalizes the explicit omitted-world attack to the hypothetical Cartesian product of exact normalized input values already represented in the aligned finite model. Report unique assignments and duplicate groups separately, use arbitrary-precision exact grid and missing counts, and enumerate the entire grid only when it fits the existing twelve-world bound. A larger grid reports its exact size and missing count but no computed closure verdict. For each absent assignment, deterministically select the nearest existing world by number of changed input IDs and world ID tie-break, recompute the graph and target receipt, expose evidence blockers and offer admissibility. A compatible omitted combination can change the hypothetical closure verdict; an invalid offered quantity or unresolved compatible target blocks decisiveness. Nothing is added to the original case or history. Cartesian recombination does not certify that inputs vary independently, that the combinations are physically feasible, or that the finite observed grid is empirically complete. Do not offer a next-observation plan under invented availability.

Four local Node groups passed with exact staged core 0caee39501496eaa232fb44d7edcdc6988462f13 and tests 07ef79737100fa0607314ef345ac2793f324c551; independent Python e409d079de5e2fc75ae8ab742accd4228359c487 accepted two Node reports and refused 36 mutations. Actual browser export and independent replay pending exact CI. No release.


## V2-036 — exact observed-grid promotion; assumption-contrast candidate

All nine exact-source workflows for 205dc1544a537dd4de3cd184653d975d84165a8d completed successfully (PR knowledge 45580836169, push knowledge 45580827851, seven auxiliary PR workflows 45580836080, 45580835965, 45580836055, 45580836002, 45580835988, 45580836035, 45580835993). Both browser jobs 139090171285 and 139090140809 completed the independent observed-domain replay step. Scoped observed-domain audit only.

New assumption-contrast candidate: compare surviving declared decisive anchors against distinct normalized assignments in the observed grid, including explicitly hypothetical omitted combinations when bounded. Expose exact inclusion-minimal input/value interventions, separate model-only reversals from evidence-compatible, evidence-excluded and admission-blocked reversals, distinguish one-factor reversal from interaction-only reversal under complete finite coverage, and preserve original capsule. No causality, feasibility, probability, continuous-domain robustness, recommendation or adoption. A direct standalone Boolean oracle exercised the exact proposed anchor algorithm across 256 truth tables and 2,048 anchors; integrated Node tests, browser wiring, independent report replay and exact new-source CI remain pending. Direct local Git clone unavailable (DNS); no full local suite claim.


## V2-037 — assumption contrast UI and replay candidate

V2-037 candidate extends V2-036 with an accessible read-only browser interaction example, report export (1 MiB limit), separate evidence-compatible and excluded witnesses, stale-report invalidation, two Chromium journey assertions, and independent Python reconstruction using pairwise exact intervention-set subset comparison, independently constructed fixture pin and 21 mutation controls per export. No browser, integrated Node, or Python execution observed yet on this source; exact CI pending. Earlier 2,048 pure-anchor oracle checks remain limited to that algorithm. No publication, source adoption, external requests or paid inference.


## V2-038 — public-filing finance investigation candidate

V2-038 public-filing finance vertical candidate. Microsoft FY2025 and FY2026 historical SEC filings (Part II Item 8 cash flows, accession 000095017025100235 and 000119312526323660, accessed 2026-11-25) manually transcribed into normalized field extracts: FY25 OCF 136162, cash PPE 64551; FY26 OCF 182935, cash PPE 115948; all USD million. Exact defined proxy OCF minus cash PPE: 71611 and 66987, change -4624. Four explicit hypothetical FY26 combinations; operating cash alone leaves opposite proxy decisions; full reported fields refute nondecreasing proxy; same conservative issuer lineage across both filings, six reads/two sources not six independent observations; hypothetical withdrawal restores ambiguity. No verified issuer authenticity, original HTML digest, real acquisition cost, future forecast, comprehensive GAAP/FCF metric or recommendation. Source numeric facts only, no verbatim filing content; original rights retained, no whole-source redistribution. Browser journey and independent pinned Python replay plus tamper controls written, not yet executed on exact candidate. V2-037 prior candidate remains pending until exact CI; no merge, deploy or paid inference.


## V2-039 — receipt-derived finance threshold candidate

V2-039 candidate fixes the static-summary weakness of V2-038: graph derives exact proxy delta and cash PPE threshold, finance diagnostics revalidate exact fixture pin and event history, compare graph and target receipt digests against replay, retain active readings and root history, and render actual surviving receipt values instead of prewritten stage outcomes. Exact threshold 111324, actual 115948, delta -4624. Added tests for both opposite operating-only candidates, threshold identity, withdrawn evidence and foreign fixture refusal. Independent Python rebuild now includes both derived nodes. Exact new-source CI pending; no production or decision authority.


## V2-040 — research evidence and report version candidate

All nine exact-source workflows succeeded for a8540f8c0b6b745dd0301b26135de54d3c634efc (knowledge PR 45590466677, push 45590453958; auxiliary PR 45590466816, 45590466776, 45590466857, 45590466708, 45590466840, 45590466683, 45590466748). Browser jobs 139122995155 and 139123035195 completed independent public-filing cash-flow replay; knowledge jobs 139122995439 and 139123034889 completed Node tests. Also all nine passed for 855449c20ac1f9bdd8d75c947784833a83969a67 and cfdf151401371cd244ee49070d5ccc50ec08de7c. Exact source only; no external source authenticity.

V2-040 candidate adds a research-only partition audit with closed source schema, exact case pin, event/participant count bounds, unique strata, aggregate conservation, exact per-row raw risk/difference/crude ratio receipts, separately reported adjusted rate ratio interval positions, and explicit non-establishment of universal causal benefit. RECOVERY NCT04381936 historical final vs preliminary numeric extracts (Figure 3, DOI 10.1056/NEJMoa2021436, PMID 32678530, PMC7383595, accessed 2026-11-25) share one declared study root. Aggregate direction lower, no-respiratory-support observed direction higher but adjusted CI includes null; no inference of harm/equivalence or clinical recommendation. Preliminary lower CI 0.91 versus final 0.92; version comparison not replication. Browser journey, strict edge-case tests, frozen independent Python replay and tamper challenges authored; exact candidate CI pending. Original paper bytes not pinned; no current guideline, clinical deployment, human efficacy or population transfer claim.


## V2-041 — source-bound trial snapshot and portable replay

V2-041 candidate: versioned trial audit v2 binds every input receipt to exact normalized-source pin and row ID, preventing population/version-only changes from preserving old receipts; aggregate-only counters are null (not tested). Strict negative-zero, duplicate-key, max-ID controls. Separate 256 KiB trial snapshot verifier requires caller-retained report and normalized source pins (two source pins for version comparison); independently implemented generic Python admission/reconstruction, packaged explicit --trial profile, preserved fixed and aligned flags. Browser exports exact bytes and snapshot digest; parity tests exercise historical snapshot, forged causal conclusion, scope/receipt tampering, source substitution and repinning, zero-event synthetic control, malformed wire and size refusal. Earlier v1 research exports remain historical development evidence, not silently accepted by v2. Source authenticity, freshness, medical validity and causal inference not established. Exact CI pending.


## V2-042 — reviewed claim compiler candidate

V2-040 exact source 1f5173a79d60ca6576b5939600fc0a1f667c8044 passed all nine workflows (knowledge PR 45591249190, push 45591240895, auxiliary PR 45591248968,45591249213,45591248939,45591249017,45591249029,45591249001,45591249047). Browser jobs 139125730226 and 139125699734 independently replayed research partition and report-version audit. This is historical v1 profile evidence; V2-041 source 550770a remains pending exact CI, no v2 snapshot promotion.

V2-042 candidate: reviewed claim compiler uses independently retained host contract pin, exact question/source byte pins and UTF-8 half-open spans, strict numeric lexeme admission and declared unit/kind/scope types. Untrusted model proposal can reference reviewed quantities, propose hypotheses or unknowns and bounded arithmetic/constraints; cannot invent numeric leaves, assert verification, execute code or promote source quotes. Exact kernel runs only dependency-ready compatible subgraphs; missing inputs and semantic type mismatches block target, partial results retained; target relevance and method validity explicitly unverified. Declared duplicate source bytes across roots visible. Finance fixture uses normalized historical amounts; no live model, no automatic document extraction, no independent compiler replay or browser integration yet. Node adversarial tests authored; exact CI pending.


## V2-043 — reviewed compiler browser and reference replay

V2-043 candidate: browser host-reviewed compiler with fixed normalized finance contract, visible exact byte spans/quantity types, editable untrusted proposal, missing input challenge, stale export invalidation and invented numeric leaf refusal. Independent generic Python reference uses Fraction, UTF-8 spans, repeated ready-set scan and separate source contract reconstruction to replay actual browser exports and challenge 13 mutations per state. Unicode category implementation parity is scoped, not universal. No live model, automatic source extraction, semantic entailment, formula validity or source truth. Exact CI pending.


## V2-044 — reviewed multi-proposal contrast candidate

V2-041 exact source 550770a0e6710cc58f11e22cd5a5c3f37ac711fe passed all nine workflows (knowledge PR 45591788405, push 45591776663; auxiliary 45591789338,45591788389,45591788399,45591788521,45591788456,45591788370,45591788699). Both browser jobs 139127534008 and 139127574414 passed independent trial replay and standalone snapshot parity. Promote scoped v2 research profile only; V2-042/043 compiler CI not yet complete when observed.

V2-044 candidate adds bounded multi-proposal contrast under one independently pinned reviewed contract. Replays every proposal; malformed agent proposals are refused individually while invalid host contract fails whole batch. Memoized exact expression digests ignore node renaming but preserve operator/operand order, typed binding identities and proposal-specific unknowns; flag same-operand comparisons, exact clones and distinct structures, separate conditional state agreement from semantic contradiction, expose shared source/binding/digest/declared-lineage sets. No majority-vote truth, algebraic equivalence, independent evidence or automatic adoption. Four test groups authored including 5 agreeing clones and a malformed proposal. Browser/independent contrast replay not yet implemented; exact CI pending.


## V2-045 — consensus challenge and shared-DAG bound

V2-045 candidate: fix an exponential shared-DAG signature traversal risk by memoizing in-flight promises, not completed hashes. Added depth-24 repeated-operand graph test requiring exactly 24 unique signature nodes; not a latency benchmark. Browser scripted 8-proposal challenge: five exact cloned self-comparisons, original comparison, reversed comparison and fabricated leaf; conditional majority is not authority. Separate Python reference reconstructs 21 admitted pair comparisons from independent host contract, exact structural hashes and explicit fixed malformed-leaf control; 16 tamper mutations authored. Generic refusal-order parity is not claimed. No live models or deployment. Exact CI pending.


## V2-046 — source economics candidate

V2-042 b3bfcf821c209d9d5de26728a69f27062e02bb7c and V2-043 77c0865310b35be0f25c3f6d23e5eac55373818b each passed all nine exact workflows. Compiler PR 45592407931, push 45592396115; browser jobs 139129670568 and 139129708625 independently reconstructed actual compiler exports. Promote scoped reviewed compiler only.

V2-046 candidate: separate host-pinned shared-source acquisition and marginal field-read economic profile over replay-derived surviving worlds and available field partitions. Exact bounded minimax state is (world cell, acquired source set); nonnegative costs, acquisition charged once, no fabricated availability, explicit initial acquisition and event digest; compare same-cost per-field counterfactual separately from legacy declared effort. Synthetic worst-case 4 to 3 units expected, 256 exhaustive sequence-oracle controls authored; no real cost, privacy/disclosure authorization, expected utility, bulk-read assumption or global best-branch optimization. CI pending.


## V2-047 — source economics browser and independent policy replay

V2-044 exact 1fd9383382590dabf3212254203e51f25f23bc6c passed all nine workflows (PR knowledge 45592604140, push 45592596058). V2-045 b48e7739403029409e4deb7330f77fc3c67720aa push 45592855249 passed; PR knowledge 45592867914 was still running when checked; do not promote full contrast yet.

V2-047 candidate: wire three actual browser source-economics modes (fresh, assumed previously acquired, withdrawn) with exact policy exports and no external requests. Fix controlled per-field comparison to honor the same initially-acquired source set; otherwise sunk-cost differences were misclassified as sharing benefits. Independent Python set-state minimax reconstructs exact fixture/economic pins, source availability, both policies and counts; 16 mutation challenges per export authored. Synthetic expected comparisons fresh 4/3, acquired 0/0, withdrawn 4/4. No measured cost or actual disclosure. Exact CI pending.


## V2-048 — explicit bundle and exposure-constrained planning

V2-045 b48e7739403029409e4deb7330f77fc3c67720aa passed all nine exact workflows (PR 45592867914, push 45592855249; browser jobs 139131305653 and 139131265987 independently reconstructed scripted contrast; knowledge jobs 139131305445 and 139131265724 passed). Promote scoped reviewed proposal contrast; no live model claim. V2-046/047 pending exact CI.

V2-048 candidate: separately pinned explicit same-source joint observation actions with exact joint tuple partitions, hard worst-branch abstract exposure cap independent of effort, one-time source acquisition, and explicit unavailable-action exclusion. Distinguish budget infeasibility from insufficient offered information. No implicit full-source disclosure, real privacy estimate or authorization. Synthetic open 3 units vs bounded 4 units and cap-1 infeasibility; 512 independent sequence oracle controls authored. No browser/independent Python replay yet; exact CI pending.


## V2-049 — caller-authored reviewed workspace

V2-046 7bca7ccf25d32bc4c1043d8d5c2417ca1d930d8f passed all nine exact workflows (knowledge PR 45593303143 and push 45593290901). V2-047 browser jobs 139133742884 and 139133695545 passed independent shared-source economics reconstruction, but full exact workflows remained pending when checked. Do not promote V2-D23 full browser gate until all nine complete.

V2-049 candidate: actual caller-authored local reviewed workspace, up to eight staged immutable text sources and 64 reviewed bindings, UTF-16 selection converted to exact UTF-8 span, repeated numeric occurrence explicitly selectable, declared type/scope and dimensions, independent contract seal, user-selected comparator draft and editable untrusted JSON. Stale question/proposal invalidation, no network, explicit export contains pasted text, reset local draft only. Browser test uses two source texts including astral/multibyte prefix and repeated number, truncated token refusal, forged numeric leaf refusal and changed question pin; independent Python reconstructs expected contract and replays actual export. No automatic extraction, inference, semantic validity or source independence. Exact CI pending.


## V2-050 — portable reviewed compiler snapshot

V2-047 exact 3a4cb80cd86afa6cfe84ec7c0be2cf2656fb976f passed all nine workflows (knowledge PR 45593578601 and push 45593566432; independent source economics browser jobs 139133742884 and 139133695545). V2-048 468b78548ae5bd8414e5d601dd8d7c018a175983 knowledge and browser jobs all passed (PR 45593837780, push 45593824056); scoped bundle/exposure solver tests, not independent browser exposure profile yet.

V2-050 candidate: explicit standalone reviewed compiler snapshot profile with caller-held report byte pin and separate reviewed contract pin, independent Python replay of arbitrary admitted contract/proposal rather than fixture-only matching. Browser saves exact snapshot digest, shows separately retained contract identity; large valid computations remain visible but no portable report above 256 KiB. Cross-profile refusal and 24 actual archive-vs-JS parity controls authored (actual caller workspace plus missing/refuted compiler reports, repinning, false status/method/relevance, forged receipts/spans, malformed wire, unreviewed leaf). No empirical truth, freshness or external adoption. Exact CI pending.


## V2-051 — explicit exposure policy browser and reference

All nine exact-source workflows passed, including knowledge PR 45594231142 and push 45594220649. Both actual Chromium caller-authored source/span workflows and independent Python reconstruction passed. Scoped manual extraction only.

V2-051 candidate: integrate explicit exposure-constrained planner into actual Chromium with four export modes (cap 4 bundle, cap 2 separate, cap 1 infeasible, withdrawn bundle). Independent Python finite-set replay rebuilds the fixture, action schedule, joint partitions, effort and exposure constraints, source withdrawal, exact branch trees and state counts; 20 mutations per actual report authored. No measured privacy risk, execution or authorization. Exact candidate CI pending.


## V2-052 — caller-authored restricted order contrast

All nine exact-source workflows passed, knowledge PR 45594622359 and push 45594609743; actual Chromium exports replayed by downloaded standalone Python archive with independent report/contract pins and parity controls. No source truth or freshness.

V2-052 candidate: caller stages up to eight exact untrusted proposals under one sealed contract. Separate order-logic profile classifies matching typed operand pairs (including reversed orientation), strict opposite versus exhaustive complement, implication, overlap, and self-comparison domain; unaligned or type-blocked operands remain unclassified. Actual state divergence fails closed. 150 exhaustive direct comparator oracle controls plus actual compiler tests; actual browser five proposals and independent Python replay of six pairs with 15 tamper challenges authored. No algebraic/semantic equivalence, source truth or independent vote. Exact CI pending.


## V2-053 — Living computational knowledge system

SUTRA is a living computational knowledge system for discovering, challenging, maintaining, revising and acting on important knowledge. Persistent, accountable, model-replaceable investigations—not general chatbot intelligence—are the product.

See [binding mandate](LIVING-KNOWLEDGE.md). New requirements extend rather than replace every prior check. Reconcile V2-052 failure before taking credit; no historical checkbox changed.

- [ ] V2-LK01-SEMANTIC-TRIAGE [Track B] Admit multiple reviewed interpretations; distinguish divergence, agreement, refusals and unresolved results without voting or semantic approval. Acceptance: Exact compiler replays, opposite/same/unresolved/refused regressions; no universal interpretation coverage. Candidate only; exact CI pending.
- [ ] V2-LK02-INTENT-IR [Track B] Preserve original natural-language question, candidate meanings and separate nine semantic obligations; source spans, entity, scope, unit, modality, negation, quantifier, baseline, causality, method, review and unknowns. Acceptance: Closed versioned schema, exact source-bound extraction, omission/negation/scope adversaries; no invented inputs.
- [ ] V2-LK03-PATHWAYS [Track B] Route structured table imports, templates, rules, user expressions, reviewed contracts, document import and optional model proposals through cheapest admissible path. Acceptance: Same contract across paths, explicit consent, costs and review; compare deterministic and model proposals without votes.
- [ ] V2-LK04-ROUNDTRIP [Track B] Render admitted meaning and executable relations into controlled language with original span and unresolved qualifier review. Acceptance: Detect changed scope, definition, negation, denominator and invented relation; paraphrase is not equivalence proof.
- [ ] V2-LK05-SEMANTIC-COUNTERFACTUAL [Track B] Perturb independent inputs to distinguish accidentally agreeing incorrect formalizations; use existing contrast and counterexample infrastructure. Acceptance: Wrong year, sign, denominator, population, aggregation, units and causal inference adversaries.
- [ ] V2-LK06-SEMANTIC-WORLDS [Track B] Extend finite worlds with typed semantic versus empirical axes; share DAGs and lazily evaluate bounded alternatives. Acceptance: Brute-force parity on small worlds, explicit truncation, no fabricated probabilities or completeness.
- [ ] V2-LK07-AMBIGUITY-REVIEW [Track B] Clarify only consequential distinctions; preserve unresolved branches, separate stakes, reversibility and clarification costs. Acceptance: Measured questions, review time, residual error, keyboard source highlighting/corrections; unreviewed semantics never approved.
- [ ] V2-LK08-KNOWLEDGE-GRAPH [Track B] Version claims, evidence, assumptions, hypotheses, definitions, observations, derived values, contradictions, questions, decisions, plans and proof artifacts; typed edge provenance. Acceptance: Immutable identity and edge authority; distinguish human/model/formal relations; reject cycles in executable DAG.
- [ ] V2-LK09-REVISION [Track B] Incremental evidence replacement/withdrawal, direct/transitive dependency invalidation, and historical reproducibility. Acceptance: Incremental equals full recompute; shared descendants, concurrency, stale cache, interrupted writes, cycles and simultaneous updates.
- [ ] V2-LK10-VERSION-CONTROL [Track B] Branch hypotheses, diff and restore investigations, preserve conflicting empirical claims in merges. Acceptance: Conflicting updates explicit; identity not logical equivalence; restore exact historical version.
- [ ] V2-LK11-IMPACT-REPORT [Track B] Explain changes, surviving/invalidated conclusions, new contradictions, reconsidered decisions, missing evidence and next investigation. Acceptance: Two independent domain journeys, independently replayable export, old snapshots retained.
- [ ] V2-LK12-ACQUISITION [Track B] Extend source economics and disclosure frontier toward noisy observations, uncertain costs, robust/minimax/regret or justified VOI, shared costs, failed observations and multiple objectives. Acceptance: Information gain distinguished from decision value; report bounds/heuristics, no invented probabilities or global optimality.
- [ ] V2-LK13-STRUCTURAL-WEAKNESS [Track B] Reuse lineage for shared trial, dataset, route, supplier, underlying model and economic exposure; common cuts and sensitivity templates. Acceptance: Unknown ancestry stays unknown; independent fixtures across domains; no counting URLs as independence.
- [ ] V2-LK14-STATISTICAL-PROFILES [Track B] Select narrow interval/measurement and statistical profiles; include study design, bias, heterogeneity, missingness, multiple testing, power and causal assumptions as separate obligations. Acceptance: Independent numerical references, coverage and assumption sensitivity; no deterministic proof of statistical or causal validity.
- [ ] V2-LK15-UNIFIED-WORKSPACE [Track B] Question → evidence → interpretations → review → investigation → conclusion → challenge → revision → export, manual/offline mode, accessible progressive disclosure. Acceptance: Actual browser journey, persistence, cancel/error recovery, keyboard/mobile and no-model pathway.
- [ ] V2-LK16-SPECIALIST-JOURNEYS [Track C] Research, engineering, finance, medical research, student and general investigations on the same architecture; at least two complete narrow domains first. Acceptance: Realistic distinct fixtures and user evaluation; no medical authority, financial recommendations or engineering certification.
- [ ] V2-LK17-BENCHMARK [Track C] Freeze staged 200 independently specified/annotated cases: 40 semantic,40 assumption,40 revision,30 ancestry,30 acquisition,20 replay/tamper; distinct synthetic/public/expert splits. Acceptance: Held-out separation; seven matched baselines (LLM, tools, solver, debate, domain software, SUTRA matched/offline); accuracy AND coverage, effort/cost, revision, replay, security, ablations and intervals.
- [ ] V2-LK18-PRIOR-ART [Track C] Compare semantic parsing, synthesis, belief revision, truth maintenance, provenance, argumentation, incremental computation, decision theory, causal/statistical and robust optimization prior art. Acceptance: Evidence register separates known algorithm, implementation, integration, novelty; include supplied ACL references; no unsupported superiority.
- [ ] V2-LK19-TRUST-BOUNDARY [Track A] Maintain source/semantic/method/computation/empirical/freshness/applicability verification dimensions, untrusted document and provider boundaries, disclosure budgets, replay, rollback and cross-user isolation. Acceptance: Injection, fabricated references, poison, Unicode, overflow, exhaustion, stale/replay/credential and cross-user adversaries; no automatic external action.
- [ ] V2-LK20-REPOSITORY-ISOLATION [Track A] Make active repository product and contributor entry points SUTRA-only; audit historical independent player files, workflows, root package, configs, media and reusable dependencies before removing non-SUTRA source. Acceptance: Clean SUTRA builds and legacy compatibility, no retired live routes, historical Git evidence intact, no production cutover.
- [ ] V2-LK21-FOUNDATION-QUEUE [Track A] Continue exact CI, WASM, integrity, consent, recovery, rollback, refinement, provider budget/BYOK and all unresolved SUTRA1/2 gates by actual dependencies. Acceptance: Old IDs, failures and evidence remain; no inherited credit or silently dropped gate.

Priority: fix exact CI; semantic triage → evidence-bound IR → round trip/counterfactuals → material ambiguity review → versioned dependency revision → impact report/export. Track A remains parallel and Track C starts benchmark design now. See machine gates for dependencies.


## V2-054 — Source-linked interpretation representation

Exact V2-053 `480c88bce1753d9693cca830d6e6b851722ed90b`: all nine workflows successful (knowledge PR 45602751694 and push 45602734844); browser job 139165593491 and knowledge job 139165594092 passed. Promote only the scoped D27 order contrast and LK01 reviewed outcome triage. The former failure remains in history. LK02 candidate: separately pinned 13-facet annotation envelope, exact question, nine obligations and distinct verification dimensions; existing compiler exclusively admits source spans and computations. Unknown/refused, partially covered, unlinked or proposed qualifiers remain explicit. Five adversarial test groups authored; exact CI pending. No automatic semantic inference, validated extraction of meaning, independent IR replay or UI yet.


## V2-055 — Versioned investigation and evidence impact baseline

Parent V2-054 `6684c3f41fdf22c73aa9d43c89b273d63071f35f` exact CI still pending at implementation start; no inherited new credit. New candidate: caller-pinned version envelope preserves exact contract, batch, annotations and predecessor digest; replay recomputes from input, never accepts supplied verdict. Graph records admitted quantity dependencies, question, contextual facets and declared ancestry. Impact comparison replays both versions and traverses both old/new reverse edges for changed/withdrawn evidence, binding and question roots; distinguishes surviving/reversed/unresolved and new/withdrawn candidates. Two synthetic domains use the same architecture (finance and network resilience); tests include source correction, withdrawal, irrelevant change, stale pin, wrong parent and forged status. Full replay is explicitly the baseline, not incremental speedup, merge/concurrency, independent semantic replay or database persistence. Exact CI pending.


## V2-056 — Synthetic semantic counterfactual challenge

Candidate tests deliberate accidental agreement between current-year and previous-year expense formulas. A separately pinned bounded scenario plan perturbs exact binding identities consistently across every occurrence and candidate, using synthetic input bases, not real evidence replacements. Evaluate only admitted decisive targets; preserve refused/unresolved baseline states. Compare cached and fresh full reports on every scenario; distinguish actual outcome divergence from a semantic or empirical verdict. Max 16 scenarios × 4 replacements × 8 candidates; explicit finite coverage, no exhaustive equivalence or real-world feasibility. Two test groups authored, exact CI pending; V2-054/055 remain separately tracked candidates until exact CI. No release.


## V2-057 — Caller-authored living investigation browser journey

V2-054 exact 6684c3f41fdf22c73aa9d43c89b273d63071f35f all nine workflows successful. Scoped IR unit evidence registered; broader LK02 remains open (automatic interpretation/extraction and specialist review). V2-055/056 exact CI still pending at observation. New browser candidate extends existing reviewed workspace rather than separate labs: manual meaning declarations, optional reviewed binding links, exact version seal/export and separate digest, retain local baseline or replay saved input bytes using separate pin, explicitly stage corrected source, show conditional reversal/affected dependency and export both versions and impact. Browser test authors five staged candidates, stale annotation invalidation, wrong-pin refusal, re-import, correction of B and four actual conditional reversals; exact CI pending. No implicit browser storage, no external requests, no automatic evidence correction or semantic sign-off. Stage-order candidate IDs are a known manual constraint; future stable identity and review controls remain open.


## V2-058 — Independent living-version replay candidate

New Python profile uses the existing independent reviewed compiler and Fraction/hashlib reference, validates nested exact version/contract/batch/annotation pins, reconstructs admitted candidate statuses, exact source-linked facets, explicit obligations and graph; independent fixed-point dependency traversal reconstructs scoped version impact. Offline verifier zipapp gains explicit --living profile (no automatic profile fallback). Actual browser before/after artifact parity and separate pin checks authored; 13 material impact mutations and stale pin/schema controls. Producer-specific refusal reason is intentionally not claimed reproduced; status and missing dependency fields still checked. Exact CI pending; no independent operator, semantic truth, empirical authority or deployment. Historical checks preserved.


## V2-059 — Responsive correction and exact candidate reconciliation

V2-055 `32348421e11bd8882117f5a4b653cf432e456846` and V2-056 `8a335023e62eedf19f3cc4849c0417f9b0604f5c` each 9/9 workflows green, scoped graph/version and counterfactual results registered. Do not promote full broader gates. V2-057 `daace962bc444b0239eb933ea7dfdd64ad6351b9` actual browser job 139171547235 failed the 360px overflow check after executing correction and four reversal assertions. Preserve the failure; add scoped layout rules for semantic rows, digest wrapping, file input, controls and pre output; keep the width requirement and report overflowing element diagnostics. V2-058 independent replay not yet verified. No release. Exact V2-059 CI pending.


## V2-060 — First frozen comparative development pilot

Added 16 manually specified synthetic cases across finance, engineering, research, student, business and general comparisons, with explicit expected candidate outcomes independent of runner output. Cases include definition divergence, population, missing inputs, same-dimension different kind, strict/inclusive equality, fabricated leaf and repeated consensus. Same reviewed data/programs for first-candidate ablation, simple enumerate-all compiler comparator and SUTRA; report conditional coverage, accuracy among answered, unsupported decisive counts and missed invariants. Simple enumerate-all expected to match; this is not a competitive model claim. 200-case target and seven real baselines remain open; no external annotations/held-out or live provider. Test and CLI CI pending. Prior V2-059 responsive correction and V2-058 independent replay remain pending until exact CI.


## V2-061 — SUTRA-only active tree and exact verification reconciliation

V2-059 and V2-060 each passed all nine exact workflows. V2-059 actual 360px browser and independent replay passed; preserve the V2-057 and V2-058 failures. V2-060 frozen pilot verified only at developer-authored scope. Retire 185 old source/configuration/workflow paths, including 16 source blobs relocated byte-for-byte into the learner's internal media boundary. Keep original NOTICE attribution, all SUTRA1/2 evidence and Git history. Root package is SUTRA-only; activate inherited learner workflow on the draft PR base. No default branch change, merge, release or deployment. Repository-isolation gate implemented but unverified until exact CI and tree inspection.


## V2-062 — Controlled-language semantic round-trip

Recompile admitted proposals under the caller-pinned version and render only the target-reachable DAG as ordered, nonrecursive instructions. Keep exact source tokens, declared types and scope, selected and unselected question bytes, missing values and blocked relations, and identify excluded nodes. Pairwise compare declared qualifier and instruction structure, not inferred intent or equivalence; no semantic entailment or external authority. Tests cover reversed comparator, changed division, period and negation annotations, partial question, invented numeric input, missing leaf, stale pin and deterministic replay. Exact CI pending; repository isolation remains pending and is not bypassed.


## V2-063 — Inherited learner acceptance correction

V2-061 full learner build succeeded but storage test failed (149 pass, 1 fail; job 139176666038). The scanner recursively included security test fixtures that deliberately contain forbidden API markers. Keep the single permitted production localStorage hit unchanged; exclude only exact package test directories, broaden production extension coverage to TS/TSX/JSX/CJS and reject literal production imports of /test/ paths. This is a static defense-in-depth check, not complete import graph or runtime proof. Preserve exact failure and require full inherited learner suite. V2-062 round-trip exact CI still pending.


## V2-064 — Browser qualifier review and round-trip inspection

Add optional per-candidate controls for every remaining qualifier beyond definition, with optional reviewed quantity reference and refusal of references without a statement. Keep user declaration separate from truth. Explicit local reconstruction of the exact pinned version displays target-reachable instructions, question coverage, qualifiers and structural differences, with no semantic-equivalence or decision authority. Draft changes clear the displayed report and disable reconstruction; all output uses textContent. Actual browser assertions cover reconstruction, refused proposal, uncertainty, stale-output invalidation and existing 360px viewport acceptance. Exact CI pending; prior failed learner acceptance remains tracked.


## V2-065 — Qualifier review acceptance and pilot observations

Require actual browser user edits of time and negation facets: exact linked declaration and unsupported declaration stay distinct, edit invalidates previous version, reconstruct again without truth credit, retain 360px viewport test. Preserve generic historical archive/temp/release output exclusions in root .gitignore; only retired demo-specific patterns remain removed. Exact V2-060 pilot log (job 139174268795): first-candidate 15/16 answered, 4/15 correct and 11 unsupported decisive. Simple enumerate-all and SUTRA both 4/16 answered, 4/4 correct, zero unsupported decisive. No advantage over enumerate-all demonstrated on this synthetic set. Preserve V2-062 inherited learner failure. Latest exact CI pending; no release authority.


## V2-066 — Source-bound incremental computation audit

Exact V2-063 passed all ten workflows, including full inherited learner suite (job 139177896143). Physical active-tree isolation and controlled-roundtrip unit tests now have scoped verified evidence; production cutover and full semantic gate remain open. Reuse audit replays both pinned versions and projects admitted numeric graphs with a stable digest of the full reviewed binding, including source bytes, span, lineage, type and value. Use a fresh in-process cache per candidate, compare complete fresh/cached projected reports and original compiler outcomes; withdraw missing graph rather than retaining receipts. Two-domain tests require 3/6 nodes reused under corrected secondary evidence and 6/6 under irrelevant source correction. Diagnostic-only; full version admission still runs, no speedup claim or imported cache. Exact V2-066 CI pending; V2-064/065 browser candidates remain to reconcile.


## V2-067 — Automatic bounded semantic witness search

V2-064 all ten exact workflows passed; actual browser reconstruction and stale invalidation verified. V2-065 actual browser qualifier-edit job passed; complete exact CI pending at observation. Generate a deterministic bounded synthetic scenario plan from agreeing but structurally different admitted decisive candidates. Prioritize differential binding IDs, then shared ones; probe zero and twice the original exact value (zero baseline uses +/-1), breadth-first, at most 16 scenarios. Reuse existing counterfactual engine and full replay parity; report exact plan digest, tested/possible counts, truncation, witnesses and no-witness state without claiming semantic equivalence or physical feasibility. Tests cover accidental period agreement, one-scenario no-witness, duplicate typed copies, budget and stale pin. Exact V2-067 CI pending; V2-066 reuse audit remains pending.


## V2-068 — Consequential clarification planner

Reconciled V2-065/066/067: each 10/10 exact workflows passed, no unresolved failures. Implement finite material-pair review over admitted decisive candidate classes; group exact structural and declaration copies without treating them as independent votes. Distinguish observed divergence from synthetic witness. Only two explicit unequal facet statements can discriminate a pair; absent declarations remain uncovered, refused/missing candidates unresolved. Optimize subset of at most 13 facets under question budget, prioritizing observed divergent pairs, then total coverage, then fewer questions. Worst-case 8191 subsets × at most 28 pairs; no probability, stakes weighting, actual human effort or automatic adoption. Tests cover duplicated proposals, missing annotations, source withdrawal, budget, deterministic tie and stale pin. Exact CI pending; wider worlds and review workflow still open.


## V2-069 — Interactive material review and revision diagnostic

Pinned answer preview recomputes the plan from exact version bytes and budget, validates exact supplied answer statements, preserves every candidate and distinguishes match, difference and unspecified declaration. No approval, removal or semantic truth. Browser integrates bounded witness/clarification planner, optional answers, exported preview and projected reuse audit with full replay. Actual browser tests cover refused branch retention, stale output invalidation, four reusable and eight executed nodes in corrected four-candidate case, export and mobile width. Unit tests cover unlisted/duplicate answers, unknown declarations and stale plan. Exact CI pending; independent answer replay and real user effort measurement remain open.


## V2-070 — Finite semantic × hypothetical quantity worlds

Use existing synthetic counterfactual and fresh/cached parity engine. Separate semantic program identities from hypothetical quantity axes. Validate explicit pinned axes (max 4 × 4 values; normalize exact rational duplicates), enumerate deterministic prefix with mixed-radix O(axes) iterator (max 16 assignments), preserve unevaluated refused/unresolved baseline cells and distinguish evaluated-prefix versus full-declared-grid invariance. Joint-change witness requires each matching single-change world actually evaluated and both candidates decisive and agreeing. Brute-force independent arithmetic fixture: product x*y vs x+x, x=y=2 and limit 9, individually raising either to 4 yields no difference, jointly yields 16 vs 8. Tests cover all cells, truncation, stale pins, duplicate axes and fabricated probability. No empirical or causal claim. Exact CI pending; previous candidates still to reconcile.


## V2-071 — Historical source restoration and stable candidate identity

Exact V2-068 10/10 green; register scoped clarification planner evidence. Restore the pinned historical question/source text and reviewed numeric selections via validated UTF-8 to UTF-16 boundary conversion, never rewrite the original version. Refuse CR-normalized textarea or unsupported question-binding drafts rather than silently change bytes. Correcting a source removes every binding on that source while retaining other source selections and requires re-review; no token auto-remapping. Candidate IDs are explicit, unique and caller-controlled, not stage-order identity; baseline comparison requires an explicit correspondence review checkbox. Actual browser correction journey restores two sources, changes B, retains A selection, reselects B, stages five proposals in reverse order, and retains existing independent impact verification. Tests include repeated multibyte source token and stale pin. Historical programs/annotations stay in original version, not automatically carried into draft. Exact CI pending; V2-069/070 pending at observation.


## V2-072 — No-model reviewed expression pathway

Exact V2-069 all ten workflows passed: actual browser material clarification, refused-branch retention, pinned answer compatibility preview and projected reuse export. Add closed arithmetic/comparison expression grammar using [binding_id], + - * / and parentheses, one comparator, no literals, functions, code evaluation, implicit conversions or model. At most 4096 characters, 256 tokens, 24 parenthesis levels, 64 DAG nodes; compiler retains depth and type admission. Deduplicate exact repeated subexpressions, no algebraic transformations. Tests compare target signature with manual finance DAG, precedence, division by zero, invalid/unknown tokens, injection, chained comparison and stale pins. Actual browser formula path exercises rejection and valid derived comparison without changing existing evidence fixtures. Exact CI pending; V2-070/071 still tracked separately. No automatic semantic compilation claim.


## V2-073 — Browser finite worlds and independent fresh replay

V2-070 exact all ten workflows passed. Add explicit optional four-axis controls and bounded sixteen-assignment grid in living workspace; original version unchanged. Export exact version and plan text, grid result, separate snapshot pin and displayed plan digest. Python independent implementation uses itertools.product, Fraction/hashlib, existing independent compiler and fresh graph replay; verifies all scoped rows, graph digests, pair witnesses, interaction claims, coverage and derived mutations. Explicit --world-grid archive profile requires snapshot, version and plan pins; no profile auto-detection. Fresh replay does not independently prove JavaScript cache use. Actual browser grid uses two stress bindings with equality boundary; 4 assignments, 16 evaluated decisive cells, refused candidate retained. Tests mutate nine derived fields and three pins, assert stale output after input edit. Exact CI pending; V2-071/072 still tracked separately. No empirical or semantic completeness.


## V2-074 — Exact failure correction

V2-071 all ten exact workflows green; actual historical source restoration and reversed-order stable ID comparison passed including independent Python impact. V2-072 knowledge failed 2/170 tests at COMPILER_NUMBER_BOUNDARY because fixture indexOf('2') selected the last digit of 12; actual browser passed. Correct the fixture by anchoring each source token to its label, not the compiler. V2-073 browser preflight failed duplicate gridPin identifier before execution. Put the new world-grid browser test in its own lexical block, preserving every assertion and independent replay. Both failures retained in machine history. No new grid or expression credit until exact CI; no release.


## V2-075 — Structural exposure and conservative shared-source cuts

Reuse pinned living graph and compiler target dependencies. Union sources by identical declared lineage or exact bytes, retain explicit join reasons and never infer independence across remaining cohorts. Separate context-only dependencies, question quantities and unresolved candidates. Collapse exact target structures for cut counting, enumerate minimum cohort sets hitting at least one reviewed input of each decisive supplied graph (<=8 cohorts, 255 subsets). Finance fixture same issuer root yields one cut, engineering distinct declared routes yields two; duplicate bytes under conflicting lineage bridge cohorts transitively. No physical outage, truth reversal, causal dependency or alternate evidence completeness claim. Tests include withdrawal and stale pin. Exact CI pending; V2-074 fixes remain pending.


## V2-076 — Three-way direct sibling investigation contrast

Compare separately pinned direct children of one exact parent. Compute structural changes for original question, sources, reviewed bindings and candidates; strip only the mandatory contract digest for admitted proposal comparison, preserve refused raw bytes. Distinguish left/right-only, same change and conflicting changes including correction versus withdrawal. Replay each branch impact independently; retain outcome differences, identity digests and original branch versions. No automatic merge or assurance that nonoverlap is semantically safe. Tests cover conflict, disjoint source revisions, same change with distinct annotation, wrong parent and identical version refusal. Bounded by existing 8 source/64 binding/8 candidate profiles; no multi-generation merge or storage. Exact CI pending; V2-074 actual browser job passed, full exact workflow pending at observation.


## V2-077 — Shared specialist worked examples

V2-074 and V2-075 each passed 10/10 exact workflows. Preserve and resolve earlier formula/grid failures at exact V2-074. New synthetic finance (operating cash vs after capex) and network (nominal vs surviving route capacity) examples use the same source draft and human expression compiler, with one changed source, one surviving and one reversed conditional interpretation. No actual company/network data or professional authority. Tests authored; exact CI pending. Integrate browser journey next. V2-076 sibling branch CI pending at observation.


## V2-078 — Guided specialist browser journey and structural exposure

Explicit sample buttons replace only current draft and leave retained baseline intact. Both synthetic domains use identical reviewed formula compiler and semantic/revision controls. Each correction reverses one candidate and preserves another. Structural exposure now inspectable/exportable; network targets share the demand source, so distinct route and load cohorts still admit a one-cohort structural input-touch cut. Actual Chromium tests traverse both domains and assert 360px layout, no external request, no authority. No real company/network or human acceptance claim. Exact CI pending; V2-076/077 to reconcile.


## V2-079 — Competing revision browser contrast

V2-076 exact 10/10 green. Use retained parent and current evaluated child; import other child with independent digest. Replay all three, display object changes and both conditional outcomes, export exact input versions and comparison. Clear stale results on semantic change, pin/file edit or parent replacement. Actual finance browser test stages sibling with changed declaration, verifies wrong-pin refusal, same source correction and left-only declaration. No merge, shared decision, or independent Python verification of sibling contrast claimed. V2-077/078 pending at observation.


## V2-080 — Scoped revision selection pilot

V2-077 and V2-078 exact 10/10 green. Freeze four development cases (two single-source, two all-source edits) with explicit retained/reselected IDs and expected conditional states. Compare exact rebuilt and restored/reselected version bytes; report full and targeted selection counts, and separate diagnostic projected node reuse. All-source controls require zero selection savings. The comparator is full reselection, not a strong incremental editor; no general speed, accuracy, human or novelty claim. Workflow prints and uploads result; exact CI pending. V2-079 pending at observation.


## V2-081 — Exact structured table pathway

Add restricted rectangular unquoted TSV paste, first row unique nonempty headers, 128 data rows × 16 columns, exact UTF-16 coordinate spans, at most 64 explicit selected cells. Selection binds source digest, source/lineage IDs, cell coordinates and caller-declared types. Reuse reviewed draft and compiler atomically; no automatic quantity inference, locale conversion or formula execution. Tests compare exact manual contract bytes and typed expression outcomes, including multibyte header, stale source, duplicate cells, ragged rows, hostile formula and malformed number. No browser integration yet; exact CI pending. V2-079/080 exact outcomes still to reconcile.


## V2-082 — Interactive structured table import

V2-079 10/10 exact workflows passed; scoped sibling browser evidence registered. Add local table paste inspector with row/column selection, exact token preview, explicit type declaration and atomic reviewed queue. Reuse table admission for every queue addition and final staging; any source text or identity change clears the queue, draft edits invalidate it, no automatic header interpretation. Browser test pastes multibyte table, rejects stale queue, stages four exact numeric cells, seals contract and computes a typed derived comparison; checks 360px and zero external requests. No file-original bytes, full spreadsheet grammar or auto-extraction claim. Exact CI pending; V2-080/081 still tracked.


## V2-083 — Bounded transactional investigation history

Add caller-pinned portable history of up to 12 versions and 8 branch heads under existing 256 KiB total wire bound. Replay every exact version in parent-before-child order; require one root, unique digests/branches and reachability from a retained head. Explicit fork from historical version; append only direct child to matching branch head. Serialize transactions within one instance, compare expected history digest at execution, commit only after full validation, preserve failed-state immutability and queue recovery. Tests exercise multi-generation history, historical fork, sibling correction/withdrawal conflict, exact restore, concurrent stale writer, malformed parent/order and unreachable versions. No disk persistence, multi-tab/process CAS, merge or independent replay claim. Exact CI pending.


## V2-084 — Table browser acceptance correction and measured selection counts

V2-080 exact 10/10 workflows green. Four synthetic revision cases matched exact rebuilt bytes, 14 full reselections versus 10 targeted (four avoided); one-source changes 7 vs 3 and all-source changes 7 vs 7. No wall-time, human-effort or superiority claim. V2-082 browser job 139199448847 failed after exact contract staging because the test attempted to fill an invisible textarea in the collapsed formula disclosure. Open the existing disclosure through its summary and assert visible; preserve the failed run and every numeric, layout and request assertion. V2-081 scoped knowledge/browser jobs passed; complete exact workflows still to reconcile. V2-083 history candidate pending. No release.


## V2-085 — Portable history in the real workspace and independent replay

V2-081 exact 10/10 green, record same-contract TSV parity. Integrate local history controls: initialize exact root, append direct child to selected branch, fork an older version, restore baseline without replacing draft, export exact bytes and separate digest, clear explicitly and replay import only with caller-held pin. Existing finance journey creates two sibling children under named branches, imports with wrong/right pins, restores root and retains existing sibling contrast; 360px and no external requests required. Add explicit Python --history profile using independent existing compiler, validate parent order, single root, all reachable branch heads, replay all conditional states; actual browser archive and seven structural mutants plus stale pins in CI. No cross-process CAS, persistent storage, merge or semantic truth. V2-082/083/084 exact outcomes remain pending/failed as recorded. Exact V2-085 CI pending.


## V2-086 — Robust decision-value acquisition under noisy observations

Extend existing deterministic economics/disclosure principles to overlapping possible outcome sets, rather than pretending noisy readings form disjoint partitions. Require complete decisive supplied synthetic grid (≤16 program/world cells), explicit terminal loss for each conditional state including abstain, upper-bound one-time source and per-read cost, abstract worst-branch exposure cap. Up to six offered actions once per branch; DP over cell subset, used actions, acquired sources and exposure; stop is always available and wins equal objective. Treat failed readings as possible overlapping labels, not probabilities; report no-observation objective, perfect-information lower bound and worst-case improvement. Exact finite declared model only; state cap 12000 fails closed; no cost/privacy/semantic/physical authority. Tests cover perfect information, informative-but-fallible observation, exposure refusal, one-read independent exhaustive oracle, stale/invalid policy and truncation. No browser or multi-action oracle yet. Exact CI pending.


## V2-087 — Acquisition decision-value UI and multi-action oracle

V2-084 10/10 exact green: actual table browser formula and mobile/no-network acceptance passed; retain V2-082/083 browser failures. Integrate a restricted caller-controlled symmetric loss profile into the existing finite world grid (not another lab): explicit error/abstention loss, cost upper bounds, exposure cap and possible failure toggle. Derive offered axis observations and shared source identity from reviewed inputs, retain exact version/grid/policy bytes and diagnostic export. Actual guided engineering browser test uses peak 50 vs 200, both candidate conclusions vary together; with perfect hypothetical observation cost 2 vs stop loss 6, all-world failure label forces stop at 6; edits invalidate export. Add independent array-based exhaustive two-action oracle over x*y threshold fixture, 18 cost/exposure/noise combinations, verify shared acquisition charged once and adaptive stopping. No probabilities, real cost or professional action. V2-085/086 exact CI pending; new candidate pending.


## V2-088 — Independent robust acquisition replay

V2-085 exact 10/10 workflows green; actual portable history browser export and independent parent-closure verification registered. Add independent Python set-based robust policy solver over fresh reconstructed synthetic grid, explicit closed policy admission, independently recomputed loss/cost/exposure and full policy tree parity. Explicit --acquisition profile requires report, version, grid and policy pins; UI displays all separately and downloads report digest. Browser-exported policy 6 → 2 abstract units is replayed offline; nine derived mutants and four pin controls authored. No producer cache/lock or real observation, recommendation, privacy estimate or professional authority. V2-086/087 exact CI still pending at observation; new candidate pending.


## V2-089 — Exact continuous interval measurement profile

V2-086 all ten exact workflows passed; scoped robust acquisition kernel evidence registered. Add inclusive hypothetical intervals over reviewed bindings (max 8 ranges) containing each exact observed point; preserve admitted compiler type/scope and original version. Propagate exact rational bounds through target DAG with 512-bit limit, classify universal holds/refuted only from sound bounds. Refine same-node subtraction, square, division and comparison only by exact DAG identity, never similar expressions; possible zero denominator remains unresolved, including x/x. General dependency overestimation remains explicit (e.g. (x+y)-x); overlap is not a witness of actual reversal. Tests cover strict/inclusive equality, mixed-sign extrema against independent samples, identity and denominator counterexamples, invalid ranges and stale pins. No statistical confidence, calibration or empirical authority. Exact CI pending; V2-087/088 still to reconcile.


## V2-090 — Continuous interval workspace and independent replay

V2-087 exact 10/10 green; actual robust acquisition browser and adaptive oracle evidence registered. V2-088 browser and knowledge jobs passed including independent policy replay; full exact workflow reconciliation pending at observation. Add explicit range controls to existing living workspace, four optional bindings and rational inclusive bounds. Engineering fixture peak 75–95 yields invariant nominal capacity but unresolved failure capacity; narrowing to 75–85 yields both invariant under declared bounds. Clear stale exports, retain exact version/range/report pins. Independent Python Fraction interval solver reconstructs admitted targets and full bound report, explicit --interval profile; actual browser export plus six nonidentity derived mutants and stale pins. No statistical confidence or calibrated uncertainty. Exact CI pending; V2-089 kernel exact pending.


## V2-091 — Living investigation overview

V2-088 and V2-089 exact 10/10 passed; scoped acquisition reference and continuous interval kernel evidence registered. V2-090 full exact CI pending. Add header keyboard entry, live question/source/selection/candidate overview, conditional candidate cards, revision reversal/survival counts, baseline state and context-sensitive navigation to existing review controls (no automatic execution or new evaluator). Clear cards immediately on mutation. Actual mobile guided journey assertions for keyboard entry/focus, ready/invalidated state, correspondence, divergent review and screenshot artifacts. No accessibility certification or user-study claim. Exact CI pending.


## V2-092 — Conditional exact binomial profile

V2-090 exact all ten workflows passed; interval browser and independent reference evidence registered. Add scope-matched reviewed count bindings, fixed n<=256, exact rational one-sided inclusive binomial tails, explicit null probability, family alpha and declared Bonferroni family size. Separate seven unresolved/declared-not-verified sampling and design obligations from arithmetic threshold comparison. No p-value as hypothesis probability, causal interpretation, evidence independence, population validity or recommendation. Small fair-coin exhaustive bit-pattern and weighted nonbinary controls, exact boundary, degenerate null, invalid count/scope and pin adversaries authored. V2-091 overview exact CI pending. New profile browser and independent reference not yet implemented.


## V2-093 — Local statistical journey and independent verifier

Add actual guided synthetic sample of 9/10 successes and corrected 8/10, ordinary count candidates and separate conditional binomial profile controls. The exact one-sided tail changes 11/1024 to 7/128 under the half-probability null; a family size of five changes the threshold even at the original count. Design declarations default unresolved, invalidate all statistical exports on edit/revision, display three separately retained pins. Independent Python Fraction and math.comb replay of actual browser artifact, seven derived tamper controls and three independent pin controls. No statistical design, generalization, causation or hypothesis truth certified. Exact CI pending; V2-091/092 reconciliation pending.


## V2-094 — Reviewed two-group exact conditional comparison

Reconcile V2-091/092/093: each exact 10/10 workflows passed. Add bounded Fisher conditional arithmetic over four distinct reviewed count bindings with internally matched and distinct declared group scopes, same count unit and nonoverlapping exact source spans; max combined n=256. One-sided inclusive tails and probability-ordered two-sided tail include ties. Exact descriptive proportion difference, Bonferroni declared family threshold and nine unresolved/declared-only design obligations. Independent bit-pattern oracle over small tables; Python uses alternative hypergeometric combinatorial formulation with 18 parity cases, mutated results and separate pins. Explicit offline profile --fisher. No automatic group independence, randomization, population validity, causal or clinical authority; distinct labels/spans are insufficient. Browser integration remains open. Exact CI pending.


## V2-095 — Two-group statistical journey and source correction

Add two-group synthetic sample and corrected source to the existing reviewed investigation. Four scope-labelled counts, explicit direction, declared family and nine design obligations; display exact tail and descriptive difference, retain three separate pins and invalidate stale exports. Initial 8/10 vs 2/10 tail 1063/46189; correction 6/10 vs 2/10 tail 713/4199; count consistency is not statistical support. Actual Chromium tests include duplicate binding refusal, family correction, design edit, corrected source and 360px/no-external-request checks. Independent offline archive replay of the actual export with eight derived mutations and three pin controls. The duplicate exact source-span adversary belongs to the existing compiler admission boundary; test now checks that boundary before profile evaluation. No independent samples, causal effect or clinical validity asserted. Exact CI pending; prior candidate remains to reconcile.


## V2-096 — Initial prior-art and falsification register

Inspect nine actual publisher/institutional abstracts, survey or standard overview, including all four supplied ACL references. Register established techniques separately from current restricted SUTRA implementation, proposed matched experiments and unclosed gaps. Add explicit execution-signature majority ablation, stepwise review comparison and independent interpretation recall evaluation to benchmark protocol. Existing simple enumeration tie is retained. No novelty claim or full-text systematic review. Statistical V2-094/095 CI pending at observation; exact evidence still to reconcile.


## V2-097 — Matched semantic execution-signature pilot

Preserve V2-094 exact failure: job 139536902985 duplicate exact span fixture refused by existing compiler before profile evaluation; V2-095 corrects test boundary, exact CI pending. Add frozen six-case synthetic developer-labelled pilot with explicit expected signature vectors, same admitted candidate programs and perturbations for all methods. Compare first-candidate, raw strict-majority execution signature, exact-program-deduplicated signature vote and retain-all with distinguishing witnesses. Include wrong period, inclusive boundary, wrong denominator, no-witness control, joint-change witness and truly equivalent orientation control. Report correct-candidate loss, abstention, wrong-only selection and retained wrong candidates separately. No semantic selection, real model or published method reproduction. CI and CLI results pending.


## V2-098 — Research evidence verification boundary

V2-095 all ten exact workflows passed, including actual Chromium and independent offline Fisher replay. Resolve V2-094 duplicate-span test failure; preserve its exact record. V2-096 impact job 139538459300 failed because prior-art.json was unmapped under managed docs; both kernel/browser jobs passed but whole-revision acceptance failed. Explicitly map the machine register, human register and evaluation protocol to v2 verification, not a catch-all docs bypass. Add regression requiring unknown JSON to remain unmapped, source register uniqueness/required ACL references/gaps and markdown parity, and print the classification JSON on future failure. Local consistency test does not prove literature accuracy. Exact CI pending; V2-097 pilot still pending.


## V2-099 — Exact caller-grounded question pathway

Add a closed English `Is <reviewed name> <comparison phrase> <reviewed name>?` grammar. Caller explicitly supplies UTF-16 operand spans and one or more reviewed binding IDs per operand; convert to exact byte claims, require full original question coverage, preserve strict/inclusive and explicit negated relation semantics. Reject unsupported grammar, hidden conjunction/conditional/negation inside names, unknown or duplicate mappings, stale pins and over-eight combinations rather than guessing/truncating. Compile via existing reviewed expression and claim compiler; retain same-binding and type-blocked alternatives, no fabricated second candidate for a single program. Separate exact question quotation, caller correspondence, conditional computation and semantic authority. Tests include boundary equality, Unicode, alternate type scope and adversarial language. Browser integration pending. Prior V2-097/098 exact CI still pending at observation.


## V2-100 — Reviewed question interaction and research validator correction

Seal the question, capture exact two operand selections, explicitly map one or several reviewed quantities per operand, preview the bounded cross-product, then explicitly replace staged candidates. Generated definition/qualifier references remain visible and retained until the respective field is edited; editing revokes inherited links and invalidates a sealed version. Single candidate stays single. Browser test covers actual spreadsheet quantities, negated relation, divergent alternatives, stale mapping, single-candidate guard, qualifier edit, question invalidation, mobile width and no external requests. V2-098 failed author-length assertion (Doyle); check nonempty author names separately without weakening substantive fields. V2-097 scoped kernel pilot 6/6, 67 evaluations, 4 distinguishing; raw majority lost correct candidates in two cases; deduplicated vote abstained four; retain-all also kept 11 wrong candidate instances. No unrestricted NLP or empirical selection claim. Exact CI pending.


## V2-101 — Independent question mapping replay

Add portable bounded mapping report with three separate retained pins (snapshot, contract, caller mapping plan). Independent Python implementation decodes UTF-16 selection boundaries, reconstructs UTF-8 spans and full restricted grammar, enumerates every declared pair, reconstructs proposal and qualifier references, independently replays conditional arithmetic, checks exact report equality and refuses tampering even after snapshot rehash. Actual browser download, isolated zipapp invocation, eight nonidentity mutations and three pin controls wired into CI. No semantic correctness, entity inference, unrestricted parsing or source truth claim. V2-099 exact knowledge failed only inherited author-length rule (207/208 passed, all four question tests passed); preserve failure. V2-100 exact CI pending. Correct V2-097 failure artifact to actual impact job.


## V2-102 — Cross-language question boundary matrix

Exact V2-100 all ten workflows green (knowledge 139542938224, browser 139542938577); resolved historical research impact and author validation failures, retaining immutable records. Share portable question projection between UI and fixture generator. Add 43 positive replay cases (13 phrases × equality/greater/lower, Japanese and supplementary Unicode operands, eight alternative combinations including blocked scopes, same-binding comparison), plus four independent refusal cases (unsupported relation, hidden conjunction, Unicode long-s reserved word, nine alternatives). Match reserved-word case folding for ASCII tokens including ECMAScript long-s/Kelvin exceptions. Independent Python compares the exact computed candidate projection. No claim of universal Unicode-version parser equivalence or intended meaning. V2-101 exact CI pending at observation; V2-102 candidate pending.


## V2-103 — Reviewed workspace source disclosure and isolation adversaries

Expose exact export report length and full included source IDs/byte lengths before local download; stale selection clears disclosure and disables download. Inject inert malicious markup, same-origin fetch sentinel and instruction-like text into TSV header/row label, preserve exact source bytes, require conditional computation unaffected, no DOM image creation, execution, request or source sentinel in browser Web Storage. Verify fresh browser context and reload contain no prior draft or downloadable report. Kernel tests add hostile appended source with recomputed exact identity, bidi and zero-width operand refusals, Unicode reserved-word attack. V2-LK19 starts scoped implementation; this tests local workspace isolation, not provider/user-account authentication or cross-user server isolation. V2-101 browser job 139544257400 passed actual independent replay; exact workflow still pending at observation. V2-102 and V2-103 pending exact CI.


## V2-104 — Portable independent controlled reconstruction

Exact V2-101 and V2-102 all ten workflows green; V2-102 knowledge 139545045638 and browser 139545046194 include 43 accepted/4 refused cross-language question cases and actual artifact replay. Add separate roundtrip export (exact version plus reconstruction, snapshot and version pins); independent Python iteratively traverses admitted target dependencies, reconstructs numeric tokens, missing values, operators, selected/unselected question bytes, qualifier statuses and structural differences. Correct false differences caused solely by object property insertion order, preserving list order and exact version identity. Actual browser exports before/after qualifier changes, isolated archive verification and 16 derived mutations plus four pin controls; stale export refusal and byte/source disclosure. No semantic equivalence or empirical truth claim. V2-103 and V2-104 exact CI pending at observation.


## V2-105 — Exact local UTF-8 document pathway

Exact V2-103 all ten workflows green, including browser hostile source, no requests and fresh-context/reload isolation. Add local file inspection, exact UTF-8 byte roundtrip with fatal decoding, preserved BOM/LF and 64 KiB/16,384 UTF-16 limits. Refuse CR/CRLF (browser normalization), binary controls, invalid encodings and stale pins; no hidden normalization. Explicit stage with caller source/lineage identity, no automatic quantity selection, existing reviewed contract/compiler reused atomically. Unit parity with manual exact text, duplicate refusal and byte-mutation control. Actual Chromium file selection, hostile markup inert, invalid UTF-8, stale preview, explicit staging, exact source digest and multibyte numeric span, comparison, 360px and no external requests. No PDF/DOCX/OCR, filename/MIME authenticity or semantic extraction claim. V2-104/105 exact CI pending.


## V2-106 — Exact local-file evidence replacement

Extend file intake with explicit add/replace selection and old/new source pins, retain declared lineage and invalidate every numeric binding from changed source even when its token is unchanged. Preserve unaffected source/binding bytes; reject stale previous/new pins, unchanged replacement and invalid text atomically. Browser preview shows previous digest and invalidated IDs; stage requires explicit replacement, stale previous computation/export cleared, reselect tokens and reseal. Actual browser test changes 12.50 to 8.25 against unchanged 10.25, reverses conditional comparison, preserves unrelated 15.25 binding and source lineage. No automatic remapping or empirical authority. V2-104 actual browser independent reconstruction job passed; whole revision pending at observation, V2-105/106 pending exact CI.


## V2-107 — Typed local-file refusal and exact CI reconciliation

V2-104 exact 10/10 workflows green. V2-105 kernel job passed; browser 139548853266 failed the specific invalid UTF-8 diagnostic. V2-106 browser 139549804317 reproduced the failure. Root cause: UI error sanitizer accepted only letters/underscores after recognized prefix, dropping UTF8. Permit bounded uppercase letters, digits and underscores while preserving generic refusal for unrecognized messages. Assert exact typed error, no digest, no stage, and unchanged prior source and binding. Keep failures explicitly recorded; no assertion relaxation, no acceptance of malformed file bytes. V2-107 exact CI pending.


## V2-108 — Explicit pinned draft source withdrawal

Reconciled exact V2-107 `adf1d76e5b79cda9852818051d932ffad9c5be45`: all nine returned PR workflows passed, including knowledge job 139551496733 and Chromium job 139551497664 ([run](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45712887023)). Prior V2-105/106 invalid UTF-8 display failures remain recorded. The connector exposes PR runs only; separate push workflow not observed here, so do not promote the fully verified cursor on this basis. Implement explicit preview and confirmation using existing reviewed draft sealing and source pin boundaries. Withdraw exactly one source and every attached binding; preserve unrelated sources including same-lineage evidence, the question and historical versions. Confirm only against unchanged draft and source selection; invalidate all current computation/export state upon application. Test old/wrong/missing/question pins, repeated withdrawal, last source, unchanged history and exact retained bindings; actual browser journey extends corrected local file case, stale selection and 360px/no-contact checks. No automatic candidate transplantation, lineage-wide removal, durable deletion, empirical authority or end-to-end incremental efficiency claim. Candidate CI pending; local full checkout unavailable (network DNS denied). Next: reconcile exact CI, integrate explicit candidate correspondence and missing-evidence impact on withdrawal rather than silently rebuilding programs.


## V2-109 — Versioned evidence withdrawal with typed unknowns

Exact V2-108 `9e64d0403f4f37ca34f45e142456191200c4fc01`: all nine returned PR workflows green; knowledge job 139557974332 and Chromium 139557975035 ([run](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45714795537)). Push-only CI is not exposed by this connector; no fully verified cursor promotion. Add deterministic preparation of an explicit child version from an exact editable pinned parent: preserve IDs, rebind admitted programs, replace every withdrawn input (including non-target nodes) with typed unknowns, remove affected exact quotations and corresponding annotation references while retaining unverified wording, quarantine previously refused proposal bytes by digest (never repin a refused candidate), and fail closed on new decisive states or unintended admission changes. Full replay of both versions and existing impact comparison; no cache transfer or global dependency coverage. Browser: matching retained baseline, explicit preview and confirmation, stale source selection guard, surviving operating-cash result vs unresolved capital-adjusted result, exported exact child/parent/impact, historical restoration, 360px and no external requests. New scoped tests across finance/network, context-only dependencies, repeated withdrawal, wrong pins and adversarial future-valid refused proposal. Exact CI pending. Independent verification of the new exported transformation and wider candidate re-review remain open. Next: extend independent Python browser artifact replay with transformation parity and adversarial omissions.


## V2-110 — Independently replayable withdrawal transformation report

V2-109 exact `ba4ac3bb7eec23846de32ace82db9ad16b98c0cb`: 7/9 returned PR workflows green, 0 failed at observation; remaining results pending. Preserve candidate status. Export a bounded report with exact parent/child bytes and a separately pinned withdrawal plan binding source ID **and** digest (same-byte source IDs are distinct). Explicit local export after confirmation, disclosure of complete parent source inventory including withdrawn text, separate snapshot and plan digests, stale export revocation. Independent Python reconstructs both versions, exact retained source/binding lists, every program transformation and typed unknown, quarantined parent digest, removed quotation/annotation links, candidate states and impact; no trust in supplied verdict or producer-specific refusal diagnostic. New standard-library offline zipapp profile, actual Chromium export replay, three synthetic cross-domain/adversarial fixtures covering all four dependency classifications and repinned mutations including altered child formula. No semantic validity, physical deletion, performance or independent external operation claim. Exact CI pending. Next: inspect V2-109/110 exact workflow results and strengthen resource/semantic impact boundaries.


## V2-111 — Provenance-bound arithmetic reuse with exact current receipts

V2-109 exact ba4ac3bb7eec23846de32ace82db9ad16b98c0cb: 9/9 returned PR workflows green (knowledge 139559952585, browser 139559952168). V2-110 exact 19bde9ebd3792f4af7e51324f1379074f12198dc: 7/9 returned PR workflows green at observation. Separate push workflows not exposed; do not claim broader completion. Extend the existing quantity kernel rather than duplicate arithmetic. A private copy-on-write verifier tracks normalized source-bound input identities and ordered transitive computation tokens. Reuse only immutable arithmetic outcomes when provenance, exact data, operation and dependencies are unchanged; construct exact current-contract receipts and digests even on reuse. Preserve original compiler result and legacy kernel API; never import cache or receipt. Compiler session validates all source/claim/program admission on each call, forks before compilation, commits only successful calls. Test exact fresh report parity, same-value source-byte/lineage change, shared descendants, adversarial stable keys with changed numbers, removal, all-missing graph, branch isolation, concurrent refusal and failed input. This is actual per-compiler computation reuse, not yet end-to-end investigation replay speed or product integration. Exact CI pending. Next: integrate transactional per-candidate sessions into semantic version replay and measure fresh-versus-reused work.


## V2-112 — Transactional exact investigation replay sessions

V2-111 exact e086f325b43d1418ec12e3bbc4ec4906efa40bf4: 7/9 returned PR workflows green at observation; remaining exact results pending. Correct the new provenance test's in-place sort on an immutable array (test-only defect found by inspection; no weakened assertion). Integrate trusted compiler sessions through contrast, triage, semantic reconstruction and exact version replay. Private per-candidate cache is copy-on-write; refused or absent candidates retire their cached nodes; failed annotations/graph/impact do not advance the cursor. Explicit fork permits sibling hypotheses; stale parent and concurrency refused. New child replay constructs the exact legacy version report and derives matching scoped impact using retained exact parent; distinct recomputation label, no false claim of full replay. Fresh APIs and independent wire artifacts remain unchanged. Two-domain fresh parity, withdrawal, same-version replay, sibling isolation, invalid reference rollback, retired refused cache, concurrency and stale pin adversaries. Add actual timing/work pilot to CI, no latency claims before observed results. Next: integrate session into workspace, keeping independent export freshly replayed and separating measured cache operations from meaning and authority.


## V2-113 — Local workspace revision replay now uses a private retained baseline and sibling-safe session forks. Exact current version admission/receipts remain mandatory. Local operation counts are distinguished from independent full replay; impact export freshly replays both versions and refuses parity mismatch. Imported anchors replay exact bytes; restored historical anchors warm separately; invalidation clears stale statistics. Explicit public semantic arguments prevent injection of an alternate private triage callback. Browser and kernel regressions added; exact candidate CI pending. V2-110 nine PR workflows passed (45715681018, jobs 139560999928/139560999393); V2-111 kernel failed only on sorting a frozen test array (45715972712/job/139561979295), fixed in V2-112; V2-112 CI pending at observation. Push-run coverage not exposed.


## V2-114 — Controlled revision benchmark with strong no-cache comparator. Both private cursors retain the exact admitted parent and run the same impact derivation; fresh current invokes ordinary compiler exactly once. Seven paired repetitions with alternating order, untimed anchor/warm-up, exact report and impact parity against independent full replay; two narrow domains and eight-candidate/264-node synthetic workload with correction, same-number source change and irrelevant context. Timing descriptive only; no assumed speedup. V2-112 all nine returned PR workflows passed (45716191802, jobs 139562734872/139562734564). Prior single-run pilot proved correction 3/6 and withdrawal 3/3 arithmetic outcomes reused in both domains but used redundant fresh comparator; retain historical result only, no latency conclusion. V2-113 pending at observation; push workflow not exposed.


## V2-115 — Atomic pinned multi-source evidence revision

V2-113 and V2-114 exact nine returned PR workflows green (knowledge runs 45716588192 and 45716763984). Strong comparator V2-114: 7 paired repetitions per case, all parity assertions passed. Wide 264-node correction reused 132 arithmetic outcomes but median 30.13 ms versus fresh 28.78 ms; irrelevant change reused all 264 but median 29.02 versus 28.31 ms. No latency advantage established; receipt hashes and readmission remain costs. New separately pinned transaction applies up to eight distinct source corrections/withdrawals in one child, exact old and replacement digests, optional explicit old-binding span reselection under unchanged type, all changed-source quote/facet links removed (even for reselected numbers), omitted inputs typed unknown, refused candidates quarantined. No implicit correspondence. Validate entire transaction before returning child; unchanged parent remains replayable. Tests cover stale pins, duplicate operations/locations, forged spans, cross-source binding, partial reselection and future-valid refused parent. Fix oversize single-withdrawal report path: return nonportable without attempting impossible casePin. Independent transaction verifier and browser UI still open; exact candidate CI pending. Separate push run not exposed.


## V2-116 — Independent atomic evidence transaction reconstruction

V2-115 exact PR workflows at observation: 4/9 green. Separate Python verifier rebuilds full old/new contract and plan-authorized transformation, exact typed reselection, missing inputs, quote/facet removal, refused quarantine, candidate outcomes and substantive impact; three separate pins. Closed offline archive profile; four synthetic fixtures including Unicode byte offsets and all five impact classes; nested repinned formula and plan mutations refused by acceptance tests, CI pending. No browser intake yet. Independent reconstruction is conditional, not empirical or semantic authority.


## V2-117 — Atomic source revision workspace

V2-116 exact returned PR workflows at observation: 5/9 green. Actual browser controls queue distinct source operations, select explicit replacement tokens with retained declared type, discard selections on replacement edits, bind exact baseline/plan, preview all candidate consequences and confirm only the exact unchanged queue. Shared child adoption path with single withdrawal; stale previews and exports cleared on draft/baseline edits; source inventory disclosure and local portable report. Actual 360px browser journey reverses operating cash and blocks capital-adjusted candidate, restores parent, tests stale guards and no external contact. Independent downloaded zipapp reconstructs browser transaction and tampering. CI pending. Broader semantic correspondence and independent benchmark still open.


## V2-118 — Shared exact compiler contract admission

V2-117 returned PR workflows at observation: 5/9 green. Remove redundant host admission per candidate: one opaque same-process capability, backed by a private WeakMap, validates full exact contract and all sources/bindings before batch evaluation; individual programs still independently admitted. Both fresh and provenance session paths use the same optimized admission; no serialized capability or forged lookalike accepted. Replace full-document prefix/suffix UTF-8 decoding for numeric boundary checks with adjacent code-point inspection after fatal exact span decoding. Tests cover cross-contract mismatch, forged capability, transactional session, Unicode letters/digits including astral, BOM/emoji/whitespace, long source and malformed byte span. Existing independent verifier and canonical reports unchanged. Controlled timing re-measured by existing benchmark; no speed claim. CI pending.


## V2-119 — Exact bounded semantic probe review suite

New finite stress-test review planner over already evaluated semantic world grid. Collapse identical typed structural programs for pair coverage without merging declared meanings; retain unresolved/refused and already-divergent candidates separately. Exact subset optimization over <=16 evaluated worlds and <=28 structural pairs: maximum coverage, minimum review worlds, minimum changed bindings, deterministic tie break. Witness minimality requires all proper nonempty change subsets to have been evaluated and decisive, not merely singles; untested/unresolved subsets reported. Tests include true joint-only witness, duplicated program, 1-vs-2 world review budget, truncated grids, missing subsets, baseline divergence and stale pins. Portable report scoped to conditional computation; independent profile and browser integration pending. No reduction in grid computation work or semantic truth claimed. V2-115 and V2-116 nine returned PR workflows green; V2-117 knowledge and browser jobs passed (139569315079/139569315442), other PR checks pending at last observation. V2-118 pending. Separate push run not exposed.


## V2-120 — Independent semantic probe subset optimization

Independent Python reconstructs the exact pinned finite grid and enumerates combinations with set unions rather than the JS bitmask DP. Verifies group deduplication, tested proper-subset minimality, budget optimum, excluded/unresolved and truncated cases. Five synthetic fixtures and repinned mutations, closed offline archive profile; exact CI pending. V2-117 and V2-118 exact nine returned PR workflows green (knowledge runs 45718126155, 45718273782). V2-119 pending at observation. No claim of semantic coverage, physical feasibility, or reduced grid evaluation work. Browser integration next.


## V2-121 — Focused synthetic review in existing world-grid workflow

V2-120 returned PR workflows at observation: 5/9 green. Integrate exact probe suite into existing finite grid with review budget, readable assignment cards, uncovered/untested/minimality detail, local report disclosure and separate pins. Replays the grid; no computation savings claimed. Stale exports cleared on budget, grid or investigation change. Actual browser export and downloaded independent verifier regression, mobile journey retained. CI pending. No semantic authority. Next: permanent frozen assumption-case development benchmark with matched comparators and negative controls.


## V2-122 — Freeze 40 assumption development cases before runner

Dataset `packages/sutra-knowledge/evaluation/assumption-development-v1.json`, exact sha256:7b38b07b1c5b3abf904fa527d34945a5192e7c6dd850b36e5e0daf4335fdfd75, 40 fixed cases in ten families. Separate authoring-only exact rational oracle fixed expected baseline states, evaluated world states, structural duplicate groups, distinguishing/unresolved pairs and optimum budgeted review subset. Includes strict/inclusive thresholds, period ambiguity, two- and three-way interaction, wrong population denominator, relative/absolute change, negation, equivalent negative controls, review budget, truncation/refused/unresolved. This is synthetic developer-authored development material; zero external annotations, held-out or live model trials. The 200-case independently reviewed target remains open. Dataset is committed before implementing the evaluator; do not alter expected answers to fit implementation. Next commit adds matched first-world, single-change, greedy and exact subset comparators, with coverage, all-cell correctness and negative results. V2-119 exact nine returned PR workflows green; V2-120/121 pending at observation. Separate push run not exposed.


## V2-123 — Execute frozen assumption development benchmark and repair replay journey

V2-121 exact browser job 139572311602 failed at browser.cjs:718: digest read from collapsed independent-replay details returned empty; knowledge job 139572312178 passed. Preserve failed evidence; open actual disclosure before reading and verify both downloaded pin files, including exact plan digest. Add executable 40-case frozen benchmark (V2-122 digest unchanged), checking baseline, structural groups, every evaluated cell, unresolved and witness pairs, coverage and exact optimum against precommitted rational oracle. Compare equal-grid/equal-budget prefix, single-coordinate greedy, unrestricted greedy and exact selectors; retain case mismatches, negative controls, and greedy counterexamples. No independent labels or measured review time; no 200-case gate credit. CI pending.


## V2-124 — Preserve change ambiguity in the grounded question compiler

Extend existing closed question profile with a v2 plan for exact baseline/current/threshold UTF-16 selections. Unqualified change preserves signed difference and signed relative change; explicit prefixes select one; every caller-mapped alternative stays visible (including type-blocked or unresolved). Signed denominator convention disclosed; zero unresolved, negative base not conventional growth. Percentage/percentage-point/causal wording is refused, not inferred. Reuse expression compiler, evidence spans, semantic facets and existing offline question dispatch; independent Python constructs the graph separately. 36 accepted parity cases, two refused, additional adversarial unit cases; CI pending. Fix oversize question report to return nonportable before hashing. Browser change question controls remain open.


## V2-125 — Grounded change workflow and verified 40-case development result

V2-123 exact 977ece7: all nine returned PR workflows green, knowledge 139574926959 and browser 139574927193. Frozen 40/40 matched precommitted expectations; 181 evaluated worlds, 410 executed candidate cells, 28 unresolved cells, 6 no-discovered-pair cases. Equal-grid/equal-budget comparison: prefix 13/42 discovered pairs, 57 review items; single-coordinate greedy 30/42, 26; unrestricted greedy and exact both 40/42, 36 items, 50 changed bindings, zero greedy counterexamples. No advantage over strong greedy in this set; no human-time/semantic-truth/held-out claim. Actual focused-probe browser download independently replayed and tamper-tested. Extend existing mapping panel (not a new parallel workflow): explicit direct/change grammar, exact three selections, conditional expressions shown, preserve blocked alternatives, clear stale previews upon mode/contract/mapping changes. Browser synthetic Unicode two-threshold journey and independent downloaded verifier plus mutations. V2-124 exact CI pending at observation; new candidate CI pending.


## V2-126 — Freeze 40 atomic revision development cases and reconcile change grammar

V2-124 `bd28a996424762c209d161a08f5609c14d23640d` and V2-125 `5d1d7f2e41368baabbc36743d6e9d0ac19a7611b`: nine returned PR workflows green each; V2-125 knowledge 139576840210 and browser 139576839545 including actual downloaded question replay and adversarial mutations. Separate push runs not exposed. Freeze 40 explicit developer-authored revision cases across finance and engineering, 32 accepted and eight atomic refusal cases, before writing runner. Include strict equality, both-source replacement, partial/zero reselection, withdrawal, correction plus withdrawal, irrelevant source, stale pin, duplicate source, cross-source selection and forged quotation. Expected target states/refusal codes fixed by declared fixture arithmetic and protocol rules, not output from implementation. Next: matched fresh/session/transaction evaluation, retained-parent checks, scoped classifications, meaningful baseline comparison; no independent labels, time claim or 200-case completion. CI pending for dataset checkpoint.


## V2-127 — Execute frozen atomic revision benchmark against matched fresh replay

Pin V2-126 dataset Git blob d199bddb0bcc9023eb0c3cf77697e3cd3c278786; unchanged expectations. Runner exercises actual atomic transformation, exact parent/child replay, strong fresh session and provenance-bound session parity, explicit missing/reselected/retained bindings, changed semantic reference invalidation, independent source operation commutation, refusal and parent preservation. Compare stale carry-forward errors and selection counts to full reselection and source-local editing (latter equals SUTRA by construction). The 40 cases are two domain wrappers over 20 patterns; no independent annotations, real-world semantics, timing or superiority claim. CI runner and result artifact candidate; no additional verified credit yet.


## V2-128 — Independent replay of the frozen revision corpus and CI configuration correction

Fix the V2-127 workflow artifact path indentation defect found by remote readback (no passing V2-127 evidence claimed; workflow runs not returned at observation). Extend the unchanged frozen runner to emit actual separately pinned transaction bundles; independently reconstruct all 32 accepted cases with Python and compare to the precommitted expected states. Reject 64 repinned mutations (altered child identity and claimed status). Preserve eight JS refusal cases and original parent replay; Python positive-bundle tests do not independently classify those rejected transactions. Verified readback of the dataset Git blob by recomputation. CI pending; no independent annotation, benchmark completion or release authority.


## V2-129 — Recover explicitly selected lost inputs from a preceding atomic revision

Introduce bounded evidence recovery kernel using exact ancestor, preceding revision plan, independently retained current child and new recovery plan pins. Reconstruct the prior transaction rather than trust unknown-node reason text. Restore only explicitly selected missing bindings with preserved types, from newly supplied exact source bytes or current corrected source bytes. No restoration of old quotation/semantic links, arbitrary historical ancestry, source authenticity or automatic correspondence. Refused candidates stay quarantined. Tests cover withdrawal→recovery reversal, omitted binding→recovery, partial recovery, order independence, pin/cross-source/span adversaries and fresh/session parity. Kernel candidate; independent Python export and browser workflow pending. V2-128 exact CI observed running; no benchmark credit yet.


## V2-130 — Independent two-transition evidence recovery replay

Portable bounded recovery includes exact preceding transaction, new recovery plan and child; independently retained snapshot, ancestor, revision plan, current and recovery plan pins required. Python separately reconstructs source and binding restoration, candidate node correspondence, unchanged annotations, refusal preservation and impact; standalone deterministic offline archive dispatch uses explicit extra pins. Four fixture exports include restored and omitted sources, partial multi-source recovery, non-target input recovery, originally unknown reason-text counterexample and removed quote. Repinned altered child, semantic link, forged selection and pin adversaries; actual isolated archive comparison. CI pending; no browser integration or arbitrary ancestry recovery.


### V2-131 — explicit recovery in the reviewed workspace (candidate)
V2-126 and V2-128 each observed 9/9 exact PR workflows successful; V2-127 malformed artifact indentation was repaired in V2-128, not counted as passing. Frozen benchmark: 40/40 expected outcomes, 32/32 independent replays, 64/64 repinned tamper refusals; 94 full versus 46 conventional source-local/SUTRA reselections. No source-local advantage, independent annotation, or speed claim. V2-131 adds a bounded, immediate-only recovery queue inside the atomic revision panel. Restored source starts blank, corrected source remains read-only, selected tokens retain prior declared type. Preview is nonmutating; explicit confirmation shifts comparison baseline to the preceding revision (not the original ancestor). Any edit clears recovery state; partial recovery cannot be iterated under this protocol. Separate pins and portable two-transition report; actual Chromium journey and independent replay including attempted semantic relink added, not yet verified. No release or deployment.


### V2-132 — freeze structural ancestry development corpus
Thirty developer-labeled topology cases frozen before evaluator implementation: separate artifacts, shared declared lineage, exact duplicate bytes, transitive bridges, cycles, overlapping/disjoint dependencies, context-only, question-only uncovered targets, refusal and unknown states, copied candidates, and 8-source boundary. Labels explicitly list expected components and complete minimum cut sets. No independent expert annotation, verified source independence or empirical failure claim. V2-129/130 exact nine PR workflows green each; V2-130 independently verified 4 recovery fixtures, rejected 52 tamper/pin cases and matched 4 isolated archive results. Browser V2-131 still in CI at observation. Reconcile correct recovery gates LK09/10/11/15/19 without closing them.


### V2-133 — execute frozen ancestry topology benchmark
Real compiler + sealed semantic investigation + structural audit on all 30 frozen labels (Git blob 0af4985a8c32eaef7a9073f5033b4d875f1bd774). Separately implemented Python traversal/combinations checks all components and complete min cuts against same frozen manifest; compare naive artifact-only and lineage-only baselines. One-target manifests duplicated only to satisfy two-proposal profile; identical target structures counted once. No claims of independent expert labels, independence, full causal ancestry or actual failure probability. Exact CI pending; no gate closed.


### V2-134 — independently replayable structural exposure
V2-131 exact nine PR workflows green; actual Chromium recovery download independently verified, isolated archive matched, six tamper/pin attempts refused (job 139594608390). V2-134 candidate adds exact structural-exposure report pin, 256 KiB portable bound, separate version pin, independent Python traversal and cut reconstruction from real sealed investigation, standalone --exposure profile, all 30 corpus exports and 2 actual browser downloads with repinned summary/authority/ancestry attacks. Existing bundle shape preserved. No independence, actual physical failure, causal completeness, or release claim; exact CI pending.


### V2-135 — reopen exact atomic transaction after restart
Candidate strict local import of the original portable transaction bytes with separately retained report, ancestor, revision-plan and child pins. Recompute transaction from original version and plan; exact producer report bytes must match, no reliance on imported summary or mere JSON equivalence. Browser preview nonmutating, confirmation explicitly replaces draft and retained baseline, then activates immediate-only recovery. Fresh Chromium page test uses previously downloaded transaction, wrong pin, stale preview, unrelated current investigation and actual recovered child. No browser persistence, arbitrary ancestry or new source authentication. Exact CI pending.


### V2-136 — exact saved recovery reopening (kernel candidate)
V2-134 `311ad1a921afb4a02cb73918acf42fc577843d92` and V2-135 `c5f6dba9049df6fb40113fff6e2b1994499345ff`: nine returned PR workflows green each. V2-135 knowledge and browser jobs [139597167744](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45726374744/job/139597167744) and [139597168368](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45726374744/job/139597168368) passed, including actual browser journey and independent structural/recovery replay. Separate push runs not observed. V2-136 reopens exact portable recovery bytes using six independently retained pins (snapshot, ancestor, revision plan, current, recovery plan, final child). Reuse strict prior transaction opening, recompute both transitions and require exact producer bytes; no authority from imported summary. Adversarial tests: each wrong pin, repinned missing list/authority/child/classification, nested mutation with both report digests recomputed, whitespace drift, multibyte size bound, retained parent and partial recovery. No recursive recovery, semantic revalidation, source authentication or browser integration yet; exact CI pending. Prefer reusing bounded replay over general ancestry ingestion. No gate closure.


### V2-137 — reopen completed recovery in the same workspace (candidate)
Extend the existing local import panel with explicit revision/recovery mode and six retained pins for recovery. Preview leaves current draft and baseline intact; mode/file/pin drift invalidates confirmation. Confirmed recovery reinstates its actual preceding revision baseline and exact recovered child, preserves the original portable report for byte-identical re-export, and never enables recursive recovery. Existing revision path and four-pin independent verifier inputs unchanged; final child digest saved via existing investigation digest export. Fresh Chromium regression uses actual previously downloaded report and separately saved pins; wrong final pin, stale mode, unrelated current draft, comparison baseline, byte-identical re-export, 360px/no external contact. V2-136 and V2-137 CI pending at authoring. No browser storage, source authentication or broad gate closure.


### V2-138 — freeze acquisition development benchmark before implementation
Freeze 30 explicit developer-labeled robust acquisition cases (15 single-axis and 15 two-axis conjunction). Expected objective and first action manually declared before evaluator; same bounded loss, actions, shared acquisition costs and exposure cap across future comparisons. Cases include free reads, stop ties, prepaid source, exposure exactly at/short of budget, overlapping and failed outcomes, shared vs separate source costs and two-step interaction. Two identical semantic proposals used solely for profile admission, not independent evidence. Next: executable compiler/grid/acquisition runner plus independent exhaustive oracle and matched no-observation/one-read/nonadaptive baselines. No empirical costs, independent human labels, speed or superiority claim; dataset not yet executed. V2-136/137 exact CI still pending at observation.


### V2-139 — execute frozen acquisition corpus and independent matched baseline oracle (candidate)
Pinned unchanged V2-138 manifest Git blob a5bd96c1667c9b980bbdfa34e1fb814baf692be0. Actual reviewed compiler, sealed investigation, finite world grid, minimax planner execute all 30 cases; expected roots/objectives and cell arithmetic checked. Separate Python enumerates from frozen manifest, not reported grid, with exact adaptive, one-read, nonadaptive subset and no-observation policies under matched losses/costs/budgets. CI publishes both JSON artifacts; no independent labels, measured real losses/privacy, human-time, superiority or verified benchmark credit pending exact workflow. V2-136/137/138 remain pending unless exact evidence later observed.


### V2-140 — adversarial adaptive-versus-fixed acquisition regression (candidate)
V2-136 exact commit 48c0879c37f83a03a05c9e3ef61724cd3eacb9c9: all nine returned PR workflows successful; actual knowledge job 139612253862 and Chromium job 139612253419 passed. Strict six-pin recovery opening thus verified within kernel scope, not arbitrary ancestry or authority. V2-138 frozen manifest also matched 30/30 in a separate preliminary array enumeration (declared objective totals 126 versus one-read 147 and no observation 180); not execution of V2-139 actual compiler/planner or its Python oracle. Add separate, non-corpus regression at maximum 16 candidate-world cells: x selects y or z through explicit arithmetic; optimal branch-dependent policy reads x then the relevant quantity. Exhaustive fixed-subset baseline has objective 6 at exposure cap 2 and 3 at cap 3, whereas expected adaptive objective 2; cap 1 and possible selector failure must abstain. Tests check every compiled cell against independent direct truth table, independent recursive oracle and fixed subsets. This is an explicit synthetic counterexample to blanket equivalence of adaptive and nonadaptive collection, not a field advantage. V2-137/139 exact CI pending at authoring.


### V2-141 — separately retained pin card for revision and recovery (candidate)
Reduce four/six manual digest copies with a closed, named local JSON pin card. Card contains only digests, no source text, and is generated only for a confirmed portable export. Strict duplicate-key/profile/field/size validation; no report replay or state mutation upon card intake. Report and card are separate downloads; a card from the same untrusted sender does not establish authenticity. Existing manual entry and independent Python verifier inputs preserved. Browser regression uses actual saved card in fresh tab, duplicate-key refusal, wrong final pin, nonmutating field fill and explicit confirmation. Exact revision reopening also preserves its report/card for re-export. No storage, automatic trust or broad gate closure. CI pending.


### V2-142 — frozen replay/tamper development specification and exact CI reconciliation
V2-137, V2-138 and V2-139 each 9/9 returned PR workflows green; separate push run not exposed. V2-137 saved recovery reopening browser job 139612622667 passed. V2-139 actual planner and independent Python oracle job 139613273989: 30/30 acquisition cases matched, summed abstract worst objective no observation 180, one read 147, exact 126, fixed nonadaptive 126; strict improvements 15, 8, 0 respectively. No superiority over fixed-subset baseline in this corpus, no empirical cost. Freeze 20 developer-labeled replay/tamper cases before evaluator. Two producer-exact positives, two pretty reserialization cases intentionally accepted only by structural verifier with new outer pin, 16 expected dual refusals, including independently pinned child and semantically revived link. Structural oracle must check separately retained child digest as a wrapper, not misrepresent existing CLI signature. No gate closure. V2-140/141 CI reconciliation remains separate.


### V2-143 — execute frozen differential replay benchmark (candidate)
Actual compiler produces withdrawal and partial recovery bundles; frozen blob e27ca033a7d7bc7d248ffb1e2b509465adb87e5d; 20 cases run strict producer reopening and separate Python structural reconstruction plus retained final-child digest. Compare hash-only and hash-plus-declared-fields controls; count false accepts only on 16 explicitly invalid transformations/pins. Two pretty cases intentionally distinguish contracts; nested mutation and restored semantic link are repinned, not merely corrupt hashes. CI pending; no new gate credit, no external annotations.


### V2-144 — freeze 40 semantic development cases before evaluator
Eight families × five explicit cases: period, inclusive threshold, denominator, operator, relative change, direction, population and equivalent expressions. Frozen baseline/counterfactual vectors, duplicate-copy pressure, intended-formula labels, and signature-distinguishability controls. These labels are synthetic developer specifications, not inferred semantics or independent review. Evaluation pending. This completes the specified size of the synthetic 200-case development design, not the external/held-out benchmark gate. V2-140 adaptive branch test passed exact knowledge job 139613709973, 9/9 returned workflows. V2-141 actual browser and kernel jobs 139614221186 and 139614221269 passed; 9/9 returned workflows. No superiority claim.


### V2-145 — execute frozen semantic development corpus (candidate)
Forty developer-labeled cases through actual reviewed expression compiler and finite semantic challenge engine; pinned manifest blob 609ad48d3d18c2ff620abeae7a3b52747aae78c1. Independent Python Fraction oracle dispatches eight closed families, verifies expected and observed vectors, newly distinguishing pairs, raw/deduplicated vote selections and wrong-only/abstention/mixed metrics. All methods receive matched programs/scenarios; retain-all does not select intended meaning. No source truth, open-ended language accuracy, independent labels or external superiority. Exact CI pending.


### V2-146 — reproducible six-group development ledger (candidate)
Aggregate only completed individual evaluator/oracle results; enforce six frozen manifest blob digests, exact case IDs, group-specific matched counts, independent replay scope and report artifact SHA-256. Include actual checked-out revision plus PR head/run ID, separate 200 synthetic coverage from zero expert/held-out labels, and retain group-specific baselines without pooling heterogeneous scores. Capture existing revision Python summary as artifact; no weakening of original steps. CI pending; no release or benchmark gate closure.


### V2-147 — independently retained final-child pin in offline verification (candidate)
V2-142/143 exact nine returned PR workflows each green. Actual replay benchmark 20/20, 16 invalid cases: strict and structural zero false accepts, hash-only 14, hash-plus-declared-pins 8; two intentional pretty-reformat differences (knowledge job 139615315490). Add optional final-child digest to structural Python revision/recovery verifier and CLI, preserving exact old successful outputs when absent or matching. Wrong and malformed child pins refuse explicitly; actual browser separately exports final child for each transition and downloaded standalone archive checks them. Frozen replay evaluator uses new direct optional pin rather than wrapper; frozen expectations unchanged. Structural replay still differs from strict producer bytes. CI pending, no broad gate closure.


### V2-148 — provider-neutral reviewed-method council and ledger format repair (candidate)
User-directed pivot: no new corpus. Repair aggregate ledger comparison to use the revision producer's bare SHA-256 format, preserving exact bytes, Git blob and case identities. Add bounded host-owned council over the existing ephemeral credential vault and provider budget workspace. Arbitrary catalog/provider labels and custom model IDs; 1–4 agent routes, 1–3 rounds, explicit question/feedback disclosure scope, same-round barrier, fixed host assignments, per-method exact verification and preserved prior disagreements. Model output is a closed reviewed-method proposal; graph and credentials never deliberately sent to peers, no model-generated endpoint or verdict accepted. No auto fallback/retry. Timeout stops publication, not an injected non-cooperative transport; budget ownership remains in workspace. Tests use two arbitrary mock providers and actual beam verifier, hostile output, scope, budget and cancellation. Existing branch V2-146 exact knowledge job 139617361867 failed at manifest digest representation after 257 unit passes; retain failure. V2-147 register was already pending at observed parent; no inherited credit. New exact CI pending. Next: validate this candidate, then browser Agent Studio and general reviewed intent proposal pathway; live credentials, arbitrary egress and paid inference remain disabled.


### V2-149 — primary Agent Studio browser integration (candidate)
Expose the council above the engineering labs with two user-editable arbitrary connection/model IDs, independently assigned role names/routes (including shared route), scope consent, bounded rounds and calls, reviewed JSON case, real independent conditional outcomes, round activity and trace export. Use per-run in-memory synthetic credentials, no endpoint or real-key input; mock decisions use agent identity and prior conditional results. DOM renders only text, config changes invalidate trace, cancellation stops publication. Actual Chromium test candidate covers custom IDs, distinct outcomes retained after convergence, forged verdict, same-route budget refusal and redacted download. No open-ended semantic parsing, live model call, provider-global billing, independent trace replay, persistent collaboration or deployment claim. V2-148 exact CI running at observation; do not inherit verification. Next: reconcile exact CI, correct regressions, then connect general reviewed intent proposals and harden registry.


### V2-150 — heterogeneous protocol registry and first-viewport repair (candidate)
V2-148 exact 9/9 PR workflows passed: knowledge job 139624048147, 262/262 unit tests including five council cases, 200/200 frozen development ledger matched; zero held-out/expert labels. V2-149 browser job 139624980167 reached the existing first-screen regression but failed because the full Studio preceded the guided challenge. Preserve the test, restore debugger first and keep Studio prominent via direct header navigation. Add a trusted extensible protocol workspace composing existing vault and budget ledger: bounded nonstream OpenAI-compatible and Anthropic Messages JSON, custom trusted adapter contract, arbitrary connection labels/model IDs, explicit hosted/local transport descriptors and mandatory injected exchange. No default network, URL proxy, real key or new endpoint; DNS/egress/tenant gates remain open. Actual encoded body bytes reserved; incomplete, malformed, tool-bearing or over-budget responses refuse. Add heterogeneous council integration through both wire shapes and custom-adapter tests; exact CI pending. Next: model-generated reviewed expression proposals and general intent path.


### V2-151 — generative expression council over reviewed evidence (candidate)
Refactor the host-owned bounded round scheduler for reuse without changing reviewed-method result shape. Add model-generated expressions (not preselected method IDs), explicit original question and selected binding descriptor/value disclosure, independently compiled conditional arithmetic, cross-agent feedback, abstention, distinct formula history, dedup by compiled bytes and existing semantic triage. Reject guessed undisclosed IDs, code/literals, extra verdict fields, duplicate JSON, stale contract pins and over-cap teams; no raw invalid output forwarded. Distinct conditional outcomes remain review-worthy after later convergence. Exact expression author is model proposal, semantic review always required. Conditional feedback can leak relations among approved binding values even when raw values not shared. No open-ended general semantic authority, paid calls or real provider integration. V2-150 CI pending at observation; V2-149 failure retained. New tests cover actual historical normalized cash-flow fixture, divergent formulas, scoped values, adversaries, abstention and timeout. Next: integrate expression council into browser and independently review provider boundaries.


### V2-152 — concurrent budget settlement and cross-profile credential isolation (candidate)
V2-150 knowledge job 139626283068 succeeded: 59 inference tests, 263 kernel tests, all 200 development cases matched; built-in/custom protocol and heterogeneous council tests passed. Browser job 139626282749 failed with 3 instead of 4 reserved calls in the two-round Studio. Root mechanism: each request settled using its captured reservation tick; a parallel reservation could advance ledger time first, causing earlier settlement/unknown marking to refuse. Use current completion tick and monotonic process clock; fail closed on injected rollback with conservative unknown reservation. Remove async gap after handle check, scan all active credentials (not only selected profile) before dispatch and before publication, check before protocol encoding, refuse public metadata aliases and array accessors. Add deterministic forward/reverse completion, rollback, cross-profile and escaped-canary tests. Exact literal canary detection is not general DLP; removed keys, transformations, malicious trusted transports, distributed budgets and real egress remain outside this guarantee. V2-151 exact CI pending at observation; no live contact or release.


### V2-153 — generated-expression Studio and real wire-format rehearsal (candidate)
V2-151 kernel job 139626930460 passed; browser 139626929920 repeated the 3/4 call failure. V2-152 browser job 139627789581 passed the full existing suite including the concurrency and mobile layout regressions; inference job 139627789195 refused a malicious accessor correctly but changed the protocol error from OPERATION to PROVIDER_RESULT. Restore protocol-safe shape admission before all-profile credential scan, still before serialization. Studio now exposes editable connection endpoint descriptors, two independent protocol choices, simulated wire encoding/decoding via the actual protocol registry, generated expressions over a pinned reviewed evidence contract, user-selected binding IDs and optional raw value scope, fresh per-run consent, visible persistent conditional divergence and redacted export. Test heterogeneous protocols, divergent outcomes after convergence, pin refusal, consent revocation and mobile overflow. Scripted generation only, no live inference or endpoint contact. Exact new CI pending.


### V2-154 — host-directed resource stopping and semantic review planning (candidate)
Add opt-in stop-on-stagnation policy to expression council: compare compiled proposal digests, stop after a complete repeated round only if no new compiled candidate appears and all original team members still propose. Preserve fixed default, hard call cap, all dissent and explicit no authority. Three-round fixture reserves four instead of six calls (33% fewer simulated calls), not measured paid cost or accuracy. Greedily prioritize binding-inclusion/comparator review prompts by opposing-pair separation, with exact-expression fallback when footprints match. No optimality, semantic correctness, causal conclusion or candidate coverage claim. Studio exposes policy and plan, tests dissent after convergence, new candidate continuation, abstention and comparator/structure distinctions. Exact CI pending.


### V2-155 — independent portable expression computation receipt (candidate)
Separate auditable computation from untrusted agent transcript: compact canonical receipt contains separately pinned contract identity, approved binding IDs, recorded expressions, recomputed proposal identities/statuses and review plan. Offline replay validates exact retained receipt pin, exact contract pin, binding scope and canonical recomputation, refusing even self-repinned forged results. No provider identities, endpoint, credential, source text, call history or model-authorship claim in receipt. Studio exports receipt with separate pin and replays exact/tampered bytes. Contract remains independently required. Receipt may reveal conditional relations. V2-153 browser job 139629109476 passed, knowledge pending at observation; exact V2-155 CI pending.


### V2-156 — explicit Node-only loopback HTTP connector (candidate)
Add a separately invoked trusted-host transport for self-operated local model endpoints, exact literal loopback IP/port/path/protocol/model approvals, no DNS/proxy/redirect/discovery/fallback, explicit no-key or approved header mode, bounded bytes/deadline and shutdown. Integrate actual protocol workspace with local TCP fixture servers, test auth isolation and route substitution/redirect/partial/invalid encoding/oversize/deadline. No real model, external provider or production UI enabled. V2-153 exact 9/9 workflows passed including browser job 139629109476 and kernel job 139629109872. V2-154 browser job 139629792477 passed, remaining exact CI pending at observation. V2-156 exact CI pending.


### V2-157 — expression receipt to living investigation graph (candidate)
Bridge verified expression receipt into existing versioned semantic investigation, deduplicate by compiled proposal identity, refuse single distinct candidate rather than fabricate alternatives, preserve exact question and compiled programs, set all unreviewed semantic facets unspecified. New root version has no decision authority. Studio exports existing baseline-compatible version and independent pin. Test full existing source-withdrawal pipeline: candidate dependencies 2 vs 4 reviewed bindings, both conditional conclusions become missing-input after withdrawal while original divergent root remains replayable; no model call. Browser checks exported version bytes and pin. V2-154 exact 9/9 workflows passed; V2-155 knowledge job 139630569794 and browser 139630570016 both passed; V2-156 pending at observation. Exact V2-157 CI pending.


### V2-158 — explicit local multi-model operator runner (candidate)
Expose separate Node CLI with bounded strict stdin config, reviewed contract and disclosure preflight, arbitrary model/agent identity and compatible protocol selection, dry-run route/scope plan with zero credential access or contact, dual explicit execute/disclosure flags, all credential enrollment before first dispatch, no-key local placeholder never sent, per-process call/wire/token/concurrency caps, SIGINT/transport shutdown and portable receipt output. Real TCP end-to-end tests use two fixture protocols and verify no contact on dry-run, missing approval, pin or credential. No genuine LLM, public provider, hosted relay or production release authorized. V2-155 and V2-156 exact 9/9 workflows passed; V2-157 pending. Exact V2-158 CI pending.

### V2-159 — Native Ollama bounded wire

Native `/api/chat` adapter is selectable in the scripted Studio and admitted by the explicit Node loopback runner. The finite `options.num_predict` cap is enforced again at the socket boundary; only terminal `done: true`, `done_reason: stop`, text-only responses and bounded `eval_count` are admitted. Native route tests use a real literal-loopback fixture server, not a genuine model. No external hosted transport, real key, or offline-model guarantee is added. API reference: https://docs.ollama.com/api/chat and https://docs.ollama.com/modelfile. Exact revision CI pending.


### V2-160 — exact operator approval and optional living-version export (candidate)
V2-157 exact nine PR workflows green (knowledge job 139632489326 and browser 139632489729). Preserve intervening V2-159 native Ollama support. Harden existing CLI: exact stdin UTF-8 plan SHA-256 approval required in addition to explicit execute/disclosure flags, before credentials or contact. Preview includes selected binding descriptors/values, credential environment aliases, deadlines and routes. Optional explicit version export seals existing receipt into baseline-compatible living graph only for distinct candidates; full reviewed contract remains local stdout and is warned. Explicit receipt/version statuses, SIGTERM/SIGINT through artifact stage, no retry, bounded host export canary scan separate from provider response caps, decoded source/portable artifacts checked. Tests verify changed config approval refusal, exact receipt and version replay, value preview, default no version. No real provider contact, external routing or production enablement. Exact CI pending.


### V2-161 — hosted public HTTPS destination admission candidate
Add Node-only policy for future hosted API adapters: explicit exact canonical HTTPS route/model/protocol, trusted injected resolver, conservative public IPv4/IPv6 subset, refuse mixed/invalid DNS answers, deterministic single address (no auto fallback), short monotonic one-use opaque lease, direct-IP/original TLS hostname enforcement descriptor. Tests include loopback/private/metadata/mapped/transition/special IPs, DNS rebinding on new resolution, expiry, rollback, route substitution and closure. No network primitive, keys or relay integrated; DNS policy is not socket/TLS enforcement or public ownership proof. V2-158 exact nine workflows green; V2-159/160 CI pending at observation. No paid inference or external contact. Exact candidate CI pending.


### V2-162 — per-agent disclosure and conservative directed feedback (candidate)
V2-160 knowledge job 139635722742 and browser 139635722312 both passed. Add complete optional per-agent scopes within host envelope, selected raw value authority, explicit directed feedback permissions and conservative sender-whole-scope subset flow rule. No output from a higher-scope model forwarded to lower-scope agent even if expression uses only common bindings; guessed hidden references refused per agent; self feedback remains. CLI previews actual per-agent descriptors/value exposure and rejects invalid flow before contact. Legacy uniform scope compatible. Tests use two injected providers and actual local TCP CLI fixtures. Shared provider state, role/question strings, timing, budgets and termination remain side channels; no strong noninterference or real provider claim. V2-161 CI pending. Exact candidate CI pending.


### V2-163 — Agent Studio per-agent evidence permission editor (candidate)
V2-161 exact nine PR workflows green, including public route policy tests (knowledge job 139636499461, browser 139636499149); V2-162 CI pending at observation. Add optional nontechnical per-agent evidence permissions UI with separate binding lists, value toggles, directed feedback, live policy preview and applied trace cards. Reuse actual scope admission, revoke consent/exports on edits, refuse downward feedback before setup. Existing uniform workflow retained. Actual Chromium candidate checks blocked direction, allowed upward flow, distinct outcomes after scoped reconsideration, scoped trace export, value-cap refusal, 360px overflow and existing no-network controls. No live AI, new corpus or strong noninterference claim. Exact CI pending.


### V2-164 — browser to actual local operator plan handoff (candidate)
V2-162 exact nine PR workflows green (knowledge job 139637358617, browser 139637358862). V2-163 exact CI running. Extract pure shared local-route/config admission from Node runner; same validator now used in Agent Studio export and CLI, preview creates no network workspace. Browser exports explicitly approved full-contract local plan with chosen model/role/protocol, separate literal loopback addresses, auth mode/credential environment alias, scopes, fixed disclosed resource defaults, exact pin and commands. No API key input, no provider contact, no automatic CLI execution. Existing CLI re-admits exact bytes. Tests cover shared preflight, native Ollama, invalid route, permission and pin, actual Chromium download/no contact/mobile overflow. No real model, hosted relay or production enablement. Exact candidate CI pending.


### V2-165 — compact local result round-trip into living investigation (candidate)
V2-163 knowledge job 139638337117 and browser 139638337391 passed; V2-164 exact CI pending. Add optional CLI portable output omitting unverified transcript, model/contact and resource claims. Keep strict 256 KiB transfer cap, receipt and optional exact root. Import in Agent Studio with separately retained plan/contract/receipt/version pins; recompute receipt and re-seal expected version, reject unrelated self-repinned root or forged receipt, no model call. Download only independently recomputed version for existing revision workspace. Receipt-only supported; no authentication, semantic or empirical authority. Actual local TCP fixture and Chromium file import/download tests plus adversaries. Exact CI pending.


### V2-166 — pinned hosted HTTPS socket candidate (not enabled)
Add trusted Node-only HTTPS exchange with mandatory host resolver, public route admission, exact IP connection, original SNI, TLS 1.2+, certificate and peer IP/port checks before HTTP credentials, one authenticated socket, no redirect/retry/proxy, deadline across DNS/TLS/body, 256 KiB response cap. Shared local/hosted wire body validator; two compatible wire protocols, no live public contact, no CLI or browser wiring. Injected TLS/HTTP event adversaries exercise policy; real CA/TLS fixture, production tenant isolation and paid provider approval remain open. V2-164 exact nine PR workflows passed; V2-165 exact nine PR workflows passed. Candidate CI pending.


### V2-167 — actual TLS fixture validates pinned transport primitive (candidate)
Extract internal socket primitive, keep public route and credential preflight in host wrapper. Real local HTTPS server with ephemeral per-test CA/certificate tests actual Node TLS+HTTP socket reuse, SNI, exact peer, authenticated header, untrusted certificate, wrong hostname, wrong admitted peer and redirect refusal. Public-route policy still forbids loopback, so positive local fixture invokes only internal primitive with a test pin and explicit test CA; no production trust modification, real public requests, UI wiring or authorization. V2-165 nine exact PR workflows passed; V2-166 candidate pending. Exact CI pending.


### V2-168 — mixed local/hosted council composition (candidate)
V2-167 exact nine PR workflows passed, knowledge 139643053370 and browser 139643053251. Compose existing local/hosted transports in one operator plan with separate explicit transport classes, credential alias namespaces, exact plan pin and hosted disclosure approval. No default hosted I/O: trusted resolver and socket primitives must be explicitly injected; no public request or real key used. Pre-enroll every credential and scan reviewed sources before dispatch; share existing council, budget and receipt kernel. Actual loopback TCP fixture plus injected hosted TLS exercise separate credentials, conditional disagreement and receipt replay; adverse plan/route/credential cases refuse before contact. Local config contract unchanged. This is not hosted production activation, multi-tenant security, genuine model interoperability or monetary budget certification. Exact new CI pending.


### V2-169 — capacity-aware council waves (candidate)
SUTRA schedules bounded same-round waves from actual ledger concurrency and remaining call/output reservation capacity rather than treating a selected four-agent team as four simultaneous calls. Global and profile admission remain in the ledger; actual wire bytes are checked there, no retry or hidden fallback. Preserve stable trace order and frozen previous-round feedback across waves; unknown charges hold slots and can block remaining agents, cancellation prevents later waves. Tests exercise 4 agents/2 slots (8 of 8 calls), 2 shared-profile agents/1 slot, unknown charge and cancellation. Capacity hints do not prove production scheduling or currency budget; contention can still cause a refusal. V2-168 exact CI pending at observation. Exact V2-169 CI pending.


### V2-170 — reversible human review answers and scoped CI diagnostics (candidate)
Connect council review prompts to explicit human answers over a separately pinned and recomputed expression receipt. Exact comparison choices only; candidates outside compared pairs remain unknown, original dissent and receipt remain intact, no semantic approval or automatic adoption. Studio supports preview/reset and export of replayable answer comparison; browser checks both matching and conflicting branches. Add early scoped council integration step without removing any existing unit/formal gates. V2-168 and V2-169 knowledge jobs 139651382343 and 139652112443 both stopped on pinned TLC download checksum mismatch before the full knowledge tests, not a demonstrated code regression. No pin change or bypass; scoped results cannot close full CI gate. V2-168 browser passed; V2-169 browser pending at observation. Exact new CI pending.


### V2-171 — same-tab evidence-to-council-to-revision handoff (candidate)
Add bounded immutable offers between existing workspaces. Explicitly replay and load a sealed evidence contract into Studio, clearing previous consent and raw value grants; large binding sets require manual subset. Offer a distinct-candidate root for explicit replay, editable-source reconstruction and confirmation as current/retained baseline; no model call, semantic adoption, automatic replacement or persistence. Browser candidate checks exact root pin, two candidates, round-trip contract pin and revoked approval. Fix V2-170 browser test syntax collision (job 139653511463) without changing assertions. V2-170 scoped council/orchestration step succeeded (job 139653510942); full formal gate still pending at observation. Exact V2-171 CI pending.


### V2-172 — mixed operator credential admission cancellation and full-plan canary scan (candidate)
Bound the host credential callback wait by caller cancellation and the approved overall timeout; observe late rejections, refuse sanitized credential-read errors, close both exchanges, and scan all decoded plan/contract fields after credential enrollment before any dispatch. No new network authorization, no callback sandbox or general DLP claim. V2-171 browser job 139654687336 succeeded; scoped inference 85/85 and council 36/36 tests passed in knowledge job 139654687570, which later failed the unchanged pinned TLC SHA-256 check. New exact CI pending.


### V2-173 — exact model-suggested quantity review (candidate)
Add a bounded untrusted suggestion format using unique literal context anchors, compiler-validated exact numeric spans and explicit pinned human selection. Ambiguous repeated values, fabricated quotes, truncated numbers, invalid types and stale pins refuse; conflicting duplicate spans cannot be jointly admitted. Existing evidence bytes and unselected candidates remain unchanged. Browser accepts pasted suggestions without provider contact, previews actual context and requires explicit selected review before sealing. Add focused tests to the pre-formal-download CI step. No claim of automated semantic extraction or model identity. Exact CI pending.


### V2-174 — explicitly scoped model quantity extraction request and independent regression ordering (candidate)
Connect exact source-quantity suggestions to the existing provider-independent workspace. A local plan binds the exact draft, selected full source texts, route/profile/model, byte estimate, output cap and timeout; only separately approved plan/disclosure can dispatch one request. Hidden-source guesses refuse before local anchor resolution; no automatic application, fallback or retries. A cancelled observer cannot publish a late result; provider may still complete/bill. Tests use an injected custom OpenAI-compatible wire adapter, not a real model. Move the existing complete JavaScript knowledge regression step before the external TLC download without removing any mandatory formal or benchmark gates. V2-172 and V2-173 browser jobs 139656497203 and 139657590848 succeeded; focused integration passed; full knowledge jobs stopped at unchanged TLC integrity gate. Exact new CI pending.


### V2-175 — explicit upstream TLC prerelease asset migration (candidate)
Investigated the repeated SHA-256 failures rather than bypassing them. Official upstream release metadata identifies a newly published v1.8.0 prerelease asset at 2026-11-26 02:14 UTC. Record previous pin, release/asset ID, exact tag commit, new publisher SHA-256, published release-page SHA-1 and byte count in TLC-PROVENANCE.md. Require all three static integrity checks before execution; no fallback/dynamic trust or changes to formal models/expected results. Independent binary retrieval was unavailable in this environment; exact CI must validate the candidate. V2-174 browser job 139658804067 and focused and full JavaScript regression in knowledge job 139658804307 passed; unchanged old-pin TLC gate failed. Exact new CI pending; no production release approval.


### V2-176 — local BYOM source extraction operator round trip (candidate)
Add a literal-loopback-only local extraction CLI with plan-only default, exact config pin, explicit disclosure approval and environment-alias credential lookup only on execution. Browser selects source grants and exports full-draft local plan with clear disclosure, then checks compact returned suggestions against retained plan and separately retained proposal digest. Imported data is still untrusted, never automatically admitted; existing anchor review and explicit quantity selection remain mandatory. Actual loopback TCP fixture uses native Ollama wire shape and fake model responses; browser test checks plan download/import and zero provider contact. No genuine model execution or hosted activation. V2-175 exact CI pending at observation; all previous formal gates retained. Exact V2-176 CI pending.


### V2-177 — decoded model proposal credential boundary (candidate)
V2-175 and V2-176 each have nine successful exact PR workflows (knowledge runs 45745352925 and 45745693875); separate push workflows not observed. Close an inner JSON escape bypass in the source quantity proposal path: scan decoded proposal keys and values using the enrolled credential vault before any review, anchor resolution or transfer, and scan decoded selected evidence before publishing a plan. CLI checks approved route metadata before socket contact. Add injected provider and real loopback TCP adversaries for escaped credential echo and zero-contact preflight rejection. This is exact credential canary detection at specified decoded boundaries, not general DLP, encoded-secret detection beyond that JSON layer, provider confidentiality or semantic verification. New candidate CI pending.


### V2-178 — decoded council candidate credential boundary (candidate)
Extend the host-owned council scheduler to scan admitted decoded candidate strings against every enrolled credential before compilation, trace insertion or directed peer feedback. A structurally valid expression equal to another agent's credential but escaped in the inner JSON must refuse without eliminating unrelated legitimate candidates or retrying the refused route. Add an injected two-provider regression. Restore the exact previous historical evidence objects in roadmap.json (V2-177 inadvertently appended a limitation to historical entries; active gate limitations retained). V2-177 PR CI observed 4/9 successful at checkpoint; no inherited new credit. Exact new CI pending. This is scoped exact-canary detection, not general DLP or strong noninterference.


### V2-179 — recover exact saved local extraction plan (candidate)
A lost browser-memory plan no longer forces a model rerun. Add pure exact plan recovery bound to a separately retained plan digest and byte-identical already staged draft, with zero network contact or draft replacement. Browser file import is bounded, fatal UTF-8 decoded, guarded against stale inputs, displays the actual admitted route/scope/budgets and never grants execution approval. Existing transfer verification and explicit quantity selection remain mandatory. Add pure digest/draft/plan tamper cases and actual Chromium plan-discard/recover/wrong-pin/no-contact journey. Current draft must first be reconstructed exactly; no automatic cross-session persistence or proof of model authorship. V2-178 exact CI pending. V2-177 scoped council/operator integration passed (knowledge job 139672991940). New exact CI pending.


### V2-180 — parallel workstream integration hub
User authorized separate draft PRs for all ten critical workstreams. Branches are sibling children of the active V2 integration branch, never of production; each owns a separate workstream file and narrowly scoped implementation. Full existing formal/browser/release gates remain mandatory on integration. New lightweight PR workflow executes JS knowledge and inference regressions on child PRs; no standalone merge/release authorization. Existing candidate V2-179 has 7/9 observed PR workflows successful at planning; knowledge and learner still running. Do not infer cross-branch verification or use a green child PR as release approval. See PARALLEL-WORKSTREAMS.md.


V2-181: all ten child PRs #51–60 advanced with executable slices; #52 and #58 advanced twice. Exact heads and actual CI observations in PARALLEL-WORKSTREAMS.md and progress.json. Nine scoped JS successes, latest workspace CI running with dedicated browser job. All observed mergeable; no integration or broad gate credit. Next parallel priority order 52, 53, 57, 58, with remaining tracks independently actionable. Preserve V1/older PRs as historical dependencies; no release.


V2-181 final: 17 child commits across #51–60; all latest scoped JS green; workspace actual Chromium green at ecbc9653. PR #52 cross-process CAS green, #53 portable mapping replay green, #57 intermediate test failure retained and corrected at d89cc968, #58 source CR normalization refusal green. Exact heads/CI/next acceptance in PARALLEL-WORKSTREAMS.md and machine register. Central parent e17ce32c had nine exact PR workflows pass, not combined child implementation verification. All original broader gates remain open.


V2-182 batch 1: ten independent implementation commits, ten exact scoped JS workflows green, workspace Chromium green; #52 real subprocess crash challenge candidate 8e9cd7c pending. Parent fdeadbb8 exact nine PR workflows passed (registry only). All broader gates remain open; next workstream actions and exact evidence in parallel registry.


V2-182 reconciliation: all ten streams advanced, latest scoped suites green; #52 actual SIGKILL and fresh kernel-flock recovery verified, #53 independent Python mapping judgments verified, #58 independent Python checkpoint summary verified and actual downloaded browser export differential pending. Validation-only draft #61 combined knowledge/browser passed at fc238782 (run 45755340152; jobs 139692536330, 139692536528); #58 later test-only candidate not included. Preserve initial exact-path impact failure and corrected outcome. No merge, release, deployment, gate promotion, or elapsed-hour certification. Next: reconcile latest #58 browser and exact combined candidate, then independent acceptance gaps.


V2-182 follow-up: #58 exact 60d38f1248c2c6b5d82a89c3340ea401da6f01c3 [actual browser run 45755640152](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45755640152) passed, including downloaded checkpoint independent Python replay and two tamper controls. All ten latest scoped child suites and workspace actual browser succeeded. #61 refreshed to 467bcc2c25abde2c43278f117e4d9ada5baeb33c containing all ten exact current child heads; [full combined run 45755925032](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45755925032) in progress at observation. Prior full combined run 45755340152 passed; no inherited green, merge, release, or broad gate credit. Central continuation requires reconcile exact new run before any further integration assertion.


## V2-183-reuse-first-reconciliation — 26 November 2026

V1 is a frozen reuse baseline, not the active development cursor. Keep 714/1100 historical checks and all historical evidence unchanged. Reuse strict wire parsing, browser runtime, peer consent, evidence, media, provider limits, accessibility, starter/Open Kit, ingress and packaging; only adapt or revalidate changed boundaries. The V2 machine registers now include a separate `reuseFirstReconciliation` overlay classifying inherited, implemented, scoped verified, integration-pending, external and deferred work. Do not promote broad gates from child or cancelled CI.

Validation-only PR #61 refreshed to `c34dc954f7a35857e24a9d5f8795f3e61fc359dd` from central `5cbab6abcfcb448b133bc286e02cfb26ce9123c7` and all ten exact child revisions. 81 unique changed child paths, one HTML overlap reconciled as disjoint pure insertions; canonical combined job bodies retained. [Combined exact run](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45764494043) pending. No merge or release. Prior cancelled jobs resubmitted individually. Main browser rerun 45755996159: all three engines and freshness passed; others await exact results. Preserve prior observations.

| PR | Exact child source | Scoped CI at observation | Reuse | Remaining |
| --- | --- | --- | --- | --- |
| #51 | `aca5e8b60c8ce67f09c72cb4722a05c8810634da` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45757418475) | Browser operator approval console, local synthetic credential lifecycle and one-shot dispatch | Authorized live provider interoperability, budget metering, integrated consent |
| #52 | `8caac249b3e3a6844fbef9fd9b189996d4d8566b` | [in_progress](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45757208682) | Existing immutable snapshots, SIGKILL recovery and flock; challenge-bound external witness adapter candidate | Observe rerun; external retained witness freshness, scale, portability and hardware power loss |
| #53 | `0065b48dc5181f549845303d1569b88d94bc2ddf` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45758784104) | Pinned mapping review, independent Python reconstruction, 24 independently annotated FinQA gold programs | Natural-language induction, review UI integration, broader ambiguity coverage |
| #54 | `0a781904d90a101b7f74a5b471d521ad8a024d05` | [in_progress](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45757527623) | Exact source-bound acquisition and separate-process authenticated observation candidate | Observe rerun; applicability, calibration, noisy correlated observations |
| #55 | `55fc7cac90c9546f8182fb0ac2ee5d4f9a005eb5` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45753442120) | Independent rational, topology and stale-revision replay | Independent interval/statistical and semantic profile coverage |
| #56 | `4620bf709d9749c311f6726e6d2e2bdf04a383b4` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759676416) | Resumable bounded streaming counterfactual search; corrected fresh computation regression | Workspace wiring, measured scaling and practical review benefit |
| #57 | `46055f4f75cf79370ae5e423d1fc99f53b17421e` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45753193964) | Credential-generation fencing and downstream publication refusal | Post-publication lifecycle, transport/peer isolation, coordinated rollback |
| #58 | `7690ca6d874f61f8da98418c9c6e8b766b313e56` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45760669200) | Portable checkpoint, independent actual export replay; new 320px keyboard/accessibility candidate | Observe browser rerun; integrated journey and human accessibility |
| #59 | `35a1e273fd10335ed70c7499d00d2cf3dfd03e01` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759708514) | Pinned public SEC/FHWA derived fact cards and independent calculations | Full-document provenance, qualified review and multi-document journeys |
| #60 | `b981d5b9e049fa62445c60c34ce8375b38933b89` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759752586) | Frozen 40-case FinQA gold-program execution benchmark, seven arms and independent scorer | End-to-end natural-language reasoning, matched actual model metering |

Next: observe exact CI; integrate #52 persistent knowledge and #53 semantic review into #58 unified workspace using existing APIs; extend independent interval/statistical replay and end-to-end benchmark. No real provider, human, physical hardware, public deployment or release evidence claimed.


## V2-189 — optional web access plan (2026-11-26)

> Historical decision superseded by V2-190 standalone scope; do not implement the integration described here.

User supplied ten TypeScript files. Added four bounded checklist tasks WEB-001–004 under existing #54 acquisition, with #57 security, #58 UI and #55 replay reuse. [Integration contract and source fingerprints](WEB-ACCESS.md). No new workstream, no live provider test, no runtime enabled, no gate promoted. Existing N003 cursor and immediate CI reconciliation unchanged. Parent `2e1fce3dc5740d6f57127da6b6c8611f6f984c30`. Proposed host-only consented GET and source snapshot admission; reject current prototype's DNS/transport/MIME/taint gaps rather than import wholesale. 164 outstanding engineering tasks including one active; six external blockers.

## V2-190 — standalone web scope and exact-head observation (2026-11-26)

Web access is a standalone optional future capability, disabled and unregistered by default. No dependency from the core reasoning, evidence acquisition, knowledge compiler, investigation workspace or execution pipeline; no existing completion gate depends on it. Reuse security primitives in one direction only. Future integration requires a separate architectural decision. No live providers, paid calls or external deployment without explicit authorization. Supersedes V2-189 integration language, retained below/in history as historical evidence only. Ten original TypeScript reference fingerprints retained; no runtime implementation or verification credit. Central observed parent `3d33e6466e9a997c0c0151780cf8fbc405898c34`; exact knowledge run [45785358772](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45785358772) in progress at observation. #58 exact head `e163e9a9a293a4be9c713f2b2967de33d91b07bd`: [workspace run 45779650243](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45779650243/job/139771714631) failed at 200% text resize (320px viewport, 384px document scroll width, no overflowing element detected by prior diagnostic); baseline browser journey passed, separate parallel run 45779650347 succeeded. #61 exact `ad295ae83bcafb48d489ef96475c80a22bac3c16`: combined and parallel runs cancelled on attempt 2, workspace run cancelled; stale manifest, validation-only, DO NOT MERGE. N003 remains active. No new gate credit; 164 engineering items including active (160 foundation plus four optional), six external blockers.

## V2-193 — exact scoped reflow success, combined refresh, queue parser correction (2026-11-26)

Observed central source `66440d22c457a819eebba666e8c74837f9eac382`. #58 `ba24ce6fbda97b76a85bce929659fb0f278d1f13`: [exact browser/accessibility job 139794191354](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45786416592/job/139794191354) passed the 320px keyboard and enlarged-font reflow assertions, 360px enlarged/restored checks, focus, accessible names, reduced motion and no external/storage. Credit N003 scoped only; no human or integrated evidence. Parallel #58 passed run 45786416609. Publisher [job 139794191333](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45786416590/job/139794191333) failed during apt font dependency setup, before generated starter browser execution; exact retry requested, prior failure retained. All nine other child scoped workflows success. All ten children 37 behind observed central, ahead respectively 5, 10, 7, 6, 4, 6, 5, 13, 6, 5. Refreshed validation-only `f58473523181779fca3e13f0127bb18469ea76da` pins central `66440d22c457a819eebba666e8c74837f9eac382` and all ten children: 38 exact changed path blobs checked for overlaps, 41 total changed entries including manifest/workflow. Canonical job bodies identical apart from exact head guards; no merge into central. Combined 45786666581, parallel 45786657638 and workspace 45786657934 in progress at observation; stale after subsequent central correction, refresh again. Old cancellation history preserved.

Central runs 45785358772 and 45786325753 failed queue audit because uppercase-only parser rejected stable V2-F11b and V2-F12d, causing count mismatch; separate browser jobs passed. Correct grammar for uppercase/hyphenated identifiers plus one lowercase suffix, preserve stable IDs, add positive/negative regressions and optional-web register/dependency invariants. No CI credit for this candidate yet. N004 active, N007/N008/N012 pending. 163 remaining engineering items including 159 foundation and four optional, six external blockers. Explicit priority counts only: {"P0":11,"P1":16,"P2":3,"unclassified":133}; no invented labels for unclassified tasks. No provider, external action, merge, release or deployment.

## V2-195 — verified central and scoped combined evidence; register normalization (2026-11-26)

Central `2d6cf98937dda9f20ea5be9064d8ef3a602c4c24` [run 45786919479](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45786919479) both knowledge and browser jobs passed; queue audit 6/6. #61 `ca2fa3516b6dcfc69b94e4180c28b411a7548cc9` exact combined knowledge job 139796246998, parallel run 45787019038 and workspace run 45787019111 passed; canonical browser job 139796247554 in_progress at observation. Credit N004 only for its three specified checks and N012 for exact central revision. N005 active pending all exact remaining validation evidence. #58 publisher retry 45786416590 attempt 2 passed; attempt 1 apt dependency failure retained. Exact central divergence 38 behind for all ten children. 161 remaining including 157 foundation and four optional, six external blockers. Explicit roadmap/checklist priority counts {"P0":11,"P1":16,"P2":3,"unclassified":131}. New register consistency checks and Living Knowledge closure authority are candidates pending exact CI; do not close N007/N008/N009/N010/N011 merely from implementation. No merge, release or external authority.

| PR | Observed exact child | Ahead/behind | Scoped run |
|---|---|---|---|
| #51 | `aca5e8b60c8ce67f09c72cb4722a05c8810634da` | 5/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45757418475) |
| #52 | `ae8630ec7d472263f8f8fffb16062bfbc10f96af` | 10/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45779075994) |
| #53 | `0065b48dc5181f549845303d1569b88d94bc2ddf` | 7/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45758784104) |
| #54 | `2336566c64c4ce461042bec8b34c01c22356aba3` | 6/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45779263957) |
| #55 | `1a429e24a4fca63affccedf138150480b3ee87c2` | 4/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45764898229) |
| #56 | `4620bf709d9749c311f6726e6d2e2bdf04a383b4` | 6/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759676416) |
| #57 | `46055f4f75cf79370ae5e423d1fc99f53b17421e` | 5/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45753193964) |
| #58 | `ba24ce6fbda97b76a85bce929659fb0f278d1f13` | 13/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45786416609) |
| #59 | `35a1e273fd10335ed70c7499d00d2cf3dfd03e01` | 6/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759708514) |
| #60 | `b981d5b9e049fa62445c60c34ce8375b38933b89` | 5/38 | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759752586) |

## V2-197 — exact register acceptance and shared-DAG regression (2026-11-26)

Central `e42b6d1c80dd06dc1075ce1b9d99bbfc26be7e70` [45787710589](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45787710589) both jobs passed (queue audit 7/7, kernel 317/317). N007–N011 coordination/engineering plan acceptance closed on that source; N010 is enforced policy/audit, not GitHub administrator restriction; #61 observed draft/unmerged. No human approval or broad Living Knowledge gate closure claimed. #52 `61714c3c095ad254486b250c80cc84b0481dfdd2` [423/423](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788072332/job/139799827662) passed including HIST-003 shared DAG: 4 recomputed, 3 removed, 3 reused, invalid dangling edge refused without state mutation, exact incremental/fresh and restored reports. HIST-003 remains open for integrated semantic/source-history evidence. Prior 422/422 scoped evidence retained.

Prior validation `ca2fa3516b6dcfc69b94e4180c28b411a7548cc9` canonical 45787018982 knowledge/browser, parallel 45787019038 and workspace 45787019111 passed; compatibility 45787019018 in progress at observation. New validation `8d12e8e15ff54c42910948a6a691eb41d631be15` pins central `e42b6d1c80dd06dc1075ce1b9d99bbfc26be7e70` and ten current child heads, exact copy of eleven nonoverlapping deltas (ten central coordination files, one #52 test); parallel 45788349987, FinQA 45788349813 and engineering 45788349939 passed at observation; canonical 45788350009, workspace 45788350020, operator 45788349834, compatibility 45788350132, publisher 45788351602 in progress. N005 remains active for latest manifest. No older success inherited. Child divergence from observed central 39 behind, ahead 5/11/7/6/4/6/5/13/6/5. 156 remaining incl 152 foundation and four independent optional web items; six external blockers. Explicit P0=11, P1=16, P2=3, unclassified=126. No external provider, merge, release, DNS, deployment or submission performed.

## V2-198 — first foundation source integration candidate (2026-11-26)

All eleven exact #61 workflows at `8d12e8e15ff54c42910948a6a691eb41d631be15` completed successfully, including [canonical](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788350009), [workspace](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788350020), [compatibility](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788350132), [operator](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788349834) and [parallel](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788349987). Close N005 and scoped UX001 on this revision only. Central parent `b9fed8f89064237a2c88d8966f10076298649b02` is a separate bookkeeping source; its CI 45788639098 still running at observation, queue audit succeeded. No broad gate closure.

Source-level patch (no PR merge): exact 9 #52, 3 #53 mapping-review, 10 #58 workspace blobs copied after verifying the central versions matched common base and corresponding combined blobs (except separately reviewed shared HTML/browser paths where individual child versions are intentionally retained). Individually reviewed two composition adapter/test blobs from validation candidate. Canonical browser gate now runs the integrated keyboard/reflow/reduced-motion contract, without replacing or weakening existing job. Source hashes in machine integrationTranches. Linux durable host CAS and portable browser history are separate; no claim of browser durable storage or automatic mapping authority. HIST002 active; HIST003, HIST010, SEM004, UX002/003 and all broad gates open pending integrated acceptance. 154 remaining including 150 foundation and four independent web items, six external blockers. All exact new CI required. PR #61 remains draft validation-only. No merge, deployment, live model, paid inference, release, DNS or external action.

## V2-199 — durable typed investigation history candidate (2026-11-26)

Exact V2-198 central `0fd7a39c355b6da832cfa4c185438bedcacbe1cb` [run 45789101493](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45789101493) passed knowledge, browser and integrated accessibility. That exact run closes HIST-003 shared-descendant correction/withdrawal, HIST-004 multi-generation fork/restore/conflict, HIST-005 challenge-bound witness plus bounded lost-response recovery, and HIST-006 rollback adversaries; limitations are retained. New production adapter `durable-investigation-history.mjs` composes the real private Linux CAS store with full `sutra-investigation-version/v1` replay rather than defining another graph. Its tests require exact typed report/graph equality after restart, revision, fork and conflict, and two-adapter stale-CAS refusal. HIST-002 remains active until this new source passes exact central CI. No browser durable-storage claim, NFS/Windows claim, physical power-loss claim, semantic truth, external provider, merge, release or deployment.

## V2-200 — bounded history scale and filesystem profile candidate (2026-11-26)

Exact V2-199 `eb5830e8a7c7b37f0c487af99f62997f29960a5b` [run 45792157072](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45792157072) passed both jobs; the 352-test knowledge suite explicitly passed durable full typed investigation restart/revision/fork/conflict and stale two-adapter CAS tests. Close HIST-002 on that immutable source. HIST-007 becomes active.

Candidate work: exercise the real durable adapter at the declared 12-version and 8-branch maxima, refuse version 13 and branch 9, record actual history bytes/runtime without making a speed SLA, and document replay/append asymptotics. The store now declares a Linux/private-local profile, refuses non-Linux, and uses actual Linux `statfs` classification to fail closed for known NFS, SMB/CIFS, 9P, AFS, CODA, CEPH and NCP magic values. Cross-filesystem portability is explicitly **not claimed**; unknown local/virtual Linux filesystems are not certified portable merely because they are not in the known-remote denylist. HIST-007/HIST-008 remain open until exact new CI. Physical power-loss HIST-009 and browser durable recovery HIST-010 remain open. No web integration, provider, merge, release or deployment.

## V2-201 — narrow filesystem support to observed profile (2026-11-26)

Exact V2-200 `7f2eec4a3fbeaea4b01066ed4eca975ca45a4e69` [run 45792842281](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45792842281) passed both central jobs. HIST-007 scale/resource profile: 12 versions, 8 branches, 80,160 bytes of 262,144, 5,550 ms observed in this CI run; version 13 and branch 9 refused. This is bounded evidence, not a performance SLA; replay remains O(V × version replay).

Do **not** close HIST-008 from the prior denylist: accepting unknown Linux filesystem magic could overstate the supported durability profile. Tighten production admission to Linux plus the actually observed EXT2/3/4 magic `0xef53`; all other filesystem types refuse, with named failures for known NFS/SMB/CIFS/9P/AFS/CODA/CEPH/NCP. Windows and all non-Linux platforms remain refused. Cross-filesystem portability is not claimed. HIST-008 stays active until exact new CI. This intentionally trades portability for a narrower verified contract. Counterexample: an XFS/Btrfs/overlay deployment may have adequate semantics but is refused until separately tested and admitted.

## V2-202 — explicit mapping-review UI candidate (2026-11-26)

Exact V2-201 `bc350f16c546a32f70ffe77652ed5fd5027589e5` [run 45793588254](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45793588254) passed 355/355 knowledge tests plus browser/accessibility. Close HIST-008: production durable history is Linux-only and admits only observed EXT2/3/4 magic `0xef53`; every other filesystem type and non-Linux platform refuses. No cross-filesystem portability claim.

SEM-004 is now active. Browser workspace imports the real `question-mapping-review.js` API. Every compiled mapping alternative is rendered with an explicit unresolved/plausible/excluded judgment, defaults unresolved, and can be exported as a separately pinned review snapshot. Any judgment or question/mapping change invalidates the review export. Review status retains `semanticInterpretation: UNVERIFIED` and `decisionAuthority: NONE`; it never selects a candidate automatically. Browser regression exercises two alternatives, incomplete review, one declared plausible, pinned downloads and invalidation with zero new external contact. SEM-004 and UX-003 remain open until exact new CI. HIST-009 remains unverified physical power-loss evidence; HIST-010/UX-002 remain durable-host browser integration work.

## V2-203 — durable-host browser history candidate (2026-11-26)

Exact V2-202 `d87414e463e396be3672e63f774de77b2ab6136d` [run 45794383708](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45794383708) passed knowledge, full browser journey and accessibility. Close SEM-004 and UX-003: real mapping-review API is exposed in the browser, alternatives default unresolved, explicit judgments produce a pinned replay snapshot, changes invalidate it, and semantic interpretation remains UNVERIFIED with no decision authority.

HIST-010 is active. Extend the real durable adapter with exact portable snapshot initialize/append operations. The standalone browser still has **no filesystem authority**: a host must explicitly inject a versioned capability. Browser-side `history-host.js` independently replays input and returned snapshots; writes use a separately retained expected head; there is no write timeout/retry that could duplicate an ambiguous commit; a successful read never replaces browser history. Exact Chromium test injects a local host backed by the real Linux CAS store, initializes the root, advances the host out-of-band, proves the stale browser CAS fails without retry or local mutation, then verifies the independently retained current head. No network request is used for the host bridge. HIST-010 and UX-002 remain open until exact new CI. Physical power-loss HIST-009 remains unavailable and unclaimed.
