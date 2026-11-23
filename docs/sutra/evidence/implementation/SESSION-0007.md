# SUTRA session 0007 implementation evidence

- Observed: 2026-11-23T15:33:40+05:45.
- Tested source candidate: `79d9d01562e039c6c2d47887c92396026913acc7`.
- Final CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45150180216/job/137609308084
- Scope: caller-local peer execution, external-capability consent, cross-origin browser fixtures, private-context containment, caller model inheritance, adversarial peer containment and controlled read-only MCP interoperability.
- No public deployment, live provider inference, public production MCP, paid call, external outreach or release occurred.

## Caller-local peer execution

The restricted browser host now keeps external capabilities closed by default. A caller must explicitly supply the consent host before declarative peer URLs or third-party MCP descriptors are accepted.

For a peer-network URL the caller:

1. uses the consent-aware manifest/graph loader;
2. preserves exact-name/load failures as a specific model-visible tool result rather than silently selecting another network;
3. compiles the fetched declarative graph locally;
4. runs it with the same guarded model adapter, cancellation signal, trace, model-call budget, agent budget and remote-call budget as the caller;
5. never sends provider/BYOK credentials to the peer artifact origin.

The browser regression starts the learner on `127.0.0.1:4183` and the independently built peer on `127.0.0.1:4195`. Chromium approves manifest and graph separately, observes exactly those two public peer GETs, runs the `checklist -> source_select` peer locally, and records learner/checklist/source_select in one sanitized trace. A repeated run that denies manifest consent emits no additional peer request and leaves the local app usable.

The browser uses a deterministic scripted model driver. This proves the orchestration/inheritance path, not live-model quality, model availability, factual correctness or production HTTPS interoperability.

## Caller model and private-context boundaries

The caller may pin an explicit model name. Peer network/agent `llm_config.model_name` hints cannot replace it; provider-mode external execution refuses to start without a caller-selected model. Synthetic adapter secrets are absent from peer fetches and model-visible data.

Private context is separate from ordinary text. It is finite bounded JSON (8 KiB) and defaults to no peer forwarding. A graph-side `allow.to_downstream.sly_data` declaration is not sufficient by itself: the caller host must separately allow field names for the exact canonical peer network URL. A similar-but-different URL does not inherit that permission. Trace export records only allowed field names, not values.

Synthetic canary tests show `synthetic-private-canary` absent from peer requests, model inputs, results and exported events while an explicitly allowed non-secret `locale` field is represented only by its field name in trace. Ordinary delegated text is intentionally distinct and can still contain user/model-provided data; this is documented rather than misrepresented as a universal text DLP layer.

Upstream private-context return/merge remains intentionally unimplemented in this candidate. Phase 036 therefore remains open.

## Untrusted peer containment

Adversarial fixtures attempt to:

- reveal a private canary;
- override the caller model;
- trigger an unapproved nested peer destination;
- publish an executable/class definition;
- inherit a peer-declared MCP capability into the caller host;
- call an undisclosed MCP write-like tool;
- smuggle an extra destination URL through otherwise read-only MCP arguments.

The runtime blocks those behaviors using graph validation, exact capability catalogs, destination-scoped context policy, caller model policy and runtime-owned argument schemas. These controls do not rely on peer instructions being cooperative. Remote executable peer tools remain outside this release.

Residual risk remains: an allowed peer's public instructions and an allowed read tool's semantically valid arguments can still influence model behavior. These tests do not establish universal prompt-injection immunity or publisher trust.

## Controlled third-party MCP path

Added `packages/sutra-runtime/third-party-mcp.js` and `apps/sutra-mcp-fixture/`.

The browser MCP transport is deliberately narrow:

- exact HTTPS endpoint (loopback HTTP for development);
- JSON-RPC POST only;
- protocol version `2025-06-18`;
- `credentials: omit`, no authorization feature, no provider key sharing;
- redirects rejected;
- request/response size ceilings;
- finite RPC count, timeout and cancellation;
- exact JSON-RPC ID/error validation;
- sanitized failure messages;
- caller descriptor filters discovery to declared tool names;
- runtime validates arguments before dispatch.

The controlled fixture allows one configured caller origin, POST/OPTIONS and only required CORS headers, with no credentials. It publishes a read-only `lookup` tool plus an extra `not_declared` tool so filtering is observable. The accepted read returns fixed source identifiers `mcp-fixture-source / fixture-v1 / mcp-fixture-cue` and `truthStatus: unverified`; it is deterministic source-addressed test data, not a factual claim.

Chromium proves:

- no MCP request before discovery approval;
- successful cross-origin discovery after approval;
- second approval before the actual tool call;
- successful source-addressed read after call approval;
- discovery denial emits no additional third-party request;
- an endpoint without the permitted CORS path fails closed rather than bypassing browser security;
- no Authorization or Cookie headers are sent.

Dedicated transport tests also cover protocol mismatch, response ID mismatch, HTML fallback, oversized response, provider error sanitization, stalled transport timeout/abort, unsafe endpoint forms and oversized call arguments rejected before contact.

## Public artifact CORS evidence

The independent peer preview exposes CORS only on `/agents/` static public artifacts, permits GET/HEAD and the Accept header, supplies no credential allowance, rejects POST, and returns an empty HEAD body. The real Chromium caller successfully retrieves manifest and graph from the second loopback origin without cookies or Authorization.

This demonstrates browser CORS behavior and configuration mechanics only on controlled loopback origins. Staging and intended production HTTPS CORS remain unverified; phase 034 stays open.

## Redirect boundary

Peer/MCP public fetches use `redirect: "error"` and omit credentials. This is intentionally stricter than Profile 0.3's normal redirect behavior. It fails closed when the browser cannot safely inspect/re-consent to a redirect. Full same-origin/changed-origin/looping redirect fixtures and re-consent policy remain phase 037 work.

## Final observed validation

On candidate `79d9d01562e039c6c2d47887c92396026913acc7`:

- learner `npm ci`, production build and app tests: pass;
- consent/inference/source/API suite: pass;
- ten pinned upstream module hashes: pass;
- runtime suite: **89/89 pass**;
- independent peer suite: **7/7 pass**;
- controlled MCP fixture suite: **1/1 pass**;
- Chromium: pass for local/source orchestration, real two-origin loopback peer load + caller-local execution, denial-before-peer-contact, cross-origin read-only MCP discovery/call, CORS refusal, native playback, 360px layout, no page errors and no unexpected external requests;
- standalone consent example Chromium: pass.

## Retained failure history

Intermediate CI failures are retained in GitHub Actions and are not counted as passing evidence. Important findings included:

- the initial external-runtime branch still had stale local-only validation clauses, so new peer/MCP tests were correctly rejected while legacy tests stayed green;
- an oversized MCP call initialized the session before payload validation; the check was moved ahead of all contact;
- Chromium does not reliably surface browser-managed CORS preflight as a normal page request event, so preflight is asserted directly in the fixture suite while Chromium asserts the actual cross-origin behavior;
- adversarial fixtures initially expected overly specific error wording; rejected peer definitions are now consistently classified as invalid public artifacts.

The final candidate above is the evidence source. Earlier green subsets do not replace it.

## Still open

- real staging/production HTTPS peer CORS and public origin evidence;
- live provider/model execution and funded visitor path;
- upstream private-context return policy;
- comprehensive redirect/re-consent fixtures;
- production/public third-party MCP behavior or authentication;
- real lesson provenance, factual reviewer, user research, independent adoption and final release/submission gates.
