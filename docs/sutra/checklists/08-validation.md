# 08. User and interoperability validation

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **26-30 Dec 2026**. This is a target window, not proof of work.

Measured task outcomes, honest limitations and independent consumption.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 071 - Test with a neutral consumer harness

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 40,59-60,70. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** From a separate clean origin, consume the published SUTRA network using the compatible generic loader. Avoid app-specific imports and inspect the exact artifacts requested.
- **Phase exit:** The network loads without SUTRA-only integration code; same-owner test infrastructure is identified as such.

- [ ] `SUTRA-P071-01` Create a consumer page on a separate clean origin
- [ ] `SUTRA-P071-02` Load the published network using a compatible generic loader
- [ ] `SUTRA-P071-03` Avoid SUTRA-specific imports, private endpoints and hidden state
- [ ] `SUTRA-P071-04` Verify exact-name manifest resolution and public artifact requests
- [ ] `SUTRA-P071-05` Run the graph with the consumer’s own active router policy
- [ ] `SUTRA-P071-06` Check denial and unavailable graph behavior from the consumer
- [ ] `SUTRA-P071-07` Document reproduction commands and deployment relationships
- [ ] `SUTRA-P071-08` Distinguish a neutral harness from actual third-party adoption
- [ ] `SUTRA-P071-09` Produce and review the phase artifact: Independent-consumer harness and reproduction instructions.
- [ ] `SUTRA-P071-10` Close phase 071 only after its applicable tasks have evidence and its exit condition is observed: The network loads without SUTRA-only integration code; same-owner test infrastructure is identified as such.

## Phase 072 - Run and report the 40-case evaluation

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 53-56,70. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Execute the frozen corpus tests against the chosen live model. Report citation validity, supported-claim precision, abstention and conflict behavior separately. Preserve failures.
- **Phase exit:** Targets: 100% syntactically valid references, >=95% supported-claim precision and no invented citations on the 20 unsupported/conflict cases.

- [ ] `SUTRA-P072-01` Run the frozen 40 cases on the recorded live model version
- [ ] `SUTRA-P072-02` Retain all per-case raw classifications and redacted evidence
- [ ] `SUTRA-P072-03` Calculate citation syntax validity with explicit denominators
- [ ] `SUTRA-P072-04` Have a reviewer assess supported-claim precision against actual source text
- [ ] `SUTRA-P072-05` Score abstention and conflict preservation separately
- [ ] `SUTRA-P072-06` Record every invented or incorrect citation rather than averaging it away
- [ ] `SUTRA-P072-07` Compare actual results with precommitted targets
- [ ] `SUTRA-P072-08` Document small-sample and evaluator limitations
- [ ] `SUTRA-P072-09` Produce and review the phase artifact: Evaluation CSV/JSON and readable results table.
- [ ] `SUTRA-P072-10` Close phase 072 only after its applicable tasks have evidence and its exit condition is observed: Targets: 100% syntactically valid references, >=95% supported-claim precision and no invented citations on the 20 unsupported/conflict cases.

## Phase 073 - Measure the hero path over 20 live runs

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 25,50,66,72. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Repeat the hero request across fresh sessions. Record success criteria, p50/p95 latency, per-run spend, origin contacts and human action completion.
- **Phase exit:** Target >=19/20 successful journeys and p95 <=25 seconds; sample size and provider conditions remain visible.

- [ ] `SUTRA-P073-01` Run the hero task in 20 fresh sessions under stated conditions
- [ ] `SUTRA-P073-02` Define success before collecting the measurements
- [ ] `SUTRA-P073-03` Record p50/p95 latency and the sample percentile method
- [ ] `SUTRA-P073-04` Record run cost, retries and contacted origins
- [ ] `SUTRA-P073-05` Check that user action and evidence validation actually complete
- [ ] `SUTRA-P073-06` Preserve failed runs and classify failure mechanisms
- [ ] `SUTRA-P073-07` Record provider identifier, dates and source revision
- [ ] `SUTRA-P073-08` Report the actual success fraction rather than a reliability guarantee
- [ ] `SUTRA-P073-09` Produce and review the phase artifact: Dated 20-run benchmark with failure reasons.
- [ ] `SUTRA-P073-10` Close phase 073 only after its applicable tasks have evidence and its exit condition is observed: Target >=19/20 successful journeys and p95 <=25 seconds; sample size and provider conditions remain visible.

## Phase 074 - Run a small real-user pilot

- **Baseline effort:** 3 person-hours; **owner:** P.
- **Original phase dependencies:** 48-50,70. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Recruit 10 consenting target users if available. Ask them to complete the defined learning task without coaching. Use de-identified observations and voluntary feedback.
- **Phase exit:** Target >=8/10 unaided completions; report actual n, recruitment source and assistance rather than assuming representativeness.

