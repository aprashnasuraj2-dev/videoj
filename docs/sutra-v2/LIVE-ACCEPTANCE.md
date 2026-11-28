# Native live acceptance suite (operator opt-in)

The twenty goals in `live-acceptance-plan.js` are fixed public operational test objectives, not a blind benchmark or a factual gold set. The 18 evidence/comparison goals also form a keyless discovery-only suite. No credential is required for planning. Keyless endpoints can rate-limit or change access policies; the suite records refusals without inventing evidence.

Example local config (one public evidence goal):

```json
{"mode":"discovery","caseIds":["e01"],"models":[],"maxEstimatedCostMicros":3}
```

Preview from a trusted checkout:

```sh
node packages/sutra-research/live-acceptance.js --plan config.json
```

Only after approving the exact displayed plan pin, public query disclosure and estimated resource reservation:

```sh
node packages/sutra-research/live-acceptance.js --run config.json sha256:REPLACE_WITH_EXACT_PIN --approve-public-contact --approve-estimated-cost > live-receipt.json
```

For model mode, configure one or two explicitly selected vendor/model names and per-call estimates in micros (1 USD = 1,000,000 micros). Set the required vendor environment key locally; never include it in config or output. Add `--approve-model-disclosure` after reviewing the selected recipients and exact public-evidence disclosure scope. The 20-case model suite can reserve up to 120 model calls, 54 search attempts, 72 document attempts, and 100 MiB including reserved buffers. At 5,000 micros estimated per model call, the suite reservation ceiling is 600,060 micros ($0.60006); this is not a provider invoice estimate or guarantee. No automatic retries or credentialed search. Use selected subset first. Provider names do not prove independent models or sources.

A no-web pass means no search/document activity and a model-only response explicitly unverified; a web pass requires search, admitted document and exact passages; a comparison additionally requires at least two origins. Model mode requires a reviewed candidate claim. Every pass still requires independent factual and semantic review. No result is marked live until native execution is attempted. The receipt includes safe failure codes, usage, durations, source and response digests, not raw evidence/model text or secrets. Exact proof and factual scoring require separate authorized evidence retention.

## Fixed keyless release observations

The `sutra-keyless-release-acceptance.yml` push-only integration workflow runs the 18 fixed discovery cases in six groups, plus nine fixed direct-document probes. Manual dispatch is restricted to the same integration branch. Each group is bound to an independently computed plan digest; no secret is referenced or credentialed search enabled. Native SUTRA transport attempts are retained as JSON, including refusals. Maximum aggregate discovery reservation: 54 searches, 72 document attempts, 90 MiB and 54 estimated micros; document probe reservation separately capped at nine 30-second plans, 18 MiB total. No raw document/error text is retained. The direct probes use fixed public endpoints and record strict media, redirects, robots denials, missing status and cancellation; successful direct probes do not establish discovery quality. Failures remain failures. This workflow is a separate network observation, not a required PR CI job or deployment authorization.
