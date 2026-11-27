# SUTRA Cloudflare capacity and route audit — 2026-11-24

Read-only audit only. No Worker, route, domain, setting, billing plan or deployment was changed.

## Connected-account observations

Query window: 2026-11-17T00:00:00Z through 2026-11-23T23:00:00Z, with Workers observability bins aligned to Asia/Kathmandu.

- Workers observability reported **532,550 events** across the queried period.
- Service breakdown:
  - `patro`: **485,860 events** (~91.2% of observed events), about 1.961 GB of logged event data.
  - `patro-date-pages`: **30,110 events** (~5.7%), about 149 MB.
  - `aafnai-library-phase1`: **16,580 events** (~3.1%), about 85.7 MB.
- The account listed **49 Worker scripts** and **35 Worker custom domains** at audit time.
- The only scripts in that list reporting static asset bindings were `patro` and `patro-date-pages`.
- No Worker domain containing SUTRA was present. `aafnaipatro.com` was mapped to the existing `patro` service.
- Workers account settings reported default usage model `standard`.
- The billing-usage endpoint returned HTTP 403 because the connected OAuth grant does not include **Billing Read**. Therefore this audit cannot establish billed request totals, current plan tier, spend, or exact remaining request headroom.

Workers observability event counts are operational telemetry. They are not represented here as identical to billable request counts.

## Relevant current Cloudflare rules

Cloudflare documentation retrieved on 2026-11-24 states:

- Static asset requests are free and unlimited on free and paid plans **when the request serves a static asset without invoking a Function/Worker**.
- Pages Functions and Worker invocations count against Workers quotas.
- Workers Free, if that is the applicable account plan, has a 100,000 Worker request/day limit resetting at midnight UTC. **This audit did not establish that the connected account is on Workers Free.**
- With Workers static assets, `run_worker_first` causes matching requests to invoke Worker code; avoiding it for ordinary static assets prevents those visits from consuming dynamic Worker requests.

References:
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/

## Proposed SUTRA hostname precedence check

A second read-only check used the proposed caller and peer hostnames already recorded in the SUTRA register:

- `sutra.aafnaipatro.com`
- `sutra-guide.aafnaipatro.com`

At observation time:

- exact DNS-record lookups returned no record for either hostname;
- the account Worker custom-domain inventory contained neither hostname;
- the zone Worker-route inventory contained neither hostname and no wildcard subdomain route such as `*.aafnaipatro.com/*`;
- the existing routes are specific to the apex host/path space (for example existing `aafnaipatro.com/...` patterns), so they do not by themselves establish a SUTRA subdomain binding;
- the existing apex custom domain `aafnaipatro.com -> patro` is an exact hostname mapping and is not evidence that a different subdomain is captured.

Cloudflare routing documentation retrieved on 2026-11-24 states that custom domains are configured for the requested hostname and that, when multiple Worker route patterns match, the most specific route wins. A Worker route also requires a resolving DNS record for the hostname before normal traffic can reach it.

References:
- https://developers.cloudflare.com/workers/configuration/routing/routes/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

**Result for P065-03:** no current route/domain/DNS precedence collision was observed for the two proposed SUTRA hostnames. This is a point-in-time read-only audit, not a reservation of those names and not production-route evidence. Re-check immediately before any eventual DNS/domain creation because account configuration can change.

No DNS record, Worker custom domain, Worker route, script, setting or deployment was created or modified by this audit.

## SUTRA configuration implications

Current development config in `services/sutra-api/wrangler.jsonc` has:

- `workers_dev: false` — no implicit public workers.dev release is requested.
- static directory `apps/sutra/dist`;
- `run_worker_first: ["/api/*"]` — ordinary HTML, hashed JS/CSS, graph files, transcripts and media are intended to be served as static assets, while API requests invoke Worker code;
- inference default `SUTRA_ENABLE_INFERENCE: "false"`;
- default external peer CSP allowlist empty;
- global inference quota and active concurrency controls remain separate from static asset delivery.

That split is the correct direction for preserving shared Worker capacity: **static learner traffic should not invoke the main Patro Worker or SUTRA Worker code; only explicitly dynamic SUTRA API traffic should.**

The static `_headers` file now carries the browser security policy because ordinary assets bypass Worker code. The Worker duplicates the same security policy for API responses. Build tests prevent those policy layers and `run_worker_first` from drifting silently.

## What this audit does not prove

- It does not prove account billing headroom or the active Cloudflare subscription tier.
- It does not establish a safe request forecast for a public SUTRA launch.
- It does not prove production route precedence after a future deployment. The two proposed SUTRA hostnames were checked read-only and showed no present collision, but neither is configured/reserved.
- It does not prove that production CDN/static requests will remain outside Worker invocation until an actual deployed request sample is observed.
- It does not authorize deployment, DNS changes, Worker domain creation or route modification.

## Release-gate consequence

Keep phase 065 open. Before public release:

1. obtain a billing/request usage source with sufficient permission, or explicitly document the plan/request ceiling from the participant's account;
2. re-confirm the proposed/final SUTRA caller and peer hostnames immediately before DNS/domain creation and re-check route ownership;
3. deploy only after the participant release gate is lifted;
4. capture a dated production request sample distinguishing static asset requests from `/api/infer` Worker invocations;
5. confirm the deployment does not route SUTRA static pages through the existing `patro` Worker.

Until then, the repo can verify the desired static/dynamic split but not production headroom.