- [ ] `SUTRA-P074-01` Recruit consenting users matching the chosen technician-learning audience
- [ ] `SUTRA-P074-02` Keep outreach and participation voluntary and user-authorized
- [ ] `SUTRA-P074-03` Use the defined task without coaching or hidden setup
- [ ] `SUTRA-P074-04` Record actual participant count and unaided completion outcome
- [ ] `SUTRA-P074-05` Record assistance, task time and observed misunderstandings
- [ ] `SUTRA-P074-06` De-identify notes and exclude unnecessary personal data
- [ ] `SUTRA-P074-07` Separate convenience-sample feedback from validated market demand
- [ ] `SUTRA-P074-08` Preserve failures and recruitment shortfall if fewer than ten participate
- [ ] `SUTRA-P074-09` Produce and review the phase artifact: Pilot notes, completion rates and usability issues.
- [ ] `SUTRA-P074-10` Close phase 074 only after its applicable tasks have evidence and its exit condition is observed: Target >=8/10 unaided completions; report actual n, recruitment source and assistance rather than assuming representativeness.

## Phase 075 - Compare against a manual baseline

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 74. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Counterbalance manual transcript search and SUTRA task order where feasible. Measure time-to-valid-evidence and errors; do not infer long-term learning from a short session.
- **Phase exit:** Target >=30% median task-time reduction with no evidence-accuracy loss; a worse result triggers workflow revision, not selective exclusion.

- [ ] `SUTRA-P075-01` Define an equivalent manual transcript-search baseline task
- [ ] `SUTRA-P075-02` Counterbalance task order where feasible to reduce learning effects
- [ ] `SUTRA-P075-03` Compare time to valid evidence rather than time to any answer
- [ ] `SUTRA-P075-04` Record errors and evidence accuracy for both workflows
- [ ] `SUTRA-P075-05` Compute paired results and report actual sample size
- [ ] `SUTRA-P075-06` Keep outliers unless a documented exclusion rule applies
- [ ] `SUTRA-P075-07` Explain convenience-sample and same-corpus practice effects
- [ ] `SUTRA-P075-08` If manual search wins, revise scope and disclose the counterevidence
- [ ] `SUTRA-P075-09` Produce and review the phase artifact: Paired task comparison and limitations.
- [ ] `SUTRA-P075-10` Close phase 075 only after its applicable tasks have evidence and its exit condition is observed: Target >=30% median task-time reduction with no evidence-accuracy loss; a worse result triggers workflow revision, not selective exclusion.

## Phase 076 - Run outside-builder evidence/interoperability trials

- **Baseline effort:** 3 person-hours; **owner:** P+E.
- **Priority override:** At least one participant should be another challenge entrant or builder working on an agentic-web site, so the result tests actual cross-project usefulness rather than same-owner adoption.
- **Intent:** Give outside developers only the public evidence-profile quickstart and, once public, the guide network URL. Measure time to first valid annotation/transcript result and whether another entrant can load the network without project coaching.
- **Phase exit:** Target two clean evidence-package runs within 15 minutes each and at least one external entrant/browser load of the public peer; report the actual participant count and every intervention.

- [ ] `SUTRA-P076-01` Seek two consenting developers outside the project through authorized outreach; prioritize at least one challenge entrant
- [ ] `SUTRA-P076-02` Give each only the public evidence-profile quickstart for the first task
- [ ] `SUTRA-P076-03` Record environment, package version and time to first `transcript_verified` result
- [ ] `SUTRA-P076-04` Target first valid evidence result within 15 minutes without cloning the player/learner app
- [ ] `SUTRA-P076-05` After public peer release, have at least one outside entrant load the exact network URL in their own browser/runtime or documented compatible client
- [ ] `SUTRA-P076-06` Log each intervention/blocker and keep participant identities out of public research notes
- [ ] `SUTRA-P076-07` Report zero/one participants honestly if recruitment fails
- [ ] `SUTRA-P076-08` Do not count project-owned origins as independent adoption or outside validation
- [ ] `SUTRA-P076-09` Produce de-identified setup logs, timing, interoperability result and adoption-friction notes
- [ ] `SUTRA-P076-10` Close phase 076 only after the actual outside-run count and entrant-load result are evidenced.

## Phase 077 - Complete the browser and device matrix

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 49,61-69. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Run current Chromium, Firefox and WebKit regressions and an available physical iPhone/Android check. Record versions, media decode, seeking, fullscreen, captions, consent and export behavior.
- **Phase exit:** Core workflow works in supported browsers; emulation is not reported as physical-device evidence.

