# SUTRA standalone autonomous research — experimental vertical slice

## Current integration contract (2026-11-28; PR #66, not released)

The primary workspace starts with an investigation objective or a labeled offline worked example. The browser owns its portable declarative graph execution; a publisher-owned, same-origin model route is an optional bounded capability, disabled in the reviewed public candidate until separately authorized. No visitor-controlled arbitrary endpoint or browser key enrollment is exposed by that public candidate. The trusted local research host supports one shared ordered pool of one to three operator-selected model IDs; one model is sufficient. Specialist role mappings are historical/advanced compatibility, not the default. Arbitrary user-operated model/API connectivity remains a longer-term requirement, subject to trusted adapters and egress admission, not a shipped unrestricted relay.

General web research is optional, on demand, and mediated by the separate loopback Node host. Missing search, model or permission is explicit, not simulated. The host's research supervisor is not browser-native graph orchestration; Node DNS/TLS/PDF/PostgreSQL facilities are not browser capabilities. Deterministic/manual investigation and replay do not require web or inference. Model claims are untrusted; exact citation integrity and deterministic replay do not prove empirical truth or independent corroboration.

Browser/peer tests use real Chromium and distinct loopback origins with injected model responses. This establishes candidate behavior, not live commercial inference, deployed HTTPS conformance or public availability of the V2 candidate. The existing public app is legacy and unchanged; no release, merge or deployment is authorized. See [the pre-release checklist](../../docs/sutra-v2/DEVPOST-PRE-RELEASE.md) for unresolved gates.

This package is separate from the exact-URL, pinned-investigation research operator. The old operator, hosted model policies and deterministic kernel are unchanged.

## Run locally (Node 22.12+)

Create a manifest such as:

```json
{
  "schema": "sutra-autonomous-research/v1",
  "objective": "Compare long-term grid battery storage costs",
  "scope": {
    "publicWeb": true,
    "queryDisclosureAllowed": true,
    "allowPrivateNetworks": false,
    "allowAuthentication": false,
    "allowExternalWrites": false,
    "privateEvidenceDisclosureAllowed": false
  },
  "budget": {
    "maxSearches": 6,
    "maxDocuments": 12,
    "maxLinkDepth": 2,
    "maxDurationSeconds": 300,
    "maxDownloadBytes": 8388608,
    "maxCostMicros": 100000
  },
  "providers": [
    {"id": "brave", "estimatedMaxCostMicros": 10000},
    {"id": "tavily", "estimatedMaxCostMicros": 10000}
  ]
}
```

The cost fields above are illustrative operator estimates, not current provider quotes. One dollar is one million micros. Confirm pricing and vendor terms for your actual account, query type and jurisdiction before execution. The CLI does not offer guaranteed strict-dollar mode or check vendor billing. The byte ledger reserves maximum response bytes for each request, including robots fetches; actual bandwidth (headers/TLS/etc.) is not measured.

Preview without credentials or contact:

```sh
node apps/sutra-v2/autonomous-research.mjs --plan < research.json
```

Read the exact preview, including the public-query disclosure scope. Supply provider credentials in the trusted process environment (SUTRA_SEARCH_BRAVE and SUTRA_SEARCH_TAVILY), not in the manifest. Then execute using the exact displayed planPin:

```sh
node apps/sutra-v2/autonomous-research.mjs --execute-research --approve-public-contact --approve-estimated-cost --approve-plan "$PLAN_PIN" --checkpoint-dir ./new-private-research-session < research.json > report.json
```

The checkpoint directory must not already exist. The option is not required for execution; without it no durable snapshots are written. Checkpoints contain objective, queries and collected public text; treat them as private local data. A retained digest is an integrity anchor, not authentication. An explicit pause is supported with --pause-after N (completed operation boundaries) plus --checkpoint-dir. Retain the reported checkpoint digest. Only a quiescent paused checkpoint is eligible for fresh approval; a running, closed or pending-dispatch checkpoint is rejected. The original absolute deadline and all reservations are preserved. Time spent paused counts against the deadline. Resume into a NEW checkpoint directory:

```sh
node apps/sutra-v2/autonomous-research.mjs --execute-research --approve-public-contact --approve-estimated-cost --approve-plan "$PLAN_PIN" --resume-checkpoint ./new-private-research-session/checkpoint.json --resume-pin "$CHECKPOINT_PIN" --checkpoint-dir ./continued-private-session < research.json > resumed-report.json
```

No automatic replay or crash recovery is provided for unknown remote dispatches. The CLI atomically consumes the retained local checkpoint path and digest before any new remote work; a failed continuation may conservatively consume it. Copying the checkpoint elsewhere can bypass the local marker and is not supported. Hosted deployments need database-level session locks and single-use continuation records. Events go to stderr and report JSON to stdout. Add --format markdown for a readable candidate-evidence report. Markdown is escaped and contains no model-generated factual synthesis.

## Guarantees and limits

