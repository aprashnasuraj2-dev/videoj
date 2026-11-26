# 03. Browser agent runtime

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **1-5 Dec 2026**. This is a target window, not proof of work.

A real portable network executing in the browser with funded inference.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 021 - Publish the local agent graph

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 14,17,20. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Author learner/front and evidence agents in the canonical data model. Publish resolved JSON without includes, environment substitutions or server paths. Keep tools narrowly scoped.
- **Phase exit:** Front agent, agent references and invocation schemas validate; portable data contains no executable payloads or secrets.

- [x] `SUTRA-P021-01` Author a front learner agent with a stable network identity
- [x] `SUTRA-P021-02` Author a separate evidence agent with a narrow grounded role
- [x] `SUTRA-P021-03` Use the canonical Neuro SAN data model rather than an invented schema
- [x] `SUTRA-P021-04` Resolve authoring includes and substitutions before publication
- [x] `SUTRA-P021-05` Validate unique agent names and declared internal call references
- [x] `SUTRA-P021-06` Declare callable input schemas and structured output where supported
- [x] `SUTRA-P021-07` Exclude credentials, local filesystem paths and executable payloads
- [x] `SUTRA-P021-08` Preserve public instructions and attribution without claiming confidentiality
- [x] `SUTRA-P021-09` Produce and review the phase artifact: sutra.network.json plus authoring source.
- [x] `SUTRA-P021-10` Close phase 021 only after its applicable tasks have evidence and its exit condition is observed: Front agent, agent references and invocation schemas validate; portable data contains no executable payloads or secrets.

## Phase 022 - Publish the manifest and peer links

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 21. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Create agent-manifest.json, links.json and peer policy using the selected runtime schema. Resolve network URLs exactly; keep public discovery files distinct from executable actions.
- **Phase exit:** A caller resolves /agents/learner through /agents/agent-manifest.json and selects only the exact named entry.

- [x] `SUTRA-P022-01` Create agent-manifest.json matching the pinned runtime schema
- [x] `SUTRA-P022-02` Declare each network name, front_man and hocon location exactly
- [x] `SUTRA-P022-03` Publish the resolved network JSON at the declared HTTP path
- [x] `SUTRA-P022-04` Create links.json with exact symbolic-to-peer-network bindings
- [x] `SUTRA-P022-05` Declare peer policy independently from address resolution
- [x] `SUTRA-P022-06` Keep top-site inference configuration distinct from peer metadata
- [x] `SUTRA-P022-07` Check trailing slashes, relative URLs and nested site-base resolution
- [x] `SUTRA-P022-08` List manifest, graph, links and runtime URLs in a public artifact inventory
- [x] `SUTRA-P022-09` Produce and review the phase artifact: Public artifact bundle and URL inventory.
- [x] `SUTRA-P022-10` Close phase 022 only after its applicable tasks have evidence and its exit condition is observed: A caller resolves /agents/learner through /agents/agent-manifest.json and selects only the exact named entry.

## Phase 023 - Mount real browser orchestration

- **Baseline effort:** 3 person-hours; **owner:** E.
- **Original phase dependencies:** 14,21-22. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Load the pinned runtime modules into SUTRA and execute the graph in page JavaScript. Instrument delegation and tool calls while leaving model inference at its configured endpoint.
- **Phase exit:** Browser traces prove graph execution and internal delegation; a server-only chat endpoint is insufficient.

- [x] `SUTRA-P023-01` Mount the pinned browser runtime in the standalone app
- [x] `SUTRA-P023-02` Parse the public graph in JavaScript executed by the browser
- [ ] `SUTRA-P023-03` Start a real front-agent invocation using configured inference
- [x] `SUTRA-P023-04` Observe an internal agent delegation and structured return
- [x] `SUTRA-P023-05` Expose narrow registered actions through the runtime interface
- [x] `SUTRA-P023-06` Record browser execution evidence separately from provider inference execution
- [x] `SUTRA-P023-07` Ensure the server proxy does not secretly own orchestration
- [x] `SUTRA-P023-08` Verify initial errors are visible without opening developer tools
- [x] `SUTRA-P023-09` Produce and review the phase artifact: Runtime entry module and first local run.
- [ ] `SUTRA-P023-10` Close phase 023 only after its applicable tasks have evidence and its exit condition is observed: Browser traces prove graph execution and internal delegation; a server-only chat endpoint is insufficient.

## Phase 024 - Add pre-execution network validation

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 23. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Reject duplicate agents, missing references, invalid fronts, unsupported definitions and schema-invalid arguments before model calls. Limit artifact size and parser work.
- **Phase exit:** Invalid examples generate visible errors and zero inference requests; supported valid graphs still run.

