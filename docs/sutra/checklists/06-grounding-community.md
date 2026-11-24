# 06. Grounding and community tools

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **16-20 Dec 2026**. This is a target window, not proof of work.

Verifiable evidence and reusable tools other builders can run.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 051 - Build bounded transcript retrieval

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 16-18,27,50. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Implement deterministic cue search with source filters, interval boundaries and result caps before optional semantic retrieval. Return IDs and excerpts that the answer validator can verify.
- **Phase exit:** Queries return only corpus-backed cue IDs; irrelevant or absent material returns no supported answer.

- [x] `SUTRA-P051-01` Implement deterministic transcript retrieval before optional semantic search
- [x] `SUTRA-P051-02` Use stable cue and source identifiers in all results
- [x] `SUTRA-P051-03` Bound query length, candidate count and excerpt size
- [x] `SUTRA-P051-04` Respect corpus/source filters and actual timestamp boundaries
- [x] `SUTRA-P051-05` Return no supported match for absent or irrelevant material
- [x] `SUTRA-P051-06` Keep source text distinct from model-authored summaries
- [x] `SUTRA-P051-07` Verify the same fixed query has reproducible evidence candidates
- [x] `SUTRA-P051-08` Record retrieval failure cases before adjusting model prompts
- [x] `SUTRA-P051-09` Produce and review the phase artifact: Retrieval module and fixed query fixtures.
- [x] `SUTRA-P051-10` Close phase 051 only after its applicable tasks have evidence and its exit condition is observed: Queries return only corpus-backed cue IDs; irrelevant or absent material returns no supported answer.

## Phase 052 - Validate evidence before rendering claims

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 17,45,51. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Check source hashes, cue existence, timestamps, quotation fidelity and structured claim references. Downgrade unsupported statements and label model interpretation separately.
- **Phase exit:** Fabricated cue IDs and altered quotations fail; supported results retain clickable source links.

- [x] `SUTRA-P052-01` Validate every rendered cue ID against the active corpus
- [x] `SUTRA-P052-02` Check timestamps and source/media version hashes
- [x] `SUTRA-P052-03` Compare quotations to actual source text with documented normalization
- [x] `SUTRA-P052-04` Require structured claim-to-evidence references before verification labels
- [x] `SUTRA-P052-05` Mark interpretation separately from source-backed excerpts
- [x] `SUTRA-P052-06` Reject invented sources, altered quotes and impossible timestamp intervals
- [x] `SUTRA-P052-07` Avoid treating schema validity as semantic verification
- [x] `SUTRA-P052-08` Preserve an explicit unsupported state when validation fails
- [x] `SUTRA-P052-09` Produce and review the phase artifact: Answer-evidence validation pipeline.
- [x] `SUTRA-P052-10` Close phase 052 only after its applicable tasks have evidence and its exit condition is observed: Fabricated cue IDs and altered quotations fail; supported results retain clickable source links.

## Phase 053 - Create a precommitted evaluation set

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 10,18,52. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Author 40 cases: 20 answerable, 10 unanswerable and 10 conflicting/adversarial cases. Freeze expected evidence and refusal behavior before final prompt tuning.
- **Phase exit:** Each case has a human-reviewed expected result; test-set leakage and later modifications are disclosed.

- [ ] `SUTRA-P053-01` Create 20 answerable cases with human-reviewed expected cue references
- [ ] `SUTRA-P053-02` Create 10 unanswerable cases that require abstention
- [ ] `SUTRA-P053-03` Create 10 conflict or adversarial cases with expected safe handling
- [x] `SUTRA-P053-04` Define supported-claim precision and citation validity denominators
- [ ] `SUTRA-P053-05` Freeze cases and rubric before final prompt tuning
- [ ] `SUTRA-P053-06` Separate development examples from the held-out evaluation set
- [ ] `SUTRA-P053-07` Version later corrections and explain why expectations changed
- [ ] `SUTRA-P053-08` Preserve failures rather than removing difficult cases from scoring
- [ ] `SUTRA-P053-09` Produce and review the phase artifact: Versioned evaluation set and scoring rubric.
- [ ] `SUTRA-P053-10` Close phase 053 only after its applicable tasks have evidence and its exit condition is observed: Each case has a human-reviewed expected result; test-set leakage and later modifications are disclosed.

## Phase 054 - Tune delegation for useful work

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 23,28,51-53. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Use agents only when a separate source or verification role adds value. Reduce redundant model calls and enforce concise structured returns. Compare with direct transcript search.
- **Phase exit:** The task remains evidence-backed while median calls and token usage are measured; extra agents are not treated as quality by themselves.

