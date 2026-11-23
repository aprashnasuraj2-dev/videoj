# 01. Strategy and competition fit

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

- [ ] `SUTRA-P001-01` Record entrant country/residence and legal-age eligibility privately, without publishing identity documents
- [ ] `SUTRA-P001-02` Confirm individual/team representation and name the actual human narrator
- [ ] `SUTRA-P001-03` Identify all pre-existing components and the competition-period contribution boundary
- [ ] `SUTRA-P001-04` Review ownership of DHAGO imports and original/new training material
- [ ] `SUTRA-P001-05` List employer/third-party assets requiring permission before public inclusion
- [ ] `SUTRA-P001-06` Record applicable competition exclusions and unresolved questions with official sources
- [ ] `SUTRA-P001-07` Keep eligibility uncertainties separate from engineering work that can proceed
- [ ] `SUTRA-P001-08` Log only eligibility outcome and blockers publicly, with no private documents
- [ ] `SUTRA-P001-09` Produce and review the phase artifact: Private eligibility checklist; public ownership/attribution notes.
- [ ] `SUTRA-P001-10` Close phase 001 only after its applicable tasks have evidence and its exit condition is observed: Every entrant and reused component has a known eligibility or rights basis; unresolved items are named.

## Phase 002 - Define the single audience and job

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 01. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Choose field technicians learning from short training videos as the initial audience. Use a learning task such as finding the optical-power recording step and comparing it with a written handover checklist.
- **Phase exit:** Task success can be observed without assuming a training benefit or claiming operational certification.

- [ ] `SUTRA-P002-01` Name one primary learner role and one real learning task
- [ ] `SUTRA-P002-02` Describe the existing manual workflow and its observable pain points
- [ ] `SUTRA-P002-03` Specify the input question, permitted corpus and expected learning card
- [ ] `SUTRA-P002-04` Write three failure examples, including wrong cue and conflicting checklist
- [ ] `SUTRA-P002-05` Define what counts as successful evidence retrieval and user action
- [ ] `SUTRA-P002-06` Document what the project will not claim about certification or competence
- [ ] `SUTRA-P002-07` Identify who can fact-check the technical lesson before public use
- [ ] `SUTRA-P002-08` Record assumptions about language, device, connectivity and prior experience
- [ ] `SUTRA-P002-09` Produce and review the phase artifact: One-page problem brief with one primary task and three failure examples.
- [ ] `SUTRA-P002-10` Close phase 002 only after its applicable tasks have evidence and its exit condition is observed: Task success can be observed without assuming a training benefit or claiming operational certification.

## Phase 003 - Pin the challenge and specification baseline

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 01. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Record the submission rules, Profile 0.2 at fd872b9 and Profile 0.3 at a0ceda3. Preserve their substantive comparison and map requirements to evidence. Recheck for organizer changes before release.
- **Phase exit:** Every mandatory requirement has an owner and planned verification; version differences are explicit.

- [ ] `SUTRA-P003-01` Retrieve current official rules, requirements, schedule and judging criteria
- [ ] `SUTRA-P003-02` Pin the launch-time specification commit and current specification commit
- [ ] `SUTRA-P003-03` Diff normative behavior rather than comparing only profile version labels
- [ ] `SUTRA-P003-04` List public artifacts, browser execution and privacy obligations individually
- [ ] `SUTRA-P003-05` Map each obligation to stable task IDs and intended evidence
- [ ] `SUTRA-P003-06` Record source URLs, versions and retrieval time with timezone
- [ ] `SUTRA-P003-07` Distinguish mandatory requirements, recommendations, extensions and project choices
- [ ] `SUTRA-P003-08` Record a release-time rule recheck task and unresolved interpretation questions
- [ ] `SUTRA-P003-09` Produce and review the phase artifact: Versioned requirement matrix with source links and retrieval dates.
- [ ] `SUTRA-P003-10` Close phase 003 only after its applicable tasks have evidence and its exit condition is observed: Every mandatory requirement has an owner and planned verification; version differences are explicit.

## Phase 004 - Select SUTRA and reject excess scope

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 02-03. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Commit to evidence-linked video learning plus a portable peer checklist network. Compare a generic assistant, full learning-management platform and a conformance-only tool. Keep one hero workflow.
- **Phase exit:** No accounts, payments, certification, arbitrary web crawling or autonomous external writes enter the minimum release.

