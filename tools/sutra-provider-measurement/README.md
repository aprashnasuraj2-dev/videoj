# SUTRA provider measurement gate

This tool performs **no provider call**. It converts a small approved live-sample record into a fail-closed cost report.

Use it only after a participant approves a provider/model and spend ceiling. Record every upstream request in each sampled run, including failures, cancellations and retries. Enter the dated provider price basis manually from the authoritative provider source.

If any observed request has unknown token usage, set `usage:null`. The report intentionally returns null mean/p95/monthly/sensitivity rather than estimating missing paid usage.

Required live sample fields:
- exact candidate source revision;
- provider + model identifier;
- prompt/completion price per 1M tokens, effective timestamp and source note;
- run outcome and observed timestamp;
- every provider request sequence, retry flag and outcome;
- prompt/completion tokens when the provider reports them.

The tool computes completed-run mean and nearest-rank p95 cost, an explicit monthly-run scenario, doubled-prompt sensitivity and one-full-mean-retry sensitivity. Failed/cancelled requests stay visible in the raw run rows. The arithmetic is not a billing guarantee.

Synthetic unit tests validate the calculation only. They are not P066 live-cost evidence and do not authorize paid inference.
