# SUTRA API candidate — not deployed

This is a separate SUTRA Worker. The checked-in configuration **disables live
inference**, disables workers.dev and assigns no production route. The proposed
`https://sutra.aafnaipatro.com` origin is configuration intent, not an observed
public release. Existing AafnaiPatro/player routes have not been changed.

## Endpoints

- `POST /api/infer`: fixed provider, validated payload, global transactional quota,
  sanitized stream. Returns 503 while disabled or incompletely configured.
- `/api/source-tools`: restricted stateless MCP JSON transport, protocol pin
  2025-06-18; initialize/initialized, tools/list, tools/call; GET returns 405.
  Origin checks protect the browser boundary. The catalog is public synthetic data.
- `GET /api/status`: configured/disabled inference and honest synthetic-catalog state.
- Other `/api/*`: 404, never the HTML asset fallback.

Development/preview middleware invokes this same handler with no secrets and
inference disabled. It does not emulate a deployed Durable Object. The browser
source test uses real endpoint requests with deterministic scripted decisions.
This client deliberately supports this site's JSON-only MCP profile, not arbitrary
MCP servers, SSE responses, auth flows or third-party discovery.

## Operator setup, before enabling paid inference

1. Build the isolated app: `npm --prefix apps/sutra ci` and
   `npm --prefix apps/sutra run build`.
2. Choose an actual available provider model and obtain budget authorization.
   `SUTRA_MODELS` is an exact comma-separated allowlist (1–3 models). It is empty
   by default. Model availability, pricing and provider compatibility are unverified.
3. Set the exact deployed HTTPS `SUTRA_ALLOWED_ORIGIN`; configure secrets through
   Cloudflare secret management: `SUTRA_PROVIDER_KEY` and a random
   `SUTRA_CLIENT_HASH_SECRET` of at least 32 characters. Never use a VITE variable,
   frontend storage, browser key entry, committed `.env` or a ZIP to supply these.
4. Keep the default quotas conservative: 100 model calls/day global; 8/client/day; **2 active provider calls at once**; 512 output tokens/call. Hard configuration maxima: 1,000 global, client <= global, 10 concurrent calls, 1,024 output tokens. A full agent task may consume up to 8 model calls.
5. Apply/review the DO migration and validate the Wrangler bundle/deployment in a
   separate nonproduction environment. Wrangler 4.166.0 dry-run passed on 2026-11-23 (72 assets, 32.49 KiB Worker /9.16 KiB gzip); no deployment has been observed. Account routing, secret setup and live visitor checks
   remain pending. Enable only after budget/model approval and those checks.

Only the fixed `https://api.openai.com/v1/chat/completions` can receive the server
key. Caller-supplied URL, authorization, token caps and extra payload fields are
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
