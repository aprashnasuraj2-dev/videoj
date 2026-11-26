# SUTRA technical implementation report — pre-release engineering draft

Observed: 2026-11-26. This report describes the **current repository implementation**, not a deployed public release. Proposed hostnames are not treated as live facts. Where evidence is synthetic, local, CI-only or still missing, the limitation is stated explicitly.

## 1. System responsibility split

SUTRA separates browser orchestration, static evidence, optional provider inference and deployment routing rather than using a server chat endpoint as the whole product.

### Browser

The learner in `apps/sutra/` owns the user journey, local source lookup, evidence display, native media control, review actions, consent UI and browser-side graph orchestration.

Key entry points:
- `apps/sutra/src/main.js` — learner composition and visible runtime controls;
- `packages/sutra-runtime/index.js` — bounded graph compilation/execution and explicit peer/source integration;
- `packages/sutra-evidence/index.js` — receipt validation;
- `packages/sutra-source-tools/index.js` — bounded source search/read;
- `packages/sutra-consent/index.js` — default-deny external-contact authorization;
- `apps/sutra/src/provider-run.js` — optional model-run lifecycle and receipt admission;
- `apps/sutra/src/receipt-actions.js` — source/version-bound review/seek authority.

A local question can remain entirely model-free. The browser does not accept a personal provider key.

### Optional server inference

The browser asks only the same SUTRA origin. `services/sutra-api/` validates origin, request shape, model allowlist, exact source/configuration preconditions, quotas and streamed protocol before forwarding an explicitly enabled request.

The checked-in Worker candidate has:
- `SUTRA_ENABLE_INFERENCE=false`;
- empty model allowlist;
- no selected backend by default.

`services/sutra-api/inference.js` supports two explicit operator modes:
- `hosted`: fixed OpenAI-compatible upstream defined in source, with server-only provider credential;
- `self_hosted`: exact operator HTTPS `/v1/chat/completions` gateway with a separate server-side token.

The visitor cannot supply the upstream URL. There is no automatic model/provider fallback and no automatic inference retry.

### Static delivery / dynamic ingress

`services/sutra-api/wrangler.jsonc` keeps Worker-first execution limited to `/api/*`. Ordinary HTML, hashed assets, public agent artifacts and media are intended for the static asset layer.

The Pages candidate in `deploy/sutra-pages/` exposes only `functions/api/[[path]].js` as a Function; CI rejects a non-API Function catch-all. This prevents ordinary media/static learner traffic from being routed through the private API service binding in the repository configuration.

This is a repository/staging-candidate architecture result, **not a production request-sample or billing claim**.

## 2. Public artifact resolution and peer policy

The learner loads data-only network publication rather than executable remote code.

Relevant source:
- `apps/sutra/public/agents/agent-manifest.json`;
- immutable versioned graph copies under `apps/sutra/public/agents/v/`;
- `apps/sutra/public/agents/links.json`;
- `packages/sutra-runtime/index.js`.

The local loader requires exact network-name matching and bounded JSON. Symbolic peer links resolve an address only; address resolution does not grant permission.

External peer graph loading is opt-in through a host-injected consent inspector. Manifest and graph retrieval are separate credential-free public GET operations. Redirects fail closed in the current profile. After validation, a peer graph executes in the **caller browser** under the caller's model/runtime budgets. SUTRA does not delegate the private provider key or arbitrary private caller state to a peer publisher.

The current profile rejects arbitrary executable remote peer definitions, generic REST execution and unrestricted MCP.

### Registered actions

SUTRA exposes narrow host-defined actions rather than allowing a graph to invent browser capabilities. Review and media-seek actions are enabled only from independently validated receipt/source state. Local review writes require explicit preview and confirmation.

A completed network/model response does not automatically gain seek/review authority. Authority is separately bound to the current source catalog, content version and request epoch.

## 3. Evidence validation and context filtering

### Receipt model

`packages/sutra-evidence/` defines the source-linked receipt boundary.

A v1 receipt carries:
- source ID/version/hash;
- media hash;
- cue ID and interval;
- exact excerpt;
- retrieval timestamp;
- explicit `verification: "unverified"`.

The strongest automated validator state is `catalog_matched`: the receipt agrees with an **independently supplied** catalog. It is not factual-truth, publisher-trust, semantic-support or safety certification.

Counterexample: a fluent model answer with no independently catalog-matched receipt is discarded by the learner provider path.

### Content profile