- [ ] `SUTRA-P054-01` Measure the baseline number of model calls and token usage
- [x] `SUTRA-P054-02` Compare agent coordination against direct transcript lookup
- [ ] `SUTRA-P054-03` Restrict delegation to source selection and useful verification roles
- [ ] `SUTRA-P054-04` Remove redundant agent hops and repeated large context
- [x] `SUTRA-P054-05` Use concise structured tool returns rather than unbounded narrative
- [x] `SUTRA-P054-06` Keep source-reference checks outside model preference
- [ ] `SUTRA-P054-07` Measure before/after latency, call count and evidence accuracy
- [x] `SUTRA-P054-08` Do not use the number of agents as a quality metric
- [ ] `SUTRA-P054-09` Produce and review the phase artifact: Prompt/delegation revision with before-and-after measurements.
- [ ] `SUTRA-P054-10` Close phase 054 only after its applicable tasks have evidence and its exit condition is observed: The task remains evidence-backed while median calls and token usage are measured; extra agents are not treated as quality by themselves.

## Phase 055 - Handle uncertainty and conflicting sources

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 45,52-54. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Require visible abstention when evidence is missing or contradictory. Distinguish excerpt-backed claims, interpretations and proposals. Do not present technical learning output as certification.
- **Phase exit:** All unanswerable/conflicting evaluation cases avoid fabricated citations; disagreements retain separate source identities.

- [x] `SUTRA-P055-01` Define visible states for unsupported claim and unresolved conflict
- [x] `SUTRA-P055-02` Require abstention when the corpus does not support the requested answer
- [x] `SUTRA-P055-03` Keep multiple conflicting source identities inspectable
- [x] `SUTRA-P055-04` Label inference and interpretation rather than calling them verified facts
- [x] `SUTRA-P055-05` Avoid unsupported technical certification or operational guarantees
- [ ] `SUTRA-P055-06` Test all unanswerable and conflicting evaluation fixtures
- [x] `SUTRA-P055-07` Verify the assistant does not fabricate citations to avoid refusal
- [x] `SUTRA-P055-08` Explain next useful human step without overstating source reliability
- [x] `SUTRA-P055-09` Produce and review the phase artifact: Uncertainty states and conflict-resolution guidance.
- [ ] `SUTRA-P055-10` Close phase 055 only after its applicable tasks have evidence and its exit condition is observed: All unanswerable/conflicting evaluation cases avoid fabricated citations; disagreements retain separate source identities.

## Phase 056 - Add stale-source and media-drift checks

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 17-18,52. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Bind receipts to source/media hashes and dates; detect updated transcripts and replaced video files. Ask for revalidation instead of silently retaining obsolete cue links.
- **Phase exit:** Replacing a fixture invalidates prior evidence links or marks them stale; hashes are described as integrity checks only.

- [x] `SUTRA-P056-01` Bind existing receipts to source and media version hashes
- [x] `SUTRA-P056-02` Detect replaced transcripts and changed video duration
- [x] `SUTRA-P056-03` Invalidate or visibly mark stale cue references after version drift
- [x] `SUTRA-P056-04` Avoid silently migrating a source ID onto unrelated content
- [x] `SUTRA-P056-05` Define compatibility rules for schema and receipt versions
- [x] `SUTRA-P056-06` Test stale stored cards across application reloads
- [x] `SUTRA-P056-07` Preserve previous provenance for diagnosing mismatches
- [x] `SUTRA-P056-08` Explain that integrity and freshness checks do not prove source truth
- [x] `SUTRA-P056-09` Produce and review the phase artifact: Version migration behavior and stale-card warning.
- [x] `SUTRA-P056-10` Close phase 056 only after its applicable tasks have evidence and its exit condition is observed: Replacing a fixture invalidates prior evidence links or marks them stale; hashes are described as integrity checks only.

## Phase 057 - Extract the standalone evidence validator

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 09,17,52,56. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Move schema validation into packages/sutra-evidence/ with no UI/player import. Ship a CLI or simple callable module, example receipts and documented error codes.
- **Phase exit:** A clean host validates one good receipt and rejects three bad fixtures without the SUTRA app or private services.

