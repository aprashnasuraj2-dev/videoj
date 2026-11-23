# SUTRA restricted browser runtime - v0.1.0

A host adapter around the **unchanged nsDeploy reference AgentNetwork/kernel and agent loop**, pinned to commit `486ecf26aa8775963f9b765f894734bef1ac9817`. The vendored core, generated modules, exact Git blob/SHA-256 inventory and Apache-2.0 license are in vendor/nsdeploy. No optional LangChain bundle or framework dependency is required.

```sh
node packages/sutra-runtime/verify-vendor.mjs
node --test packages/sutra-runtime/test/*.test.mjs
```

The package imports no player or learner UI and has its own graph example/test fixtures. It is an early source distribution, not an npm registry publication or claim of challenge conformance.

## Current behavior

- compileNetwork validates a bounded resolved JSON graph in the canonical Neuro SAN data model through the reference kernel plus a stricter local-only policy. It rejects duplicate names, missing/front references, unsupported executable definitions, external capabilities, unsupported invocation schemas, directed cycles and excessive depth before model work.
- runNetwork executes the reference multi-agent loop with an explicitly injected model adapter. No missing adapter silently falls back to a mock. A scripted-test adapter is provided separately under testing.js; the app names that mode conspicuously. No provider, paid inference or peer is connected by this package.
- loadLocalNetwork retrieves one exact published network from a same-origin manifest/JSON graph with credential-free, redirect-rejecting, bounded JSON reads. The whole artifact load has a five-second maximum. HTML fallbacks, duplicate/wrong names and executable publication metadata fail closed. Cross-origin loading is unavailable until a consent-aware peer loader is integrated.
- Default runtime ceilings: depth 3; 12 agent invocations; 8 model calls; 8 steps/agent; 2 concurrent model calls; 60 seconds elapsed; 16,000 returned model-content characters. Hosts may reduce ceilings, never widen them through this API. Graph is <=64 KiB, public manifest <=16 KiB, request <=2,000 characters, invocation arguments <=8,000 characters and per-model tool calls <=2.
- Cancellation/timeouts stop subsequent calls and settle the caller even if an injected adapter ignores its abort signal. Adapters must also honor cancellation to stop their own external work; this wrapper cannot undo a request already sent by an adapter.
- Caller-visible events contain only phase, kind, IDs, status, agent and tool names. They omit prompt text, raw arguments and model output. The host must avoid placing secrets in public graph identities or its own adapter logs.

## Scope and limits

This local profile intentionally rejects peer/MCP/REST/coded capabilities rather than bypassing absent consent/transport controls. Site actions, funded inference, stream UI, cross-origin composition and the complete specification are still pending. Scripted delegation is useful for integration checks; it is not live AI, independent adoption, semantic grounding or factual verification. An injected provider adapter is a host integration surface, not a shipped funded provider route.

We reuse the reference runner instead of creating a new agent framework. The explicit SUTRA host restricts capabilities and applies additional validation/budgets outside model instructions. The full Engine/UI import was rejected for this spike to avoid its unneeded optional runner bundle and broad capability surface. Revisit the adapter as peer/inference phases are implemented.

## Public data

examples/learner.network.json is the canonical synthetic local graph example. The app publishes an identical copy at agents/learner.network.json, indexed by agent-manifest.json and accompanied by links.json. These artifacts are data; graph instructions are public, not confidential. The manifest intentionally has no claimed funded router. Publication on local preview is not public HTTPS release.