`packages/sutra-content-profile/index.js` binds the learner to a profile, catalog and transcript. It validates bounded JSON/data shapes, hashes the catalog/transcript, binds the primary source/cue and, in reviewed mode, requires content-addressed media/transcript/guide references.

The current public development content remains synthetic unless a rights-cleared reviewed content pack is explicitly supplied and passes its separate intake/review gates.

### Model/source context

The model adapter receives bounded host-selected graph/source context. Public graph instructions and source-tool text are treated as untrusted data; they cannot choose a network destination, provider model, credential, write capability or new caller policy.

The source-tool boundary returns bounded exact catalog data. The local lexical path deliberately abstains when retained query terms are unsupported and keeps ambiguous full matches visible.

### Review/seek authority

`apps/sutra/src/receipt-actions.js` independently revalidates receipt references. Stale, malformed, tampered or self-derived source records cannot enable current source actions. When source/configuration identity drifts, old evidence may remain readable but its action authority is revoked.

## 4. Reproduction commands

### Learner

Requires Node 22.12 or newer:

```bash
npm --prefix apps/sutra ci
npm --prefix apps/sutra run build
npm --prefix apps/sutra test
```

Full Chromium/browser integration additionally requires the Playwright browser binaries:

```bash
npm --prefix apps/sutra run test:browser
```

### Restricted runtime and reusable packages

```bash
node packages/sutra-runtime/verify-vendor.mjs
node --test packages/sutra-runtime/test/*.test.mjs
node --test packages/sutra-evidence/test/*.test.mjs
node --test packages/sutra-consent/test/*.test.mjs
node --test packages/sutra-source-tools/test/*.test.mjs
```

### Open Kit candidate

```bash
node --test tools/sutra-open-kit/test.mjs
```

The Open Kit CI also performs a deterministic rebuild, inventory verification, tar round-trip, evidence CLI invocation, consent-denial example, upstream vendor verification and publisher-starter tests.

### Tracker consistency

```bash
node docs/sutra/tools/progress.mjs check
```

These commands reproduce implementation checks. They do not reproduce missing human, rights, funded-provider, physical-device or public-production evidence.

## 5. Hosting, cache and quota model

### Browser security and cache policy

Static response policy lives in `apps/sutra/public/_headers`.

Current intent:
- `/assets/*`: one-year immutable cache for hashed build assets;
- `/agents/v/*` and `/agents/release/*`: one-year immutable cache for versioned publications;
- `/guides/release/*`: one-year immutable plus a data-only restrictive CSP;
- `/agents/*`: revalidate;
- `/media/*`: revalidate;
- `/index.html`: revalidate.

Media is therefore **not** claimed immutable merely from its current path. Source/content identity is separately byte/hash-bound by the content profile and evidence contract.

Default static CSP keeps `connect-src 'self'`. A future approved cross-origin public peer requires an explicit policy change plus a fresh browser/production-header check.

### Inference quota assumptions

Checked-in candidate defaults in `services/sutra-api/wrangler.jsonc`:
- maximum 100 admitted model calls/day;
- maximum 8 calls/client/day;
- maximum 2 concurrent active requests;
- 3,379,200 admitted input bytes/day;
- 51,200 admitted output tokens/day;
- configured output ceiling 512 tokens/request.

`services/sutra-api/quota.js` implements atomic daily/client/resource admission and 45-second active leases. A reservation is conservative: ambiguous provider failure does not refund the daily admitted budget. Concurrency release is separate from the daily spend/resource count.

These are **resource ceilings, not a currency budget**. Actual hosted-provider spend, self-hosted energy cost and competition-period funding headroom remain unmeasured until an authorized live configuration is tested.

### Media/inference hosting limitation

No production SUTRA hostname, final media host or funded inference backend is claimed by this report. Repository configuration and dry-run compilation are not production availability evidence.

## 6. Observed engineering evidence

The project keeps exact evidence under `docs/sutra/evidence/` and machine state in `docs/sutra/progress.json`.

Examples relevant to this report:
- `docs/sutra/evidence/implementation/SESSION-0047.md` — consent/source/config/default-inference stabilization;
- `docs/sutra/evidence/implementation/SESSION-0048.md` — fresh first-load inference discovery and static/media ingress isolation;
- `docs/sutra/evidence/implementation/PHASE-023-RUNTIME-ENTRY.md` — browser runtime entry and scripted local orchestration;
- `docs/sutra/evidence/implementation/SESSION-0050.md` — contributor/Open Kit documentation contract.

