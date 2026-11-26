# Optional web access — V2-190 standalone capability contract

**Status:** planned only, disabled and unregistered by default. Web access is a standalone optional future capability, disabled and unregistered by default. No dependency from the core reasoning, evidence acquisition, knowledge compiler, investigation workspace or execution pipeline; no existing completion gate depends on it. Reuse security primitives in one direction only. Future integration requires a separate architectural decision. No live providers, paid calls or external deployment without explicit authorization.

## Placement and dependency direction

An independent module with explicit construction and injected transport, provider configuration, authorization policy, clock and cancellation. No import, registration, UI panel, evidence intake, investigation/history mutation, model tool binding, or execution-path changes in SUTRA core. It may consume compatible existing public-route policy, pinned HTTPS socket, bounded-response and budget primitives after compatibility checks; foundation must never import it. Preserve original security contracts and avoid shared mutable state or credential paths. If a primitive needs adaptation, implement a narrow adapter in the optional module and prove no regression in its existing consumers.

## Uploaded prototype review / adaptation map

| File | Keep/adapt | Must correct before use |
| --- | --- | --- |
| types.ts | SearchIntent, result shapes, typed errors | Closed schemas, limits; raw URL vs discovery dedupe identity; nonce not a security boundary |
| config.ts | Limits, switch, per-host policy, circuit breaker | Disabled by default; validate numeric config; honest user agent; bounded state; provider policy explicit |
| ssrf.ts | Negative URL/IP tests | Ordinary DNS names currently rejected by isPrivateIP; reject non-HTTPS, userinfo, ambiguous IPs/ports, private/reserved DNS answers and DNS rebinding; re-admit every redirect and verify actual peer |
| http.ts | Stream byte bounds, AbortSignal, redirect handling | Host slots leak on redirects/429/errors/robots; race acquiring slots; timeout stops before body; unbounded 429 retries; HTML-only MIME prevents JSON/XML; reuse compatible pinned transport or a narrow independent adapter |
| robots.ts | Cached access policy | Bounded retrieval with same egress controls, origin/agent cache, correct rule precedence and escaping; enforce crawl delay; fail closed on uncertain policy, no bypass |
| providers.ts | Intent classification, provider adapters, circuit-breaker and ranking concept | Select configured/approved providers only; URL/site routes missing; RRF currently retains max rather than sums; deterministic ties and per-provider dedupe; report errors/partial results; avoid generic link fallback, no guaranteed keyless access |
| extract.ts | Titles, headings, readable text, links | Node/host parser choice and limits; no JS execution or subresource fetch; preserve text spacing, exact raw bytes and provenance; no active Markdown links/images rendering; avoid broad ad deletion and destructive Unicode normalization without recording |
| tools.ts | web_search and web_read entry points | Reject malformed/oversized args; accurate intent; snapshot-pinned pagination, not refetch/re-nonce; typed untrusted data, not delimiter/regex authority; no auto registration |
| index.ts | Explicit initialization shape | Explicit standalone factory only; never register with SUTRA core |
| test.ts | Test categories and adversarial seeds | Fix missing afterEach import, import-time config mutation, unmocked network and unused HTML fixtures; assert actual flags, refusal/no contact and deterministic limits |

## Standalone interface

Explicit disabled-by-default construction; operations web_search({query,maxResults}) and web_read({url,maxChars}) accept an AbortSignal and a separately scoped caller authorization. No side effects at import or disabled construction. Return bounded typed results with provider attempt/refusal/failure status, actual classified intent, stable ranking/dedupe, exact requested/final URL, timestamps, MIME, raw/extracted digests and extraction version, truncation and untrusted-content markers. Pagination uses immutable retained snapshots, never an implicit refetch. URL intent stages separate read authorization; no automatic follow links. Query, provider endpoints, robots and redirects each require admission before contact. Public HTTPS only, DNS/IP pinning, same-origin redirect re-admission, no credentials/cookies/proxy, no JS/subresource loading. Provider JSON/XML uses strict bounded parsing, no external entities. Extracted text is data, not truth or authority; never admitted into foundation automatically. No live provider is promised or enabled.

