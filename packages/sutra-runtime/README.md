# SUTRA restricted browser runtime - v0.1.0

A host adapter around the **unchanged nsDeploy reference AgentNetwork/kernel and agent loop**, pinned to commit `486ecf26aa8775963f9b765f894734bef1ac9817`. The vendored core, generated modules, exact Git blob/SHA-256 inventory and Apache-2.0 license are in vendor/nsdeploy. No optional LangChain bundle or framework dependency is required.

```sh
node packages/sutra-runtime/verify-vendor.mjs
node --test packages/sutra-runtime/test/*.test.mjs
```

The package imports no player or learner UI and has its own graph example/test fixtures. It is an early source distribution, not an npm registry publication or claim of challenge conformance.

## Current behavior

- compileNetwork validates a bounded resolved JSON graph in the canonical Neuro SAN data model through the reference kernel plus a restricted host policy. It rejects duplicate names, missing/front references, executable definitions, unapproved external capabilities, unsupported invocation schemas, directed cycles and excessive depth before model work.
- runNetwork executes the reference multi-agent loop with an explicitly injected model adapter. No missing adapter silently falls back to a mock. A scripted-test adapter is provided separately under testing.js; the app names that mode conspicuously. No provider or paid inference is connected by this package. Peer loading and caller-local execution are opt-in developer integration surfaces, not live public deployment.
- loadLocalNetwork retrieves one exact published network from a same-origin manifest/JSON graph with credential-free, redirect-rejecting, bounded JSON reads. The whole artifact load has a five-second maximum. HTML fallbacks, duplicate/wrong names and executable publication metadata fail closed. Cross-origin peer loading requires the separate consent-aware loader and an explicitly injected inspector; ordinary local loading remains same-origin.
- Default runtime ceilings: depth 3; 12 agent invocations; 8 model calls; 8 steps/agent; 2 concurrent model calls; 60 seconds elapsed; 16,000 returned model-content characters. Hosts may reduce ceilings, never widen them through this API. Graph is <=64 KiB, public manifest <=16 KiB, request <=2,000 characters, invocation arguments <=8,000 characters and per-model tool calls <=2.
- Cancellation/timeouts stop subsequent calls and settle the caller even if an injected adapter ignores its abort signal. Adapters must also honor cancellation to stop their own external work; this wrapper cannot undo a request already sent by an adapter.
- Caller-visible events contain only phase, kind, IDs, status, agent and tool names. They omit prompt text, raw arguments and model output. The host must avoid placing secrets in public graph identities or its own adapter logs.

## Scope and limits

By default this local profile rejects external peers and MCP/REST/coded capabilities. An explicit `peerRuntime` inspector enables only data-only HTTPS peers (or HTTP loopback in tests). Third-party MCP, REST and coded capabilities remain disabled rather than bypassing missing consent/transport controls. Site actions, funded inference, stream UI, cross-origin composition and the complete specification are still pending. Scripted delegation is useful for integration checks; it is not live AI, independent adoption, semantic grounding or factual verification. An injected provider adapter is a host integration surface, not a shipped funded provider route.

We reuse the reference runner instead of creating a new agent framework. The explicit SUTRA host restricts capabilities and applies additional validation/budgets outside model instructions. The full Engine/UI import was rejected for this spike to avoid its unneeded optional runner bundle and broad capability surface. Revisit the adapter as peer/inference phases are implemented.

## Public data

examples/learner.network.json is the canonical synthetic local graph example. The app publishes an identical copy at agents/learner.network.json, indexed by agent-manifest.json and accompanied by links.json. These artifacts are data; graph instructions are public, not confidential. The manifest intentionally has no claimed funded router. Publication on local preview is not public HTTPS release.

## Caller-local peer execution — bounded development integration

`runNetwork({ definition, request, model, peerRuntime: { inspector, fetchImpl? } })` opts into strict exact peer network references in the caller's data graph. Without `peerRuntime`, those references are rejected at compilation; the existing local graph and developer preview remain peer-free. A peer URL must resolve to the exact published graph name under its site base. HTTP is accepted **only** for localhost/loopback testing.

At the moment a caller selects a peer tool, the host invokes the existing consent inspector for separate manifest and graph artifact GETs. The published graph is parsed and compiled as data, then executed by the same pinned reference runner **inside the caller**. The peer's site receives public artifact requests only: no delegated prompt, private context, provider key, source tool, remote action, or inference request is sent to its origin by this adapter. Caller-side model adapters must independently secure their own provider credentials and request handling.

The caller and peer share a single agent-count budget (12 maximum), model-call budget (8 maximum), cancellation deadline (60 seconds maximum), trace and output ceiling; remote calls are capped at two per query and one per peer. External MCP and further remote agents inside peer graphs are refused. Peer-origin and network labels are included in the **sanitized** event stream, while content/arguments are omitted. These are runtime checks, not a claim of arbitrary hostile-prompt resistance.

A peer artifact failure fails the invoking run with a bounded code such as `PEER_NETWORK_MATCH`, `PEER_MANIFEST_UNAVAILABLE`, `PEER_GRAPH_UNAVAILABLE`, or `PEER_CONSENT_DENIED` — rather than allowing the model to convert an upstream tool error into a completed response. The underlying response payload is not surfaced. Tests cover denied contact, exact matching, malformed peer data and common budgets. The browser fixture uses two loopback origins with public CORS and does **not** prove independently deployed HTTPS, community adoption, factual correctness or a live AI provider.