- [ ] `SUTRA-P004-01` Document why portable guide composition adds value to a video task
- [ ] `SUTRA-P004-02` Compare generic chatbot, infrastructure-only inspector and full learning platform
- [ ] `SUTRA-P004-03` Select one hero task and explicitly list deferred user journeys
- [ ] `SUTRA-P004-04` Separate minimum release scope from removable optional enhancements
- [ ] `SUTRA-P004-05` Keep customer records, payments, operational device writes and certificates out of scope
- [ ] `SUTRA-P004-06` Specify manual transcript search as the measurable counterexample
- [ ] `SUTRA-P004-07` Decide whether optional BYOK fits remaining effort and security capacity
- [ ] `SUTRA-P004-08` Record the decision and the evidence that would reverse it
- [ ] `SUTRA-P004-09` Produce and review the phase artifact: Product decision note and a must-have / optional / deferred scope list.
- [ ] `SUTRA-P004-10` Close phase 004 only after its applicable tasks have evidence and its exit condition is observed: No accounts, payments, certification, arbitrary web crawling or autonomous external writes enter the minimum release.

## Phase 005 - Design the 110-second proof sequence

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 04. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Storyboard question, timestamp evidence, peer permission, local peer execution, confirmed review-card save and one visible refusal. Reserve room for the reusable kit and human explanation.
- **Phase exit:** The complete story fits 110 seconds with a 10-second ceiling margin; no feature relies on a hidden narrator claim.

- [ ] `SUTRA-P005-01` Allocate the demonstration timeline to an under-120-second final video
- [ ] `SUTRA-P005-02` Storyboard the question, actual timestamp evidence and real media seek
- [ ] `SUTRA-P005-03` Storyboard destination consent before any external peer contact
- [ ] `SUTRA-P005-04` Show peer-local execution without claiming independently operated infrastructure
- [ ] `SUTRA-P005-05` Show source comparison, human review and saved evidence receipt
- [ ] `SUTRA-P005-06` Reserve time for a visible denial or bounded-execution failure
- [ ] `SUTRA-P005-07` Reserve time to demonstrate public reusable tools and actual results
- [ ] `SUTRA-P005-08` Check the storyline can be explained in the entrant’s real voice
- [ ] `SUTRA-P005-09` Produce and review the phase artifact: Time-coded browser demo outline.
- [ ] `SUTRA-P005-10` Close phase 005 only after its applicable tasks have evidence and its exit condition is observed: The complete story fits 110 seconds with a 10-second ceiling margin; no feature relies on a hidden narrator claim.

## Phase 006 - Translate the judging rubric into evidence

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 03-05. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Allocate attention equally across technical implementation, design, impact and idea quality. Define product evidence and community-tool evidence for each; treat conformance as a separate prerequisite.
- **Phase exit:** Each criterion links to a planned screen, test or real observation rather than a promotional adjective.

- [ ] `SUTRA-P006-01` Create a separate pass/fail conformity gate before scoring quality
- [ ] `SUTRA-P006-02` Give equal planning weight to all four published judging criteria
- [ ] `SUTRA-P006-03` Assign a visible product artifact to technological implementation
- [ ] `SUTRA-P006-04` Assign an end-to-end learner journey to coherent product design
- [ ] `SUTRA-P006-05` Assign measured audience outcomes and reusable tools to potential impact
- [ ] `SUTRA-P006-06` Explain the idea’s non-obvious mechanism without unsupported uniqueness claims
- [ ] `SUTRA-P006-07` Map every advertised achievement to an executable check or observation
- [ ] `SUTRA-P006-08` Avoid inventing a numeric organizer scoring scale or probability of winning
- [ ] `SUTRA-P006-09` Produce and review the phase artifact: Four-column evidence scorecard and pass/fail checklist.
- [ ] `SUTRA-P006-10` Close phase 006 only after its applicable tasks have evidence and its exit condition is observed: Each criterion links to a planned screen, test or real observation rather than a promotional adjective.

## Phase 007 - Establish effort and spend limits

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 04. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Confirm available hours against this plan; reserve 15% for integration failures. Set model, hosting and media budgets, plus a stop rule when funded inference reaches its approved cap.
- **Phase exit:** The calendar has a named daily capacity; model cost assumptions and unknown provider prices are shown separately.

- [ ] `SUTRA-P007-01` Sum person-hour estimates and add a named integration contingency
- [ ] `SUTRA-P007-02` Record participant availability and tasks requiring genuine human involvement
- [ ] `SUTRA-P007-03` Separate inference, media, hosting and optional service cost assumptions
- [ ] `SUTRA-P007-04` Select an approved spend ceiling before enabling funded inference
- [ ] `SUTRA-P007-05` Calculate baseline capacity and sensitivity to doubled token/retry usage
- [ ] `SUTRA-P007-06` Name the first optional scope cuts when available hours shrink
- [ ] `SUTRA-P007-07` Reserve availability funding through the verified judging end date
- [ ] `SUTRA-P007-08` Record missing prices, tester availability and infrastructure access honestly
- [ ] `SUTRA-P007-09` Produce and review the phase artifact: Effort baseline, cost worksheet and scope-cut order.
- [ ] `SUTRA-P007-10` Close phase 007 only after its applicable tasks have evidence and its exit condition is observed: The calendar has a named daily capacity; model cost assumptions and unknown provider prices are shown separately.

