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
