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

- [ ] `SUTRA-P051-01` Implement deterministic transcript retrieval before optional semantic search
- [ ] `SUTRA-P051-02` Use stable cue and source identifiers in all results
- [ ] `SUTRA-P051-03` Bound query length, candidate count and excerpt size
- [ ] `SUTRA-P051-04` Respect corpus/source filters and actual timestamp boundaries
- [ ] `SUTRA-P051-05` Return no supported match for absent or irrelevant material
- [ ] `SUTRA-P051-06` Keep source text distinct from model-authored summaries
- [ ] `SUTRA-P051-07` Verify the same fixed query has reproducible evidence candidates
- [ ] `SUTRA-P051-08` Record retrieval failure cases before adjusting model prompts
- [ ] `SUTRA-P051-09` Produce and review the phase artifact: Retrieval module and fixed query fixtures.
- [ ] `SUTRA-P051-10` Close phase 051 only after its applicable tasks have evidence and its exit condition is observed: Queries return only corpus-backed cue IDs; irrelevant or absent material returns no supported answer.

## Phase 052 - Validate evidence before rendering claims

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 17,45,51. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Check source hashes, cue existence, timestamps, quotation fidelity and structured claim references. Downgrade unsupported statements and label model interpretation separately.
- **Phase exit:** Fabricated cue IDs and altered quotations fail; supported results retain clickable source links.

- [ ] `SUTRA-P052-01` Validate every rendered cue ID against the active corpus
- [ ] `SUTRA-P052-02` Check timestamps and source/media version hashes
- [ ] `SUTRA-P052-03` Compare quotations to actual source text with documented normalization
- [ ] `SUTRA-P052-04` Require structured claim-to-evidence references before verification labels
- [ ] `SUTRA-P052-05` Mark interpretation separately from source-backed excerpts
- [ ] `SUTRA-P052-06` Reject invented sources, altered quotes and impossible timestamp intervals
- [ ] `SUTRA-P052-07` Avoid treating schema validity as semantic verification
- [ ] `SUTRA-P052-08` Preserve an explicit unsupported state when validation fails
- [ ] `SUTRA-P052-09` Produce and review the phase artifact: Answer-evidence validation pipeline.
- [ ] `SUTRA-P052-10` Close phase 052 only after its applicable tasks have evidence and its exit condition is observed: Fabricated cue IDs and altered quotations fail; supported results retain clickable source links.

## Phase 053 - Create a precommitted evaluation set

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 10,18,52. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Author 40 cases: 20 answerable, 10 unanswerable and 10 conflicting/adversarial cases. Freeze expected evidence and refusal behavior before final prompt tuning.
- **Phase exit:** Each case has a human-reviewed expected result; test-set leakage and later modifications are disclosed.

- [ ] `SUTRA-P053-01` Create 20 answerable cases with human-reviewed expected cue references
- [ ] `SUTRA-P053-02` Create 10 unanswerable cases that require abstention
- [ ] `SUTRA-P053-03` Create 10 conflict or adversarial cases with expected safe handling
- [ ] `SUTRA-P053-04` Define supported-claim precision and citation validity denominators
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
- [ ] `SUTRA-P054-02` Compare agent coordination against direct transcript lookup
- [ ] `SUTRA-P054-03` Restrict delegation to source selection and useful verification roles
- [ ] `SUTRA-P054-04` Remove redundant agent hops and repeated large context
- [ ] `SUTRA-P054-05` Use concise structured tool returns rather than unbounded narrative
- [ ] `SUTRA-P054-06` Keep source-reference checks outside model preference
- [ ] `SUTRA-P054-07` Measure before/after latency, call count and evidence accuracy
- [ ] `SUTRA-P054-08` Do not use the number of agents as a quality metric
- [ ] `SUTRA-P054-09` Produce and review the phase artifact: Prompt/delegation revision with before-and-after measurements.
- [ ] `SUTRA-P054-10` Close phase 054 only after its applicable tasks have evidence and its exit condition is observed: The task remains evidence-backed while median calls and token usage are measured; extra agents are not treated as quality by themselves.

## Phase 055 - Handle uncertainty and conflicting sources

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 45,52-54. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Require visible abstention when evidence is missing or contradictory. Distinguish excerpt-backed claims, interpretations and proposals. Do not present technical learning output as certification.
- **Phase exit:** All unanswerable/conflicting evaluation cases avoid fabricated citations; disagreements retain separate source identities.

