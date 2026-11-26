# SUTRA session 0047 — 2026-11-26

Observed at 2026-11-26T16:25:00+05:45. Work branch `sutra/caller-peer-failure-boundary`. Exact observed source `d1560cfadbd0cf73007076e7a5e7b8f319e8fc81`; this head is one documentation-only commit ahead of the last product-code source `ae042db07f51d0cf1e71f002869ce9a65a011d48`, so the product/runtime bytes are unchanged while the exact head received a fresh full CI run.

## Objective

Close `SUTRA-P078-02` only if the stabilization condition “Fix consent, source-version and default-inference blockers before polish” is supported by current executed assertions. This is a reconciliation/verification closure, not a release, live-provider, human-acceptance or deployment claim.

## Exact CI observation

Commit `d1560cfadbd0cf73007076e7a5e7b8f319e8fc81` completed all 19 pull-request workflows successfully.

Primary learner workflow:
- Run: `45772729122`
- Job: `139748964385`
- `npm run build`: pass
- `npm test`: pass
- package/API tests: pass
- runtime tests: pass
- Chromium browser suite: pass

Additional exact-head gates used for boundary coverage:
- local inference gateway run `45772729143`: pass
- release-candidate gate run `45772728930`: pass
- reviewed content-pack compiler run `45772729087`: pass

## P078-02 stabilization closure table

| Area | Exact-head evidence | Result / limitation |
| --- | --- | --- |
| Default inference state | learner log: “disabled by default; no upstream before validation”; checked-in Worker candidates remain off | Pass. No claim about a live provider. |
| Local/no-model path | 40-case authored synthetic lexical suite: 20 positive, 10 unsupported, 10 adversarial/ambiguous; zero model calls/network requests | Pass for deterministic development fixtures, not held-out semantic quality. |
| Source-version binding | snapshot-aware inference/source tools reject stale or malformed catalog before quota/upstream; browser content drift path makes zero model calls | Pass. |
| Model/backend/config binding | approved contract cannot authorize different caller/graph origin; snapshot-aware model POST pins exact backend; browser graph/inference-contract drift invalidates approval before model call | Pass. |
| Per-run inference consent | browser suite verifies opening consent performs zero model calls and approval is single-run | Pass. |
| Denial/cancel before model | browser suite verifies cancel/native close produces zero model calls and keeps local evidence available | Pass. |
| Source-less generated answer | browser `no-receipt` case discards interpretation and exposes no completed answer | Pass. Counterexample remains rejected even when model text is fluent. |
| Invalid/stale receipt | collector independently refuses malformed, stale, tampered and self-verified records; revalidates on mounted-source drift | Pass. |
| Partial/truncated stream | protocol tests reject missing DONE, provider errors and incomplete terminal events; Worker cannot certify DONE | Pass. |
| Terminal rewrite | protocol test: terminal reason is immutable, including unsuccessful finish followed by empty stop | Pass. |
| Token inconsistency | protocol/usage-ledger tests reject early/replaced usage and inconsistent prompt+completion total | Pass. |
| Automatic model retry | usage ledger and browser/provider runs report no automatic retries; network loss requires explicit fresh retry | Pass. |
| Catalog/config change mid-run | exact API/runtime tests reject stale catalog/backend; browser drift paths end incomplete and clear provider authority | Pass. |
| Prior completed result | browser regression keeps previous completed evidence through cancelled preflight, then revokes stale action authority once a later model run actually starts | Pass. |
| Source ambiguity | local answer test keeps alternative fully matching cues visible and does not invent one answer | Pass. |
| Search truncation | direct/source-tool tests preserve total match count and explicit truncation rather than implying five results are exhaustive | Pass. |
| Secrets/BYOK | client assets exclude server credential identifiers/fixed paid upstream; direct BYOK absent; cookies/authorization not forwarded | Pass. |
| Release config binding | release-candidate workflow passed backend/content identity tests and incomplete-template refusal | Pass structurally; not a release or deployment. |
| Paid fallback | checked-in candidates remain inference-off; hosted/self-hosted mode is explicit and tests reject disabled/malformed backend before upstream | Pass for default configuration. No live funded sample. |

## Counterexamples preserved

- A fluent generated response with zero independently catalog-matched receipts is rejected.
- A failed/length terminal reason followed by an empty stop frame remains incomplete.
- Prompt + completion token counts that do not equal total are rejected.
- A changed catalog, backend, graph or inference contract cannot inherit old approval.
- Six matching cues cannot be represented as one confident answer merely because only five are rendered.
- Opening or cancelling inference consent cannot create model traffic.
- A prior completed answer cannot lend active review/seek authority to a later failed or different-question run.

## Scope boundary

This closes only original checklist item `SUTRA-P078-02`. It does not close phase 078 because `SUTRA-P078-07` and `SUTRA-P078-10` remain pending. It does not resolve:
- R-005 human-adjudicated held-out semantics;
- R-006 rights-cleared lesson/reviewed guide;
- R-007 live funded provider economics;
- R-008 physical touch/human screen-reader acceptance;
- R-009 independent public interoperability;
- R-010 production Cloudflare billing/headroom.

No paid inference, public deployment, DNS/route change, release, promotion or submission occurred.
