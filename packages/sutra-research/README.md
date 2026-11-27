# SUTRA standalone autonomous research — experimental vertical slice

This package is separate from the exact-URL, pinned-investigation research operator. The old operator, hosted model policies and deterministic kernel are unchanged.

## Run locally (Node 22.12+)

Create a manifest such as:

```json
{
  "schema": "sutra-autonomous-research/v1",
  "objective": "Compare long-term grid battery storage costs",
  "scope": {
    "publicWeb": true,
    "queryDisclosureAllowed": true,
    "allowPrivateNetworks": false,
    "allowAuthentication": false,
    "allowExternalWrites": false,
    "privateEvidenceDisclosureAllowed": false
  },
  "budget": {
    "maxSearches": 6,
    "maxDocuments": 12,
    "maxLinkDepth": 2,
    "maxDurationSeconds": 300,
    "maxDownloadBytes": 8388608,
    "maxCostMicros": 100000
  },
  "providers": [
    {"id": "brave", "estimatedMaxCostMicros": 10000},
    {"id": "tavily", "estimatedMaxCostMicros": 10000}
  ]
}
```

The cost fields above are illustrative operator estimates, not current provider quotes. One dollar is one million micros. Confirm pricing and vendor terms for your actual account, query type and jurisdiction before execution. The CLI does not offer guaranteed strict-dollar mode or check vendor billing. The byte ledger reserves maximum response bytes for each request, including robots fetches; actual bandwidth (headers/TLS/etc.) is not measured.

Preview without credentials or contact:

```sh
node apps/sutra-v2/autonomous-research.mjs --plan < research.json
```

Read the exact preview, including the public-query disclosure scope. Supply provider credentials in the trusted process environment (SUTRA_SEARCH_BRAVE and SUTRA_SEARCH_TAVILY), not in the manifest. Then execute using the exact displayed planPin:

```sh
node apps/sutra-v2/autonomous-research.mjs --execute-research --approve-public-contact --approve-estimated-cost --approve-plan "$PLAN_PIN" --checkpoint-dir ./new-private-research-session < research.json > report.json
```

The checkpoint directory must not already exist. The option is not required for execution; without it no durable snapshots are written. Checkpoints contain objective, queries and collected public text; treat them as private local data. A retained digest is an integrity anchor, not authentication. An explicit pause is supported with --pause-after N (completed operation boundaries) plus --checkpoint-dir. Retain the reported checkpoint digest. Only a quiescent paused checkpoint is eligible for fresh approval; a running, closed or pending-dispatch checkpoint is rejected. The original absolute deadline and all reservations are preserved. Time spent paused counts against the deadline. Resume into a NEW checkpoint directory:

```sh
node apps/sutra-v2/autonomous-research.mjs --execute-research --approve-public-contact --approve-estimated-cost --approve-plan "$PLAN_PIN" --resume-checkpoint ./new-private-research-session/checkpoint.json --resume-pin "$CHECKPOINT_PIN" --checkpoint-dir ./continued-private-session < research.json > resumed-report.json
```

No automatic replay or crash recovery is provided for unknown remote dispatches. The CLI atomically consumes the retained local checkpoint path and digest before any new remote work; a failed continuation may conservatively consume it. Copying the checkpoint elsewhere can bypass the local marker and is not supported. Hosted deployments need database-level session locks and single-use continuation records. Events go to stderr and report JSON to stdout.

## Guarantees and limits

- Only objective-derived queries; no remote content is promoted into tool instructions or sent to a model. Search credentials only go to fixed provider endpoints. Public document requests are unauthenticated.
- DNS all-answer checks and direct pinned TLS peer verification. Redirects, query-bearing document URLs, non-HTTPS, IP literals, compression and unsupported media are refused. Same-origin reference links are the default; add the explicit scope field "allowCrossOriginLinks": true to authorize cross-domain public reference navigation. No referrer, cookies or credentials are forwarded. A robots policy is fetched and evaluated conservatively; access/terms still require operator review. No browser sandbox or independent egress firewall has been deployed.
- Serial waves use the existing bounded task DAG. Exact extracted-text passage locators and digests are checked. Source matching, domain diversity and lexical coverage are not independent corroboration or factual correctness. A deterministic evidence index validates every source span, retains exact numeric observations with explicit units and candidate period, detects narrowly matched numerical discrepancies, flags possible common-origin documents and emits a typed provenance graph. No semantic contradiction or causal conclusion is asserted.
- HTML extraction uses a bounded, non-executing scanner with structural line breaks and candidate metadata. It is deliberately limited, not a browser-compatible or general main-content parser. PDF, JavaScript rendering, multi-agent hosted reasoning, formal contradiction analysis, report synthesis, production gateway, authenticated tenancy and crash reconciliation for unknown external dispatches are not implemented.
- Unit tests use injected providers/transport and do not establish live provider success. The research-specific workflow runs npm test --prefix packages/sutra-research.