- [ ] `SUTRA-P055-01` Define visible states for unsupported claim and unresolved conflict
- [ ] `SUTRA-P055-02` Require abstention when the corpus does not support the requested answer
- [ ] `SUTRA-P055-03` Keep multiple conflicting source identities inspectable
- [ ] `SUTRA-P055-04` Label inference and interpretation rather than calling them verified facts
- [ ] `SUTRA-P055-05` Avoid unsupported technical certification or operational guarantees
- [ ] `SUTRA-P055-06` Test all unanswerable and conflicting evaluation fixtures
- [ ] `SUTRA-P055-07` Verify the assistant does not fabricate citations to avoid refusal
- [ ] `SUTRA-P055-08` Explain next useful human step without overstating source reliability
- [ ] `SUTRA-P055-09` Produce and review the phase artifact: Uncertainty states and conflict-resolution guidance.
- [ ] `SUTRA-P055-10` Close phase 055 only after its applicable tasks have evidence and its exit condition is observed: All unanswerable/conflicting evaluation cases avoid fabricated citations; disagreements retain separate source identities.

## Phase 056 - Add stale-source and media-drift checks

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 17-18,52. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Bind receipts to source/media hashes and dates; detect updated transcripts and replaced video files. Ask for revalidation instead of silently retaining obsolete cue links.
- **Phase exit:** Replacing a fixture invalidates prior evidence links or marks them stale; hashes are described as integrity checks only.

- [ ] `SUTRA-P056-01` Bind existing receipts to source and media version hashes
- [ ] `SUTRA-P056-02` Detect replaced transcripts and changed video duration
- [ ] `SUTRA-P056-03` Invalidate or visibly mark stale cue references after version drift
- [ ] `SUTRA-P056-04` Avoid silently migrating a source ID onto unrelated content
- [ ] `SUTRA-P056-05` Define compatibility rules for schema and receipt versions
- [ ] `SUTRA-P056-06` Test stale stored cards across application reloads
- [ ] `SUTRA-P056-07` Preserve previous provenance for diagnosing mismatches
- [ ] `SUTRA-P056-08` Explain that integrity and freshness checks do not prove source truth
- [ ] `SUTRA-P056-09` Produce and review the phase artifact: Version migration behavior and stale-card warning.
- [ ] `SUTRA-P056-10` Close phase 056 only after its applicable tasks have evidence and its exit condition is observed: Replacing a fixture invalidates prior evidence links or marks them stale; hashes are described as integrity checks only.

## Phase 057 - Publish the standalone Web Annotation media-evidence validator

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Priority override:** `SUTRA-DECISION-0010`. This is the flagship Potential Impact artifact.
- **Intent:** Ship a dependency-free profile of the W3C Web Annotation model for timed media evidence: `Annotation` → `SpecificResource` → `FragmentSelector`, Media Fragments `t=start,end`, plus a separate SRI-style SHA-256 integrity manifest. Keep byte integrity distinct from factual truth.
- **Phase exit:** From an unrelated working directory, the CLI validates the good annotation/transcript fixture and rejects altered bytes, a bad interval and an altered quotation without the SUTRA app, player, API key or private service.

- [x] `SUTRA-P057-01` Keep the evidence package independent of the learner UI, player and agent runtime
- [x] `SUTRA-P057-02` Map the public evidence object to W3C Web Annotation classes/properties rather than a bespoke SUTRA envelope
- [x] `SUTRA-P057-03` Use a `FragmentSelector` conforming to Media Fragments URI syntax with explicit `t=start,end` ranges
- [x] `SUTRA-P057-04` Keep resource integrity in a separate manifest with SRI-style `sha256-<base64>` metadata
- [x] `SUTRA-P057-05` Recompute supplied transcript/media bytes with Web Crypto before counting integrity as verified
- [x] `SUTRA-P057-06` Verify transcript cue ID, exact interval and exact quotation after the transcript bytes match
- [x] `SUTRA-P057-07` Bundle good and deliberately bad fixtures with stable error codes and no secret-bearing fields
- [x] `SUTRA-P057-08` Provide a tiny framework-free `#t=start,end` cue-link helper with no player dependency
- [x] `SUTRA-P057-09` Provide a clean-host CLI/quickstart targeted at first success within 15 minutes
- [x] `SUTRA-P057-10` Close phase 057 only after widened CI runs the annotation tests and CLI, and docs state that matching hashes prove bytes rather than truth.

