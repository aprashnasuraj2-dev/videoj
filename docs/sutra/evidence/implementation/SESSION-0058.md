# SUTRA Session 0058 — dated Cloudflare Worker request sample

- Observed: 2026-11-26T19:56:56+05:45
- Product source remains: `f8c3da48a4d99a6311910b99a40b23d0ea9fa63c`
- Operation: read-only Cloudflare Workers Observability query against the connected AafnaiPatro account.
- No deployment, route, DNS, Worker, binding, secret, billing, cache or application configuration was changed.
- Privacy rule: raw request headers, IP addresses, user agents, request/ray/trace IDs and account identifiers were not retained in repository evidence.

## 24-hour service-level observation

Query window: **2026-11-25T14:00:00Z to 2026-11-26T14:00:00Z**.

Workers Observability event counts grouped by `$metadata.service`:

| Worker service | Observability events |
| --- | ---: |
| `patro` | 30,996 |
| `aafnai-library-phase1` | 1,882 |
| `patro-date-pages` | 593 |

These are **observability event counts, not billed Worker invocation counts**. They must not be used as a quota/headroom denominator.

## Dated privacy-projected request sample

Query window: **2026-11-26T12:00:00Z to 2026-11-26T14:00:00Z**. The connector queried each service and projected only timestamp, service, event type, method/path, status, outcome and timing before returning the sample.

| UTC timestamp | Worker service | Request path | Status | Outcome | CPU ms | Wall ms |
| --- | --- | --- | ---: | --- | ---: | ---: |
| 2026-11-26T13:59:59.245Z | `patro` | `GET /nepal/sunsari/duhabi/balkunda` | 200 | ok | 4 | 411 |
| 2026-11-26T13:59:49.186Z | `patro` | `GET /nepal/solukhumbu/vdc/nele` | 200 | ok | 3 | 802 |
| 2026-11-26T13:59:34.652Z | `aafnai-library-phase1` | `GET /article/mig-wire-feed-versus-current-compare-common-methods-setup-choices-and-trade-offs` | 200 | ok | 8 | 613 |
| 2026-11-26T13:58:18.477Z | `aafnai-library-phase1` | `GET /research/cdn-cache-key-variation-troubleshooting-isolate-the-failure-with-observable-tests` | 200 | ok | 2 | 986 |
| 2026-11-26T13:58:05.978Z | `patro-date-pages` | `GET /date/2007-07-16` | 200 | ok | 2 | 433 |
| 2026-11-26T13:55:25.512Z | `patro-date-pages` | `GET /date/2007-05-30` | 200 | ok | 2 | 530 |

Every retained sample row had `eventType=fetch`. The sample therefore shows concrete request paths that entered each observed Worker service.

## SUTRA-P065-08 — verified

The task asks for a dated request sample showing which requests invoke Workers. The read-only query above provides dated path-to-service evidence for the existing account and records only non-sensitive fields.

## Boundaries

- This does **not** prove SUTRA production route behavior because SUTRA is not publicly deployed.
- It does **not** satisfy P065-07. Observability events are not a trustworthy substitute for account-wide billed invocation usage, plan limits or retry headroom.
- It does **not** satisfy P065-10. That exit requires an observed SUTRA static visit that bypasses the main Patro Worker and separate inference-call accounting on the selected production route.
- The earlier deployment/release prohibition remains unchanged.

## Register effect

One additional original task is verified:

- Overall verified: **776 -> 777 / 1,107**
- Original verified: **670 -> 671 / 1,000**
- Original pending: **324 -> 323**
- Omissions: **6** unchanged
- Hardware blockers: **1** unchanged
