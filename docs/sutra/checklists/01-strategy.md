# 01. Strategy and competition fit

> **RETIRED SUTRA1 EXECUTION QUEUE (2026-11-26).** The user retired all remaining unchecked SUTRA1 tasks. This file now preserves verified/omitted/blocked historical evidence only. Do not resume work from this file; use [`docs/sutra-v2/CHECKLIST.md`](../../sutra-v2/CHECKLIST.md).

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **23-26 Nov 2026**. This is a target window, not proof of work.

Pass/fail compliance and a narrow, useful product thesis.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 001 - Confirm entry eligibility and ownership

- **Baseline effort:** 1 person-hours; **owner:** P.
- **Original phase dependencies:** None. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Check entrant residence, age, team representation and rights to reuse existing code. Identify the person who will narrate the final video.
- **Phase exit:** Every entrant and reused component has a known eligibility or rights basis; unresolved items are named.


## Phase 002 - Define the single audience and job

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 01. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Choose field technicians learning from short training videos as the initial audience. Use a learning task such as finding the optical-power recording step and comparing it with a written handover checklist.
- **Phase exit:** Task success can be observed without assuming a training benefit or claiming operational certification.

- [x] `SUTRA-P002-01` Name one primary learner role and one real learning task
- [x] `SUTRA-P002-02` Describe the existing manual workflow and its observable pain points
- [x] `SUTRA-P002-03` Specify the input question, permitted corpus and expected learning card
- [x] `SUTRA-P002-04` Write three failure examples, including wrong cue and conflicting checklist
- [x] `SUTRA-P002-05` Define what counts as successful evidence retrieval and user action
- [x] `SUTRA-P002-06` Document what the project will not claim about certification or competence
- [x] `SUTRA-P002-08` Record assumptions about language, device, connectivity and prior experience
- [x] `SUTRA-P002-09` Produce and review the phase artifact: One-page problem brief with one primary task and three failure examples.

## Phase 003 - Pin the challenge and specification baseline

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 01. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Record the submission rules, Profile 0.2 at fd872b9 and Profile 0.3 at a0ceda3. Preserve their substantive comparison and map requirements to evidence. Recheck for organizer changes before release.
- **Phase exit:** Every mandatory requirement has an owner and planned verification; version differences are explicit.

- [x] `SUTRA-P003-01` Retrieve current official rules, requirements, schedule and judging criteria
- [x] `SUTRA-P003-02` Pin the launch-time specification commit and current specification commit
- [x] `SUTRA-P003-03` Diff normative behavior rather than comparing only profile version labels
- [x] `SUTRA-P003-04` List public artifacts, browser execution and privacy obligations individually
- [x] `SUTRA-P003-05` Map each obligation to stable task IDs and intended evidence
- [x] `SUTRA-P003-06` Record source URLs, versions and retrieval time with timezone
- [x] `SUTRA-P003-07` Distinguish mandatory requirements, recommendations, extensions and project choices
- [x] `SUTRA-P003-08` Record a release-time rule recheck task and unresolved interpretation questions
- [x] `SUTRA-P003-09` Produce and review the phase artifact: Versioned requirement matrix with source links and retrieval dates.
- [x] `SUTRA-P003-10` Close phase 003 only after its applicable tasks have evidence and its exit condition is observed: Every mandatory requirement has an owner and planned verification; version differences are explicit.

## Phase 004 - Select SUTRA and reject excess scope

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 02-03. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Commit to evidence-linked video learning plus a portable peer checklist network. Compare a generic assistant, full learning-management platform and a conformance-only tool. Keep one hero workflow.
- **Phase exit:** No accounts, payments, certification, arbitrary web crawling or autonomous external writes enter the minimum release.

