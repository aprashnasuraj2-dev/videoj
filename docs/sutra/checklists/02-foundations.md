# 02. Repository and source foundations

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
- **Intent:** Record or obtain permission for one concise instructional video of about three minutes and a written handover checklist. Aim for a final total average bitrate around 0.8 Mbps so the measured asset is roughly 18 MB and comfortably below the 25 MiB hard limit; measured bytes, not the estimate, decide acceptance. Use synthetic device readings; remove customer information, employer marks and unauthorized material.
- **Phase exit:** Rights and factual review are documented; the approximately three-minute film contains the steps needed by the hero query and is suitable for the measured media-size target.

- [ ] `SUTRA-P015-01` Select one factual approximately three-minute lesson matching the hero task
- [ ] `SUTRA-P015-02` Create or obtain explicit rights for footage, narration and written checklist
- [ ] `SUTRA-P015-03` Remove customer data, internal credentials and unauthorized employer marks
- [ ] `SUTRA-P015-04` Use synthetic device readings and non-sensitive demonstrations
- [ ] `SUTRA-P015-05` Have a competent content owner review the technical sequence
- [ ] `SUTRA-P015-06` Verify the actual recording contains the answerable steps being demonstrated without padding the lesson to hit a duration target
- [ ] `SUTRA-P015-07` Record media owner, license, capture date and permitted public use
- [ ] `SUTRA-P015-08` Keep raw private permissions outside Git and publish only safe provenance
- [ ] `SUTRA-P015-09` Produce and review the phase artifact: Original lesson files, text checklist and provenance record.
- [ ] `SUTRA-P015-10` Close phase 015 only after its applicable tasks have evidence and its exit condition is observed: Rights and factual review are documented; the approximately three-minute film contains the hero steps and fits the measured delivery target.


## Phase 016 - Create transcript, captions and cue IDs

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 15. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Create timestamped transcript segments and captions; manually check cue boundaries and technical wording. Give every segment a stable ID tied to a specific media version.
- **Phase exit:** All timestamps satisfy 0 <= start < end <= actual duration; spot checks match spoken content.

- [ ] `SUTRA-P016-01` Transcribe spoken lesson content with stable segment identifiers
- [ ] `SUTRA-P016-02` Create valid WebVTT captions with correct ordering and encoding
- [ ] `SUTRA-P016-03` Compare cue starts and ends to the actual media duration
- [ ] `SUTRA-P016-04` Manually check technical words, units and ambiguous spoken terms
- [ ] `SUTRA-P016-05` Distinguish source transcript text from translated or summarized text
- [ ] `SUTRA-P016-06` Tie captions and transcript metadata to the exact media version
- [ ] `SUTRA-P016-07` Check missing, overlapping and zero-length cue handling
- [ ] `SUTRA-P016-08` Spot-check multiple cues against real playback before declaring alignment
- [ ] `SUTRA-P016-09` Produce and review the phase artifact: WebVTT captions, transcript JSON and cue map.
- [ ] `SUTRA-P016-10` Close phase 016 only after its applicable tasks have evidence and its exit condition is observed: All timestamps satisfy 0 <= start < end <= actual duration; spot checks match spoken content.

## Phase 017 - Define the Web Annotation evidence profile

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 09,16. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Make the reusable evidence interchange a narrow profile of the W3C Web Annotation Data Model rather than a SUTRA-only receipt. Represent a cue target with `SpecificResource` + `FragmentSelector`, use the W3C Media Fragments temporal value `t=start,end`, and attach SRI-style `sha256-<base64>` integrity metadata for transcript/media bytes. Keep authenticity and semantic truth separate from byte integrity.
- **Phase exit:** A standards-shaped annotation can produce a deterministic media cue link; altered bytes/ranges are rejected; a valid hash is never described as proof that a statement is true.

- [~] `SUTRA-P017-01` Define the profile identifier/version over the W3C Web Annotation JSON-LD context
- [ ] `SUTRA-P017-02` Use `Annotation`, `SpecificResource`, `FragmentSelector` and an explicit source IRI rather than a bespoke cue envelope
- [ ] `SUTRA-P017-03` Encode the cue interval as a Media Fragments temporal selector `t=start,end` and validate finite half-open bounds
- [ ] `SUTRA-P017-04` Attach transcript/media integrity using SRI-style SHA-256 metadata and an independently supplied manifest
- [ ] `SUTRA-P017-05` Represent the exact source excerpt as a `TextualBody` plus bounded cue/version metadata needed by this profile
- [ ] `SUTRA-P017-06` Keep credentials, private context and raw prompts out of annotations and integrity manifests
- [ ] `SUTRA-P017-07` Create valid, missing-source, invalid-fragment, altered-integrity and altered-quotation fixtures
- [ ] `SUTRA-P017-08` Document explicitly that a hash establishes byte equality only, not factual truth, publisher trust or semantic support
- [ ] `SUTRA-P017-09` Produce and review the phase artifact: Web Annotation media-evidence profile, validator contract and valid/invalid fixtures.
- [ ] `SUTRA-P017-10` Close phase 017 only after its applicable tasks have evidence and its exit condition is observed: A standards-shaped cue annotation validates, altered bytes/ranges fail, and byte integrity is not mislabeled as truth.