- [x] `SUTRA-P024-01` Reject duplicate names and nonexistent front agents before inference
- [x] `SUTRA-P024-02` Reject missing internal references and malformed JSON schemas
- [x] `SUTRA-P024-03` Reject unsupported executable definitions and unbounded artifact sizes
- [x] `SUTRA-P024-04` Validate model-generated tool arguments before dispatch
- [x] `SUTRA-P024-05` Handle invalid Unicode, deeply nested input and parser failures safely
- [x] `SUTRA-P024-06` Verify each invalid fixture causes zero model calls
- [x] `SUTRA-P024-07` Retain a valid control graph proving validation is not universally rejecting
- [x] `SUTRA-P024-08` Render specific actionable errors without private context or stack secrets
- [x] `SUTRA-P024-09` Produce and review the phase artifact: Network validator and adversarial fixtures.
- [x] `SUTRA-P024-10` Close phase 024 only after its applicable tasks have evidence and its exit condition is observed: Invalid examples generate visible errors and zero inference requests; supported valid graphs still run.

## Phase 025 - Provide funded default inference

- **Baseline effort:** 3 person-hours; **owner:** E+P.
- **Original phase dependencies:** 07,23. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Implement a narrow same-origin default-inference proxy with a fixed approved upstream and model policy. Keep its provider credential server-side. Stream output and enforce payload and output ceilings.
- **Phase exit:** A new visitor completes the live task without bringing a key; no provider secret appears in assets, prompts or logs.

- [x] `SUTRA-P025-01` Implement one narrow same-origin default-inference endpoint
- [ ] `SUTRA-P025-02` Select a fixed approved provider origin and permitted model list
- [x] `SUTRA-P025-03` Keep the provider credential in server-managed configuration only
- [x] `SUTRA-P025-04` Enforce input size, output token and model request ceilings
- [x] `SUTRA-P025-05` Stream supported provider responses through the bounded adapter
- [x] `SUTRA-P025-06` Prevent arbitrary URL forwarding and server-side request forgery
- [ ] `SUTRA-P025-07` Verify a clean visitor can run without supplying credentials
- [x] `SUTRA-P025-08` Check generated assets, logs and error responses for secret exposure
- [x] `SUTRA-P025-09` Produce and review the phase artifact: Default inference endpoint and setup documentation.
- [ ] `SUTRA-P025-10` Close phase 025 only after its applicable tasks have evidence and its exit condition is observed: A new visitor completes the live task without bringing a key; no provider secret appears in assets, prompts or logs.

## Phase 026 - Support streaming, cancellation and errors

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 25. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Handle streamed function calls, user cancellation, malformed model responses, provider errors and incomplete streams. Abort child operations when the run is cancelled.
- **Phase exit:** Cancellation prevents new calls; an interrupted answer is visibly incomplete and is never presented as a completed verified result.

- [x] `SUTRA-P026-01` Represent idle, running, cancelling, failed and complete states explicitly
- [x] `SUTRA-P026-02` Assemble streamed function-call arguments only after valid completion
- [x] `SUTRA-P026-03` Handle malformed model output and unexpected provider payloads
- [x] `SUTRA-P026-04` Propagate model and child-agent errors without inventing success
- [x] `SUTRA-P026-05` Abort outstanding reads and prevent new children after cancellation
- [x] `SUTRA-P026-06` Label interrupted text as incomplete rather than verified output
- [x] `SUTRA-P026-07` Bound retries for clearly failed reads with recorded attempt counts
- [x] `SUTRA-P026-08` Verify cancellation does not disrupt ordinary media controls
- [x] `SUTRA-P026-09` Produce and review the phase artifact: Typed run lifecycle and actionable error states.
- [x] `SUTRA-P026-10` Close phase 026 only after its applicable tasks have evidence and its exit condition is observed: Cancellation prevents new calls; an interrupted answer is visibly incomplete and is never presented as a completed verified result.

## Phase 027 - Register grounded local read actions

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 16,23-24. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Expose exact catalog actions for lesson search, source excerpt retrieval and current playback state. Validate input and result schemas; never grant arbitrary DOM or fetch access.
- **Phase exit:** The runtime calls an internal agent and a grounded local capability using validated arguments.

- [x] `SUTRA-P027-01` Register exact names and purpose for transcript search and excerpt reads
- [x] `SUTRA-P027-02` Declare effect classes and input schemas for each local capability
- [x] `SUTRA-P027-03` Return only corpus-scoped source IDs and bounded excerpt data
- [x] `SUTRA-P027-04` Expose actual playback state through a safe read adapter
- [x] `SUTRA-P027-05` Prevent arbitrary DOM access, script execution and unrestricted fetch arguments
- [x] `SUTRA-P027-06` Validate action output before agents or UI consume it
- [x] `SUTRA-P027-07` Observe an internal agent invoking a grounded local capability
- [x] `SUTRA-P027-08` Show unavailable capabilities clearly rather than bypassing browser restrictions
- [x] `SUTRA-P027-09` Produce and review the phase artifact: Read-action registry and bounded retrieval functions.
- [x] `SUTRA-P027-10` Close phase 027 only after its applicable tasks have evidence and its exit condition is observed: The runtime calls an internal agent and a grounded local capability using validated arguments.

