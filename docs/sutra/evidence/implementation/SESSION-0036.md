# SUTRA session 0036 — asynchronous evidence, learner order, publication completeness

Observed 2026-11-24T15:27:36+05:45. Only SUTRA; branch `sutra/caller-peer-failure-boundary`, PR #49 remains draft. This continuation began around 14:53 Nepal time; elapsed time at this observation about 35 minutes, not the requested full 60. No paid/live model, cloud mutation, deployment, release, merge or submission. Connector edits and GitHub CI, no local repository execution claimed.

After the 0035 checkpoint, retrieved individual diff data for all 54 intervening commits between the 0034 observed source and initial PR head and examined relevant changed-file lists and implementation diffs, in addition to the net source review. This is not independent execution of each historical commit.

## Exact revision and relevant executed job evidence

| Revision | Observation | Executed evidence |
|---|---|---|
| b48eeb10212b51cd54660484b62097931fcc9c49 | Immutable source args, preabort/handshake checks, no late receipt | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45364758665/job/138343494521) |
| 7d29bae613160531901fc397bb6a473c6306b944 | 128-char source IDs consistent in local, catalog and MCP | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45364954724/job/138344169644) |
| 16a1dd3a5b113937aab5b15fcab3f423c59d7392 | Retain and label earlier question/config result separately | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45365140226/job/138344799731) |
| fd65f94aa7fda3dd7ff2291396d29e43c2d40903 | Independent final collector with sticky invalidity, reject stale/malformed evidence | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45365628272/job/138346486911) |
| 4dbcba700bc002970125e26b0c532f783cb4015e | Content/source quota bound to contract; preabort/abort during admission | 18/19; [actual failing job](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45365859857/job/138347272492), old 503 assertion versus intended explicit 499 CANCELLED |
| 3be8b0f94ad6c182007ec5785fb3858c7f5a416a | Assert 499 CANCELLED while retaining zero upstream call assertion | 19/19 |
| c95042f90c797cac3631d7aca2961a715fbbc064 | Freeze exact consent contract before await; preabort public fetch; preserve uppercase literal A/I; validate catalog before indexing | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45366388057/job/138349083675) |
| 7cdf228bd3526465049fd179841791e34b894651 | Local question before optional inference, actual keyboard/reading order, narrow viewport; lexical wording not semantic guarantee | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45366733956/job/138350264590) |
| ec841cf5451db41432aa76f2d3fd83dfaf3e204e | Timeout/cancellation reason preserved; held source response cannot complete after timeout | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45366885655/job/138350790774) |
| 02f442726f22d9ec58d922362cbb775784d10efc | Earlier action authority revoked permanently on edit/rediscovery; old text stays readable | 19/19; [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45367066017/job/138351410723) |
| dc7bef783a4214ac014911ae310c4af3cd91d771 | Mandatory candidate files, exact pack paths and private-reference exclusion; bounded provider/local measurement accounting | 19/19; [candidate](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45367406064/job/138352610990) 18/18, [measurement](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45367407172/job/138352616212) 15/15, both no failures/cancelled/skipped; incomplete template refused |

Latest [learner](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45367406421/job/138352611552) build, app tests, package/API tests, pinned vendor check, runtime tests, independent peer build/test and Chromium browser suite all executed and passed. Failure-only upload skipped, not test coverage. [Browser matrix](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45367406373): freshness classification and Chromium, Firefox, WebKit jobs each executed the browser-matrix test. [Local gateway](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45367406080/job/138352611195) actual gateway test step passed. No human screen-reader or physical touch test inferred.

## P078-02 closure table (development/synthetic scope)

| Area | Observation and limitation |
|---|---|
| Default inference state | Checked-in off; no enabling public/paid service |
| Local/no-model | Fresh learner flow, reordered local search, actual browser; lexical rather than semantic search |
| Source version | Mounted exact content, precondition denial before quota; stale receipts rejected independently |
| Model/backend | Opaque per-request HMAC version includes model, credential, backend/upstream, quota and content; frozen consent; cannot attest changed weights at same endpoint |
| Per-run consent | Explicit approval; discovery/preflight no model POST |
| Denial/cancel | Zero model POST before execution; in-flight abort cannot undo earlier attempt or promise quota refund |
| Source-less answer | Final independent collector denies completion; invalidity sticky even if observer error swallowed |
| Partial stream | Existing fake engine EOF tests executed; valid partial receipts separate, no completion |
| Terminal rewrite | Prior immutable terminal regression retained in executed suite |
| Token inconsistency | Prior terminal usage regression retained; offline bounded measurement arithmetic tested |
| Model retry | No implicit retry on synthetic error/cancel |
| Catalog change mid-run | 409 incomplete; inference disabled until explicit fresh check |
| Prior completed result | Prior answer retained separately; no merge; revoked action stays inert even if question restored or button forcibly enabled |
| Source ambiguity | Complete bounded match count, ambiguous result regardless of rank; existing six-cue regression |
| Search truncation | Explicit total count and cap five; MCP agreement |
| Secrets/BYOK | Browser cookie-canary and API tests; candidate private evidence references excluded; not comprehensive secret scanner or live audit |
| Release config | Exact backend/model/upstream/content/source binding and mandatory files; 18 synthetic tests; incomplete template refuses output |
| Paid fallback | Explicit backend; no default fallback or paid activation |

No P078-02 original credit: live authorized reviewed-content/backend pairing, real source accuracy and genuine operator model behavior have not been observed. Hardware gate X007-08 remains blocked; rights, human review/pilot/physical device/screen-reader, real economics and public interoperability remain pending. Do not equate successful synthetic tests or checked-in config with production readiness. Conservative explicit uppercase letter constraint may reject ordinary capitalized natural-language queries; exact literal search remains available. Candidate requires trusted stable build tree and independent live evidence/authenticity review, not a proof against arbitrary embedded secrets. Reports reject future-effective price/cost and unsafe numeric bounds; real price, energy, throughput, cost and p95 remain unmeasured. Historical performance and quality values are not refreshed by a green workflow.

Two added checks X007-21 and X007-22; no original phase credited. **609/1,000 original verified; 654/1,046 total verified; 45/100 fully verified phases; six omissions; one hardware blocker; 385 pending.**
