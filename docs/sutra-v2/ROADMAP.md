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
