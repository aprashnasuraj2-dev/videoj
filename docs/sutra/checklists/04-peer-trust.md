# 04. Peer composition and trust

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **6-10 Dec 2026**. This is a target window, not proof of work.

Two-origin execution, permission boundaries and observable failures.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 031 - Build the standalone peer source site

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 18,22,28. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Publish a second app under apps/sutra-peer/ with a checklist front agent and a source-selection helper. Give it its own static build and understandable human page.
- **Phase exit:** The peer is independently fetchable on a distinct HTTPS origin, with no dependency on the caller bundle.

- [x] `SUTRA-P031-01` Create an independent apps/sutra-peer static package and build output
- [x] `SUTRA-P031-02` Publish a checklist front agent and narrow source-selection helper
- [ ] `SUTRA-P031-03` Serve a human-readable guide page with actual corpus provenance
- [x] `SUTRA-P031-04` Keep its public graph declarative and independently fetchable
- [x] `SUTRA-P031-05` Avoid requiring caller UI imports or a private agent server
- [x] `SUTRA-P031-06` Expose the exact checklist network identifier through its own manifest
- [x] `SUTRA-P031-07` Prepare distinct preview and production origin configuration
- [x] `SUTRA-P031-08` State both public origins are controlled by the same project owner
- [x] `SUTRA-P031-09` Produce and review the phase artifact: Peer graph, manifest, links and source page.
- [ ] `SUTRA-P031-10` Close phase 031 only after its applicable tasks have evidence and its exit condition is observed: The peer is independently fetchable on a distinct HTTPS origin, with no dependency on the caller bundle.

## Phase 032 - Resolve peers by exact network name

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 22,31. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Implement the base-path manifest lookup and exact name match; resolve declared graph URLs safely. Reject missing entries rather than choosing a similarly named network.
- **Phase exit:** Wrong-name, missing-manifest and malformed-definition cases fail closed with a specific visible explanation.

- [x] `SUTRA-P032-01` Derive the peer site base from the network URL path correctly
- [x] `SUTRA-P032-02` Fetch the manifest at that derived base after consent
- [x] `SUTRA-P032-03` Select only an exactly matching network name
- [x] `SUTRA-P032-04` Resolve declared hocon locations against the correct site base
- [x] `SUTRA-P032-05` Reject missing entry, malformed manifest and unsupported graph types
- [x] `SUTRA-P032-06` Handle query fragments, encoded paths and trailing-slash ambiguity deliberately
- [x] `SUTRA-P032-07` Avoid fallback to a default or similarly named network
- [x] `SUTRA-P032-08` Preserve a specific failure result for the invoking network
- [x] `SUTRA-P032-09` Produce and review the phase artifact: Peer loader and name-resolution test fixtures.
- [x] `SUTRA-P032-10` Close phase 032 only after its applicable tasks have evidence and its exit condition is observed: Wrong-name, missing-manifest and malformed-definition cases fail closed with a specific visible explanation.

## Phase 033 - Ask permission before external contact

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 32. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Display destination origin, purpose and intended disclosure before peer fetches and third-party MCP discovery/calls. Keep default per-contact approval; remember session-scoped approval only after explicit user choice.
- **Phase exit:** Network recording shows no unapproved peer request; denial leaves the local video and local evidence usable.

- [x] `SUTRA-P033-01` Show intended external origin and purpose before the first contact
- [x] `SUTRA-P033-02` Obtain approval before manifest fetch and graph retrieval
- [x] `SUTRA-P033-03` Apply consent checks before third-party MCP discovery and calls
- [x] `SUTRA-P033-04` Implement denial with no network request side effect
- [x] `SUTRA-P033-05` Use per-contact approval as the initial policy
- [x] `SUTRA-P033-06` Allow session-scoped remembered decisions only through an explicit user choice
- [x] `SUTRA-P033-07` Show intended data disclosure without leaking hidden private context
- [x] `SUTRA-P033-08` Record consent scope and decisions in a redacted inspectable event stream
- [x] `SUTRA-P033-09` Produce and review the phase artifact: Consent UI, state machine and decision record.
- [x] `SUTRA-P033-10` Close phase 033 only after its applicable tasks have evidence and its exit condition is observed: Network recording shows no unapproved peer request; denial leaves the local video and local evidence usable.

## Phase 034 - Verify public artifact CORS

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 31-33. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Apply CORS only to intended public artifacts and inspect real browser fetches. Fetch manifests and graphs without caller credentials; keep inference and action policies separate.
- **Phase exit:** Public artifacts load from a caller origin; credentialed wildcard configurations and accidental private responses are absent.

