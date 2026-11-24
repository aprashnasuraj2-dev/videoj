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

The tool computes both all-observed-run and completed-run mean/nearest-rank p95 cost. Monthly projection uses the **all observed run** mean so paid failed attempts are not silently excluded. It also reports doubled-prompt and one-full-observed-run-retry sensitivity. Failed/cancelled requests stay visible in the raw run rows. The arithmetic is not a billing guarantee.

Synthetic unit tests validate the calculation only. They are not P066 live-cost evidence and do not authorize paid inference.

## CLI

The measurement tool is offline:

`node tools/sutra-provider-measurement/cli.mjs MEASUREMENT.json > report.json`

Exit 0 means the supplied record has complete token usage and cost arithmetic was produced. Exit 3 means the JSON is structurally valid but cost completeness is false because at least one request has unknown usage. Exit 2 is invalid input/usage. Input is capped at 512 KiB. Timestamps require an explicit timezone.

`example.synthetic.json` is deliberately fake data with provider/model labels that cannot be confused with a live sample. Never cite its costs.
