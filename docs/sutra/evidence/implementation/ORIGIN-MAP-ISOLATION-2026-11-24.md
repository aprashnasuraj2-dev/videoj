# SUTRA origin map and isolation decision — 2026-11-24

This is a planning/isolation artifact built from existing repository documentation and the previously recorded read-only Cloudflare audit. **No new cloud/account/DNS request was made for this artifact.**

## Evidence classes

- **Repository-documented public origin:** a URL documented by the existing DHAGO/DETOUR project. This identifies the intended/current project mapping in source documentation; it is not a fresh live availability check.
- **Read-only Cloudflare observation:** a point-in-time connected-account inventory already recorded in `CLOUDFLARE-CAPACITY-2026-11-24.md` and `CLOUDFLARE-TWO-ACCOUNT-2026-11-24.md`.
- **Proposed SUTRA origin:** configuration/design only; not deployed or reserved.

## Existing project origin inventory

| Project | Origin / path | Evidence class | Isolation note |
| --- | --- | --- | --- |
| AafnaiPatro | `https://aafnaipatro.com/` | read-only Cloudflare audit: apex custom domain mapped to existing `patro` service | Must not be overwritten or used as SUTRA static host |
| DHAGO Studio | `https://creative.aafnaipatro.com/` | root README project documentation | Existing DHAGO demo; SUTRA build/output must not target it |
| DETOUR checkpoint demo | `https://detour-entry.aafnaipatro.com/mux/` | root README project documentation | Existing DETOUR demo |
| DETOUR single-place demo | `https://detour.aafnaipatro.com/mux/` | root README project documentation | Existing DETOUR demonstration |

The read-only Cloudflare audit did not assert the backing service for the DHAGO/DETOUR documentation URLs; therefore this map does not invent Worker/Pages ownership for them.

## New SUTRA origins

| Role | Proposed production origin | Development/preview | Build output | Status |
| --- | --- | --- | --- | --- |
| Learner/caller | `https://sutra.aafnaipatro.com/` | loopback Vite preview; candidate cloud previews are not release evidence | `apps/sutra/dist` | proposed, not deployed |
| Guide peer | `https://sutra-guide.aafnaipatro.com/` | loopback peer preview `http://127.0.0.1:4185` | `apps/sutra-peer/dist` | proposed, not deployed |
| Private funded API | same caller-facing `/api/*` path via intended isolated ingress/private service | local Vite bridge / CI synthetic transport | `services/sutra-api/` | inference disabled; not public live evidence |
| Media/transcript/graphs | caller static origin, served as static assets rather than Patro Worker application logic | app-local static build | inside `apps/sutra/dist` | development artifact only |

The earlier read-only audit found **no exact DNS record, Worker custom domain, or route for either proposed SUTRA hostname** and no wildcard subdomain Worker route that established a collision at that observation time. That is availability/preflight evidence only, not a reservation. Recheck immediately before any authorized future binding.

## Browser contact topology

Default learner contact policy:
- learner HTML/JS/CSS/media/transcript/agent data: caller same origin;
- local source tools / provider status / inference proxy: caller same-origin `/api/*`;
- peer public manifest/graph: exact guide origin only after consent;
- peer requests: `credentials:'omit'`, redirects rejected;
- no browser key/BYOK path;
- no analytics/ad third-party contact in current learner build.

The caller chooses the model/provider path. Peer metadata cannot select the caller model or receive caller credentials.

## Cookie/storage isolation

Current SUTRA does not require cookies for the learner/peer flow. External peer artifact fetches omit credentials. Browser-local review cards use an explicitly named SUTRA localStorage key on the caller origin.

If cookies are introduced later:
1. do **not** set `Domain=.aafnaipatro.com`;
2. keep authentication/session cookies host-only to the exact service that needs them;
3. use Secure + HttpOnly for server session credentials and an appropriate SameSite policy;
4. never rely on parent-domain cookies for caller↔peer composition;
5. peer public artifacts remain credentialless.

A subdomain is a distinct browser origin even though it shares a registrable domain. Same-owner subdomains therefore demonstrate cross-origin composition mechanics, **not independent ecosystem adoption**.

## Public artifact bases / exact identities

Planned caller artifact base:
- `https://sutra.aafnaipatro.com/agents/`
- networks currently published in development manifest: `learner`, `source_learner`, `linked_learner`

Planned peer artifact base:
- `https://sutra-guide.aafnaipatro.com/agents/`
- peer network: `checklist`

Exact network selection is required. A wrong name does not fall back.

## Production, preview and rollback targets

### Production
The two exact proposed production hostnames above. They are not deployed.

### Preview/development
Local/CI origins are deliberately distinct from production. The peer config records loopback preview separately and labels production `proposed_not_deployed`. Cloud provider preview URLs are not treated as production evidence.

### Rollback
Rollback is **artifact/revision based**, not a second public hostname:
- retain the prior immutable hashed app assets and versioned graph artifacts;
- preserve the previous known-good learner/peer build revision;
- restore the prior static artifact set on the same exact role/origin if an authorized deployment is rolled back;
- never roll SUTRA back by redirecting traffic onto Patro, DHAGO or DETOUR origins.

The existing rollout-retention tooling preserves immutable prior assets/graphs and rejects collisions. A real production rollback remains a later release-phase observation.

## Ownership / accounts

The archived two-account preflight records the Patro account as owner of the active `aafnaipatro.com` zone and a distinct CloudflareB connection as the intended isolated hosting side. It also records that a direct cross-account Worker custom domain is not a valid assumption. The candidate design uses isolated static hosting/private API concepts while leaving DNS association for a later authorized release step.

This is an engineering plan; it does not claim the cross-account topology is deployed.

## Exit interpretation

Phase 008 is a **choice/isolation planning phase**, not a deployment phase. Existing Patro/DHAGO/DETOUR public mappings are identified to the evidence level available; SUTRA caller/peer origins, outputs, contact boundaries, cookie policy, exact artifact bases and rollback strategy are separately defined.

No DNS, domain, route, account or deployment was changed to complete this phase.
