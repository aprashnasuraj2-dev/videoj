# SUTRA API candidate — not deployed

This is a separate SUTRA Worker. The checked-in configuration **disables live
inference**, disables workers.dev and assigns no production route. The proposed
`https://sutra.aafnaipatro.com` origin is configuration intent, not an observed
public release. Existing AafnaiPatro/player routes have not been changed.

## Endpoints

- `POST /api/infer`: internal SUTRA same-origin alias for the fixed funded provider path.
- `POST /api/v1/chat/completions`: publisher-funded OpenAI-compatible browser-router facade backed by the **same** validation/quota/streaming core. It accepts no visitor Authorization header and returns 503 while disabled/incompletely configured.
- `/api/source-tools`: restricted stateless MCP JSON transport, protocol pin
  2025-06-18; initialize/initialized, tools/list, tools/call; GET returns 405.
  Origin checks protect the browser boundary. The catalog is public synthetic data.
- `GET /api/status`: configured/disabled inference and honest synthetic-catalog state; when configured, publishes `routerBase: /api/v1`, `publisherFunded: true`, `byok: false` plus the approved model.
- Other `/api/*`: 404, never the HTML asset fallback.

Development/preview middleware invokes this same handler with no secrets and
inference disabled. It does not emulate a deployed Durable Object. The browser
source test uses real endpoint requests with deterministic scripted decisions.
This client deliberately supports this site's JSON-only MCP profile, not arbitrary
MCP servers, SSE responses, auth flows or third-party discovery.

## Operator setup, before enabling any hosted inference

1. Build the isolated app: `npm --prefix apps/sutra ci` and
   `npm --prefix apps/sutra run build`.
2. Choose an actual available provider model and obtain budget authorization.
   `SUTRA_MODELS` is an exact comma-separated allowlist (1–3 models). It is empty
   by default. Model availability, pricing and provider compatibility are unverified.
3. Choose `SUTRA_INFERENCE_BACKEND=self_hosted` (recommended if an operator can run a GPU gateway) or explicitly select `hosted` for an externally billed provider. Without an explicit backend, **inference is disabled** even when a key exists. Set the exact deployed HTTPS `SUTRA_ALLOWED_ORIGIN`; configure secrets through
   Cloudflare secret management: `SUTRA_PROVIDER_KEY` and a random
   `SUTRA_CLIENT_HASH_SECRET` of at least 32 characters. Never use a VITE variable,
   frontend storage, browser key entry, committed `.env` or a ZIP to supply these.
4. Keep the default quotas conservative: 100 model calls/day global; 8/client/day; **2 active provider calls at once**; 512 output tokens/call. Hard configuration maxima: 1,000 global, client <= global, 10 concurrent calls, 1,024 output tokens. A full agent task may consume up to 8 model calls.
5. Apply/review the DO migration and validate the Wrangler bundle/deployment in a
   separate nonproduction environment. Wrangler 4.166.0 dry-run passed on 2026-11-23 (72 assets, 32.49 KiB Worker /9.16 KiB gzip); no deployment has been observed. Account routing, secret setup and live visitor checks
   remain pending. Enable only after budget/model approval and those checks.

In explicit `hosted` mode, only the fixed `https://api.openai.com/v1/chat/completions` receives the external server key. In `self_hosted` mode only the operator-configured canonical HTTPS `SUTRA_SELF_HOSTED_UPSTREAM_URL` ending in `/v1/chat/completions` receives the separate `SUTRA_SELF_HOSTED_TOKEN`; no user-entered endpoint can be forwarded. A private authenticated TLS gateway is required. `localhost`, raw IPs, URL credentials, queries, fragments, redirects and unauthenticated gateways are refused. The token remains server-side; zero provider invoice does not mean zero machine, electricity, bandwidth or operations cost. Never expose an unprotected Ollama/llama.cpp server on the public internet. The Worker is not a LAN-to-browser bridge. Caller-supplied URL, authorization, token caps and extra payload fields are
rejected. Request body <=32 KiB, 32 messages, 24,000 message-content characters,
16 tool schemas; supported closed schemas only. Output/stream caps are documented
in the inference package. Body/quota deadline: 5 seconds; provider deadline: 30.
No automatic provider retries or daily-quota refunds follow ambiguous/failed provider requests. Active-concurrency leases are released separately so a failed stream does not block all later traffic until the next UTC day.

The quota DO uses one global named instance and atomic storage transactions. A successful reservation creates a 45-second active lease; at most `SUTRA_MAX_CONCURRENT` leases may exist. The Worker releases a lease after provider rejection/failure, completed or incomplete stream, and client stream cancellation. Expired leases are pruned during later reservations. Daily/client usage is deliberately **not refunded** after provider work starts, avoiding automatic retry spend. Daily client identities are HMAC hashes of the Cloudflare-supplied IP plus UTC day;
no raw IP, prompt, content or provider secret is stored in quota state. Old-day
state is replaced on the next request. Shared NAT users share a client allowance;
rotating IPs can evade that allowance, but the global ceiling still applies.
Origin checking is **not authentication**: a nonbrowser caller can spoof Origin
and consume the global allowance. The current default-off service is not a general
public paid API. A production abuse-control decision remains required.

A request ceiling is not a dollar budget. At the default 100 calls/day, at most
51,200 requested output tokens/day are allowed; actual billed tokens, growing
input histories, model price and failed-call billing determine spend. No dollar
estimate or payment readiness is claimed. Provider-level spend controls must be
reviewed before enabling. Network failure may consume quota without a completed
result; this conservative choice avoids accidental repeat spend.

## Validation and references

