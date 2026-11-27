# 02. Repository and source foundations

> **RETIRED SUTRA1 EXECUTION QUEUE (2026-11-26).** The user retired all remaining unchecked SUTRA1 tasks. This file now preserves verified/omitted/blocked historical evidence only. Do not resume work from this file; use [`docs/sutra-v2/CHECKLIST.md`](../../sutra-v2/CHECKLIST.md).

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **27-30 Nov 2026**. This is a target window, not proof of work.

An isolated app, rights-cleared lesson material and reproducible builds.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 011 - Snapshot videoj and inventory change scope

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 10. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Record main SHA 042bea1d1723b448854538c21e8f693608897c5a, repository instructions, existing build commands and deployment workflows. Inspect nested instructions before touching any directory.
- **Phase exit:** Read evidence is distinguished from executed tests; no assumption that an existing live domain matches main.

- [x] `SUTRA-P011-01` Resolve the current remote main SHA and record inspection time
- [x] `SUTRA-P011-02` Read root and relevant nested AGENTS instructions before changes
- [x] `SUTRA-P011-03` Inventory root DHAGO and independent DETOUR build boundaries
- [x] `SUTRA-P011-04` Inspect actual workflow triggers rather than relying on hosting prose
- [x] `SUTRA-P011-05` Identify existing SUTRA files, branches or work before creating replacements
- [x] `SUTRA-P011-06` Separate source inspection from builds, CI runs and live observations
- [x] `SUTRA-P011-07` Record original package versions and existing deployment relationships
- [x] `SUTRA-P011-08` Check the attached plan matches the phase titles and provenance hash
- [x] `SUTRA-P011-09` Produce and review the phase artifact: Repository map and baseline revision note.
- [x] `SUTRA-P011-10` Close phase 011 only after its applicable tasks have evidence and its exit condition is observed: Read evidence is distinguished from executed tests; no assumption that an existing live domain matches main.

## Phase 012 - Create an isolated SUTRA app package

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 08,11. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Add apps/sutra/ with its own package, lockfile, Vite config and output. Import only the DHAGO reusable player through an explicit reviewed path boundary. Do not mix in DETOUR source or demo media.
- **Phase exit:** A SUTRA build cannot empty root dist/ or detour/dist/; no dependency on apps/preview/ exists.

- [x] `SUTRA-P012-01` Create a standalone apps/sutra package manifest and lockfile
- [x] `SUTRA-P012-02` Give the app a distinct Vite root and output directory
- [x] `SUTRA-P012-03` Define the explicit DHAGO source import or adapter boundary
- [x] `SUTRA-P012-04` Resolve shared-source dependencies without importing the preview application
- [x] `SUTRA-P012-05` Keep DETOUR code, themes, fixtures and media out of SUTRA
- [x] `SUTRA-P012-06` Ensure builds cannot empty root dist or detour/dist directories
- [x] `SUTRA-P012-07` Provide documented clean-install and development commands for the new app
- [x] `SUTRA-P012-08` Verify the new application shell builds independently of demo content
- [x] `SUTRA-P012-09` Produce and review the phase artifact: Standalone app skeleton and build entry.
- [x] `SUTRA-P012-10` Close phase 012 only after its applicable tasks have evidence and its exit condition is observed: A SUTRA build cannot empty root dist/ or detour/dist/; no dependency on apps/preview/ exists.

## Phase 013 - Create path-scoped verification

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 12. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Add checks for the new app and shared DHAGO imports. Preserve existing verification. Inspect workflow YAML because current DHAGO staging triggers on successful main pushes as well as manual dispatch.
- **Phase exit:** App changes run their checks; existing staging or deployment behavior is understood before any root edit.

- [x] `SUTRA-P013-01` Add path-scoped verification for new app and imported shared code
- [x] `SUTRA-P013-02` Preserve existing DHAGO and DETOUR workflow intent and triggers
- [x] `SUTRA-P013-03` Inspect whether changes to shared player files need existing regressions
- [x] `SUTRA-P013-04` Ensure documentation-only planning edits do not trigger deployment work
- [x] `SUTRA-P013-05` Keep SUTRA artifacts and caches separate from other project outputs
- [x] `SUTRA-P013-06` Pin appropriate Node and dependency installation behavior
- [x] `SUTRA-P013-07` Document successful-main restaging versus actual public promotion accurately
- [x] `SUTRA-P013-08` Ensure CI does not require unavailable provider or deployment secrets
- [x] `SUTRA-P013-09` Produce and review the phase artifact: Scoped CI configuration and release-trigger note.
- [x] `SUTRA-P013-10` Close phase 013 only after its applicable tasks have evidence and its exit condition is observed: App changes run their checks; existing staging or deployment behavior is understood before any root edit.

## Phase 014 - Select reference runtime and license

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 03,12. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Spike a pinned nsDeploy browser runtime revision, inspect its integration surface and license, and record required adapters. Prefer reusing browser orchestration to building a second framework.
- **Phase exit:** A minimal two-agent network can be loaded in the spike; no declaration of conformance precedes behavior tests.