- [ ] `SUTRA-P034-01` Serve public artifact CORS from both staging and intended public origins
- [ ] `SUTRA-P034-02` Fetch public manifests and graphs without caller credentials
- [ ] `SUTRA-P034-03` Allow only the methods and headers required by artifact access
- [ ] `SUTRA-P034-04` Keep authentication and inference policies separate from public artifact CORS
- [ ] `SUTRA-P034-05` Verify browser behavior rather than curl success alone
- [ ] `SUTRA-P034-06` Reject credentialed wildcard assumptions and private-response exposure
- [ ] `SUTRA-P034-07` Check missing CORS and failed preflight produce usable errors
- [ ] `SUTRA-P034-08` Document cross-origin permissions independently from publisher trust
- [ ] `SUTRA-P034-09` Produce and review the phase artifact: Header checks and cross-origin browser evidence.
- [ ] `SUTRA-P034-10` Close phase 034 only after its applicable tasks have evidence and its exit condition is observed: Public artifacts load from a caller origin; credentialed wildcard configurations and accidental private responses are absent.

## Phase 035 - Run the peer in the caller browser

- **Baseline effort:** 2.5 person-hours; **owner:** E.
- **Original phase dependencies:** 23,32-34. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Instantiate the fetched peer graph in the active browser runtime. It inherits the caller router, model policy and execution limits; do not call a private remote peer agent service.
- **Phase exit:** One browser trace shows local graph -> peer graph -> structured result, with model requests staying on the caller inference path.

- [x] `SUTRA-P035-01` Instantiate the fetched peer data in the active caller runtime
- [x] `SUTRA-P035-02` Use the caller’s approved inference router and model policy
- [x] `SUTRA-P035-03` Share caller execution ceilings across peer delegation
- [x] `SUTRA-P035-04` Return the peer front-agent structured result through normal tool results
- [x] `SUTRA-P035-05` Prevent the peer from receiving provider or BYOK credentials
- [x] `SUTRA-P035-06` Show local and peer-network invocations in one browser trace
- [x] `SUTRA-P035-07` Ensure the peer origin receives artifacts-only requests as designed
- [x] `SUTRA-P035-08` Demonstrate equivalent loading with no private remote execution service
- [x] `SUTRA-P035-09` Produce and review the phase artifact: End-to-end browser composition proof.
- [x] `SUTRA-P035-10` Close phase 035 only after its applicable tasks have evidence and its exit condition is observed: One browser trace shows local graph -> peer graph -> structured result, with model requests staying on the caller inference path.

## Phase 036 - Enforce private-context allow rules

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 35. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Keep private context outside ordinary text. Deny transfer by default and allow only explicitly named fields for the destination network. Explain that ordinary delegated text can still disclose data.
- **Phase exit:** Synthetic secret canaries are absent from peer requests, prompts, outputs and trace export unless a specifically allowed test field is used.

- [x] `SUTRA-P036-01` Keep private context separate from ordinary request/response text
- [x] `SUTRA-P036-02` Deny private-field forwarding across network boundaries by default
- [x] `SUTRA-P036-03` Bind allowed fields to an exact destination network identity
- [x] `SUTRA-P036-04` Apply separate upstream and downstream forwarding permissions
- [x] `SUTRA-P036-05` Use synthetic secret canaries to inspect prompts and network requests
- [x] `SUTRA-P036-06` Verify peer results cannot smuggle forbidden private fields into receipts
- [x] `SUTRA-P036-07` Explain that plain delegated text is not filtered as private context
- [x] `SUTRA-P036-08` Test both denied forwarding and an explicitly permitted non-secret field
- [x] `SUTRA-P036-09` Produce and review the phase artifact: Destination-scoped context filter and canary tests.
- [x] `SUTRA-P036-10` Close phase 036 only after its applicable tasks have evidence and its exit condition is observed: Synthetic secret canaries are absent from peer requests, prompts, outputs and trace export unless a specifically allowed test field is used.

## Phase 037 - Handle redirects and policy changes

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 33-36. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Check new destinations when redirects change origin. Limit declared artifact origins and re-evaluate cached approvals when scope changes. Fail closed when browser redirect behavior cannot enforce the policy.
- **Phase exit:** A redirect to an unapproved origin cannot silently expand access; the original site remains responsive.

- [ ] `SUTRA-P037-01` Identify redirects that change destination origin before further disclosure
- [ ] `SUTRA-P037-02` Reapply destination policy and required consent at each changed origin
- [ ] `SUTRA-P037-03` Bound the set of acceptable declared artifact destinations
- [ ] `SUTRA-P037-04` Re-evaluate approval when peer scope or content binding changes materially
- [x] `SUTRA-P037-05` Avoid leaking authentication headers across redirect chains
- [x] `SUTRA-P037-06` Handle browser redirect limitations by failing closed when necessary
- [x] `SUTRA-P037-07` Test same-origin, changed-origin, looping and denied redirect fixtures
- [x] `SUTRA-P037-08` Keep the local lesson functional after a blocked peer redirect
- [x] `SUTRA-P037-09` Produce and review the phase artifact: Redirect fixtures and policy-change handling.
- [ ] `SUTRA-P037-10` Close phase 037 only after its applicable tasks have evidence and its exit condition is observed: A redirect to an unapproved origin cannot silently expand access; the original site remains responsive.

