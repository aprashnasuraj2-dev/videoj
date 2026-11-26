# SUTRA V2 — active remaining-work checklist

> **SOLE ACTIVE EXECUTION CHECKLIST — 2026-11-26.** By user direction, the 379 remaining SUTRA1 pending tasks are retired and removed from the active legacy checklist. Git history and verified V1 evidence remain available for reuse, but **V1 pending IDs must never be selected as work**. “Continue with SUTRA” means reconcile the current remote V2 state and then execute the next dependency-ready unchecked item in this file.

[Binding mandate](LIVING-KNOWLEDGE.md) · [Continuation contract](CONTINUE.md) · [Roadmap](ROADMAP.md) · [Parallel workstreams](PARALLEL-WORKSTREAMS.md) · [Machine state](progress.json)

## State contract

- `[ ]` remaining engineering or verification work.
- `[~]` the single active task when a checkpoint explicitly marks it active.
- `[!]` genuine external/user-owned blocker; do not fabricate completion.
- `[x]` may be used only after the exact acceptance below has current passing evidence.
- This is a **remaining-work-only** checklist. Completed historical subcomponents are described as context but are not repeated as `[x]` items.
- Child-branch CI is scoped evidence, not integrated system evidence.
- Older green revisions do not transfer to newer heads.
- No percentage-complete metric. Close broad gates only on their stated acceptance.

## Current live branch baseline to reconcile

| PR | Workstream | Observed exact head at V2-197 reconciliation | Current evidence boundary |
| --- | --- | --- | --- |
| #50 | central V2 | `e42b6d1c80dd06dc1075ce1b9d99bbfc26be7e70` | [exact central knowledge and browser CI; 7/7 queue audit](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45787710589) |
| #51 | model orchestration | `aca5e8b60c8ce67f09c72cb4722a05c8810634da` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45757418475) |
| #52 | persistent knowledge | `61714c3c095ad254486b250c80cc84b0481dfdd2` | [423/423 scoped JS passed; atomic correction/withdrawal, prior-state refusal and restored replay](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788072332/job/139799827662) |
| #53 | semantic compilation | `0065b48dc5181f549845303d1569b88d94bc2ddf` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45758784104) |
| #54 | evidence acquisition | `2336566c64c4ce461042bec8b34c01c22356aba3` | [407+5+2 tests passed, authenticated separate-process receipt and acquisition path](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45779263957/job/139770463685) |
| #55 | independent verification | `1a429e24a4fca63affccedf138150480b3ee87c2` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45764898229) |
| #56 | counterfactuals | `4620bf709d9749c311f6726e6d2e2bdf04a383b4` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759676416) |
| #57 | security/recovery | `46055f4f75cf79370ae5e423d1fc99f53b17421e` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45753193964) |
| #58 | unified workspace | `ba24ce6fbda97b76a85bce929659fb0f278d1f13` | [exact accessibility and browser passed](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45786416592/job/139794191354); parallel passed; publisher setup failure retained; exact retry passed |
| #59 | specialist domains | `35a1e273fd10335ed70c7499d00d2cf3dfd03e01` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759708514) |
| #60 | benchmark | `b981d5b9e049fa62445c60c34ce8375b38933b89` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45759752586) |
| #61 | validation-only combined tree | `8d12e8e15ff54c42910948a6a691eb41d631be15` | pins central `e42b6d1c80dd06dc1075ce1b9d99bbfc26be7e70` and ten exact children; [combined CI running](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788350009); [parallel passed](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45788349987), prior exact `ca2fa3516b6dcfc69b94e4180c28b411a7548cc9` canonical CI passed; **DO NOT MERGE** |