- [x] `SUTRA-P014-01` Inspect nsDeploy runtime entry points and a working published example
- [x] `SUTRA-P014-02` Select an immutable runtime revision and compatible graph format
- [x] `SUTRA-P014-03` Review its license and transitive redistribution/NOTICE obligations
- [x] `SUTRA-P014-04` Spike browser import, graph parsing and basic two-agent execution
- [x] `SUTRA-P014-05` Identify required inference, action and peer adapters before UI expansion
- [x] `SUTRA-P014-06` Record unsupported optional runtime capabilities and deliberate omissions
- [x] `SUTRA-P014-07` Measure the runtime bundle separately from the learner shell
- [x] `SUTRA-P014-08` Compare reuse effort with a fresh runtime and record the selection
- [x] `SUTRA-P014-09` Produce and review the phase artifact: Runtime decision, lock/pin and third-party notice entry.
- [x] `SUTRA-P014-10` Close phase 014 only after its applicable tasks have evidence and its exit condition is observed: A minimal two-agent network can be loaded in the spike; no declaration of conformance precedes behavior tests.

## Phase 015 - Author one rights-cleared training lesson

- **Baseline effort:** 3 person-hours; **owner:** P.
- **Original phase dependencies:** 02,05. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Record or obtain permission for a 3-5 minute instructional video and a written handover checklist. Use synthetic device readings; remove customer information, employer marks and unauthorized material.
- **Phase exit:** Rights and factual review are documented; the film contains the steps needed by the hero query.


## Phase 016 - Create transcript, captions and cue IDs

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 15. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Create timestamped transcript segments and captions; manually check cue boundaries and technical wording. Give every segment a stable ID tied to a specific media version.
- **Phase exit:** All timestamps satisfy 0 <= start < end <= actual duration; spot checks match spoken content.


## Phase 017 - Define the evidence receipt contract

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 09,16. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Design a versioned JSON receipt carrying source ID, source hash, cue ID, timestamp interval, source text reference, retrieval time and verification status. Keep authenticity claims separate from file integrity.
- **Phase exit:** A hash mismatch is detectable; a valid hash is never described as proof that a statement is true.

- [x] `SUTRA-P017-01` Choose a receipt schema identifier and versioning convention
- [x] `SUTRA-P017-02` Specify source ID, media hash and transcript or checklist version
- [x] `SUTRA-P017-03` Specify cue identifier and finite start/end timestamp constraints
- [x] `SUTRA-P017-04` Represent quotation or excerpt references without fabricating provenance
- [x] `SUTRA-P017-05` Include retrieval time and clearly scoped verification status
- [x] `SUTRA-P017-06` Keep credentials, private context and raw prompts out of receipts
- [x] `SUTRA-P017-07` Create valid, missing-source, invalid-range and altered-hash examples
- [x] `SUTRA-P017-08` Document that byte integrity does not establish factual truth
- [x] `SUTRA-P017-09` Produce and review the phase artifact: Evidence schema v1 and valid/invalid example fixtures.
- [x] `SUTRA-P017-10` Close phase 017 only after its applicable tasks have evidence and its exit condition is observed: A hash mismatch is detectable; a valid hash is never described as proof that a statement is true.

## Phase 018 - Build a small reproducible lesson corpus

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 15-17. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Package the main video and at least two written source pages with immutable IDs, version dates and licensed text. Include a deliberately conflicting training fixture outside the default learner path.
- **Phase exit:** Every public answerable claim has a source; synthetic conflict fixtures are clearly labeled.


## Phase 019 - Plan video delivery using actual size

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 08,15. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Measure encodes, choose poster/preload policy and test the intended media host for byte ranges, CORS and content types. Use a separate approved R2/CDN location if Pages limits or seeking require it.
- **Phase exit:** Any Pages asset is below 25 MiB; seeking is verified on the selected route before choosing it.


## Phase 020 - Close the foundation milestone

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 11-19. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Run the isolated app build, inspect dependency boundaries and review the corpus and architecture. Confirm that the product still tells one coherent story.
- **Phase exit:** App shell, licensed evidence corpus, runtime decision and proposed domains are ready; blockers are resolved or scoped out.

- [x] `SUTRA-P020-01` Review the app package and dependency boundary against repository instructions
- [x] `SUTRA-P020-03` Confirm the runtime spike resolved the highest integration uncertainty
- [x] `SUTRA-P020-04` Run the documented new-app build at a recorded source revision
- [x] `SUTRA-P020-05` Record missing participant inputs without presenting them as completed
- [x] `SUTRA-P020-06` Resolve any output-directory collision before feature implementation
- [x] `SUTRA-P020-07` Review the hero narrative against the current scope and effort
- [x] `SUTRA-P020-08` Record a foundation gate decision with named unresolved blockers
- [x] `SUTRA-P020-09` Produce and review the phase artifact: Milestone A review tied to the current SHA.