- [x] `SUTRA-P057-01` Create a standalone evidence package without UI or media dependencies
- [x] `SUTRA-P057-02` Publish the receipt schema and supported version rules
- [x] `SUTRA-P057-03` Expose a documented validator API and simple command-line entry point
- [x] `SUTRA-P057-04` Return stable error codes for missing source, invalid time and altered hash
- [x] `SUTRA-P057-05` Bundle valid and invalid synthetic fixtures
- [x] `SUTRA-P057-06` Avoid requiring the learner application or private service credentials
- [x] `SUTRA-P057-07` Run the validator from a separate clean host
- [x] `SUTRA-P057-08` Document semantic-validation limits and compatibility expectations
- [x] `SUTRA-P057-09` Produce and review the phase artifact: Open Kit artifact 1: evidence schema and validator.
- [x] `SUTRA-P057-10` Close phase 057 only after its applicable tasks have evidence and its exit condition is observed: A clean host validates one good receipt and rejects three bad fixtures without the SUTRA app or private services.

## Phase 058 - Extract the peer-consent inspector

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 09,33-38,47. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Make a reusable component or module showing intended peer contact, scope and redacted outcome. Clearly state that schema/permission visibility does not establish publisher trust.
- **Phase exit:** Another static page can use it; denial emits no fetch and exports contain no credential canary.

- [x] `SUTRA-P058-01` Extract consent events and policy display into a reusable module
- [x] `SUTRA-P058-02` Define framework-neutral origin, purpose and disclosure inputs
- [x] `SUTRA-P058-03` Provide a plain browser example outside the learner app
- [x] `SUTRA-P058-04` Verify denial emits no network request
- [x] `SUTRA-P058-05` Support explicit approval scope and redacted outcome display
- [x] `SUTRA-P058-06` Keep model credentials and raw private prompts out of exports
- [x] `SUTRA-P058-07` Document that consent visibility is not a publisher reputation system
- [x] `SUTRA-P058-08` Test integration without the DHAGO player or SUTRA corpus
- [x] `SUTRA-P058-09` Produce and review the phase artifact: Open Kit artifact 2: consent inspector with a framework-neutral example.
- [x] `SUTRA-P058-10` Close phase 058 only after its applicable tasks have evidence and its exit condition is observed: Another static page can use it; denial emits no fetch and exports contain no credential canary.

## Phase 059 - Create an agentic-site starter

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 09,22,31,57-58. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Build a minimal two-agent example with manifest, links, runtime wiring, sample local action and clear deploy instructions. Use synthetic licensed data and preserve runtime attribution.
- **Phase exit:** A clean install serves the example without the main app; manifest and exact-name peer loading work.

- [x] `SUTRA-P059-01` Create a minimal two-agent starter with synthetic licensed content
- [x] `SUTRA-P059-02` Include manifest, resolved graph and named peer-link examples
- [x] `SUTRA-P059-03` Wire a pinned runtime and one safe registered local action
- [x] `SUTRA-P059-04` Document default inference setup without embedding real secrets
- [x] `SUTRA-P059-05` Include a second-origin example and denied-origin walkthrough
- [x] `SUTRA-P059-06` Keep starter build/install commands independent of the learner app
- [x] `SUTRA-P059-07` Retain required upstream license and NOTICE material
- [x] `SUTRA-P059-08` Verify clean publication and exact-name network loading
- [x] `SUTRA-P059-09` Produce and review the phase artifact: Open Kit artifact 3: publisher starter and example peer.
- [x] `SUTRA-P059-10` Close phase 059 only after its applicable tasks have evidence and its exit condition is observed: A clean install serves the example without the main app; manifest and exact-name peer loading work.

## Phase 060 - Publish a versioned Open Kit candidate

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 57-59. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Write quickstarts, API boundaries, Apache-compatible notices and troubleshooting. Add a community test command described as project checks, not an official certification suite.
- **Phase exit:** Each tool has its own purpose, entry point, license and runnable example; no private data or tokens are packaged.

- [x] `SUTRA-P060-01` Assign an immutable candidate version to each community artifact
- [x] `SUTRA-P060-02` Write a purpose, quickstart and public entry point for each tool
- [x] `SUTRA-P060-03` Explain supported environments and incompatible optional capabilities
- [x] `SUTRA-P060-04` Include troubleshooting for schema, CORS, consent and router failures
- [x] `SUTRA-P060-05` Expose public source and runnable synthetic examples
- [x] `SUTRA-P060-06` Label project checks as project checks rather than official certification
- [x] `SUTRA-P060-07` Scan archives for private material and secret canaries
- [x] `SUTRA-P060-08` Record what remains unverified before asking outsiders to try it
- [x] `SUTRA-P060-09` Produce and review the phase artifact: Versioned community release candidate and public documentation paths.
- [x] `SUTRA-P060-10` Close phase 060 only after its applicable tasks have evidence and its exit condition is observed: Each tool has its own purpose, entry point, license and runnable example; no private data or tokens are packaged.
