# SUTRA v2 release architecture and trust boundaries
Status: accepted engineering design for PR #66; **not** release or deployment authorization. Reviewed baseline 55ca53b0e3137db5241d0b2ec68c1e6bf1a3cf5a (2026-11-28). Implementation may advance; revalidate affected boundaries against the exact deployed revision.

## Current integration contract (2026-11-28; PR #66, not released)

The primary workspace starts with an investigation objective or a labeled offline worked example. The browser owns its portable declarative graph execution; a publisher-owned, same-origin model route is an optional bounded capability, disabled in the reviewed public candidate until separately authorized. No visitor-controlled arbitrary endpoint or browser key enrollment is exposed by that public candidate. The trusted local research host supports one shared ordered pool of one to three operator-selected model IDs; one model is sufficient. Specialist role mappings are historical/advanced compatibility, not the default. Arbitrary user-operated model/API connectivity remains a longer-term requirement, subject to trusted adapters and egress admission, not a shipped unrestricted relay.

General web research is optional, on demand, and mediated by the separate loopback Node host. Missing search, model or permission is explicit, not simulated. The host's research supervisor is not browser-native graph orchestration; Node DNS/TLS/PDF/PostgreSQL facilities are not browser capabilities. Deterministic/manual investigation and replay do not require web or inference. Model claims are untrusted; exact citation integrity and deterministic replay do not prove empirical truth or independent corroboration.

Browser/peer tests use real Chromium and distinct loopback origins with injected model responses. This establishes candidate behavior, not live commercial inference, deployed HTTPS conformance or public availability of the V2 candidate. The existing public app is legacy and unchanged; no release, merge or deployment is authorized. See [the pre-release checklist](DEVPOST-PRE-RELEASE.md) for unresolved gates.

## ADR-REL-001 — retain browser orchestration and separate host capabilities
Decision: use the canonical V2 static Pages artifact as the sole release surface. The browser downloads and compiles its published Neuro SAN-compatible JSON graph and runs the pinned nsDeploy agent loop locally. A same-origin API may supply bounded inference, never agent scheduling authority. The Pages function forwards only its fixed method/path table over the private same-account SUTRA_API service binding. The Worker owns fixed provider routes, credentials and durable quota admission. The separate guide origin publishes public graph JSON only. Keep public inference disabled until explicit owner approval and actual preview checks.

For this release, autonomous general web research remains a local Node capability, not an implicitly available public Pages service. The loopback workspace gateway owns its own research supervisor, query authorization, retrieval, model calls and report assembly. Browser graph orchestration and host research orchestration are distinct: do not claim the host supervisor is browser-native. A future public search/document capability must provide narrowly typed, individually authorized operations with browser-side graph scheduling and authenticated isolation; no generic URL relay. Pinned DNS/TLS sockets, Linux PDF sandbox and PostgreSQL workers stay on a compatible separately reviewed Node/Linux service, not inside Workerd or the browser. PDF and durable public research are not release claims.

Alternatives rejected:
- Full Node orchestration behind public HTTP: loses portable browser execution and expands server trust, abuse and cost exposure.
- All-in-Worker research: pinned socket, namespace/PDF and database guarantees are not established in Workerd.
- Browser-direct arbitrary provider endpoints: leaks or overexposes user keys and broadens CSP; current public candidate uses one pinned publisher route.
- Reusing legacy learner as canonical release: wrong product; retain compatibility tests and rollback only.

## Trust-boundary diagram