## Phase 038 - Keep untrusted peer instructions contained

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 24,28,36. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Treat peer instructions and source text as untrusted model input. Remove arbitrary action/fetch access and remote coded-tool execution from this release. Test attempts to leak context or alter routing.
- **Phase exit:** Test attacks cannot cause a blocked destination, unreviewed write, key leak or router override; limitations of prompt defenses are stated.

- [ ] `SUTRA-P038-01` Treat peer instructions, transcript text and tool results as untrusted
- [x] `SUTRA-P038-02` Create fixtures attempting key exfiltration and private-context disclosure
- [x] `SUTRA-P038-03` Create fixtures attempting router override and unapproved destination calls
- [x] `SUTRA-P038-04` Create fixtures attempting unreviewed writes and argument substitution
- [x] `SUTRA-P038-05` Keep remote executable tool loading outside this release
- [x] `SUTRA-P038-06` Validate final action arguments with runtime-owned policy checks
- [x] `SUTRA-P038-07` Verify prompt-level defenses are not the only containment mechanism
- [x] `SUTRA-P038-08` Record residual model manipulation risks without claiming universal immunity
- [x] `SUTRA-P038-09` Produce and review the phase artifact: Adversarial peer fixture set and containment report.
- [ ] `SUTRA-P038-10` Close phase 038 only after its applicable tasks have evidence and its exit condition is observed: Test attacks cannot cause a blocked destination, unreviewed write, key leak or router override; limitations of prompt defenses are stated.

## Phase 039 - Add a compatible read-only MCP path

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 27,33,38. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Exercise the runtime MCP adapter against a controlled read-only test service or public permitted service. Confirm discovery and call consent, bounded results and clear CORS failure behavior.
- **Phase exit:** At least one authorized tool read works; unavailable endpoints never trigger browser-security bypasses.

- [x] `SUTRA-P039-01` Choose a controlled or explicitly permitted read-only MCP service
- [x] `SUTRA-P039-02` Verify the pinned runtime’s MCP discovery and invocation support
- [x] `SUTRA-P039-03` Ask permission before discovery and before calls according to policy
- [x] `SUTRA-P039-04` Apply allowed-tool names and bounded argument/result schemas
- [x] `SUTRA-P039-05` Test successful grounded read, discovery error and service timeout
- [x] `SUTRA-P039-06` Verify browser CORS and fail closed when access is unavailable
- [x] `SUTRA-P039-07` Keep MCP authentication distinct from LLM router credentials
- [x] `SUTRA-P039-08` Document the tested endpoint behavior without implying production availability
- [x] `SUTRA-P039-09` Produce and review the phase artifact: MCP compatibility fixture and documented integration instructions.
- [x] `SUTRA-P039-10` Close phase 039 only after its applicable tasks have evidence and its exit condition is observed: At least one authorized tool read works; unavailable endpoints never trigger browser-security bypasses.

## Phase 040 - Close the interoperability milestone

- **Baseline effort:** 1.5 person-hours; **owner:** E+P.
- **Original phase dependencies:** 30-39. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Replay the specification checklist on two HTTPS origins. Include denial, invalid graph, cycle, budget, private context and router inheritance. Distinguish the two same-owner origins from independent adoption.
- **Phase exit:** All required observable behaviors pass or block progression; no extension is represented as a normative requirement.

- [ ] `SUTRA-P040-01` Replay the complete specification interoperability checklist on HTTPS
- [ ] `SUTRA-P040-02` Verify two-agent publication and actual grounded internal invocation
- [ ] `SUTRA-P040-03` Verify exact-name second-origin loading and caller-local execution
- [ ] `SUTRA-P040-04` Verify denied origin, invalid graph, cycle and budget refusal behavior
- [ ] `SUTRA-P040-05` Verify router inheritance and private-context denial with canaries
- [ ] `SUTRA-P040-06` Link every mandatory check to a dated source revision and evidence
- [ ] `SUTRA-P040-07` Distinguish optional extensions from the core conformance claim
- [ ] `SUTRA-P040-08` Block the milestone on missing evidence or a critical boundary failure
- [ ] `SUTRA-P040-09` Produce and review the phase artifact: Milestone B evidence and conformance gap list.
- [ ] `SUTRA-P040-10` Close phase 040 only after its applicable tasks have evidence and its exit condition is observed: All required observable behaviors pass or block progression; no extension is represented as a normative requirement.
