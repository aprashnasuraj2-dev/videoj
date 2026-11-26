# 08. User and interoperability validation

> **RETIRED SUTRA1 EXECUTION QUEUE (2026-11-26).** The user retired all remaining unchecked SUTRA1 tasks. This file now preserves verified/omitted/blocked historical evidence only. Do not resume work from this file; use [`docs/sutra-v2/CHECKLIST.md`](../../sutra-v2/CHECKLIST.md).

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

- [x] `SUTRA-P071-01` Create a consumer page on a separate clean origin
- [x] `SUTRA-P071-02` Load the published network using a compatible generic loader
- [x] `SUTRA-P071-03` Avoid SUTRA-specific imports, private endpoints and hidden state
- [x] `SUTRA-P071-04` Verify exact-name manifest resolution and public artifact requests
- [x] `SUTRA-P071-05` Run the graph with the consumer’s own active router policy
- [x] `SUTRA-P071-06` Check denial and unavailable graph behavior from the consumer
- [x] `SUTRA-P071-07` Document reproduction commands and deployment relationships
- [x] `SUTRA-P071-08` Distinguish a neutral harness from actual third-party adoption
- [x] `SUTRA-P071-09` Produce and review the phase artifact: Independent-consumer harness and reproduction instructions.
- [x] `SUTRA-P071-10` Close phase 071 only after its applicable tasks have evidence and its exit condition is observed: The network loads without SUTRA-only integration code; same-owner test infrastructure is identified as such.

## Phase 072 - Run and report the 40-case evaluation

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 53-56,70. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Execute the frozen corpus tests against the chosen live model. Report citation validity, supported-claim precision, abstention and conflict behavior separately. Preserve failures.
- **Phase exit:** Targets: 100% syntactically valid references, >=95% supported-claim precision and no invented citations on the 20 unsupported/conflict cases.


## Phase 073 - Measure the hero path over 20 live runs

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 25,50,66,72. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Repeat the hero request across fresh sessions. Record success criteria, p50/p95 latency, per-run spend, origin contacts and human action completion.
- **Phase exit:** Target >=19/20 successful journeys and p95 <=25 seconds; sample size and provider conditions remain visible.


## Phase 074 - Run a small real-user pilot

- **Baseline effort:** 3 person-hours; **owner:** P.
- **Original phase dependencies:** 48-50,70. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Recruit 10 consenting target users if available. Ask them to complete the defined learning task without coaching. Use de-identified observations and voluntary feedback.
- **Phase exit:** Target >=8/10 unaided completions; report actual n, recruitment source and assistance rather than assuming representativeness.


## Phase 075 - Compare against a manual baseline

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 74. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Counterbalance manual transcript search and SUTRA task order where feasible. Measure time-to-valid-evidence and errors; do not infer long-term learning from a short session.
- **Phase exit:** Target >=30% median task-time reduction with no evidence-accuracy loss; a worse result triggers workflow revision, not selective exclusion.


## Phase 076 - Run two outside-builder Open Kit trials

- **Baseline effort:** 3 person-hours; **owner:** P+E.
- **Original phase dependencies:** 60,71. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Invite two consenting developers outside the project to install one tool or starter from the public docs. Record time to first success and every intervention. Do not send invitations automatically.
- **Phase exit:** Target two clean runs within 15 minutes each; if only one or zero participate, disclose the actual count and remaining validation gap.


## Phase 077 - Complete the browser and device matrix

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 49,61-69. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Run current Chromium, Firefox and WebKit regressions and an available physical iPhone/Android check. Record versions, media decode, seeking, fullscreen, captions, consent and export behavior.
- **Phase exit:** Core workflow works in supported browsers; emulation is not reported as physical-device evidence.

- [x] `SUTRA-P077-01` Record current Chromium, Firefox and WebKit versions
- [x] `SUTRA-P077-02` Check actual decode, captions, seek and fullscreen behavior
- [x] `SUTRA-P077-03` Check graph execution, consent, card export and error states
- [x] `SUTRA-P077-05` Label emulated, desktop-engine and physical evidence distinctly
- [x] `SUTRA-P077-06` Record unsupported codecs and browser capability limitations
- [x] `SUTRA-P077-07` Link failures to the exact source/media revision
- [x] `SUTRA-P077-08` Publish a matrix with pass, fail and untested entries
- [x] `SUTRA-P077-09` Produce and review the phase artifact: Browser matrix with pass/fail/untested cells.

## Phase 078 - Fix the highest-impact observed failures

- **Baseline effort:** 3 person-hours; **owner:** E.
- **Original phase dependencies:** 72-77. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Prioritize broken evidence, task confusion, peer failures and mobile blockers over cosmetic additions. Update prompts only using development fixtures; preserve the frozen test set.
- **Phase exit:** No blocker affects the filmed or judge workflow; unresolved limits are visible in release notes.

- [x] `SUTRA-P078-01` Rank observed failures by evidence correctness and core task impact
- [x] `SUTRA-P078-03` Use development fixtures rather than tuning on frozen held-out cases
- [x] `SUTRA-P078-04` Record affected files and evidence invalidated by each fix
- [x] `SUTRA-P078-05` Avoid introducing new unrelated features during stabilization
- [x] `SUTRA-P078-06` Preserve benchmark failures and previous results for comparison
- [x] `SUTRA-P078-08` Record remaining issue severity and user-visible effect
- [x] `SUTRA-P078-09` Produce and review the phase artifact: Issue resolutions tied to source revisions.

## Phase 079 - Recheck affected evidence after fixes

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 78. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Run only checks affected by changes plus the critical integrated journey. Re-run the fixed evaluation set if grounding logic changed; update benchmarks only when their implementation changed.
- **Phase exit:** Reported metrics correspond to the candidate revision; earlier numbers are not reused after material changes.

- [x] `SUTRA-P079-01` Identify which checks each stabilization change actually affects
- [x] `SUTRA-P079-02` Re-run grounding evaluation when retrieval or claim validation changes
- [x] `SUTRA-P079-03` Re-run latency/cost measurements only after relevant behavior changes
- [x] `SUTRA-P079-04` Recheck the critical integrated journey after fixes
- [x] `SUTRA-P079-05` Tie updated evidence to the candidate source revision
- [x] `SUTRA-P079-06` Keep old numbers labeled historical instead of reusing them silently
- [x] `SUTRA-P079-07` Avoid broad repeated testing without an unresolved reason

## Phase 080 - Freeze a release candidate

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 71-79. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Tag an immutable candidate, freeze the scope and assemble the actual evidence. Assess each judging criterion without predicting a prize outcome.
- **Phase exit:** Conformance passes; core product and Open Kit links work; remaining issues have honest impact descriptions.