## Phase 018 - Build a small reproducible lesson corpus

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 15-17. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Package the main video and at least two written source pages with immutable IDs, version dates and licensed text. Include a deliberately conflicting training fixture outside the default learner path.
- **Phase exit:** Every public answerable claim has a source; synthetic conflict fixtures are clearly labeled.

- [ ] `SUTRA-P018-01` Index the original film, transcript and at least two written pages
- [ ] `SUTRA-P018-02` Assign immutable source IDs and stable publicly explainable labels
- [ ] `SUTRA-P018-03` Record source license, publication date and content version
- [ ] `SUTRA-P018-04` Ensure each hero claim can point to an actual source excerpt
- [ ] `SUTRA-P018-05` Create a clearly marked conflicting-source fixture for testing
- [ ] `SUTRA-P018-06` Separate attack fixtures and synthetic contradictions from default learner content
- [ ] `SUTRA-P018-07` Bound corpus size and avoid arbitrary live web crawling
- [ ] `SUTRA-P018-08` Record the corpus manifest and reproducible content hashes
- [ ] `SUTRA-P018-09` Produce and review the phase artifact: Corpus index and fixture provenance list.
- [ ] `SUTRA-P018-10` Close phase 018 only after its applicable tasks have evidence and its exit condition is observed: Every public answerable claim has a source; synthetic conflict fixtures are clearly labeled.

## Phase 019 - Plan video delivery using actual size

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 08,15. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Measure the approximately three-minute encode, target roughly 0.8 Mbps total average bitrate, choose poster/preload policy and test the intended media host for byte ranges, CORS and content types. The estimate is about 18 MB at 180 seconds; actual encoded bytes including audio/container overhead must remain below 25 MiB. Exercise a physical iPhone seek before finalizing the host. Use a separate approved R2/CDN location if Pages limits or seeking require it.
- **Phase exit:** Any Pages asset is actually below 25 MiB and real physical-iPhone seeking is verified on the selected route before choosing it.

- [ ] `SUTRA-P019-01` Measure final MP4/WebM duration, total average bitrate and file size including audio/container overhead
- [ ] `SUTRA-P019-02` Check each Pages asset against the actual per-file size limit and keep the lesson asset below 25 MiB
- [ ] `SUTRA-P019-03` Test Range responses, content types and CORS on proposed media hosting
- [ ] `SUTRA-P019-04` Test real decode and seeking on an available physical iPhone before selecting the final delivery route
- [ ] `SUTRA-P019-05` Prefer verified static/media hosting over routing video through the main Patro Worker
- [ ] `SUTRA-P019-06` Set intentional poster, preload and low-bandwidth transcript behavior
- [ ] `SUTRA-P019-07` Avoid unapproved media uploads or duplicate assets when hashes already match
- [ ] `SUTRA-P019-08` Record bitrate, duration, exact byte count, physical device/browser version and chosen media origin
- [ ] `SUTRA-P019-09` Produce and review the phase artifact: Media delivery decision, byte/bitrate inventory and early iPhone seek evidence.
- [ ] `SUTRA-P019-10` Close phase 019 only after its applicable tasks have evidence and its exit condition is observed: The asset is below 25 MiB and real iPhone seeking works on the selected route.


## Phase 020 - Close the foundation milestone

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 11-19. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Run the isolated app build, inspect dependency boundaries and review the corpus and architecture. Confirm that the product still tells one coherent story.
- **Phase exit:** App shell, licensed evidence corpus, runtime decision and proposed domains are ready; blockers are resolved or scoped out.

- [ ] `SUTRA-P020-01` Review the app package and dependency boundary against repository instructions
- [ ] `SUTRA-P020-02` Confirm the corpus, transcript and media provenance are available
- [ ] `SUTRA-P020-03` Confirm the runtime spike resolved the highest integration uncertainty
- [ ] `SUTRA-P020-04` Run the documented new-app build at a recorded source revision
- [ ] `SUTRA-P020-05` Record missing participant inputs without presenting them as completed
- [ ] `SUTRA-P020-06` Resolve any output-directory collision before feature implementation
- [ ] `SUTRA-P020-07` Review the hero narrative against the current scope and effort
- [ ] `SUTRA-P020-08` Record a foundation gate decision with named unresolved blockers
- [ ] `SUTRA-P020-09` Produce and review the phase artifact: Milestone A review tied to the current SHA.
- [ ] `SUTRA-P020-10` Close phase 020 only after its applicable tasks have evidence and its exit condition is observed: App shell, licensed evidence corpus, runtime decision and proposed domains are ready; blockers are resolved or scoped out.