- [x] `SUTRA-P004-01` Document why portable guide composition adds value to a video task
- [x] `SUTRA-P004-02` Compare generic chatbot, infrastructure-only inspector and full learning platform
- [x] `SUTRA-P004-03` Select one hero task and explicitly list deferred user journeys
- [x] `SUTRA-P004-04` Separate minimum release scope from removable optional enhancements
- [x] `SUTRA-P004-05` Keep customer records, payments, operational device writes and certificates out of scope
- [x] `SUTRA-P004-06` Specify manual transcript search as the measurable counterexample
- [x] `SUTRA-P004-07` Decide whether optional BYOK fits remaining effort and security capacity
- [x] `SUTRA-P004-08` Record the decision and the evidence that would reverse it
- [x] `SUTRA-P004-09` Produce and review the phase artifact: Product decision note and a must-have / optional / deferred scope list.
- [x] `SUTRA-P004-10` Close phase 004 only after its applicable tasks have evidence and its exit condition is observed: No accounts, payments, certification, arbitrary web crawling or autonomous external writes enter the minimum release.

## Phase 005 - Design the 110-second proof sequence

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 04. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Storyboard question, timestamp evidence, peer permission, local peer execution, confirmed review-card save and one visible refusal. Reserve room for the reusable kit and human explanation.
- **Phase exit:** The complete story fits 110 seconds with a 10-second ceiling margin; no feature relies on a hidden narrator claim.

- [x] `SUTRA-P005-01` Allocate the demonstration timeline to an under-120-second final video
- [x] `SUTRA-P005-02` Storyboard the question, actual timestamp evidence and real media seek
- [x] `SUTRA-P005-03` Storyboard destination consent before any external peer contact
- [x] `SUTRA-P005-04` Show peer-local execution without claiming independently operated infrastructure
- [x] `SUTRA-P005-05` Show source comparison, human review and saved evidence receipt
- [x] `SUTRA-P005-06` Reserve time for a visible denial or bounded-execution failure
- [x] `SUTRA-P005-07` Reserve time to demonstrate public reusable tools and actual results
- [x] `SUTRA-P005-09` Produce and review the phase artifact: Time-coded browser demo outline.

## Phase 006 - Translate the judging rubric into evidence

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 03-05. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Allocate attention equally across technical implementation, design, impact and idea quality. Define product evidence and community-tool evidence for each; treat conformance as a separate prerequisite.
- **Phase exit:** Each criterion links to a planned screen, test or real observation rather than a promotional adjective.

- [x] `SUTRA-P006-01` Create a separate pass/fail conformity gate before scoring quality
- [x] `SUTRA-P006-02` Give equal planning weight to all four published judging criteria
- [x] `SUTRA-P006-03` Assign a visible product artifact to technological implementation
- [x] `SUTRA-P006-04` Assign an end-to-end learner journey to coherent product design
- [x] `SUTRA-P006-05` Assign measured audience outcomes and reusable tools to potential impact
- [x] `SUTRA-P006-06` Explain the idea’s non-obvious mechanism without unsupported uniqueness claims
- [x] `SUTRA-P006-07` Map every advertised achievement to an executable check or observation
- [x] `SUTRA-P006-08` Avoid inventing a numeric organizer scoring scale or probability of winning
- [x] `SUTRA-P006-09` Produce and review the phase artifact: Four-column evidence scorecard and pass/fail checklist.
- [x] `SUTRA-P006-10` Close phase 006 only after its applicable tasks have evidence and its exit condition is observed: Each criterion links to a planned screen, test or real observation rather than a promotional adjective.

## Phase 007 - Establish effort and spend limits

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 04. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Confirm available hours against this plan; reserve 15% for integration failures. Set model, hosting and media budgets, plus a stop rule when funded inference reaches its approved cap.
- **Phase exit:** The calendar has a named daily capacity; model cost assumptions and unknown provider prices are shown separately.

- [x] `SUTRA-P007-01` Sum person-hour estimates and add a named integration contingency
- [x] `SUTRA-P007-03` Separate inference, media, hosting and optional service cost assumptions
- [x] `SUTRA-P007-05` Calculate baseline capacity and sensitivity to doubled token/retry usage
- [x] `SUTRA-P007-06` Name the first optional scope cuts when available hours shrink
- [x] `SUTRA-P007-08` Record missing prices, tester availability and infrastructure access honestly
- [x] `SUTRA-P007-09` Produce and review the phase artifact: Effort baseline, cost worksheet and scope-cut order.