```text
 public judge browser (untrusted input; graph execution owner)
    | GET static JS/WASM, manifest + graph; local reviewed evidence
    v
 Pages static assets --------------------- public JSON guide origin
    | /api/status /api/infer /api/v1/chat/completions /api/source-tools
    | same-origin requests, bounded approval; guide GET only after consent
    v
 Pages Function -- exact method/path table -- private Worker service binding
    |                                         | fixed model + host-held key
    |                                         +--> reviewed provider endpoint
    |                                         +--> Durable Object quota ledger
    |
    + NO route to autonomous research, PostgreSQL, PDF or arbitrary URL proxy

 separate local operator (single trusted workstation)
    browser -- loopback Host/Origin + scoped client token --> Node research gateway
       |      one-shot preview, scoped queries, one active session      |
       |                                               fixed model/search APIs
       |                                               pinned public DNS/TLS
       |                                               bounded extraction
       +<-- untrusted report and exact spans; human admission --> reviewed kernel
                           offline proof export -> independently pinned verifier
```

The public guide edge in the diagram is a browser-to-guide credentialless GET, not a Pages-to-guide relay. Provider transport receipts establish response admission only. Neither an extracted span nor a proof digest establishes empirical truth. The local gateway is not a multi-tenant authorization system; a short-lived client token is not an account identity. A separately trusted proof pin and verifier digest are required for offline replay.

## REL-S02 — release threat model
Assets: provider/search credentials, approved model/config pins, quota reservations, source text and reviewed evidence, private session/report and draft state, artifact integrity, judge availability. Principals: anonymous visitor (untrusted), browser application (caller policy, not server authentication), peer publisher (untrusted graph/instructions), external provider/source (untrusted response), trusted local operator, deployment operator, private Worker and quota DO. An authenticated hosted tenant is a future principal; it has no enabled public session endpoint today. Same-origin does not prove user identity, and client IP is at most an abuse-control input.

| Attack / boundary | Existing candidate control | Required residual evidence / owner |
| --- | --- | --- |
| Anonymous quota exhaustion, direct POST, forged identity | fixed route, disabled default, bounded output, durable quota reservation; no public Worker URL | staged platform identity/service-binding verification, rate/volume/actual billing kill switch (REL-S04/S05/S14; operator) |
| Prompt/peer injection grants tools or sends secrets | bounded graph compiler, exact destination consent, caller-owned routing, private context allowlist, no registered writes, sanitized trace | full production red-team and negative network trace (REL-C20/S12; runtime reviewer) |
| Third-party graph or source substitution | exact name, redirect policy, raw artifact digest, acquisition pins; untrusted content rendered as text | public HTTPS/neutral consumer and source authenticity remain separate (REL-C11/C12/R02; browser reviewer) |
| Arbitrary outbound URL/SSRF and DNS rebinding | no public URL proxy; local pinned DNS/TLS/peer checks, HTTPS/media/body limits, robots, independent redirect admission | real authorized host test and egress enforcement; PDF sandbox probe before enablement (REL-S06/S07; infrastructure) |
| Cross-site requests, CSRF and spoofed local token | same-origin checks, process-random token, loopback-only bind, explicit approval, no wildcard private API CORS | actual preview forged-header tests; token is single-operator scope, not tenant login (REL-S05/S08; security) |
| Cross-tenant report/cache leakage or replay | no hosted research sessions exposed; local one-session gateway, no-store API, process memory, no public key persistence | before any hosted private session: authenticated principal, tenant-keyed storage/cache, expiry, CAS/fence, deletion, backup/restore, cross-tenant tests (REL-S08/S09/S10; backend) |
| Credential leakage to provider/peer/logs/build | host secret custody, exact provider routes, peer GET only, canary checks and redacted receipts; public build canary scanning | runtime secret inventory, rotation and operator approval; no CI-secret copying to runtime (REL-S03/S12/S13; operator) |
| Lost response, cancelled call, double dispatch or late publication | no automatic retry after uncertain dispatch; cancellation fences, quota lease, explicit unknown status | actual restart, interruption and invoice reconciliation; abort is not billing guarantee (REL-S11/S15; operator) |
| Poisoned artifact or forged proof | lockfile build, exact manifest/artifact pins, independent replay, tamper rejection | reviewed release artifact, trusted out-of-band pin, license/rights audit and rollback (REL-D09/S13; release owner) |
| XSS, malicious markup, oversized payload or UI denial of service | nonexecuting text extraction, DOM text nodes, restrictive CSP, bounded inputs/outputs | integrated production negative tests, physical mobile/load checks (REL-S12/U08; UI reviewer) |