## Phase 008 - Choose deployment origins and isolation

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 04,07. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Plan sutra.aafnaipatro.com for the app and sutra-guide.aafnaipatro.com for the peer. Treat both as proposed same-owner origins. Inspect actual routes before mapping them.
- **Phase exit:** Existing Patro, DHAGO and DETOUR domain mappings are identified; new deployments have separate outputs and rollback targets.

- [ ] `SUTRA-P008-01` Inventory existing AafnaiPatro, DHAGO and DETOUR origin mappings
- [ ] `SUTRA-P008-02` Propose separate new caller and peer origins without overwriting existing ones
- [ ] `SUTRA-P008-03` Check DNS/custom-domain availability and existing route precedence read-only
- [ ] `SUTRA-P008-04` Identify inference and media origin ownership and intended browser contacts
- [ ] `SUTRA-P008-05` Separate production, preview and rollback targets for both new applications
- [ ] `SUTRA-P008-06` Document cookie scope and why subdomain isolation is an origin boundary
- [ ] `SUTRA-P008-07` Specify exact public artifact base paths and network identifiers
- [ ] `SUTRA-P008-08` Treat same-owner origins as composition evidence rather than independent adoption
- [ ] `SUTRA-P008-09` Produce and review the phase artifact: Origin map covering new app, peer, inference and media.
- [ ] `SUTRA-P008-10` Close phase 008 only after its applicable tasks have evidence and its exit condition is observed: Existing Patro, DHAGO and DETOUR domain mappings are identified; new deployments have separate outputs and rollback targets.

## Phase 009 - Define the community Open Kit

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 02,06. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Specify a framework-independent evidence schema/validator, a peer-consent inspector and an agentic-site starter. Identify the external builder job, documented interfaces and reusable boundaries.
- **Phase exit:** A third-party builder can test the kit without importing DHAGO, DETOUR, private media, credentials or the learner app.

- [ ] `SUTRA-P009-01` Define the evidence validator’s standalone builder job and contract
- [ ] `SUTRA-P009-02` Define the consent inspector’s inputs, outputs and denial guarantee
- [ ] `SUTRA-P009-03` Define the starter’s minimal publish-and-consume user journey
- [ ] `SUTRA-P009-04` Exclude player imports, private corpus, private keys and hidden services
- [ ] `SUTRA-P009-05` Choose public source, documentation and example locations for each tool
- [ ] `SUTRA-P009-06` Specify required license, attribution and versioning boundaries
- [ ] `SUTRA-P009-07` Define a clean-host installation task for outside developers
- [ ] `SUTRA-P009-08` Define what would count as actual reuse versus merely downloading files
- [ ] `SUTRA-P009-09` Produce and review the phase artifact: Open Kit API brief, intended users and sample adoption task.
- [ ] `SUTRA-P009-10` Close phase 009 only after its applicable tasks have evidence and its exit condition is observed: A third-party builder can test the kit without importing DHAGO, DETOUR, private media, credentials or the learner app.

## Phase 010 - Freeze measurable acceptance targets

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 05-09. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Approve the evaluation set, denial tests, 10-person pilot target, 20 live hero runs and two external-builder trial target. Define measurement methods before implementation.
- **Phase exit:** Targets are labeled prospective; failed targets will be reported as results, not silently edited into success.

- [ ] `SUTRA-P010-01` Freeze the core hero success criteria before prompt tuning
- [ ] `SUTRA-P010-02` Define the 40-case answerable, unsupported and conflict evaluation split
- [ ] `SUTRA-P010-03` Define live-run count, success threshold and latency measurement method
- [ ] `SUTRA-P010-04` Define pilot recruitment target and unaided task-completion metric
- [ ] `SUTRA-P010-05` Define outside-builder setup target and intervention-count recording
- [ ] `SUTRA-P010-06` Define security gates and what failures block public release
- [ ] `SUTRA-P010-07` Mark every numerical target as prospective, not achieved
- [ ] `SUTRA-P010-08` Record baseline revision and a process for documented target changes
- [ ] `SUTRA-P010-09` Produce and review the phase artifact: Acceptance baseline and dated milestone gates.
- [ ] `SUTRA-P010-10` Close phase 010 only after its applicable tasks have evidence and its exit condition is observed: Targets are labeled prospective; failed targets will be reported as results, not silently edited into success.