## Proposed initial policy (engineering defaults, not observed performance)

- Off by default; 1 search provider per operation, optional second only when explicitly configured and budgeted; max 10 results, 2,000-character query, 2,048-character URL, 8,000-character display slice.
- 15 s end-to-end deadline including admission/DNS/queue/body; max 3 admitted network contacts per action including robots/redirects, max 2 same-origin redirects within that cap; no automatic retry on 429, report backoff; cancellation covers queued work and streamed body. 1 MiB decoded response maximum for web profile, 64 KiB bounded extracted snapshot; no silent truncation of evidence spans. Enforce aggregate byte ceilings across contacts, not just per response. Existing narrower reader ceiling remains unchanged.
- At most 2 concurrent web actions per module instance, 1 per host, bounded queue (max 8 per session), default 300 ms minimum host delay or longer robots delay; bounded TTL cache/limiter entries (max 128). Explicit standalone authorization and budget accounting reserve before dispatch; never put secrets or unapproved query in logs. Use no paid endpoint by default.
- Search providers can fail, disagree, deny access or return no results; surface these distinctions. No CAPTCHA bypass, paywall bypass, browser emulation for evasion, crawler, background monitor, headless JS rendering, recursive search, PDF/OCR, private accounts or arbitrary GET proxy in this slice.

## Acceptance and ordering

WEB-001 (P0 within the optional module only): isolated security transport, cancellation and resource bounds. WEB-002 (P1): standalone search/read, configured provider routing, inert extraction and typed snapshots. WEB-003 (P1): standalone interface and compatibility verification; prove no reverse dependency, import-time registration, default contact or core behavior change. WEB-004 (P1): isolated security, correctness and regression verification at exact revision. All four follow higher-priority foundation work; only internal WEB dependencies apply. No existing core completion gate requires web access. Live provider interoperability, costs and external services require separate explicit authorization. Future core integration requires a separate architectural decision.

Test deterministic injected transports: denied/expired/revoked authorization, mixed public/private DNS, rebinding, IPv4/IPv6 mapped/internal/metadata routes, redirect/robots denial, queued cancellation, stalled/chunked/oversize/decompression body, concurrent budgets, 429/no retry, invalid MIME/JSON/XML, robots unknown/deny, extraction Unicode/injection, ties/duplicates, partial failures versus no results, snapshot pagination, refresh and offline digest validation. Positive fixture search then independently authorized read; no core import or model. Counterexample: multiple providers return syndicated text; dedupe does not establish independent evidence. Verify existing foundation security tests independently; fixture success is not live provider validation.

## Original upload fingerprints (SHA-256; input references, not repository runtime code)

| File | SHA-256 |
| --- | --- |
| types.ts | 17bef630723e02b532bc2f802d86f7a4fa5cfc7dc004c5f7f1e77f624df997d3 |
| config.ts | 0d53184705e0da44b7ad532eea2faa041e77b4d11a4695b580af62acc4afa1d8 |
| extract.ts | a3c11b6aec5e4ab3fc7fd6cba4bdf66b863d5196db0b2ebd682478b6ec975707 |
| http.ts | 99b9fbf84a655d25cf8b7e9b377e4613d726512a6fc8252f79bbd6518b33baad |
| index.ts | 22dcbc3a12e2bedec7cff4493eeb197dcec30ca28fe4037728528ee0ee8c5a5a |
| providers.ts | 0586c326e8ba0323397c9d9b13de626c994cdb71c1ec21b6dcd99b63eed7d6cb |
| robots.ts | c588df1473792be597655ce6164546812039cf3adb1de5027e68796eaec761d9 |
| ssrf.ts | 3dd0377a52acabcbd12d78d00e3a92f58080c4d4216da699cd73c8a704793905 |
| test.ts | d229621ee80b61d1db1c8413421f5341d70142f875c9719231384e349aad2b87 |
| tools.ts | 7443747a405215c13fa12f51e7ebf4d0a055d5c1292786664d5f8e180b983c56 |

Static inspection only; uploaded source was not executed or contacted live, and original files remain conversation attachments, not vendored production code. No verified gate credit. 