Observed browser evidence includes a fresh viewer completing the local question-to-review path without an external/model/media request, explicit optional-inference discovery, native-media evidence controls, visible denial/error states and browser-side orchestration.

Observed runtime/API evidence includes invalid graph rejection before model work, bounded source tools, exact consent boundaries, no automatic inference retry, provider stream terminal/token checks, source/configuration preconditions and safe failure behavior.

### Evaluation and cost status

Development/synthetic evaluation fixtures exist and are useful for regression detection, but they are not a held-out human-adjudicated semantic benchmark. Live funded-provider economics have **not** been measured. Physical GPU/open-weight model acceptance has **not** been measured. The technical report therefore does not supply invented latency, token-cost, energy-cost or user-success numbers.

The final report must replace this subsection with exact final-candidate evaluation/cost/browser results only after those measurements exist. This is why `SUTRA-P085-04` remains pending.

## 7. Security/privacy mechanisms and limits

Implemented mechanisms include:
- server-only provider credentials;
- exact model allowlist and operator-selected backend;
- no visitor-controlled upstream URL;
- no direct BYOK;
- default-off inference candidate;
- same-origin browser provider requests;
- daily HMAC client quota identity rather than raw address in model payload;
- credentialless public peer/source reads;
- explicit external-contact consent;
- bounded JSON/byte/parser limits;
- redirect rejection at restricted external boundaries;
- sanitized trace/export projection;
- no raw model/provider error bodies rendered as success;
- evidence/action authority separate from model fluency.

Important limits:
- consent does not prove a peer is trustworthy;
- catalog matching does not prove facts are correct;
- a model can repeat ordinary user text, so users must not submit secrets;
- a request already sent cannot be “unsent” by later cancellation;
- same-owner loopback fixtures do not prove independent public interoperability;
- secret-pattern scans are defense-in-depth, not universal exfiltration detection;
- CI/browser emulation does not replace physical-device or assistive-technology testing.

## 8. Current release limits / untested environments

The following are deliberately **not advertised as complete**:
- entrant eligibility and all content/employer rights;
- final rights-cleared lesson, written guide and factual reviewer;
- human first-time-viewer acceptance;
- human Nepali terminology review;
- physical touch/device acceptance and screen-reader user acceptance;
- authorized real open-weight model/hardware acceptance;
- live funded provider quality, cost and sustained availability;
- independent public HTTPS peer/MCP interoperability;
- production SUTRA DNS/routes and Cloudflare billing headroom;
- outside-builder adoption;
- final release candidate, public video and official submission.

The project also does not claim arbitrary MCP compatibility, arbitrary remote peer code, account/payment/certificate features, autonomous external writes or general prompt-injection immunity.

## 9. Source-to-claim index

| Claim | Source / check |
| --- | --- |
| Browser graph execution | `apps/sutra/src/main.js`, `packages/sutra-runtime/index.js`, `PHASE-023-RUNTIME-ENTRY.md` |
| Default-off optional inference | `services/sutra-api/wrangler.jsonc`, `services/sutra-api/inference.js`, Session 0047/0048 |
| Source-linked receipt validation | `packages/sutra-evidence/index.js`, package tests |
| Source/content byte binding | `packages/sutra-content-profile/index.js`, content-pack/intake tests |
| Consent before external peer/MCP contact | `packages/sutra-consent/index.js`, consent/browser tests |
| Review/seek authority from current evidence only | `apps/sutra/src/receipt-actions.js`, learner browser tests |
| Static/media paths outside dynamic API service path | `services/sutra-api/wrangler.jsonc`, `deploy/sutra-pages/ingress.test.mjs`, Session 0048 |
| Static cache/security policy | `apps/sutra/public/_headers` |
| Quota/concurrency ceilings | `services/sutra-api/quota.js`, quota tests |
| Reusable source distribution | `tools/sutra-open-kit/`, Open Kit CI |
| Current unresolved work | `docs/sutra/progress.json`, `docs/sutra/PROGRESS.md` |

## 10. Report status

This document is a **pre-release engineering report draft**. It is suitable for internal verification and later PDF-ready editing, but it is not the final phase-085 exit artifact because:
- live evaluation/cost results are incomplete;
- the deployed build does not exist;
- final release/public URLs are not available.

Future edits must preserve the distinction between implemented/tested behavior and proposed or externally unverified behavior.
