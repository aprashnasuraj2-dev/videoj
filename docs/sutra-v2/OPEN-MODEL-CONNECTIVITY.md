# Open model connectivity and collaborative intelligence — binding product extension (2026-11-26)

User requirement: no fixed vendor list. Bring your own model, API and credentials (BYOM/BYOAPI/BYOK), including user-operated inference. Major-provider presets are conveniences, never requirements. This is a product specification, not implementation or authorization to enable external inference.

## Architecture and UX

- Model connection registry: stable user-owned connection ID, protocol/adapter ID, endpoint policy, display name, model catalog or manual model ID, capability declarations with explicit unknown state, credential handle, health and cost metadata. No provider-name enum in orchestration contracts. Support multiple connections, multiple credentials and multiple models per connection. Credential handles never enter model messages, shared graphs or exported configurations.
- Agent configuration: independent role/prompt, connection ID, model ID, tool grants, context/disclosure policy, token/call/spend limits and optional approved fallback chain. Any role may use any compatible model. Allow same model with different roles, different models of one provider, different providers, entirely local or mixed teams. No commercial model required.
- Protocol adapters: start with bounded OpenAI-compatible chat and existing runtime contract; native Anthropic, Gemini, Ollama and other adapters are extension targets, not fixed routing dependencies. Aggregators and inference hosts can use compatible adapters. Self-hosted, fine-tuned, proprietary and custom APIs supported through a versioned trusted adapter contract. Unknown protocols require an adapter, not arbitrary executable code or raw user-defined request templates on a shared relay. Model discovery is optional; manual IDs remain available. Streaming, structured output, tool calls, context limits, modalities and usage are negotiated or explicitly unknown; never assume protocol compatibility implies feature parity.
- Frontend: add model connection (preset or custom), endpoint/protocol, model IDs, authentication method, secret enrollment via separate host-owned credential UI, approved connection test, capability/cost display, enable/disable/delete and credential rotation; Agent Studio assigns any compatible connection/model to each role and visualizes actual dispatch, failures and evidence exchange. Export only redacted configuration. No automatic discovery or test that sends credentials without consent.
- Orchestration: use existing runtime and verification contracts; scoped shared findings, bounded parallel and sequential delegation, critique and iterative verification feedback, cancellation, failure recovery, actual model provenance, and user-approved routing. No consensus-as-proof. Manual/offline verification remains fully useful.

## Safety boundaries and alternatives

Custom endpoint configuration is not arbitrary network authority. Validate normalized exact origins and approved destinations; restrict schemes, ports, redirects and credential forwarding; enforce egress controls at connection time including DNS rebinding, loopback, private/link-local/metadata targets and IPv6/mapped-address variants. Public hosted relay must never reach user-local or private networks. Local/self-hosted private inference requires a separately reviewed user-side connector or self-hosted runtime with explicit scope; do not claim remote hosted SaaS can directly access localhost. No automatic fallback to a different provider, cost tier, credential or disclosure destination without an approved policy. No secret propagation, cross-tenant access, secret-bearing logs, URL query credentials, raw custom headers in graph exports, or model-directed URL changes. Unknown pricing/usage requires fail-closed reservation or explicit bounded accounting policy; free tiers are not assumed unlimited. Model output and external content remain untrusted.

Rejected alternatives: fixed vendor enum (excludes private models); unrestricted arbitrary URL proxy (SSRF and credential exfiltration); unrestricted user-code adapters in shared execution (tenant isolation and arbitrary execution). Trusted protocol adapters plus user-controlled connections preserve choice while bounding authority.

## Acceptance gates (extend existing V2-P14-BYOK-UX, V2-P14-BUDGET, V2-RUNTIME-03 and V2-LK15)

1. Mock-only tests register an unrecognized provider name and custom compatible endpoint/model without core changes; independent credentials and models coexist; same-provider and multi-provider agent assignments produce correct bounded dispatch. Unsupported capabilities refuse or choose an explicitly approved compatible alternative.
2. At least two independently implemented protocol adapters (or one plus a trusted test adapter) pass contract tests for cancellation, malformed/truncated output, errors, rate limits, unknown usage and bounded concurrency; user-visible provenance records actual route. No fabricated model capabilities.
3. Browser journey configures a custom connection, selects a model for arbitrary roles, runs a mock multi-agent investigation with critique and verifier feedback, switches/deletes/rotates profiles and exports without secrets. No-model path remains usable.
4. Security adversaries: endpoint substitution, redirects, DNS rebinding, private/metadata/IPv6 egress, credential destination mixup, model-selected routing, cross-tenant access, budget race, malicious output, secret canaries in logs/DOM/export and unapproved fallback. Local transport is separately threat reviewed.
5. No claim of production support until exact-source tests and separately authorized provider integration evidence. Keep current live inference/key entry disabled until threat, consent, taint, provider-budget and deployment gates pass. No paid calls, credentials or external disclosures authorized by this requirement.

Existing 200 synthetic cases stay frozen; fix the known aggregate revision manifest mismatch rather than expand them. This requirement extends existing open gates and does not close any prior gate or change the current implementation cursor.

## V2-156 local transport candidate
Node-only explicit literal-loopback connector, exact host-approved route descriptors and bounded JSON. This is not an enablement of the hosted UI, public relay, production credentials or paid inference. Real local TCP tests use simulated responders. Public egress, tenant isolation and authorized real model testing remain separate gates.

## V2-158 explicit local operator runner (candidate)
A separate Node CLI previews exact pinned question, disclosure and approved local route plan with no contact, requires both execution/disclosure flags for actual literal-loopback calls, preflights every credential and selected binding, applies resource budgets and outputs conditional review receipt. No hosted UI enablement. Config names only a restricted local environment variable for credentials. Tests use local fixture responders, not genuine model inference.

### V2-159 — Native Ollama bounded wire

Native `/api/chat` adapter is selectable in the scripted Studio and admitted by the explicit Node loopback runner. The finite `options.num_predict` cap is enforced again at the socket boundary; only terminal `done: true`, `done_reason: stop`, text-only responses and bounded `eval_count` are admitted. Native route tests use a real literal-loopback fixture server, not a genuine model. No external hosted transport, real key, or offline-model guarantee is added. API reference: https://docs.ollama.com/api/chat and https://docs.ollama.com/modelfile. Exact revision CI pending.

## V2-160 exact local approval candidate
Local operator execution requires the exact previewed input pin. Optional full living version export is explicitly selected and does not expand model disclosure. Existing local process trust and credential gates remain unchanged.

## V2-161 hosted public-route policy candidate
Conservative all-answer public IP admission, explicit route/model, one-use time-bounded DNS address pin and original TLS hostname descriptor. No public network client or credential authority; future socket-level enforcement and real provider tests remain separately gated.
