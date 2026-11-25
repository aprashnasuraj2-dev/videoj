# Dependency-aware engineering roadmap — V2-011

This is the active phase index and new engineering-gate register. The original requirement IDs, descriptions, checkboxes and historical evidence remain in [CHECKLIST.md](CHECKLIST.md), [SESSIONS.md](SESSIONS.md) and [progress.json](progress.json); see [roadmap.json](roadmap.json) for structured records and crosswalk. Historical checkboxes are not equivalent to formal verification. New gates close only with their own observed evidence. P0 = blocking safety/correctness; P1 = product/verification; P2 = deferred/conditional. Risk is independent of priority. No percentage-complete metric.

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
- **Acceptance:** At least two fixed provider profiles can coexist; secret values never enter graph, prompt, peer payload, trace, export, URL, telemetry or plaintext browser storage; provider/model choice and per-profile limits require explicit host UI; deterministic no-AI mode remains usable; removal clears the credential handle.
- **Positive tests:** Fake provider profiles, masked onboarding, provider/model switching and independent bounded reservations; no live paid inference.
- **Adversarial tests:** Credential canary, malicious peer/model asks for key, arbitrary endpoint, model-selected provider switch, stale handle, reload/export/log/DOM leakage and cross-profile confusion.
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
