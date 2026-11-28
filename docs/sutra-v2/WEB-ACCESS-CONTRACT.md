# SUTRA bounded web access — shared consent contract (2026-11-28)

## Architecture

SUTRA has three independent entry points, **one local trusted web boundary**, and a deterministic, evidence-only result contract:

| Caller | How it proposes work | Who grants contact | Result |
|---|---|---|---|
| User | `Open the public web — no model required` in objective workspace; exact URL or query | User checkbox + one-shot host preview | Unverified extracted source or candidate search links |
| Deterministic SUTRA engine | `gateway.web.preview(request,{actor:'engine'})` on trusted local host | Explicit operator-controlled `gateway.web.start(exactApproval)` | Same result schema and hashes |
| LLM agent | Existing on-demand model research supervisor; or trusted host `gateway.web.preview(request,{actor:'agent'})` | Operator approves exact request, destination, scope, budget; model output alone is **never** approval | Same result schema; model claims remain untrusted |

The browser-facing host **always** forces `actor:'user'`. It cannot set `agent`/`engine` by submitting a forged JSON role. Native browser port is loopback, behind an origin-checked, short-lived host token; no visitor-controlled public proxy or arbitrary API credentials.

Web tool: `packages/sutra-research/on-demand-web.js`. Bridge: `packages/sutra-research/local-workspace-gateway.js` and `apps/sutra-v2/research-workspace.mjs`; interface: `apps/sutra-v2/src/direct-web-panel.js`.

## Exact web-tool request

```json
{"operation":"fetch","resource":"https://public.example.org/document","backend":null,"render":false}
```

or search using a **configured** provider:

```json
{"operation":"search","resource":"public dataset battery storage 2026","backend":"brave","render":false}
```

A preview is local and returns `requestPin`, `planPin`, `approvalId`, `expiresAt`, actor, exact public destination/query, budget and disclosure. An approved start must match **all three** identifiers and both explicit approval booleans. Starting consumes the preview. Changed query, actor, backend, URL, render capability, or an expired preview requires a new approval. No contact happens during preview.

`web.capabilities()`, `web.preview(request,{actor})`, `web.start(approval)`, `web.status(sessionId)`, `web.cancel(sessionId)` are reusable on a trusted host. User-facing local API paths under `/api/research/web/`: `capabilities` (GET), `preview` (POST), `start` (POST), `status?id=...` (GET) and `cancel` (POST). No browser service credentials are returned.

## Extraction and fallback

- `fetch` always starts with the existing non-executing, pinned HTTPS/TLS/DNS peer-checked document transport and conservative `robots.txt` checking. Explicitly admitted redirects are independently robots-checked. URLs with credentials, private networks, IP literals, unsafe query fields, non-HTTPS, or forbidden port are rejected.
- `search` contacts only the explicitly selected configured search provider; links and titles are **discovery only**. Each candidate URL passes the public URL policy; no destination is fetched implicitly. A separate `fetch` proposal and approval must precede actual reading.
- Optional Obscura JavaScript rendering requires a trusted local binary and `render:true` in the **exact** approved request. Existing static results are kept on renderer failure or absent material gain. Unmetered subresource egress and lack of proven native isolation prohibit public deployment.
- Documents retain requested/final URL, retrieval timestamp, original raw-body SHA-256, full extracted-text digest, returned-text digest, parser and any renderer provenance, and the source text. Bounded returned extraction is at most 100,000 UTF-16 code units (explicitly marked if truncated); reports at most 512 KiB.
- Search results and document text are untrusted data. Exact quote/digest integrity does not establish truth, freshness, originality, independent corroboration, or authority to act.

## Bounded budgets and failure semantics

One web operation at a time per local web broker, up to 45 seconds, 2 search reservations, 3 document reservations, and 2 MiB of **reserved** response bytes. A pending legacy autonomous research run blocks the web broker; a pending web operation blocks launching a new local research run. No credential sharing, session persistence, automatic web continuation, public writes or browser-side network authority.

Cancellation aborts the host request. A transport failure after a dispatch attempt is marked as potentially unknown outcome, not quietly retried or counted as success. The report's recorded reserved bytes do **not** equal actual egress, especially with a browser renderer, redirects, transport headers and search provider overhead.

## Verification and release blockers

`npm test --prefix packages/sutra-research` is mandatory and includes `test/on-demand-web.test.mjs`: model-free fetch, engine and model proposals, strict approval, unsafe URLs and queries, duplicate/hostile search candidates, cancellation, busy sessions, provenance, and token/owner enforcement. Browser UI/Playwright smoke and actual-host egress are separate requirements.

**Not production-ready:** Do not claim flawless or complete browser-native agent support. Required before public release: end-to-end live direct URL, JS SPA, redirect, robots denial and search cases; Obscura binary attestation, sandbox + firewall with subresource egress enforcement, shared global rate limits across workers, actual CPU/RSS/network-byte latency measurements, full browser control accessibility smoke, search-provider credentials/terms evaluation, source injection adversarial testing and current exact-revision CI.