These are design and threat-analysis decisions, not certification that each mitigation works in production. No protected session data may be placed in shared static cache or public artifact; any future tenant service must reject missing authentication and cross-tenant object IDs before reading data. If a required capability is missing, return explicit unavailable; no synthetic fallback masquerading as real output, no automatic paid escalation.

## Reproduction, attribution and evidence
From the exact reviewed checkout (Node 24 in browser CI, Python 3.10+ for offline verifier, Rust WASM target):
```sh
npm ci --prefix apps/sutra
npm ci --prefix apps/sutra-v2
rustup target add wasm32-unknown-unknown
node apps/sutra-v2/build.mjs
node --test apps/sutra-v2/test/build-contract.test.mjs
node packages/sutra-runtime/verify-vendor.mjs
node apps/sutra-v2/node_modules/playwright/cli.js install chromium
node apps/sutra-v2/test/autonomous-workspace.cjs
npm test --prefix packages/sutra-research
npm --prefix apps/sutra-peer run build
node deploy/sutra-pages/prepare.mjs
node deploy/sutra-pages/verify-build.mjs
```
Follow the [workspace workflow](../../.github/workflows/sutra-v2-workspace-browser.yml) for the full fixture and independent Python replay sequence; see [DEMO.md](DEMO.md) for trusted-pin ceremony and limitations. Local fixture browser tests inject inference; they are not real model/search or public HTTPS tests. Review exact configuration in [private Worker](../../services/sutra-api/wrangler.private.jsonc), [Pages adaptation](../../deploy/sutra-pages/README.md), [research host](../../packages/sutra-research/README.md), and [runtime](../../packages/sutra-runtime/README.md).

Source attribution: repository [Apache-2.0 license](../../LICENSE); pinned upstream nsDeploy commit 486ecf26aa8775963f9b765f894734bef1ac9817 (vendored core, upstream license, notices and identity in [vendor/nsdeploy](../../packages/sutra-runtime/vendor/nsdeploy)); sponsor [agentic-web](https://github.com/cognizant-ai-labs/agentic-web) specification and runtime are upstream work, not SUTRA inventions. SUTRA-specific additions include restricted host capability policy, reviewed evidence and deterministic revision/replay, orbital integration and packaging. The [Open Kit](../../tools/sutra-open-kit/README.md) is a reproducible private source candidate; no external adoption, npm release, or blanket asset rights implied.

Exact baseline hosted evidence: [all checks](https://github.com/aprashnasuraj2-dev/videoj/commit/55ca53b0e3137db5241d0b2ec68c1e6bf1a3cf5a/checks), [workspace browser incl. neutral-origin consumption and offline replay](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46097153323), [knowledge/inference](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46097153266), [research](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46097153210), [ingress dry-run](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46097153443), [Open Kit](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46097153320), [neutral consumer](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46097153221). These are past exact-revision results, not verification of subsequent changes. No public promotion or external sharing authorized.


### Browser-owned bounded frontier scheduling (development)

For an explicitly prepared local research session, the host now presents a bounded list of already-admitted source ranking features (opaque candidate ID, title, rank, depth and prior domain attempts). The browser computes the next source choice using the deterministic discovery policy. The host accepts only one exact candidate ID under the current session, plan, operation nonce and sequence, rechecks domain attempt limits, and requires a separate dispatch permit. No URL, credential or new network capability can be supplied by a selection. The host still owns model-response admission, search query planning, HTTP/DNS/TLS, robots, budgets and report assembly. Model-free automatic host mode is unchanged. This advances R15 but does not establish fully browser-native adaptive research; browser/host integration tests require exact-revision acceptance.
