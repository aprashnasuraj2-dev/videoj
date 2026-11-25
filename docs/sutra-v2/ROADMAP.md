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
- **Evidence:** [58a5f96456c4](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45523546697/job/138901145733); [e96734190870](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524456423/job/138904189960); [88ab00000eaf](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524767453/job/138905253653); [45ea97969ff5](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45524868505/job/138905589669). Exact results and failed gate in SESSIONS.md; [1951512e9f9a](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45527040306/job/138912849718). Exact scope and counterexamples in SESSIONS.md.
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
