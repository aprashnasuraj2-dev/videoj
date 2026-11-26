# SUTRA self-hosted resource measurement gate

This offline tool records **real operator-owned inference measurements after hardware is explicitly authorized**. It does not start a model, download weights, contact a provider, create a tunnel or deploy anything.

The input binds an exact source revision, model identifier, exact public gateway URL SHA-256 plus a separate gateway-build SHA-256 identity, engine/version, weight SHA-256/license/source, GPU/RAM, dated electricity/hardware-amortization basis plus whether energy is wall-meter total or an incremental measurement and bounded concurrent batches. Each request keeps completed, failed and cancelled outcomes, latency, model-call count, retry count and reported token usage. Each batch records its measurement-window **start** in `observedAt`, wall-clock duration and measured energy. Measurement windows must not overlap; overlapping windows are rejected because summing them would double-count hardware time and potentially wall energy.

Completed requests must include at least one model call; request latency cannot exceed its enclosing batch duration. Retry counts remain visible and the report exposes a separate `noAutomaticRetries` policy flag. The report computes observed latency p50/p95, concurrency-specific p50/p95, token completeness, energy, electricity cost, hardware-time cost and a scenario projection. It never treats provider token pricing as self-hosted cost. Operational cost is intentionally limited to the supplied energy and amortization basis; network/tunnel/labor/tax/replacement costs remain disclosed as excluded.

Synthetic tests prove arithmetic and validation only. They are **not** real GPU evidence and do not satisfy X007-08.

`node tools/sutra-local-measurement/cli.mjs MEASUREMENT.json > report.json`

Exit 0 means the supplied resource record has complete token usage. Exit 3 means resource measurements are structurally valid but at least one request lacks token usage. Exit 2 means invalid input.