If any head changes, reconcile the affected delta before claiming work against it. V2-197 comparison at observed central `e42b6d1c80dd06dc1075ce1b9d99bbfc26be7e70`: all ten children 39 commits behind (ahead counts #51–#60: 5, 11, 7, 6, 4, 6, 5, 13, 6, 5). The current validation-only tree pins that source, not this later bookkeeping checkpoint. Subsequent changes require exact reconciliation; see session evidence.

---

# A. Immediate repository and CI reconciliation

These items are first in the execution queue because later integrated claims depend on them.

- [x] `V2-N001` Reconcile PR #52 exact head CI. Re-run or otherwise obtain completed exact-head scoped evidence for the external history-witness implementation; inspect cancelled job cause before rerun and retain failure/cancellation history.
- [x] `V2-N002` Reconcile PR #54 exact head CI for authenticated observation acquisition; confirm the separate-process Ed25519 receipt path completes on the exact current head.
- [x] `V2-N003` Complete PR #58 newest browser/accessibility evidence: 320px keyboard journey, accessible names, focus treatment, reflow/200% proxy, reduced motion, no storage and no external contact.
- [x] `V2-N004` Complete PR #61 exact combined validation on the current 82-path manifest: combined knowledge regression, parallel regression and workspace browser/accessibility must all finish successfully or produce retained failures.
- [~] `V2-N005` Confirm #61 browser success and all child-specific workflows belong to the exact current manifest; do not inherit older #61 green revisions.
- [x] `V2-N006` Reconcile all ten child heads against the current central V2 head and document base drift; do not treat the eight central coordination commits as automatically present in children.
- [x] `V2-N007` Normalize `progress.json`, `roadmap.json`, Markdown roadmap/checklist and parallel registry so one current V2 checkpoint supersedes stale top-level V2-179/V2-182 cursors without erasing historical entries.
- [x] `V2-N008` Make all machine/readable queues reference this remaining-work checklist and remove any automatic fallback to SUTRA1 pending IDs.
- [x] `V2-N009` Reconcile broad Living Knowledge gate wording against scoped machine statuses so unit/scoped evidence cannot be mistaken for full gate closure.
- [x] `V2-N010` Preserve #61 as validation-only and explicitly prevent it from becoming the integration merge vehicle.
- [x] `V2-N011` Produce a reviewed integration plan for moving compatible child work into the central V2 line without losing branch-specific evidence or known failures.
- [x] `V2-N012` Run the applicable central exact CI after register/checklist reconciliation and record the new immutable checkpoint separately from the tested child SHAs.

**Exit:** current heads, CI state, registers and next cursor agree; no stale V1 or old V2 queue can become active.

---

# B. Parallel workstream remaining tasks

## B1. PR #51 — model-independent orchestration

Existing base: provider substitution, opposite-output preservation, one-shot route approval, pre-dispatch revalidation, browser operator console and ephemeral synthetic credential lifecycle.

- [ ] `V2-ORCH-001` Integrate operator approval with the common V2 consent/disclosure boundary rather than maintaining an isolated approval path.
- [ ] `V2-ORCH-002` Define and verify capability negotiation for heterogeneous OpenAI-compatible, local/BYOM and future adapter profiles without vendor-specific agent roles.
- [ ] `V2-ORCH-003` Implement global, per-provider, per-investigation and per-call concurrency/budget accounting with conservative unknown-charge handling.
- [ ] `V2-ORCH-004` Implement bounded cancellation semantics and distinguish local cancellation, provider completion and possible billing.
- [ ] `V2-ORCH-005` Verify route replacement ceremony invalidates stale approvals/disclosures while preserving prior pinned investigation evidence.
- [ ] `V2-ORCH-006` Add provider-result provenance sufficient to prove model replacement never rewrites already-pinned historical evidence.
- [ ] `V2-ORCH-007` With explicit user authorization only, execute heterogeneous real-provider interoperability and record exact model identity, latency, tokens and cost.
- [ ] `V2-ORCH-008` Demonstrate deterministic/manual/offline investigation remains useful when all model routes are unavailable.

**External boundary:** real credentials, paid inference and spend require explicit authorization; synthetic adapters cannot close `V2-ORCH-007`.

## B2. PR #52 — persistent knowledge and revision

Existing base: immutable snapshots, local CAS, fsync/atomic publication, subprocess concurrency, real SIGKILL tests, kernel flock profile and challenge-bound signed freshness witness candidate.

- [x] `V2-HIST-001` Finish exact-head witness CI and retain cancellation/failure evidence.
- [ ] `V2-HIST-002` Connect the durable history store to the full typed V2 knowledge graph, not only the narrow existing snapshot profile.
- [ ] `V2-HIST-003` Verify simultaneous correction and withdrawal with shared descendants; incremental invalidation must equal full replay.
- [ ] `V2-HIST-004` Verify branch/fork/restore/diff histories across multiple generations while preserving conflicting empirical claims.
- [ ] `V2-HIST-005` Establish an externally retained monotonic witness workflow and bounded lost-response recovery without blind replay.
- [ ] `V2-HIST-006` Test coordinated rollback scenarios: local store rollback, witness rollback and stale retained-view combinations.
- [ ] `V2-HIST-007` Run large-history scale/resource tests and record asymptotic/observed limits.
- [ ] `V2-HIST-008` Decide and document supported filesystem/OS profiles; test cross-filesystem portability where claimed and explicitly refuse unsupported NFS/Windows behavior if not verified.
- [ ] `V2-HIST-009` Perform physical/hardware power-loss durability evidence when available; do not substitute SIGKILL for power loss.
- [ ] `V2-HIST-010` Integrate durable history into the unified browser workspace with stale-CAS and recovery UX.

## B3. PR #53 — semantic compilation and intent

Existing base: explicit competing mappings, exclusion/unresolved states, review revision audit, independent Python reconstruction and deterministic FinQA gold-program execution profile.

- [ ] `V2-SEM-001` Implement bounded natural-language-to-meaning/program induction; executing supplied gold programs is not sufficient.
- [ ] `V2-SEM-002` Expand ambiguity coverage for signed/relative change, denominator, timeframe, population, negation, quantifier, modality, units and causal wording.
- [ ] `V2-SEM-003` Complete the versioned intent IR with original question, candidate meanings and separate source/extraction/entity/scope/relationship/method/computation/empirical/applicability obligations.
- [ ] `V2-SEM-004` Integrate explicit competing interpretations and unresolved branches into the browser review UI.
- [ ] `V2-SEM-005` Implement controlled-language round trip and detect scope/definition/negation/denominator/invented-relation drift.
- [ ] `V2-SEM-006` Provide structured table, template/rule, user-expression, document and optional model-proposal pathways that produce the same reviewed contract where semantically equivalent.
- [ ] `V2-SEM-007` Implement consequential clarification selection: ask only distinctions capable of changing material downstream results.
- [ ] `V2-SEM-008` Build independently annotated ambiguity cases; same-project Python replay is not human annotation.
- [ ] `V2-SEM-009` Measure review burden, unresolved rate and residual semantic error without converting lexical/model confidence into truth probability.

## B4. PR #54 — evidence acquisition and source economics

Existing base: acquisition path replay, source-bound receipts and challenged Ed25519 observation receipts from a separate signer process.

- [x] `V2-ACQ-001` Finish exact-head authenticated acquisition CI.
- [ ] `V2-ACQ-002` Separate source authentication, measurement calibration, applicability and real-world truth in the receipt model.
- [ ] `V2-ACQ-003` Model correlated/noisy observations without inventing independence or probabilities.
- [ ] `V2-ACQ-004` Support failed/unknown observations and bounded retry/replanning without converting failure into evidence.
- [ ] `V2-ACQ-005` Support one-time shared acquisition costs and marginal field-read costs across candidate investigations.
- [ ] `V2-ACQ-006` Add uncertain cost bounds and explicit privacy/disclosure exposure dimensions.
- [ ] `V2-ACQ-007` Compare minimax/regret/justified VOI strategies under declared assumptions; do not claim global optimality outside bounded cases.
- [ ] `V2-ACQ-008` Integrate actual consent before any external observation/source contact.
- [ ] `V2-ACQ-009` Add source ancestry/independence representation so repeated URLs or signer identity do not imply independent evidence.
- [ ] `V2-ACQ-010` Integrate acquisition planning and result admission into the unified workspace.
- [ ] `V2-ACQ-011` Add independent oracle/replay coverage for multi-action noisy/shared-cost cases.


## B5. PR #55 — independent verification and replay

Existing base: independent rational/topology/stale-revision replay and broadened interval differential regression.

- [ ] `V2-VER-001` Extend independent interval verification across the supported expression/profile surface and document unsupported operations.
- [ ] `V2-VER-002` Add independent statistical-profile verification for supported binomial/hypergeometric or later profiles.
- [ ] `V2-VER-003` Add independent semantic-record verification that checks structure/pins without pretending to certify meaning.
- [ ] `V2-VER-004` Add domain-specific independent reference implementations for at least two complete specialist journeys.
- [ ] `V2-VER-005` Publish clean build/replay instructions and verify them outside the primary JS implementation path.
- [ ] `V2-VER-006` Expand mutation corpus for stale pins, forged receipts, cycles, duplicate identities, semantic-envelope tampering and unsupported profiles.
- [ ] `V2-VER-007` Record CPU/memory/input-size bounds for independent verification and refuse oversized artifacts deterministically.

## B6. PR #56 — counterfactuals and adversarial challenge

Existing base: normalized-domain expansion and resumable streaming counterfactual search over very large declared finite domains.

- [ ] `V2-CF-001` Wire counterfactual challenge into the unified investigation workspace.
- [ ] `V2-CF-002` Create practical review UI for found witnesses, searched coverage and unresolved search.
- [ ] `V2-CF-003` Preserve everywhere the distinction between “no witness yet” and “no witness in the fully exhausted declared domain”.
- [ ] `V2-CF-004` Expand material perturbations across year/sign/denominator/population/aggregation/units/causal assumptions.
- [ ] `V2-CF-005` Support multi-axis ambiguity while keeping bounded evaluation and explicit truncation.
- [ ] `V2-CF-006` Measure runtime/memory scaling by evaluated worlds and candidate count.
- [ ] `V2-CF-007` Measure whether counterfactual probes reduce human review effort/error on frozen cases.
- [ ] `V2-CF-008` Connect counterfactual evidence to ambiguity review and benchmark artifacts without automatic semantic adoption.

## B7. PR #57 — security, privacy and recovery

Existing base: decoded exact-credential scanning, credential-set generation fences and downstream publication refusal.

- [ ] `V2-SEC-001` Integrate credential generation/lifetime with #51 operator approval and common consent.
- [ ] `V2-SEC-002` Define post-publication credential lifecycle and what can/cannot be revoked after a result is already published.
- [ ] `V2-SEC-003` Verify transport isolation across provider, peer, evidence and local-witness paths.
- [ ] `V2-SEC-004` Verify peer-to-peer/private-context isolation and prevent authority transfer through untrusted peer content.
- [ ] `V2-SEC-005` Add cross-user/session isolation tests for storage, receipts, credentials, approvals and cached investigations.
- [ ] `V2-SEC-006` Expand secret adversaries beyond exact canaries: split/encoded/alternative representations where technically supportable; explicitly document residual non-DLP scope.
- [ ] `V2-SEC-007` Run integrated prompt/document injection and poisoned-reference tests through the real workspace.
- [ ] `V2-SEC-008` Enforce disclosure budgets consistently across model, peer and acquisition flows.
- [ ] `V2-SEC-009` Verify coordinated rollback/recovery/refinement does not restore revoked authority.
- [ ] `V2-SEC-010` Define secure deletion/lifetime guarantees for browser and host credential material without claiming impossible remote deletion.
- [ ] `V2-SEC-011` Run final combined trust-boundary regression over the integrated product.

## B8. PR #58 — unified investigation workspace

Existing base: portable draft/history/baseline checkpoint, stale-safe restore, independent replay of actual browser export and automated keyboard/reflow/reduced-motion candidate.

- [ ] `V2-UX-001` Finish newest exact browser/accessibility CI.
- [ ] `V2-UX-002` Integrate #52 durable history into the workspace using its real APIs.
- [ ] `V2-UX-003` Integrate #53 mapping/semantic review into the workspace using its real APIs.
- [ ] `V2-UX-004` Integrate #56 counterfactual challenge and coverage state.
- [ ] `V2-UX-005` Integrate #54 acquisition planning/receipt admission under explicit consent.
- [ ] `V2-UX-006` Integrate #51 provider/operator approval without making model use mandatory.
- [ ] `V2-UX-007` Complete one coherent flow: question → evidence → interpretations → review → investigation → conclusion → challenge → revision → impact → export.
- [ ] `V2-UX-008` Implement cancellation/error/recovery UX that distinguishes refused, failed, unknown and recoverable states.
- [ ] `V2-UX-009` Support larger bounded portable investigations with deterministic refusal when size limits are exceeded.
- [ ] `V2-UX-010` Make the manual/offline/no-model path a first-class complete journey.
- [ ] `V2-UX-011` Conduct human usability and human screen-reader/AT acceptance when consenting reviewers are available.
- [ ] `V2-UX-012` Conduct actual mobile/physical-device acceptance; automated 320px Chromium does not satisfy this.

## B9. PR #59 — specialist domain journeys

Existing base: finance/engineering revision journeys and pinned SEC/FHWA fact-card calculations with independent arithmetic replay.

- [ ] `V2-DOM-001` Upgrade from compact derived fact cards to full-document provenance or an explicitly bounded source-extract contract.
- [ ] `V2-DOM-002` Add qualified source review for freshness, applicability, extraction and methodology.
- [ ] `V2-DOM-003` Run multi-document finance investigation with corrections/conflicts and no investment recommendation.
- [ ] `V2-DOM-004` Run multi-document engineering investigation with measurement conditions and no engineering certification.
- [ ] `V2-DOM-005` Add statistical/measurement assumptions where those domains require them rather than treating deterministic arithmetic as empirical validity.
- [ ] `V2-DOM-006` Complete two genuinely end-to-end specialist journeys on the same unified workspace architecture.
- [ ] `V2-DOM-007` Add research/student/general investigation journeys after the two complete narrow domains.
- [ ] `V2-DOM-008` Add a medical-research journey that explicitly excludes clinical treatment authority.
- [ ] `V2-DOM-009` Conduct independent specialist/human evaluation when qualified reviewers are available.

## B10. PR #60 — benchmark and prior art

Existing base: frozen 40-case FinQA held-out **gold-program execution** benchmark with seven offline arms and independent scorer. This is not natural-language program induction.

- [ ] `V2-BENCH-001` Build end-to-end natural-language reasoning evaluation where the system must derive/review the executable interpretation rather than receive the gold program.
- [ ] `V2-BENCH-002` Freeze independently annotated real/public/expert cases separately from synthetic development cases.
- [ ] `V2-BENCH-003` Complete 40 semantic cases.
- [ ] `V2-BENCH-004` Complete 40 assumption/counterfactual cases.
- [ ] `V2-BENCH-005` Complete 40 revision cases.
- [ ] `V2-BENCH-006` Complete 30 structural-ancestry cases.
- [ ] `V2-BENCH-007` Complete 30 acquisition cases.
- [ ] `V2-BENCH-008` Complete 20 replay/tamper cases.
- [ ] `V2-BENCH-009` Keep synthetic/public/expert/held-out splits independently pinned and leakage-audited.
- [ ] `V2-BENCH-010` Run matched actual LLM baseline under the same declared resources when authorized.
- [ ] `V2-BENCH-011` Run matched tools, solver, debate and domain-software baselines where meaningful.
- [ ] `V2-BENCH-012` Run matched SUTRA full and offline/no-model ablations.
- [ ] `V2-BENCH-013` Record actual tokens, latency, cost, coverage, correctness, unsupported-decisive rate and failure IDs.
- [ ] `V2-BENCH-014` Measure review effort/time, revision latency, reproducibility and security outcomes.
- [ ] `V2-BENCH-015` Report intervals and paired errors; explicitly preserve counterexamples where a simpler baseline ties or wins.
- [ ] `V2-BENCH-016` Complete prior-art comparison across semantic parsing/synthesis, belief revision/TMS, provenance, argumentation, incremental computation, decision theory, causal/statistical methods and robust optimization before novelty/superiority claims.

---

# C. Living Knowledge broad gate closures

These are **exit gates**, not substitutes for the detailed tasks above. Mark them complete only when their full acceptance is met.

- [ ] `V2-LK01-SEMANTIC-TRIAGE` Multiple reviewed interpretations preserve divergence/agreement/refusal/unresolved states without voting or semantic approval.
- [ ] `V2-LK02-INTENT-IR` Full versioned intent representation preserves source-bound facets/unknowns and passes omission/negation/scope adversaries.
- [ ] `V2-LK03-PATHWAYS` Structured, manual, document and optional model pathways converge on the same admissible contract with explicit consent/cost/review.
- [ ] `V2-LK04-ROUNDTRIP` Controlled-language reconstruction detects changed scope, definition, negation, denominator and invented relations.
- [ ] `V2-LK05-SEMANTIC-COUNTERFACTUAL` Material perturbations expose accidental agreement across required ambiguity families.
- [ ] `V2-LK06-SEMANTIC-WORLDS` Bounded semantic/empirical worlds match brute force on small cases and expose truncation/completeness honestly.
- [ ] `V2-LK07-AMBIGUITY-REVIEW` Only consequential clarifications are asked and review time/residual error are measured.
- [ ] `V2-LK08-KNOWLEDGE-GRAPH` Versioned claims/evidence/assumptions/hypotheses/definitions/observations/derived values/contradictions/questions/decisions/plans/proofs have typed provenance and cycle-safe executable edges.
- [ ] `V2-LK09-REVISION` Incremental correction/withdrawal equals full recompute under shared descendants, concurrency, stale cache and interrupted writes.
- [ ] `V2-LK10-VERSION-CONTROL` Branch/diff/restore/merge preserves conflicting empirical claims and exact history.
- [ ] `V2-LK11-IMPACT-REPORT` Two independent domains produce replayable change-impact reports with old snapshots retained.
- [ ] `V2-LK12-ACQUISITION` Noisy/failed observations, shared/uncertain costs and decision value are handled under explicit assumptions.
- [ ] `V2-LK13-STRUCTURAL-WEAKNESS` Shared ancestry/exposure/cuts work across domains and unknown ancestry remains unknown.
- [ ] `V2-LK14-STATISTICAL-PROFILES` Supported interval/statistical profiles have independent numerical checks plus explicit design/bias/missingness/multiple-testing/power/causal obligations.
- [ ] `V2-LK15-UNIFIED-WORKSPACE` Complete browser journey has persistence, recovery, accessibility, mobile readiness and a no-model path.
- [ ] `V2-LK16-SPECIALIST-JOURNEYS` At least two complete realistic specialist domains run on the same architecture and receive appropriate user/specialist evaluation.
- [ ] `V2-LK17-BENCHMARK` Full staged 200-case comparative evaluation reports coverage and accuracy plus cost/effort/revision/replay/security/ablations/intervals.
- [ ] `V2-LK18-PRIOR-ART` Evidence-based prior-art register clearly separates known algorithms, SUTRA implementation/integration and any defensible novelty.
- [ ] `V2-LK19-TRUST-BOUNDARY` Integrated injection, poison, Unicode, overflow, exhaustion, stale/replay/credential, disclosure and cross-user adversaries pass without automatic external action.
- [ ] `V2-LK20-REPOSITORY-ISOLATION` Active repository/contributor entry points are SUTRA-only with clean SUTRA builds, legacy compatibility evidence and no unintended live-route cutover.
- [ ] `V2-LK21-FOUNDATION-QUEUE` All still-applicable V2 foundation obligations below are completed, explicitly deferred with rationale, or externally blocked.

---

# D. Remaining foundation/research phases

The two strong scoped foundation results `V2-P05-STORE` and `V2-P06-MODEL` are historical completed foundations and are not repeated here. The following remain open in whole or in part.

- [ ] `V2-P00-REPRO` Reproducible clean builds, locked toolchain identities and documented hash differences.
- [ ] `V2-P00-EVIDENCE` Machine validator ensures promoted evidence is exact-source/job/artifact bound and failure history is append-only.
- [ ] `V2-P01-THREAT` Complete principals/trust-boundary/capability/threat-to-test map for the integrated V2 product.
- [ ] `V2-P02-RUNTIME` Verify host-owned closed admission, origin/nesting/cancellation and hard run budgets end-to-end.
- [ ] `V2-P03-TAINT` Preserve typed untrusted provenance and prevent untrusted text/data from becoming authority.
- [ ] `V2-P04-CONSENT` Bind exact operation/destination/lifetime/disclosure to revocable approval.
- [ ] `V2-P05-RECOVERY` Complete durable recovery with unknown outcomes and bounded contacts.
- [ ] `V2-P05-ROLLBACK` Complete rollback/equivocation protection relative to independently retained state.
- [ ] `V2-P06-REFINE` Complete verified refinement between implementation traces and bounded formal model.
- [ ] `V2-P07-WASM` Verify exact WASM build/resource profile and independent execution boundary.
- [ ] `V2-P08-CAUSAL` Add explicitly scoped causal assumptions/profiles without turning deterministic proof into causal validity.
- [ ] `V2-P09-IR` Complete stable intermediate representation across supported semantic and execution pathways.
- [ ] `V2-P10-LEAN` Complete only the machine-checked proofs that materially reduce product risk; record scope and assumptions.
- [ ] `V2-P11-UNCERTAINTY` Complete supported uncertainty/statistical semantics and independent parity.
- [ ] `V2-P12-ECON` Complete source/decision economics beyond synthetic fixed costs.
- [ ] `V2-P13-INTEROP` Verify independent peer/publisher interoperability under current V2 contracts.
- [ ] `V2-P14-BUDGET` Complete provider/global budget accounting including unknown charges and concurrent calls.
- [ ] `V2-P14-BYOK-UX` Complete safe operator BYOM/BYOK UX after taint/consent/budget gates; real use requires explicit authorization.
- [ ] `V2-P16-LEARN` Adapt inherited learner/evidence capabilities to the living-investigation product where still useful.
- [ ] `V2-P17-OBSERVE` Complete authentic observatory/evidence capture without confusing observation with authority.
- [ ] `V2-P18-KIT` Publish/verify V2 independent-consumer/Open-Kit contract only after the integrated contract stabilizes.
- [ ] `V2-P19-PERF` Measure integrated performance, scaling and resource ceilings rather than component microbenchmarks only.
- [ ] `V2-P20-BENCH` Complete end-to-end comparative benchmark gate.
- [ ] `V2-P21-RESEARCH` Complete prior-art and research-limit evidence needed for defensible claims.
- [ ] `V2-P15-SUPERVISE` Reopen only if product need justifies supervised/long-running behavior; otherwise keep explicitly deferred.
- [ ] `V2-P22-RELEASE` Keep deferred until product/security/evaluation/human/external gates and explicit release authorization are satisfied.

## Cross-register foundation obligations

- [ ] `V2-D24-DISCLOSURE-FRONTIER` Finish exact browser/independent verification of exposure-constrained acquisition and preserve “budget infeasible” versus “insufficient information”.
- [ ] `V2-RUNTIME-02` Reconcile remaining runtime recovery/idempotency obligations into the V2 foundation gates.
- [ ] `V2-RUNTIME-03` Reconcile remaining runtime consent/action-authority obligations into the integrated contract.
- [ ] `V2-F11b` Resolve remaining portable/external witness obligation or explicitly supersede it with a stronger current V2 mechanism and evidence.
- [ ] `V2-F12d` Resolve remaining WASM/formal integration obligation or explicitly supersede it with current bounded verification evidence.

---

## D1. Standalone optional web access (after foundation; no core gate dependency)

Web access is a standalone optional future capability, disabled and unregistered by default. No dependency from the core reasoning, evidence acquisition, knowledge compiler, investigation workspace or execution pipeline; no existing completion gate depends on it. Reuse security primitives in one direction only. Future integration requires a separate architectural decision. No live providers, paid calls or external deployment without explicit authorization. See [WEB-ACCESS.md](WEB-ACCESS.md). Priorities are local to this module.

- [ ] `V2-WEB-001` **P0** — Build isolated disabled-by-default credentialless HTTPS admission and bounded transport: exact disclosure authorization, DNS/IP pinning, per-hop re-admission, robots policy, cancellation, byte/contact/deadline budgets and deterministic refusal/no-contact fixtures.
- [ ] `V2-WEB-002` **P1** — Implement standalone bounded web_search/web_read with configured provider routing, accurate intent/status, deterministic ranking, inert extraction and typed untrusted snapshots with raw/extracted digests.
- [ ] `V2-WEB-003` **P1** — Verify standalone interface and compatibility: explicit construction, disabled/unregistered defaults, no reverse dependencies or changes to core behavior; existing security primitive consumers retain their contracts.
- [ ] `V2-WEB-004` **P1** — Verify isolated security, correctness and regression at exact revision with hostile deterministic fixtures, cancellation, resource/concurrency limits, offline snapshot integrity and foundation non-regression; no live provider claim.

# E. External/user-owned blockers — never simulate

- [!] `V2-EXT-001` Consenting human reviewers for usability/semantic-review evidence.
- [!] `V2-EXT-002` Actual physical mobile devices and human screen-reader/assistive-technology acceptance.
- [!] `V2-EXT-003` Operator-authorized real provider credentials/model choice and explicit spend ceiling for live interoperability/benchmarking.
- [!] `V2-EXT-004` Independently operated public HTTPS peer/publisher where required by interoperability acceptance.
- [!] `V2-EXT-005` Rights/factual/source-owner approval for any material that requires it.
- [!] `V2-EXT-006` Public deployment, DNS/domain, release/promotion or submission authorization.

External blockers do **not** stop independent engineering that does not depend on them.

---

# F. Default execution order for “continue with SUTRA”

Unless exact remote reconciliation shows a dependency change, execute in this order:

1. `V2-N001` #52 exact CI.
2. `V2-N002` #54 exact CI.
3. `V2-N003` #58 browser/accessibility CI.
4. `V2-N004` #61 current combined validation.
5. `V2-N005` confirm manifest-bound evidence; `V2-N006`–`V2-N012` normalize branches/registers and prepare reviewed integration.
6. Integrate `#52 history + #53 semantic review → #58 workspace`.
7. Integrate #57 trust boundaries and #51 operator/model approval around that path.
8. Integrate #56 counterfactual challenge and #54 acquisition into the same investigation.
9. Expand #55 statistical/semantic independent verification.
10. Exercise #59 complete specialist journeys.
11. Advance #60 to end-to-end natural-language and full staged benchmarking.
12. Close the 21 Living Knowledge gates and remaining foundations only when their acceptance is genuinely satisfied.
13. Develop WEB-001–004 independently when higher-priority foundation work permits; never make web access a foundation gate.

Do not choose a former SUTRA1 pending task merely because it once had a lower numeric phase or appeared in an old `next_task` queue.

---

# G. Checkpoint rule

For every material task:

**inspect → implement → adversarially challenge → verify exact source → update this checklist + machine registers + session/decision evidence → commit → re-read remote → continue**

A continuation session should keep executing dependency-ready items while safe and authorized work remains. Stop dependent work only for a genuine external/user-owned input, safety issue or explicit user instruction.