## Phase 058 - Consent inspector (completed earlier; example-only now)

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Scope note:** This phase was validly completed before `SUTRA-DECISION-0010`. Keep the module/tests as an example of the required peer-contact boundary, but do not position it as the flagship community artifact and do not spend release-critical time polishing it.
- **Intent:** Framework-neutral origin/purpose/disclosure approval with redacted decisions.
- **Phase exit:** Another static page can use it; denial emits no fetch and exports contain no credential canary.

- [x] `SUTRA-P058-01` Extract consent events and policy display into a reusable module
- [x] `SUTRA-P058-02` Define framework-neutral origin, purpose and disclosure inputs
- [x] `SUTRA-P058-03` Provide a plain browser example outside the learner app
- [x] `SUTRA-P058-04` Verify denial emits no network request
- [x] `SUTRA-P058-05` Support explicit approval scope and redacted outcome display
- [x] `SUTRA-P058-06` Keep model credentials and raw private prompts out of exports
- [x] `SUTRA-P058-07` Document that consent visibility is not a publisher reputation system
- [x] `SUTRA-P058-08` Test integration without the DHAGO player or SUTRA corpus
- [x] `SUTRA-P058-09` Retain the framework-neutral example as secondary Open Kit material
- [x] `SUTRA-P058-10` Historical phase exit remains evidenced; no additional release polish is required.

## Phase 059 - Deferred general agentic-site starter

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Scope decision:** `SUTRA-DECISION-0010`. A broad starter duplicates work already common among challenge entrants and is cut before the evidence validator, BYOK and real interoperability proof. The small peer package may remain as an example, not a release-critical starter product.
- **Intent if resumed:** Build a minimal reusable agentic-site starter after the flagship evidence tool has outside validation.
- **Phase exit if resumed:** A clean install serves the example without the main app; manifest and exact-name peer loading work.

- [-] `SUTRA-P059-01` Create a minimal two-agent starter with synthetic licensed content
- [-] `SUTRA-P059-02` Include manifest, resolved graph and named peer-link examples
- [-] `SUTRA-P059-03` Wire a pinned runtime and one safe registered local action
- [-] `SUTRA-P059-04` Document default inference setup without embedding real secrets
- [-] `SUTRA-P059-05` Include a second-origin example and denied-origin walkthrough
- [-] `SUTRA-P059-06` Keep starter build/install commands independent of the learner app
- [-] `SUTRA-P059-07` Retain required upstream license and NOTICE material
- [-] `SUTRA-P059-08` Verify clean publication and exact-name network loading
- [-] `SUTRA-P059-09` Produce and review the phase artifact only if this optional starter is resumed
- [-] `SUTRA-P059-10` Close phase 059 only if the starter is later resumed and evidenced.

## Phase 060 - Package the evidence-first Open Kit candidate

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 57; completed consent/peer examples may accompany it but are not required flagship artifacts.
- **Intent:** Make the Web Annotation media-evidence validator the primary reusable contribution. Keep the consent inspector and static peer as small secondary examples. Optimize the flagship for an outside developer to reach a valid result within 15 minutes.
- **Phase exit:** The evidence package has an immutable candidate version, standards mapping, CLI/API/cue-link entry points, synthetic fixtures, license and one-command tests; no private key or SUTRA-only corpus is required.

- [ ] `SUTRA-P060-01` Assign an immutable candidate version to the evidence profile/package
- [ ] `SUTRA-P060-02` Lead the Open Kit docs with the Web Annotation + Media Fragments + SRI mapping
- [ ] `SUTRA-P060-03` Provide CLI, browser API and tiny cue-link entry points with one synthetic fixture set
- [ ] `SUTRA-P060-04` Keep the 15-minute quickstart independent of the player, learner, peer and inference services
- [ ] `SUTRA-P060-05` Retain Apache-compatible notices and clearly label project checks as non-official conformance checks
- [ ] `SUTRA-P060-06` Preserve the hash-versus-truth boundary in all examples and output wording
- [ ] `SUTRA-P060-07` Scan the candidate package/archive for private material and secret canaries
- [ ] `SUTRA-P060-08` Keep consent inspector and static peer as optional examples rather than equal-weight products
- [ ] `SUTRA-P060-09` Record the exact candidate hash/version and what remains unverified before outside trials
- [ ] `SUTRA-P060-10` Close phase 060 only after one clean documented install reproduces the validator result without private context.