## Phase 028 - Implement execution budgets

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 23,26-27. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Start with depth 3, 12 agent invocations, 8 remote calls, concurrency 2 and a 60-second wall-clock ceiling. Track output tokens and bounded history independently.
- **Phase exit:** A composition cycle and an intentional over-budget request stop predictably; ordinary repeated-agent work is not falsely rejected as a cycle.

- [x] `SUTRA-P028-01` Configure finite composition depth and total invocation count
- [x] `SUTRA-P028-02` Configure remote-call count, concurrency and wall-clock ceilings
- [x] `SUTRA-P028-03` Bound history, artifact sizes, output tokens and tool result size
- [x] `SUTRA-P028-04` Account for nested peer work inside the caller’s active budget
- [x] `SUTRA-P028-05` Detect actual composition cycles without banning legitimate repeated agents
- [x] `SUTRA-P028-06` Cancel descendants and stop further requests when a budget is exhausted
- [x] `SUTRA-P028-07` Show which limit stopped execution and preserve safe partial results
- [x] `SUTRA-P028-08` Exercise each limit using deterministic fixtures and a valid control run
- [x] `SUTRA-P028-09` Produce and review the phase artifact: Runtime budget controller and limit diagnostics.
- [x] `SUTRA-P028-10` Close phase 028 only after its applicable tasks have evidence and its exit condition is observed: A composition cycle and an intentional over-budget request stop predictably; ordinary repeated-agent work is not falsely rejected as a cycle.

## Phase 029 - Implement reviewed local write actions

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 17,27. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Add save-review-card and export-receipt with explicit effect classification. Bind the reviewed payload to the executed action and source version. Surface persisted receipt or unknown outcome accurately.
- **Phase exit:** Cancelling writes changes no stored state; changing arguments after review requires a fresh confirmation.

- [x] `SUTRA-P029-01` Register save-review-card and export-receipt with explicit effects
- [x] `SUTRA-P029-02` Validate proposed payload and bind it to the current source version
- [x] `SUTRA-P029-03` Show destination, arguments and local persistence meaning before confirmation
- [x] `SUTRA-P029-04` Require a new confirmation if the reviewed payload changes
- [x] `SUTRA-P029-05` Prevent cancellation from changing stored user data
- [x] `SUTRA-P029-06` Bind request ID and receipt to the actual executed proposal
- [x] `SUTRA-P029-07` Distinguish successful persistence, rejection and unknown outcome
- [x] `SUTRA-P029-08` Ensure the browser never blindly repeats an ambiguous write
- [x] `SUTRA-P029-09` Produce and review the phase artifact: Write proposal, confirmation and receipt flow.
- [x] `SUTRA-P029-10` Close phase 029 only after its applicable tasks have evidence and its exit condition is observed: Cancelling writes changes no stored state; changing arguments after review requires a fresh confirmation.

## Phase 030 - Add optional direct BYOK safely

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 25-29. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Offer only a tested browser-CORS-compatible router path with in-memory credentials and clear deletion. Keep the funded default as the judge path. If capacity is short, remove BYOK UI and publish it as unsupported.
- **Phase exit:** If shipped, keys go only to the selected router and never to peer artifacts, actions, analytics, traces or exports.

- [x] `SUTRA-P030-01` Decide whether optional BYOK remains in scope after the default path works
- [-] `SUTRA-P030-02` Use only a tested permitted router with browser CORS support
- [-] `SUTRA-P030-03` Keep BYOK credentials in memory and provide explicit deletion
- [x] `SUTRA-P030-04` Prevent peer metadata from overriding caller router or model policy
- [-] `SUTRA-P030-05` Send keys only in authorized model requests to the selected router
- [-] `SUTRA-P030-06` Check URLs, prompts, actions, traces, analytics and exports for key canaries
- [-] `SUTRA-P030-07` Stop with a clear setup error if a required key is absent
- [x] `SUTRA-P030-08` If omitted, remove BYOK affordances and record the optional-scope decision
- [x] `SUTRA-P030-09` Produce and review the phase artifact: BYOK adapter and disclosure, or a documented omission decision.
- [x] `SUTRA-P030-10` Close phase 030 only after its applicable tasks have evidence and its exit condition is observed: If shipped, keys go only to the selected router and never to peer artifacts, actions, analytics, traces or exports.
