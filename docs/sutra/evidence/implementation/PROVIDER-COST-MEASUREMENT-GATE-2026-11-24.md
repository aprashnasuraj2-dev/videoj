# Provider cost measurement gate — implementation only

SUTRA now has a deterministic cost-report tool for the future **approved** live sample. It does not contact a provider and therefore does not satisfy P054-01 or P066-01..03.

The report refuses cost completeness if any observed provider request lacks token usage. Failed/cancelled requests and retries remain in the record. With complete usage and a dated price basis it computes completed-run mean, nearest-rank p95, explicit monthly scenario, doubled-prompt sensitivity and one-full-mean-retry sensitivity.

This prevents a future live test from quietly excluding failed paid requests or projecting monthly cost from incomplete token data.