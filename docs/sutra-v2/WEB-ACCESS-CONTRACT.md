# SUTRA — autonomous source-agnostic web access (2026-11-28)

## Engineering contract

**No per-URL human intervention for routine public-web research.** A trusted local SUTRA runtime can start a bounded investigation from a natural-language objective, and an agent, engine or user can invoke public search or exact URL retrieval automatically through the common host web broker. The configured runtime grants public-read capability for its limited session; the model can select queries and document candidates within that capability, but cannot extend its budget, read private networks, authenticate as a user, write to external sites, or grant itself a different privilege.

The optional one-shot manual approval path remains for operators who **want** it; it is not the default autonomous research journey.

### Entry points

| Caller | Autonomous invocation | Model needed? | Egress and evidence rule |
|---|---|---|---|
| User | **Investigate autonomously — no model required** button in objective workspace; host `POST /api/research/auto/start` with `{"objective":"..."}` | No | Multi-step deterministic source discovery, follow links, extract candidate passages, preserve failures, evidence remains unverified |
| User, exact URL/search | **Run automatically — no repeated approvals** in public web panel; `POST /api/research/web/auto/start` with an exact bounded tool request | No | Direct public HTTPS source or federated/search-backend discovery |
| Trusted SUTRA engine | `gateway.web.autoStart(request,{actor:'engine'})` or `gateway.startAutonomous({objective},{actor:'engine'})` | No | Same bounded transport and immutable report schema |
| Trusted LLM agent | `gateway.web.autoStart(request,{actor:'agent'})`, or `gateway.startAutonomous({objective,models:[...]},{actor:'agent'})` with configured model profiles | Optional | Agent can request additional public sources during investigation within its preconfigured runtime scope; no manual approval between eligible operations |

The loopback HTTP bridge binds an authenticated, same-origin session and **always fixes browser origin actor to `user`**; browser JSON cannot impersonate the engine or another agent. Internal calls only are allowed to assign `agent` and `engine` roles. No public, anonymous browser-to-network relay is exposed.

### Broad source discovery, not a website whitelist

`createSearchProviders()` exposes the following adapters: **Brave**, **Tavily** (configured keys); **OpenAlex** (best-effort basic public API, optional key), **Crossref**, **Europe PMC**, **Semantic Scholar** (public/rate-limited, optional key), **arXiv**, and **Wikipedia**. The research-source router chooses up to five heterogeneous backends based on objective; the automatic direct search can federate across those backends and deduplicate links, preserving any failed provider status. Wikipedia is one optional low-priority collection for academic research, **never the sole default search universe**.

**Publisher coverage is intentionally unbounded.** Search indexes and DOI metadata can point at individual journal and research pages on Nature, Science/AAAS, Springer Nature, Elsevier/ScienceDirect, Wiley, Taylor & Francis, SAGE, IEEE, ACM, PLOS, SciELO, ResearchGate and any other public HTTPS publisher. A public URL is eligible for ordinary retrieval regardless of its brand, provided it passes the dynamic URL policy, public DNS/TLS pinning, robots policy and response limits. Inclusion is **not** a claim that every site is indexed or accessible. Special subscription-only services (for example SciFinder) require legitimately configured licensed integrations; no credential/paywall bypass exists.

OpenAlex open-access landing pages and Europe PMC free-to-read records are preferred over paywalled publisher redirects when the respective index supplies such a location. Open-access status is index-reported, not a guarantee that a file downloads. OpenAlex and Crossref metadata identify publications; they do not confer article/full-text access. A ResearchGate record may be publicly visible while its full text is restricted. DOI redirects may lead to paywalled journals, in which case the failure is recorded and SUTRA can seek independently available sources. Never represent indexing metadata or abstract snippets as a full extracted journal article.

### Autonomous routing and resource controls

`selectResearchBackends(objective,available,{max:5})` favors Europe PMC for biomedical investigations; Semantic Scholar/arXiv/OpenAlex for technical studies; OpenAlex/Crossref for scholarly literature; configured general-web search for contemporary general queries. Other indexes can still be used after preferred ones; source domains themselves are not filtered by these preferences.

Default model-free objective budget: **5 search reservations, 10 document reservations, 8 MiB of reserved transport/download bytes, 180 seconds, one link depth**. Each direct web operation is separately bounded (up to 5 search providers, 3 document reservations, 2 MiB and 90 seconds). Operation failure does not turn into positive evidence. Cancellations abort execution; actual external contact may remain uncertain where dispatch has occurred. The search-to-source admission step is explicit in the report, **not** an approval popup.

Provider-specific APIs retain their own rate limits and might return 429/403; report provider errors. No hidden scraping of logins, captcha evasion, private networks, cookies, secrets or third-party POST/PUT writes. Browser-based JavaScript rendering through Obscura stays optional and local; static pinned HTTPS extraction remains the low-resource default. Academic PDF retrieval is optional via `SUTRA_ENABLE_PDF=1` on a Linux host with the existing `prlimit` + `bubblewrap` + `pdftotext` sandbox; a sandbox probe must succeed before contact, and PDF text retains page-offset provenance. No unsandboxed PDF fallback.

### Reusable code and tests

- `packages/sutra-research/providers.js`: eight dedicated provider adapters, all with bounded responses
- `packages/sutra-research/research-source-router.js`: deterministic objective-to-diverse-provider selection
- `packages/sutra-research/on-demand-web.js`: `autoStart`, federated multi-index search, exact source results and provenance
- `packages/sutra-research/local-workspace-gateway.js`: `startAutonomous` and model-optional shared research host
- `apps/sutra-v2/research-workspace.mjs`: token-checked automatic local HTTP dispatch; no external proxy
- `apps/sutra-v2/src/autonomous-research-panel.js`, `direct-web-panel.js`: user-facing autonomous and manual workflows
- `test/discovery-providers.test.mjs`, `test/on-demand-web.test.mjs`: parser, source routing, publisher-domain coverage, failure and authorization regressions

### Verification gates — not release certified

New unit tests and code parsing alone **do not** prove live retrieval, publisher coverage or resource savings. Still needed: full CI exact-head completion, live interoperability across scholarly/general backends with published timestamps, journal paywall/robots negative cases, actual arXiv/Europe PMC/OpenAlex/Crossref response fixtures, accurate memory/CPU/network metrics, external-run egress limits, Obscura sandbox and native-binary verification, and operator UI browser/accessibility tests. No Cloudflare/production deployment from this development branch.
