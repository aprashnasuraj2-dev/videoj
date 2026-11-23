# Session 0005: inference host and grounded source reads

Started 2026-11-23 13:58:02 +05:45 (08:13:02 UTC), requested approximately
30 minutes. Resumed main `13d9eb8e624f1c83e22a29f1dd17dfe69bcc17cc`;
remote main was unchanged when the implementation PR was created. All work is
SUTRA. Existing reusable player source, demos and production deployment mappings
are unchanged; no paid calls or production changes occurred.

## Implemented behavior

- Separate inference client and server-only Worker candidate, disabled by default.
  One fixed upstream, explicit operator model allowlist, no caller URLs/keys/caps,
  bounded JSON/messages/tools/output, sanitized streaming, abort deadlines and no
  retry/refund after ambiguous upstream work.
- Global daily quota in a single Durable Object's atomic transaction; per-client
  daily HMAC identity, no raw IP/prompt/key persistence. Defaults 100 total calls,
  8 per client and 512 requested output tokens. The 51,200 maximum requested output
  tokens/day is not a dollar cap: input tokens, model price and provider billing
  remain unknown. Origin checks are not authentication; production abuse controls
  and actual account spend limits remain operator gates.
- Reusable read-only `search_lesson` and `read_cue` registry with closed schemas,
  exact host catalog receipts, bounded results and `unverified` truth status.
  It cannot fetch a caller URL, inspect arbitrary DOM or execute scripts.
- Same-origin JSON-only MCP facade and bounded runtime transport. Trusted host
  configuration grants exactly `/api/source-tools`; default compilation still
  rejects MCP descriptors. Remote peers/coded tools/REST remain refused. Upstream
  nsDeploy modules are unchanged. No general MCP compatibility claim is made.
- Published source_learner graph, scripted learner-to-evidence delegation, real
  source endpoint search/read calls, output revalidation and explicit unavailable
  UI. Decisions are scripted; transport/retrieval/validation actually execute.
- Snapshot-only playback read adapter returns native current time, duration and
  booleans after metadata; absent/error/live-unknown media reports unavailable.
  No DOM element, URL or mutation capability is returned by the snapshot.
- Local Vite development/preview serves the same read API handler with inference
  disabled. Candidate Worker configuration uses asset-first routing except API;
  workers.dev is off and no production route is assigned.

## Verification and practical limits

Code candidate: `61f44558b9512990f9c4155e31ff95d0d40bbe98`.
`inference-source-candidate-files.json` identifies exact changed source bytes.

- 59 runtime tests, 11 inference client/parser tests, 5 source registry tests,
  13 Worker/quota tests, and 21 app tests: **109 total local tests passed**.
- Production Vite build and all 10 upstream module hashes passed. The optional
  lazy Mux chunk still produces the known size warning. Server-only key/HMAC
  identifiers, fixed provider URL and test secret marker are absent from built JS.
- Integration observes two agents, five scripted model steps, two actual source
  calls, catalog-matched receipts, rejection of tampering/extra tools/wrong IDs,
  cancellation and HTTP/size/type failures. It proves consistency, not truth.
- Provider tests use injected synthetic streams, not live AI. Quota concurrency
  tests use a serialized in-memory transaction harness, not Cloudflare execution.
  No Wrangler dry-run, deployed migration, actual secret or live visitor success
  has been observed. Model selection and paid-service authorization remain pending.
- Local browser attempt started preview after the fix, then failed because the
  required Playwright Chromium binary was absent. This is not a browser pass.
  Remote Chromium status is recorded below only after actual observation.

## Retained failures and fixes

The first CI candidate `7edb8b3deca47f194a9b5aa62f96432f16bf74b6` passed build,
Node suites and vendor checks, but preview exited before browser readiness:
https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45138952082/job/137571922114
The local Vite plugin returned Connect's app object; Vite interpreted the return
as a post-hook. The installer now returns nothing. Startup stderr/stdout is kept
in the browser harness so future failures are actionable. No browser success was
credited to that candidate. A source-validator option-name mistake was also found
while checking the API and corrected from shape-only to the actual `sources`
argument before the source tests/candidate were published.

## Next work

Implement a consent-aware peer boundary and tests before any cross-origin contact.
Actual approved provider/model/budget and live keyless visitor checks remain phase
025 gates. Original lesson rights, factual reviewer, real learner/builder trials,
Cloudflare deployment, final ZIP and Devpost filing remain pending.

The source registry and validator are additional community building blocks. Source
availability and reproducible tests are evidence of implementation; they are not
independent adoption or measured Potential Impact.


### Additional browser failures retained

Candidates 4762fc1ad3ffd5f2c2f8b352e572fb0ec858751c and
 d9ff703f01d2bf08ae2b41050421f0327d465ede passed source retrieval but failed the
unavailable-source browser assertion. The upstream loop could relay tool errors as
ordinary text; the SUTRA host now promotes required source discovery/call errors to
its failure channel and aborts the composition. A dedicated regression test covers
both. Candidate bb7ac772ceac026cb835c1bb0bbc83b33edccd6c passed those cases and native
snapshot reads but failed the 360px overflow assertion; the JSON output now wraps
inside the learner column. Final candidate additionally declares the playback read
capability's closed empty input schema. These failures were not called successful
browser runs. Local system Chromium launch also failed; only remote browser
observations can establish this session's functional browser result.


## Final browser observation 2026-11-23T14:22:27+05:45

Candidate `61f44558b9512990f9c4155e31ff95d0d40bbe98`: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45139865572/job/137574910727 succeeded. Inspected steps confirm locked install,
build, 21 app tests, 29 inference/source/API tests, 59 runtime tests, all ten vendor
hashes and the actual Chromium command passed. Browser tests cover scripted
internal delegation, two source-tool calls, blocked source failure without a
completion claim, invalid graph/artifact refusal, native decode/play/pause/seek and
playback snapshots, reviewed local persistence, keyboard interaction, 360px layout,
no page errors, no external requests and no optional Mux load for the native fixture.

Final checkpoint: **152/1000 checks; ten phases fully verified**. Phase 027 closes;
phase 025 remains partial because actual operator model selection, a live keyless
visitor task and its exit have not occurred. Remote tree comparison confirms zero
changes to existing `src/`, `detour/`, `apps/preview/` or their deployment configs.


## Deployment-free packaging follow-up

At 2026-11-23T14:25:23+05:45, `WRANGLER_SEND_METRICS=false npm exec --yes
--package=wrangler@4 -- wrangler deploy --dry-run --outdir
/tmp/sutra-worker-dry-run --config wrangler.jsonc` passed using Wrangler 4.166.0.
It read 72 assets, bundled a 32.49 KiB Worker (9.16 KiB gzip), recognized the
InferenceQuota/ASSETS bindings and retained enable=false/model-list-empty.
No secrets were supplied and no account resource, route or migration was deployed.
The earlier no-dry-run statement describes the initial candidate checkpoint; this
observation supersedes only that packaging limitation. The preceding offline CLI
attempt failed ENOTCACHED; normal installation then supplied the CLI. A proxy and
transitive node-domexception deprecation warning did not fail the dry-run.

This is bundle/config validation, not Cloudflare runtime, quota persistence,
provider compatibility, spend control or public release evidence. Verified task
count stays 152; no deployment or live-visitor task is closed by a dry-run.
