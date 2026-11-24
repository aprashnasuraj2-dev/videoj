# Session 0026 — provider measurement readiness and revision-bound CI proof

Observed 2026-11-24T09:02:00+05:45 on current head `49de8a1e1fe1147a230cc40a5afcf162291c9e4e`.

Provider measurement workflow [45317785192](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45317785192) passed the offline cost-report suite; impact workflow [45317785213](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45317785213) passed its mapping/classification tests.

The measurement tool:
- retains completed/failed/cancelled runs and retries;
- uses all observed run cost for monthly projection rather than successful-run-only cost;
- nulls mean/p95/monthly/sensitivity if any request usage is unknown;
- requires explicit-timezone provider price/run timestamps;
- provides bounded offline CLI and synthetic-only sample;
- performs no provider call.

These mechanics are X004, **not** P054/P066 live measurement.

P079-07 evidence is strengthened: on `f4a8c78ca5f158217ed45bf52bf757303c94d4fe`, both specialized workflows ran only their cheap freshness jobs and skipped the expensive baseline/matrix jobs because the revision-bound engineering/browser metrics were current. Current head repeats the same behavior. Manual workflow dispatch remains a force-run path.

Counts: **597/1,000 original verified; 609/1,012 total verified; 44/100 fully verified phases; 6 omissions**.