- [ ] `SUTRA-P077-01` Record current Chromium, Firefox and WebKit versions
- [ ] `SUTRA-P077-02` Check actual decode, captions, seek and fullscreen behavior
- [ ] `SUTRA-P077-03` Check graph execution, consent, card export and error states
- [ ] `SUTRA-P077-04` Use an available physical iPhone/Android device for touch verification
- [ ] `SUTRA-P077-05` Label emulated, desktop-engine and physical evidence distinctly
- [ ] `SUTRA-P077-06` Record unsupported codecs and browser capability limitations
- [ ] `SUTRA-P077-07` Link failures to the exact source/media revision
- [ ] `SUTRA-P077-08` Publish a matrix with pass, fail and untested entries
- [ ] `SUTRA-P077-09` Produce and review the phase artifact: Browser matrix with pass/fail/untested cells.
- [ ] `SUTRA-P077-10` Close phase 077 only after its applicable tasks have evidence and its exit condition is observed: Core workflow works in supported browsers; emulation is not reported as physical-device evidence.

## Phase 078 - Fix the highest-impact observed failures

- **Baseline effort:** 3 person-hours; **owner:** E.
- **Original phase dependencies:** 72-77. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Prioritize broken evidence, task confusion, peer failures and mobile blockers over cosmetic additions. Update prompts only using development fixtures; preserve the frozen test set.
- **Phase exit:** No blocker affects the filmed or judge workflow; unresolved limits are visible in release notes.

- [ ] `SUTRA-P078-01` Rank observed failures by evidence correctness and core task impact
- [ ] `SUTRA-P078-02` Fix consent, source-version and default-inference blockers before polish
- [ ] `SUTRA-P078-03` Use development fixtures rather than tuning on frozen held-out cases
- [ ] `SUTRA-P078-04` Record affected files and evidence invalidated by each fix
- [ ] `SUTRA-P078-05` Avoid introducing new unrelated features during stabilization
- [ ] `SUTRA-P078-06` Preserve benchmark failures and previous results for comparison
- [ ] `SUTRA-P078-07` Check mobile and keyboard blockers observed in the pilot
- [ ] `SUTRA-P078-08` Record remaining issue severity and user-visible effect
- [ ] `SUTRA-P078-09` Produce and review the phase artifact: Issue resolutions tied to source revisions.
- [ ] `SUTRA-P078-10` Close phase 078 only after its applicable tasks have evidence and its exit condition is observed: No blocker affects the filmed or judge workflow; unresolved limits are visible in release notes.

## Phase 079 - Recheck affected evidence after fixes

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 78. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Run only checks affected by changes plus the critical integrated journey. Re-run the fixed evaluation set if grounding logic changed; update benchmarks only when their implementation changed.
- **Phase exit:** Reported metrics correspond to the candidate revision; earlier numbers are not reused after material changes.

- [ ] `SUTRA-P079-01` Identify which checks each stabilization change actually affects
- [ ] `SUTRA-P079-02` Re-run grounding evaluation when retrieval or claim validation changes
- [ ] `SUTRA-P079-03` Re-run latency/cost measurements only after relevant behavior changes
- [ ] `SUTRA-P079-04` Recheck the critical integrated journey after fixes
- [ ] `SUTRA-P079-05` Tie updated evidence to the candidate source revision
- [ ] `SUTRA-P079-06` Keep old numbers labeled historical instead of reusing them silently
- [ ] `SUTRA-P079-07` Avoid broad repeated testing without an unresolved reason
- [ ] `SUTRA-P079-08` Verify reported metrics match the implementation that will ship
- [ ] `SUTRA-P079-09` Produce and review the phase artifact: Final affected-check results and comparison against prior data.
- [ ] `SUTRA-P079-10` Close phase 079 only after its applicable tasks have evidence and its exit condition is observed: Reported metrics correspond to the candidate revision; earlier numbers are not reused after material changes.

## Phase 080 - Freeze a release candidate

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 71-79. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Tag an immutable candidate, freeze the scope and assemble the actual evidence. Assess each judging criterion without predicting a prize outcome.
- **Phase exit:** Conformance passes; core product and Open Kit links work; remaining issues have honest impact descriptions.

- [ ] `SUTRA-P080-01` Freeze the intended release scope and immutable candidate revision
- [ ] `SUTRA-P080-02` Confirm conformance gates and the funded judge path
- [ ] `SUTRA-P080-03` Assemble the actual product, browser and evaluation evidence
- [ ] `SUTRA-P080-04` Verify reusable tool candidate links and clean-host examples
- [ ] `SUTRA-P080-05` Record each unresolved issue with practical effect
- [ ] `SUTRA-P080-06` Assess all four judging criteria using observed work only
- [ ] `SUTRA-P080-07` Separate prospective impact from measured small-sample results
- [ ] `SUTRA-P080-08` Prevent new optional features from delaying the stable candidate
- [ ] `SUTRA-P080-09` Produce and review the phase artifact: Milestone E release candidate and factual evidence index.
- [ ] `SUTRA-P080-10` Close phase 080 only after its applicable tasks have evidence and its exit condition is observed: Conformance passes; core product and Open Kit links work; remaining issues have honest impact descriptions.
