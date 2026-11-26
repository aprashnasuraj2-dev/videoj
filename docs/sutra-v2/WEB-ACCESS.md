# Optional web access — V2-189 integration contract

**Status:** planned only; no runtime imported or network capability enabled. **Scope:** a small optional extension of current source acquisition, not a new research platform or autonomous browser. The user supplied ten TypeScript files (1,726 lines) on 2026-11-26. Adapt their useful behaviors; do not import the prototype wholesale.

## Placement

Existing question/evidence workflow -> explicitly consented web discovery/read -> untrusted source preview -> user-reviewed exact source span -> existing typed investigation, acquisition/revision, history and independent replay. The manual/local/no-model journey stays intact. Search rank is discovery only, not confidence, independent corroboration or source truth. A fetched page is not an authenticated measurement.

Reuse existing implementation, not parallel infrastructure:
- packages/sutra-inference/public-route-policy.js and pinned-https-socket.js: inspect/adapt public IP checks, all-address resolution, original TLS identity and same admitted socket. The current primitive is model-specific; extract only a narrow common GET transport after regression tests. Never route arbitrary URLs via the model credential path.
- packages/sutra-consent/index.js: use existing inspector/closed admission for exact action, destination, lifetime, purpose and disclosed query/URL, including redirect and robots requests. No consent -> zero outbound requests.
- packages/sutra-runtime/bounded-response.js, source-mcp.js and packages/sutra-source-tools/index.js: reuse bounded reading, closed tool schema and receipt/data validation patterns. Existing reader is capped at 65,536 bytes; preserve that existing contract, define an explicit separately bounded web profile if required.
- packages/sutra-inference/budget-ledger.js and existing host runtime: reuse bounded reservation/accounting; do not create another global mutable provider budget or credential vault.
- packages/sutra-knowledge/robust-acquisition.js, existing acquisition receipts on #54, reviewed source drafts, revision and history: import only reviewed source text under existing source/lineage IDs, preserve version pins. No change to reasoning kernel or truth semantics.
- apps/sutra-v2 existing reviewed workspace: one optional evidence panel, not a separate app. No browser direct fetch to arbitrary websites, no public relay, and no deployment assumption. Trusted host adapter only; browser communicates through existing bounded capability.

## Uploaded prototype review / adaptation map

| File | Keep/adapt | Must correct before use |
| --- | --- | --- |
| types.ts | SearchIntent, result shapes, typed errors | Closed schemas, limits; raw URL vs discovery dedupe identity; nonce not a security boundary |
| config.ts | Limits, switch, per-host policy, circuit breaker | Disabled by default; validate numeric config; honest user agent; bounded state; provider policy explicit |
| ssrf.ts | Negative URL/IP tests | Ordinary DNS names currently rejected by isPrivateIP; reject non-HTTPS, userinfo, ambiguous IPs/ports, private/reserved DNS answers and DNS rebinding; re-admit every redirect and verify actual peer |
| http.ts | Stream byte bounds, AbortSignal, redirect handling | Host slots leak on redirects/429/errors/robots; race acquiring slots; timeout stops before body; unbounded 429 retries; HTML-only MIME prevents JSON/XML; use existing transport instead |
| robots.ts | Cached access policy | Bounded retrieval with same egress controls, origin/agent cache, correct rule precedence and escaping; enforce crawl delay; fail closed on uncertain policy, no bypass |
| providers.ts | Intent classification, provider adapters, circuit-breaker and ranking concept | Select configured/approved providers only; URL/site routes missing; RRF currently retains max rather than sums; deterministic ties and per-provider dedupe; report errors/partial results; avoid generic link fallback, no guaranteed keyless access |
| extract.ts | Titles, headings, readable text, links | Node/host parser choice and limits; no JS execution or subresource fetch; preserve text spacing, exact raw bytes and provenance; no active Markdown links/images rendering; avoid broad ad deletion and destructive Unicode normalization without recording |
| tools.ts | web_search and web_read entry points | Reject malformed/oversized args; accurate intent; snapshot-pinned pagination, not refetch/re-nonce; typed taint and review, not delimiter/regex authority; no auto registration |
| index.ts | Explicit initialization shape | Register through host-owned capability admission only, disabled unless opted in |
| test.ts | Test categories and adversarial seeds | Fix missing afterEach import, import-time config mutation, unmocked network and unused HTML fixtures; assert actual flags, refusal/no contact and deterministic limits |

## Minimal interface and layered flow