## Phase 008 - Choose deployment origins and isolation

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 04,07. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Plan sutra.aafnaipatro.com for the app and sutra-guide.aafnaipatro.com for the peer. Treat both as proposed same-owner origins. Inspect actual routes before mapping them.
- **Phase exit:** Existing Patro, DHAGO and DETOUR domain mappings are identified; new deployments have separate outputs and rollback targets.

- [x] `SUTRA-P008-01` Inventory existing AafnaiPatro, DHAGO and DETOUR origin mappings
- [x] `SUTRA-P008-02` Propose separate new caller and peer origins without overwriting existing ones
- [x] `SUTRA-P008-03` Check DNS/custom-domain availability and existing route precedence read-only
- [x] `SUTRA-P008-04` Identify inference and media origin ownership and intended browser contacts
- [x] `SUTRA-P008-05` Separate production, preview and rollback targets for both new applications
- [x] `SUTRA-P008-06` Document cookie scope and why subdomain isolation is an origin boundary
- [x] `SUTRA-P008-07` Specify exact public artifact base paths and network identifiers
- [x] `SUTRA-P008-08` Treat same-owner origins as composition evidence rather than independent adoption
- [x] `SUTRA-P008-09` Produce and review the phase artifact: Origin map covering new app, peer, inference and media.
- [x] `SUTRA-P008-10` Close phase 008 only after its applicable tasks have evidence and its exit condition is observed: Existing Patro, DHAGO and DETOUR domain mappings are identified; new deployments have separate outputs and rollback targets.

## Phase 009 - Define the community Open Kit

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 02,06. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Specify a framework-independent evidence schema/validator, a peer-consent inspector and an agentic-site starter. Identify the external builder job, documented interfaces and reusable boundaries.
- **Phase exit:** A third-party builder can test the kit without importing DHAGO, DETOUR, private media, credentials or the learner app.

- [x] `SUTRA-P009-01` Define the evidence validator’s standalone builder job and contract
- [x] `SUTRA-P009-02` Define the consent inspector’s inputs, outputs and denial guarantee
- [x] `SUTRA-P009-03` Define the starter’s minimal publish-and-consume user journey
- [x] `SUTRA-P009-04` Exclude player imports, private corpus, private keys and hidden services
- [x] `SUTRA-P009-05` Choose public source, documentation and example locations for each tool
- [x] `SUTRA-P009-06` Specify required license, attribution and versioning boundaries
- [x] `SUTRA-P009-07` Define a clean-host installation task for outside developers
- [x] `SUTRA-P009-08` Define what would count as actual reuse versus merely downloading files
- [x] `SUTRA-P009-09` Produce and review the phase artifact: Open Kit API brief, intended users and sample adoption task.
- [x] `SUTRA-P009-10` Close phase 009 only after its applicable tasks have evidence and its exit condition is observed: A third-party builder can test the kit without importing DHAGO, DETOUR, private media, credentials or the learner app.

## Phase 010 - Freeze measurable acceptance targets

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 05-09. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Approve the evaluation set, denial tests, 10-person pilot target, 20 live hero runs and two external-builder trial target. Define measurement methods before implementation.
- **Phase exit:** Targets are labeled prospective; failed targets will be reported as results, not silently edited into success.

- [x] `SUTRA-P010-01` Freeze the core hero success criteria before prompt tuning
- [x] `SUTRA-P010-02` Define the 40-case answerable, unsupported and conflict evaluation split
- [x] `SUTRA-P010-03` Define live-run count, success threshold and latency measurement method
- [x] `SUTRA-P010-04` Define pilot recruitment target and unaided task-completion metric
- [x] `SUTRA-P010-05` Define outside-builder setup target and intervention-count recording
- [x] `SUTRA-P010-06` Define security gates and what failures block public release
- [x] `SUTRA-P010-07` Mark every numerical target as prospective, not achieved
- [x] `SUTRA-P010-08` Record baseline revision and a process for documented target changes
- [x] `SUTRA-P010-09` Produce and review the phase artifact: Acceptance baseline and dated milestone gates.
- [x] `SUTRA-P010-10` Close phase 010 only after its applicable tasks have evidence and its exit condition is observed: Targets are labeled prospective; failed targets will be reported as results, not silently edited into success.
