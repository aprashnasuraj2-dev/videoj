# Runtime selection and restricted host spike

## Selected implementation

Pin: cognizant-ai-lab/nsdeploy at 486ecf26aa8775963f9b765f894734bef1ac9817. Source repository, commit, original Git blob IDs and SHA-256 hashes are recorded in packages/sutra-runtime/vendor/nsdeploy/UPSTREAM.json. All ten included modules are unchanged. Apache-2.0 license is included; no separate upstream NOTICE file was found in the inspected source tree. Upstream headers and generated-source provenance remain intact.

Reuse AgentNetwork, validateNetwork and runAgent directly. SUTRA's separate host owns preflight policy, adapter injection, limits, timeout/cancellation, same-origin artifact loading and safe event projection. The graph remains Neuro SAN-compatible data and the existing evidence validator remains independent.

Alternative: import the full Engine and UI, including optional runner bundle and broad transport/coded-tool surfaces. Rejected for this local spike because those dependencies and capabilities are unnecessary before consent-aware peer and funded-inference integrations. Optional LangChain bundle alone is about 1.57 MB unminified in the inspected upstream tree. The selected core imports no external JavaScript package.

## Interoperability surface

Public local artifacts: agents/agent-manifest.json, agents/learner.network.json and agents/links.json. Manifest names front learner and exact learner graph; no default inference route is claimed. JSON contains two public instruction/schema definitions and internal delegation. The exact-name local loader rejects wrong/duplicate names, HTML fallbacks, unsafe redirects, external definitions and executable capability metadata.

The current adapter deliberately supports a restricted local subset. It is not a drop-in replacement for every nsDeploy deployment or proof of whole-profile conformance. It rejects rather than silently ignores unsupported fields, executable definitions, REST/MCP/peer capabilities and schema keywords. The canonical first agent must match the manifest front. Private context is not accepted by this host surface.

## Required adapters still outstanding

- Default funded inference: approved same-origin bounded proxy and server-held credentials; no keyless scripted fallback.
- Site reads/actions: exact catalog names, schema validation, destination/effect policy and reviewed action receipts.
- Peer loading: user consent before contact, exact URL/name resolution, approved origins, caller router inheritance and destination-scoped private-context filters.
- Interactive streaming/lifecycle: connect cancellation and partial outcomes to the user-facing run controls.
- Production publication: verified HTTPS artifacts and accessible live judge workflow.

The scripted test uses the real upstream loop with a deterministic injected model driver. Two agent invocations and three model steps establish orchestration wiring only. They are not LLM quality, source grounding, a real audience result or external adoption.

## Measurements and verification

Node tests cover invalid graphs before model dispatch, exact source loading, cancellation/timeout, concurrency, invalid arguments and redacted events. Vendor verification compares each included file with its pinned upstream Git blob and SHA-256. Candidate verification and actual CI results belong in SESSION-0004 evidence; do not infer browser success from a Node-only run.

The browser shell initially loads roughly 53 kB minified JS (~20 kB gzip) in the current candidate. DHAGO loads lazily on explicit fixture selection; its adapter is roughly 277 kB minified (~77 kB gzip) plus CSS. The optional Mux chunk is separate (~640 kB minified /197 kB gzip) and exceeds Vite's chunk warning threshold; it is not needed by the native fixture. These are build-size observations, not measured first-load performance or a quota calculation.