`node --test services/sutra-api/test/*.test.mjs` from repo root. The quota tests use
an in-memory serialized transaction harness, not a live Cloudflare deployment.
The provider tests inject synthetic HTTP streams and never contact a paid service.

Primary references refreshed 2026-11-23:
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events
- https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- https://modelcontextprotocol.io/specification/2025-06-18/basic/transports

The reference upstream runner is unchanged. SUTRA's host grants exactly one local
MCP descriptor (`/api/source-tools`) when explicitly configured; peers, external
MCP, coded tools, arbitrary REST and private context forwarding remain disabled.


## Static assets, security headers and Worker-request separation

`wrangler.jsonc` intentionally sets `assets.run_worker_first` to `["/api/*"]`. Normal SUTRA HTML, hashed JS/CSS, public graphs, text tracks and media should therefore be served by the static asset layer without entering Worker code. Do **not** broaden this to `true` merely to attach headers; that would convert ordinary learner asset traffic into Worker invocations and undermine the shared-capacity plan.

Because static files bypass Worker code, `apps/sutra/public/_headers` is the authoritative default browser-security policy for the learner page. It currently allows only same-origin connections. A future approved public peer origin must be added deliberately and tested before release; there is no wildcard peer/connect source. The Worker applies the same baseline security fields to `/api/*` responses, and build tests compare both layers to prevent accidental drift.

Cache classes are also intentionally split:

- Vite content-hashed `/assets/*` and physically content-versioned `/agents/v/<git-blob>/...` graphs: long-lived immutable.
- HTML, manifests, links, canonical/unversioned graphs and unversioned media aliases: revalidate.
- `/api/*`, inference streams and error responses: `no-store`.
- Media requests carry source-version query keys and byte-level SHA-256 verification before player mount; static media currently remains revalidated rather than claiming immutable filename semantics.

The manifest points to retained graph copies under `/agents/v/<git-blob>/...`. CI computes the Git blob identity of the canonical graph and requires the declared physical version path to contain byte-identical data. A graph edit without a version-path update fails the build.

## Daily resource admission (not a dollar budget)
In addition to daily call and per-client ceilings, the quota object atomically reserves the exact UTF-8 byte length of the validated outbound JSON request and the configured maximum requested output tokens. `SUTRA_MAX_DAILY_INPUT_BYTES` and `SUTRA_MAX_DAILY_OUTPUT_TOKENS` may be reduced independently. Checked-in disabled configurations allow at most 3,379,200 input JSON bytes and 51,200 requested output tokens per UTC day, still bounded by 100 admitted calls, 8 per client and 2 active calls. A rejected resource reservation produces 429 before any provider contact; an admitted reservation is not refunded after release, cancellation or failure. UTC date rollover resets daily counters but preserves unexpired active leases, preventing an accidental midnight concurrency burst. Legacy same-day state with only call counts is conservatively charged at prior hard per-call maxima. These are resource bounds, not actual provider token counts or billed USD. The provider may tokenize differently, bill failed calls or apply other charges; only observed provider usage/prices and provider-side spend controls support a cost claim. No paid inference is enabled.

## Publisher-funded interoperability facade

The future top-site manifest can publish the caller origin plus `/api/v1` as its default publisher-funded router. The OpenAI-compatible `POST /api/v1/chat/completions` route is not a second provider implementation: it enters the same `handleInference` function as `/api/infer`, so origin checks, visitor-Authorization rejection, exact model allowlist, payload/schema bounds, global/client/resource quota, concurrency lease, fixed upstream, server-only provider key, sanitized usage/SSE stream, cancellation and no automatic retry remain identical.

The route existing in code does **not** mean inference is live. Checked-in configs keep `SUTRA_ENABLE_INFERENCE=false` and an empty model allowlist. A release manifest must not publish the router as usable until the live-provider/cost/release gates pass.


### Snapshot-aware learner precondition

The learner sends the public `X-Sutra-Catalog-Sha256` header on its caller-owned inference and source-tools POSTs. A provided value that does not match the Worker's active catalog returns HTTP 409 with `CONTENT_VERSION_MISMATCH` before quota reservation or source-tool execution. The header is not a credential or authorization mechanism; portable clients may omit it under the existing contract. It does not verify factual truth, pin the Worker implementation, or guarantee that already-completed requests can be undone. The browser preflight independently checks the mounted profile/transcript and exact approved graph, and refuses to present an answer from a run that encounters a catalog-version rejection.

### Self-hosted OpenAI-compatible engines (explicit opt-in, not deployed)

Configure a separately owned authenticated HTTPS reverse proxy forwarding only the permitted POST `/v1/chat/completions` to a local Ollama or llama.cpp server. The gateway enforces the worker's bearer secret, mTLS/firewall/rate limits where possible, and never exposes the engine directly. Set `SUTRA_INFERENCE_BACKEND=self_hosted`, `SUTRA_SELF_HOSTED_UPSTREAM_URL=https://operator-owned-gateway.example/v1/chat/completions` (illustrative only), `SUTRA_SELF_HOSTED_TOKEN` (random 16+ character private secret), an exact `SUTRA_MODELS` allowlist plus the normal quotas and origin. The endpoint path is fixed; client-supplied URLs/headers never change it. The worker strips unapproved fields, caps output, checks streaming syntax and returns no completed answer on incompatible tool-call chunks. `max_tokens` and streamed usage are requested in this mode; actual engine support requires a pinned model/runtime compatibility evaluation. Do not enable inference without a secure reachable gateway, tested tool-calling model, resource budget and explicit operator authorization. The checked-in deployment remains disabled.