- Only objective-derived queries; no remote content is promoted into tool instructions or sent to a model. Search credentials only go to fixed provider endpoints. Public document requests are unauthenticated.
- DNS all-answer checks and direct pinned TLS peer verification. Non-HTTPS, IP literals, compression and unsupported media are refused. Redirects and query-bearing document URLs are refused by default. Explicitly add scope.allowRedirects=true for at most three independently admitted public redirects (each document hop is charged and robots-checked), and scope.allowPublicQueryParameters=true for a short allowlist of simple non-secret parameter values; known tracking parameters are stripped. Unknown/duplicate parameters and opaque tokens are refused. The report preserves requested and final URLs and the redirect chain. Same-origin reference links are the default; add the explicit scope field "allowCrossOriginLinks": true to authorize cross-domain public reference navigation. No referrer, cookies or credentials are forwarded. A robots policy is fetched and evaluated conservatively; access/terms still require operator review. No browser sandbox or independent egress firewall has been deployed.
- Serial waves use the existing bounded task DAG. Document requests are separated by a 750 ms per-origin interval within each operator run, with at most three attempted documents per hostname. A structured deterministic plan tracks five research dimensions; the controller prioritizes missing objective terms and candidate numerical discrepancies. Frontier weights are 45% unseen-domain novelty, 30% title relevance, 15% search rank and 10% link depth (discovery only). Exact extracted-text passage locators and digests are checked. Source matching, domain diversity and lexical coverage are not independent corroboration or factual correctness. A deterministic evidence index validates every source span, retains exact numeric observations with explicit units and candidate period, detects narrowly matched numerical discrepancies, flags possible common-origin documents and emits a typed provenance graph. No semantic contradiction or causal conclusion is asserted.
- HTML extraction uses a bounded, non-executing scanner with structural line breaks and candidate metadata. It is deliberately limited, not a browser-compatible or general main-content parser. PDF text extraction is opt-in with scope.allowPdf=true and requires a patched Linux host with /usr/bin/prlimit, /usr/bin/bwrap and /usr/bin/pdftotext, working user/network namespaces and nested-userns prevention. Input is limited to 1 MiB, extraction to 256 KiB and 200 pages, with fixed process limits, no inherited credentials, no host home mount and no unsandboxed fallback. The CLI runs a fixed harmless sandbox probe before any provider contact when PDF is enabled; it refuses execution if the probe fails. Unit/injected-process tests cover the invocation and page locators. Actual namespace availability and hostile-PDF isolation must still be validated on the deployment host. Scanned PDFs, table semantics and OCR are not supported. JavaScript rendering, multi-agent hosted reasoning, formal contradiction analysis, report synthesis, production gateway, authenticated tenancy and crash reconciliation for unknown external dispatches are not implemented.
- Unit tests use injected providers/transport and do not establish live provider success. The seeded research stress test runs 128 isolated fixture sessions and asserts at least 1,000 synthetic search/document operations, exact budget accounting, duplicate rejection and citation integrity. It is not a hosted concurrency or latency benchmark. The research-specific workflow runs npm test --prefix packages/sutra-research.

### Credentialed model smoke (Gemini, Groq, OpenRouter)

Store rotated credentials outside the repository in the operator's secret manager, or in protected GitHub Actions environment `sutra-live-research` as `SUTRA_HOSTED_GEMINI`, `SUTRA_HOSTED_GROQ`, and `SUTRA_HOSTED_OPENROUTER`. Never pass secrets in arguments, manifests, logs or source files. The manual main-branch workflow performs one bounded synthetic challenge per provider. A successful report must explicitly say `credentialed_live_transport` and contain a passed check for every tester-selected route. Fixture CI is not live evidence. OpenRouter free routing may vary its underlying model; different transport vendors do not prove independent model families. These credentials do not authorize Brave or Tavily web search.

```sh
node apps/sutra-v2/live-model-smoke.mjs --plan
# After checking the displayed plan and setting environment variables securely:
node apps/sutra-v2/live-model-smoke.mjs --execute-live-model-smoke --approve-provider-contact --approve-estimated-cost --approve-plan "$PLAN_PIN"
```

### Model selection and on-demand web access

The supported local research configuration is one ordered `modelPolicy.models` pool (one to three selected model descriptors) and `allowPublicEvidenceDisclosure: true`. Each descriptor supplies `vendor`, `model`, `maxInputBytes`, `maxOutputTokens`, and `estimatedMaxCostMicros`. The first is preferred. The runtime schedules planning, synthesis, and critique internally; avatars are not model connections. One model can perform all operations; two or three can supply another perspective. Different models or vendors do not prove independence. The default `webAccess` is `on_demand`: the model can answer without web, request bounded host searches, or request synthesis after acquiring evidence. An empty provider list is valid; unavailable web requests are explicitly reported, not simulated. Previously exported role-specific manifests remain compatible but are not the primary local configuration.

Smoke tests accept `SUTRA_SMOKE_MODELS_JSON` as a nonsecret JSON object, e.g. `{"groq":"openai/gpt-oss-20b"}`. The selected model IDs are part of the approval pin; a single configured credential is sufficient when only one route is selected. These are test inputs, not orbital role mappings.

### Local orbital workspace

After building the existing frontend, start `node apps/sutra-v2/research-workspace.mjs` and open the printed loopback URL. The host reads model/search credentials from environment variables. Enter model IDs once under shared model connections, select one to three, then enter an objective on the orbital map and approve the exact preview. Direct public HTTPS retrieval is separately scoped by `allowModelPublicUrls`; general search still needs an available host search backend. No model-to-avatar mapping, credential browser storage or public deployment is required. Local in-memory sessions do not survive restart; the PostgreSQL candidate is a separate integration.

### Optional Obscura Rust browser backend (local experimental)

A pinned Apache-2.0 Obscura Rust source checkout, opt-in JavaScript-rendered HTML enhancement, strict subprocess limits, static fallback and explicit unmetered-subresource caveats are described in [OBSCURA-WEB-ACCESS](../../docs/sutra-v2/OBSCURA-WEB-ACCESS.md). Disabled by default; not enabled for hosted/public deployment. Rendering is a second navigation behind original pinned static retrieval and does not replace native research or any existing capability.
