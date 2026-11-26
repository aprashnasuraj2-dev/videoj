# SUTRA session 0007 — invoking-network peer errors and caller-local execution

- Observed evidence: 2026-11-23T18:29:19+05:45.
- Last tested source code candidate: `3b37a73db0a03577b81f3d34346ea70ff46ea0a5`.
- Draft development PR: https://github.com/aprashnasuraj2-dev/videoj/pull/49
- Green run: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45176985173/job/137700681281
- No public deployment, actual live model, separately owned peer, public HTTPS validation, community adoption or official submission occurred.

## Implemented source

1. The restricted host can now opt into exact public peer URLs only when `runNetwork` receives a consent inspector. Its compile step retains default-deny external references. HTTP exceptions are constrained to loopback hosts for test development.
2. The existing consent-aware artifact loader fetches manifest and graph separately, without browser credentials. Invalid URLs, missing names, malformed graphs and executable metadata do not fall back to another peer.
3. The host compiles fetched peer data into the pinned `AgentNetwork` model and invokes the peer front agent **within the caller process**, through the same injected model adapter, trace, agent budget, model budget and abort signal. Coded tools, third-party MCP, peer-side REST and nested remote execution remain disabled.
4. A peer artifact/load error is promoted to the invoking host's failure channel with a sanitized stable code. A failed peer load cannot be transformed by the model's next step into a reported completed result. Specific examples: `PEER_NETWORK_MATCH`, `PEER_MANIFEST_UNAVAILABLE`, `PEER_GRAPH_UNAVAILABLE`, `PEER_CONSENT_DENIED`, `PEER_CYCLE`.
5. Runtime trace events expose only bounded safe fields including public network/origin labels. Prompts, arguments, internal traces and credential values are not included in the host's exported event stream.

## Verified tests

- 21/21 learner app tests passed.
- 37/37 consent, inference, source tools and API tests passed.
- 72/72 runtime/loader tests passed, including the newly added peer invocation, exact mismatch, missing manifest/graph, denial, malformed graph, budget sharing and default-disabled cases.
- 7/7 independent peer-package tests passed.
- Ten unchanged pinned upstream nsDeploy modules passed the integrity check.
- Three Chromium integration scripts passed. The new two-origin (HTTP loopback) test observed: denial with **zero peer requests**; approval with **exactly two artifact GETs**, no cookies; execution of three local agents and five scripted model steps; distinct caller/peer trace labels; a wrong-name request fetching the manifest only and failing with `PEER_NETWORK_MATCH`. The existing learner, media-timing and standalone consent browser checks also passed.
- The browser peer package ran on a separate local server; no private remote peer execution service was used. It is **not** evidence of production/staging HTTPS CORS or a different publisher.

## Intermediate failure history retained

- First runtime run failed because the test expected four agent invocations; the real caller + peer front + peer helper count is three. The test assertion was corrected.
- Initial browser wiring rejected HTTP loopback because the opt-in compilation regex only allowed HTTPS; corrected to allow HTTP **only when the existing URL validator proves loopback**.
- Added HTTP/JSON error-stage tests exposed a `CONTACT_RESPONSE` exception that was not mapped to the manifest-vs-graph failure stage. The mapping now covers bounded contact failures while preserving consent/cancellation codes.
- Browser consent test initially read the runtime trace array rather than the consent inspector's own redacted decision array; the assertion was corrected.
- Adding safe trace labels invalidated the previous allowlist assertion; the assertion was updated for bounded public `origin` and `network` fields.
- Final green evidence is **only** run 45176985173 at the listed source revision. Earlier failed runs remain visible in CI history and are not credited.

## Unfinished and limits

- `SUTRA-P035-05` remains open for a credential/BYOK canary exercise under a configured private provider; no real provider credential was supplied or used.
- `SUTRA-P033-03` remains open: external MCP discovery and tool-call consent are not integrated into the host transport. A consent helper supporting those contact kinds alone does not count.
- Phase 034 production HTTPS CORS remains unverified. Phase 035 exit remains open while private-context and credential handling lack their full evidence.
- Original rights-cleared content, factual human review, provider approval/budget, consenting testers/devices, independent builder adoption and entrant eligibility still need participant input.
- Public release, paid inference, route/domain binding, promotion, final ZIP and Devpost submission remain closed by the participant's explicit release gate.

## Resume

Next: integrate `SUTRA-P033-03` default-deny third-party MCP discovery and invocation consent through a narrowly injected, credentialless read-only client; then exercise `SUTRA-P035-05` synthetic private credential canaries. Keep the public gate closed. Maintain the SUTRA-only scope and the pinned upstream vendor files.