1. **Capability admission:** host owns both operations; no executable page instructions, arbitrary method, headers, cookies, credentials, user-supplied proxy or automatic tool chaining. Search query disclosure and URL disclosure approved separately. Explicit exact origin/path/query and expiry, revocation and cancellation checked before each contact; cross-origin redirects refused in first profile, and same-origin redirects re-admitted. Never fetch private/internal routes, even robots or provider endpoints.
2. **Discovery:** web_search({query,maxResults}) returns normalized candidates, actual classified intent, attempted/succeeded/refused provider states and truncation. Start with one configured approved search endpoint (e.g. operator-owned SearXNG or permitted documented API); optionally one specialist provider. No claim of free/unlimited or live availability. General Google/Bing/DDG/Brave scraping and Wiby held outside default profile pending provider terms/permission; GitHub code search may require credentials. MediaWiki, HN, arXiv, StackExchange adapters only after allowed endpoint, format, availability and policy verification. URL intent stages read approval rather than sending URL to search engine; site filter explicit. No need to implement all 11 prototype adapters for acceptance.
3. **Retrieval:** web_read({url,maxChars}) supports approved public HTTPS HTML and plain text; provider JSON/XML parsed by separate strict profile (no external entities, no arbitrary XML/HTML execution). Retain exact requested/final URL, redirect outcomes, status, retrieval time (host observed, not proof of publication time), media type, raw byte SHA-256, extraction algorithm/version, extracted text SHA-256, truncation/encoding and source flags. Never equate retrieval, transport authentication, source identity, factual truth or calibration.
4. **Admission:** all search strings, link targets and fetched content remain typed untrusted data. Store/review immutable bounded snapshots; page 2 reads retained snapshot by pin/offset, not new network content. Human review chooses source spans and interpretation. Refresh creates new revision, never rewrites prior evidence. Export bounded snapshot or exact retained source text and pins; independent replay verifies digest/span relationship offline, not internet freshness or truth. No automatic decision/external authority.

## Proposed initial policy (engineering defaults, not observed performance)

- Off by default; 1 search provider per operation, optional second only when explicitly configured and budgeted; max 10 results, 2,000-character query, 2,048-character URL, 8,000-character display slice.
- 15 s end-to-end deadline including admission/DNS/queue/body; max 3 admitted network contacts per action including robots/redirects, max 2 same-origin redirects within that cap; no automatic retry on 429, report backoff; cancellation covers queued work and streamed body. 1 MiB decoded response maximum for web profile, 64 KiB bounded extracted snapshot; no silent truncation of evidence spans. Enforce aggregate byte ceilings across contacts, not just per response. Existing narrower reader ceiling remains unchanged.
- At most 2 concurrent web actions/investigation, 1 per host, bounded queue (max 8 per session), default 300 ms minimum host delay or longer robots delay; bounded TTL cache/limiter entries (max 128). Explicit consent and budget ledger reserve before dispatch; never put secrets or unapproved query in logs. Use no paid endpoint by default.
- Search providers can fail, disagree, deny access or return no results; surface these distinctions. No CAPTCHA bypass, paywall bypass, browser emulation for evasion, crawler, background monitor, headless JS rendering, recursive search, PDF/OCR, private accounts or arbitrary GET proxy in this slice.

## Acceptance and ordering

See the four V2-WEB tasks in the sole active CHECKLIST. WEB-001 is P0 for web enablement only, not a new prerequisite for unrelated foundation work. Existing immediate CI reconciliation remains first. WEB-001 can use already-verified host primitives once the listed consent/runtime/taint gate obligations relevant to this route have exact evidence; no need to close unrelated broad phases. WEB-002/003/004 are P1 and follow the #54/#58 integration path. Keep off if blocked; run deterministic no-network and loopback fixture tests in CI, with production route policy rejecting loopback. Live permitted endpoint tests are separate and require scoped operator authorization. External blockers EXT-003/005/006 apply as relevant; no new broad release gate.

Required negative cases: DNS rebinding, mixed public/private DNS, IPv4/IPv6 mapped/internal/metadata addresses, credentials in URL, redirect to internal host, redirect/robots not consented, revoked/expired approval, queued cancellation, stalled/chunked/oversize/decompression body, concurrent budget, 429/no retry, invalid MIME/JSON/XML, robots deny/unknown, extraction omission/Unicode/injection including forged delimiters and active links, rank ties/duplicates, no results vs failure, stale snapshot pagination and refresh. Positive: approved fixture query -> exact result -> separately approved read -> reviewed span -> existing investigation -> revision/export/replay; no model required. Counterexample: multiple search providers return same syndicated article; dedupe does not establish independent ancestry.

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
