# SUTRA session history

Append entries; never erase failures or silently rewrite previous completion claims. Each continuation reads the latest entry plus the active handoff and actual source. Task state lives in checkboxes; evidence/cursor lives in `progress.json`.

## SUTRA-SESSION-0001 - Checklist and resumable register bootstrap

- Date: 2026-11-23, Asia/Kathmandu (actual save timestamp in `progress.json`).
- Request: expand the attached 100-phase plan into a detailed repository checklist and make “continue with sutra” resume verified progress.
- Code inspected: remote `main` at `042bea1d1723b448854538c21e8f693608897c5a`.
- Source observations: recursive repository tree and root instructions/README fetched through GitHub; no existing SUTRA implementation or register at that revision.
- Plan observations: attached PDF read directly; 41 pages; all 100 phase titles match the expanded baseline; PDF SHA-256 recorded in `BASELINE.md`.
- Files: `docs/sutra/` handoff, 10 workstream checklists, added-scope list, coverage, provenance, evidence guidance and logs; read-only `docs/sutra/tools/progress.mjs`; scoped root AGENTS/README links.
- Product task state: all 1,000 original checks pending. Setup is recorded separately, not credited as product implementation.
- Verification: see the observed command results recorded below before this checkpoint is published.
- Not run: DHAGO/DETOUR application builds, browser/device tests, conformance/model calls, public release checks, user/builder trials and Devpost submission.
- Scope changes: decisions 0001-0003 establish the active plan, truthful starting state and isolation/community boundaries.
- Next original task: `SUTRA-P001-01` requires actual participant eligibility information when needed.
- Next engineering queue: `SUTRA-P002-01`, `SUTRA-P003-01`, `SUTRA-P011-01`, after current-source and dependency checks.
- Missing inputs: eligibility/representation, original lesson rights/reviewer, approved paid-service budget and eventual tester/device availability. These are pending inputs, not blanket blockers on independent engineering.
- Publication: resolve this checkpoint's actual commit SHA from Git history after saving. The code SHA above is the inspected baseline, not the yet-to-be-created documentation commit.

### Validation results

- `node --check docs/sutra/tools/progress.mjs`: passed JavaScript syntax validation on Node v24.22.3 after the checker relocation.
- `node docs/sutra/tools/progress.mjs check`: passed; 1,000 unique original IDs present, 0 verified, 0 active, 0 blocked, 0 omitted and all phase exits open.
- `status --json`, `next` and `phase 001 --json`: exercised; the selected phase contains 10 items and the cursor/independent queue matches the handoff.
- Nine temporary-copy negative cases were rejected: completion without evidence, duplicate ID, missing original ID, unknown resume task, unmatched active cursor, broken internal link, premature phase exit, omission of a mandatory boundary check and unsupported submitted-state claim. The original tracker was unchanged by those checks.
- Root instruction/README changes are additive; original guidance remains intact. All 100 PDF phase titles match the expanded baseline.
- Existing workflow path filters were inspected. The checker lives under `docs/sutra/tools/` so this tracker change does not trigger DHAGO's `scripts/**` media build/restaging path. A dedicated lightweight tracker workflow is added separately; no GitHub CI outcome is assumed until observed.
- A local relocation command initially used the staging directory twice and failed before changing the checker; the path was corrected and validation re-run. No repository or deployment state was affected.

## Future session template

- Session ID; timestamp/timezone; request and source/work branch.
- Current-source versus prior checkpoint comparison; stale or reopened evidence.
- Task IDs attempted/completed/blocked/omitted; actual changed paths.
- Commands/observations, exit codes, evidence links and practical limits.
- Decisions, newly discovered tasks and updated dependencies.
- Exact next action, pending participant inputs and independent alternatives.
- Actual code/release/submission states; checkpoint commit resolved after saving.

## SUTRA-SESSION-0002 - Implement evidence receipts and validator

- Timestamp: 2026-11-23T13:08:08+05:45; resumed remote main cbd3be50545e98a6d1b13c58e59d403b7cde7906; no intervening main changes. Root instructions, handoff and latest decisions were freshly read.
- Added the standalone `packages/sutra-evidence/` schema, browser-callable validator, CLI, synthetic examples, README and 22 passing tests.
- Defined the audience/task in PRODUCT_BRIEF; reviewer identity remains pending.
- Completed 28 checks: P002 items 01-06,08-09 and all phase 017/057 checks. Phase 002 remains incomplete; no app or conformance phase was credited.
- Evidence: `evidence/implementation/SESSION-0002.md` plus candidate file hashes.
- Scope: decision 0004 records independent early contract/tool implementation.
- Next: P003-01 rules/spec refresh, P011 source map, P012 isolated shell. No public deployment, paid inference, outreach or official filing occurred.

## SUTRA-SESSION-0003 - Rules refresh and isolated learner shell

- 2026-11-23T13:20:58+05:45; resumed main `47191f97499d0c1b2ca4dbc5f32b0b39f7d698c2` and its existing 28 verified tasks.
- Refreshed official pages and launch/current spec pins; no substantive core spec change found. Added requirement map and repository map.
- Built apps/sutra with own Vite package/lock/output; actual synthetic receipt validation and honest missing-media/runtime states.
- Four build-boundary checks passed; root/DETOUR output sentinels survived. Local Chromium blocked by environment socket restriction; no local visual success claimed. Browser behavior is committed as a reproducible CI check.
- Verified count: 64/1000. Phase 012 remains partial because real DHAGO shared dependency resolution and its phase exit are pending. Phase 013 CI completion is also not yet credited.
- Evidence: evidence/implementation/SESSION-0003.md and shell-candidate-files.json.
- Next: P014-01 runtime selection/spike, P012-04 shared player dependencies. Participant reviewer/footage, eligibility and spend remain pending; no external outreach, paid inference or public deployment.

### Session 0003 CI completion

- Observed 2026-11-23T13:23:04+05:45: shell and register CI passed on `a86042b35724e573b74b6fedb0673d3b72186bb6`; shell steps include actual npm run test:browser success.
- Final checkpoint: 66/1000 checks and five phases complete. P013-09/10 are now credited; P012-04/10 still pending.
- Local Chromium failure is retained; remote Chromium functional success is separate evidence. No visual or physical-device pass claimed.

## SUTRA-SESSION-0004 - Runtime, evidence workflow and isolated learner integration

- Started 07:43:18 UTC /13:28:18 Nepal; checkpoint 2026-11-23T13:51:05+05:45. Request: continue SUTRA for approximately half an hour.
- Resumed main 0da257c6a31f33ceba7c825755e94b51a5bd4338; inspected root instructions, handoff, decisions and task dependencies. User clarified SUTRA scope; reusable player source/demos/deployments remain untouched.
- Implemented pinned reference-loop adapter, exact local artifact loading, data/schema validation, finite execution, cancellation and safe trace events; scripted model wiring is clearly labeled.
- Added an explicit app-only reusable player adapter, verified synthetic timing bytes/native state, and reviewed browser-local fixture cards with cancellation/replay/outcome handling.
- Local results: 53 runtime/loader tests; 17 app/review tests; build and all ten vendor-module hashes pass. Initial runtime/player browser CI passed on 90f3dbebb52f7171e6c9e0946d42fcf6613a168c; later review and accessor-hardening CI remains to be observed.
- Evidence: evidence/implementation/SESSION-0004.md and runtime-player-candidate-files.json.
- Recorded 132/1000 verified checks; live inference, peer consent, agent-callable source actions and genuine lesson/user evidence remain pending.
- Next: P025-01 safe inference host boundary; P027-01 local read-action registry. No paid calls, public deployment, external outreach or official filing occurred.

### Session 0004 final CI and handoff

- 2026-11-23T13:54:20+05:45: actual shell and register workflows passed on `9100c0e4ebd2fde2c8827f3a5cb6e709873ec8a1`. Confirmed the browser step ran, including reviewed local cards and invalid-graph/error cases.
- Revalidated app/CI foundation gates after the added integrations; preserved previous evidence as history. Updated source map for the now-implemented SUTRA component boundary.
- Final count: 135/1000 checks, nine phases complete. Remaining work is explicitly scoped; no live-AI, factual-truth, independent adoption or deployment claim is made.
- Next session should resume P025-01; implement/test the bounded host boundary while keeping paid calls disabled until configured/authorized.

## SUTRA-SESSION-0005 - Bounded inference and source retrieval

- Started 2026-11-23T13:58:02+05:45; resumed main 13d9eb8e624f1c83e22a29f1dd17dfe69bcc17cc. User authorized approximately half an hour of SUTRA work. Remote main was unchanged when PR #45 opened.
- Implemented a default-off fixed-provider Worker/client, bounded complete-only streaming, server-only credential boundary and global transactional daily quota. No real provider/model/account/spend validation or live call occurred.
- Implemented reusable read-only source tools, exact catalog receipts, same-origin MCP endpoint/transport, two-agent scripted source invocation and native snapshot-only playback reads. Existing player source/demos/deployments remain untouched.
- 109 local tests, production build and ten upstream module hashes pass. Server-only identifiers are absent from built JS. Synthetic streams and transaction harness are explicitly distinguished from live services.
- First CI preview startup failed after all Node checks passed; fixed the Vite hook return and added startup logs. Local browser then reached launch but required Chromium binary was absent. Final remote Chromium observation is appended separately.
- Evidence: evidence/implementation/SESSION-0005.md and inference-source-candidate-files.json. Code candidate 61f44558b9512990f9c4155e31ff95d0d40bbe98.
- Partial checkpoint 150/1000; actual model selection, live visitor, source unavailable browser case and phase exit are not credited before observation. Next independent engineering: P033-01 consent-aware peer boundary; keep paid inference disabled.


### Session 0005 final browser and register checkpoint

- 2026-11-23T14:22:27+05:45: source candidate 61f44558b9512990f9c4155e31ff95d0d40bbe98 passed all shell workflow steps, including real Chromium. Evidence: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45139865572/job/137574910727.
- Final local totals: 59 runtime +11 inference +5 source registry +13 API/quota +21 app =109 tests; production build and ten upstream hashes pass. Chromium confirms unavailable-source refusal and 360px wrapping after retained failures.
- 152/1000 checks, ten phases complete. P027 closes; P025-02/07/10 remain pending. Next P033-01 consent-before-contact boundary. No paid call, public deployment, original-content claim, independent adoption, ZIP delivery or Devpost filing occurred.


### Session 0005 packaging follow-up

- 2026-11-23T14:25:23+05:45: post-merge main shell/register CI succeeded. Wrangler 4.166.0 dry-run also passed (72 assets, Worker 32.49 KiB/9.16 KiB gzip, inference off, empty model allowlist, no supplied secrets). No deployment occurred; 152 checks remain verified. This supersedes only the earlier unobserved-bundle limitation.


### Participant release constraint

- Participant clarified during final handoff: do not jump to release until all major checklist work is complete. Recorded this gate in CONTINUE/PROGRESS/DECISIONS and preserved deployment/route/paid-inference state as closed. The completed Cloudflare action was a deployment-free dry-run only.


## SUTRA-SESSION-0006 - Consent boundary and exact peer artifact loading

- Started from merged main `bd72962a434ca2ce1408eafaa3ce5d85de4ef850` after verifying both SUTRA workflows green and the live register at 152/1000. Work stayed on `sutra/consent-inspector`; PR #47 is the review surface.
- Added framework-neutral `packages/sutra-consent/` with default per-contact approval, explicit exact session scope, public destination/purpose/disclosure labels, redacted decision/outcome events and bounded credentialless JSON retrieval. Added a learner consent preview and an independently served plain-browser example.
- Added a Profile 0.3 exact peer artifact loader to the restricted runtime: URL-derived site base, manifest-after-consent, exact network match, declared graph resolution and distinct graph-origin approval. Executable metadata remains rejected and peer execution remains disabled.
- Preserved stricter redirect-error behavior for now. The current spec permits ordinary redirects, but changed-origin consent/policy is deliberately deferred to P037 rather than silently broadening access.
- CI retained several failures instead of rewriting history: runs 20-23 found browser-test assertion issues; run 24 passed the consent-only candidate; run 25 passed the peer-loader code before dedicated peer tests; run 26 exposed a bad mocked Response fixture; run 27 is the final green code candidate.
- Final source candidate `70fe330b92dc22ba3dd9fc60cc3166c1d7ae42d7`: 37 consent/inference/source/API tests and 65 runtime tests pass; ten vendor hashes pass; learner and standalone-example Chromium both pass. Evidence: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45145022530/job/137592064940 and `evidence/implementation/SESSION-0006.md`.
- Credited 26 checks: P032-01..07/09, P033-01/02/04..09 and all P058 items. New total: 178/1000; phase 058 closes. P032-08/10 and P033-03/10 remain open.
- No live peer, third-party MCP, CORS, public deployment, paid model call, external outreach or official filing occurred. Public release remains blocked by decision 0008.
- Next engineering queue: P031-01 independent peer package, P032-08 invocation-visible peer failure, P033-03 third-party MCP consent.


### Session 0006 independent peer continuation

- 2026-11-23T15:05:24+05:45: added zero-dependency `apps/sutra-peer/` with static build/preview, human page, exact `checklist` manifest/graph, `source_select` helper, links map and proposed-origin ownership disclosure.
- CI step builds and tests the peer package independently. Its loopback test fetches the built page/artifacts, observes public-artifact CORS locally, and then loads the actual `/agents/checklist` URL through `loadPeerNetwork` after separate consent decisions.
- Final peer candidate `4acb6e1aeddcba3bbf44b240069a4afe5a0f4ceb` passed the full SUTRA workflow: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45146010597/job/137595359493.
- Credited P031-01/02/04/05/06/07/08/09. Total is 186/1000; phase 031 stays open. P031-03 actual corpus provenance and P031-10 distinct public HTTPS remain pending and are not simulated by loopback.
- Next: P032-08 invocation-visible peer failure, P033-03 third-party MCP consent, then P035-01 caller-local peer execution. Public release remains closed.


## SUTRA-SESSION-0008 — BYOK in-flight credential revocation

- Checkpoint: 2026-11-23T16:07:00+05:45; working branch `sutra/peer-invocation`, PR #48; tested candidate `092c8d2c601bcfd7075a4062a4c13460257aaa90`.
- Fixed a BYOK revocation gap: `clear()` formerly removed the closure secret for future calls but did not cancel model requests already in flight. Active request abort controllers are now tracked and aborted when the key is cleared, with cleanup in `finally`.
- Added a node-test regression checking an already active fetch is aborted, no later transport occurs, and cancellation errors do not expose a synthetic secret.
- GitHub Actions register and evidence jobs passed for the candidate. Shell CI had completed install, production build, app tests, inference/source/consent/API tests, pinned-vendor verification, runtime tests and independent-peer tests; Chromium installation and browser execution were still underway at the time this entry was recorded.
- Not yet credited as new `[x]` items: original total stays 186/1000 until the final shell CI result is inspected. In particular P030-02 production CORS cannot be verified using a browser route fixture alone.
- Next: inspect the exact candidate shell result, retain failure evidence if needed and continue the phase 030 BYOK credential-isolation checklist. Release, funded inference and public routes remain off.


### Session 0008 verification and checklist reconciliation

- 2026-11-23T16:14:09+05:45: the code candidate `092c8d2c601bcfd7075a4062a4c13460257aaa90` completed all three Actions workflows successfully, including the full Chromium shell job https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45155920061. This closes the earlier pending-browser verification; it remains a synthetic OpenRouter fixture, not a real live router CORS/account test.
- Reconciled `SUTRA-SESSION-0007` evidence at `79d9d01562e039c6c2d47887c92396026913acc7`, independently confirmed shell CI success at https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45150180216. Credited P032-08/10, P033-03/10, P034-02..09, P035-01..10, P036-01/02/03/05/07/08/09 and P038-01..10.
- Credited BYOK P030-01/03/04/05/06/07/09 against the passing latest canary, deletion and key-revocation tests, with the actual source revision recorded in `progress.json`.
- Total rises from 186 to **232 verified items**, **15 fully verified phases**. No synthetic fixture is counted as public HTTPS CORS, real model quality, live funded inference, factual lesson validation or independent outside adoption.
- Open P030-02 actual permitted router CORS, P030-08 independent funded-path failure, P034-01 staging/public HTTPS, P036-04 upstream field policy and P037-07 full redirects. Release stays blocked under SUTRA-DECISION-0008.

### Session 0008 redirect/path-consent hardening — in verification

- Scope: P037-04/06/07/08 targeted engineering, not yet claimed verified.
- fetchJsonWithConsent now rejects redirected responses and response URLs differing from the disclosed target, even if a custom transport silently followed a same-origin redirect. Native fetch still uses redirect:error, credentials:omit.
- New real loopback HTTP tests cover same-origin, changed-origin and looping redirects, denied-before-transport and normal direct read. Chromium checks blocked manifest redirects while local lesson evidence remains functional.
- Manifest-declared graph path changes now require a fresh session approval; query-bearing or overlong graph paths fail before graph contact. Changed-path and query-denial regression fixtures added.
- Prior candidate 49e4f00178063c0f484dd6582883f947a754b547 FAILED the browser assertion: a blocked peer load may surface inside the invoking agent tool result rather than top-level (PEER_ARTIFACT). Corrected observable assertion; failed CI retained at https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45157301045 and not credited as success.
- Redirect rejection is deliberately stricter than full Profile 0.3 redirect interoperability. Same-URL changed content is not yet hash-bound to authorization. No public HTTPS or third-party-publisher validation; phase 037 remains incomplete.
- Do not credit checklist tasks before complete, passing current candidate CI. Historical verified baseline remains 232/1000.

### Session 0008 redirect validation and timestamped checkpoint

- 2026-11-23T16:26:24+05:45: the final redirect/path-consent candidate `e5af69d975ec0c7fc4c84c3e20b84036e3302cca` passed all three Actions workflows, including Chromium shell run https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158153046. Verified P037-06/07/08 against actual fail-closed and local-lesson observations; total **235/1,000** with 15 complete phases. Re-consent for accepted changed-origin redirects and changed-content graph approval remain OPEN.
- Withdrawn the proposed peer URL at the caller's same registrable domain. A separately controlled registrable domain remains an unverified external release dependency; no domain or route was configured.
- Appended additional concurrent BYOK revocation regression on the branch after the redirect candidate. That later test requires its own passing CI before its result is counted; earlier BYOK single-call cancellation was already verified.

### Session 0008 streaming, cancellation and independent inference-path closure

- 2026-11-23T16:33:00+05:45: code candidate `29d686bd4f3fdb99565e3a3e4c904d12018ff27a` passed runtime tests and full Chromium shell: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45159138495. A delegated child that stalls after the first tool call is now explicitly tested: cancellation prevents a third model step. Existing streaming tool-fragment, malformed result, incomplete stream and failure sanitization tests were reconciled; P026-02/03/04/05/06 verified. P026-01 explicit run lifecycle and P026-08 media-continuity cancellation remain open.
- 2026-11-23T16:30:00+05:45: verified P030-08 synthetic independence at `106da667c68b1645fa33674b08785db5a97f2fd3`, shell https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158656419. A funded quota 429 does not block BYOK; BYOK auth 401 does not prevent an otherwise configured funded adapter. No live funded account or browser CORS is claimed.
- 2026-11-23T16:31:00+05:45: verified P037-05 on `cf60561ad82fdef78b3b41e4bc1f530d21192a8a`, shell https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158831857: redirect requests omit Authorization/Cookie and changed-origin targets receive no request. Full redirect acceptance/reconsent stays open.
- Total **242/1000**, fifteen fully verified phases. Source, checklist, machine register and evidence link synchronized in PR #48. No release or official submission.


## SUTRA-SESSION-0009 — Explicit lifecycle, cancellation/media continuity and bounded read retry

- Observed 2026-11-23T16:51:55+05:45. Started from PR #48 with 242/1000 verified and Phase 026 partially complete.
- Added `apps/sutra/src/run-lifecycle.js` with explicit idle, running, cancelling, failed and complete states plus unit tests for valid transitions and incomplete cancellation.
- Wired peer composition to a fresh AbortController per run, a visible lifecycle status, a cancel control, cancellation provenance and pending-consent cleanup. Cancelled output is explicitly incomplete and never presented as verified/completed.
- Added Chromium cancellation coverage: after page reload and mounting the synthetic native timing fixture, the peer URL is re-entered, the manifest request is intentionally stalled, the run is cancelled, lifecycle ends failed/incomplete, and the video subsequently plays, advances its native media clock and pauses normally.
- Added bounded source-read retry behavior: at most two transport attempts per RPC; one retry for transport rejection or 5xx only. Successful malformed content/schema failures are not retried. Each attempt emits sanitized method/attempt/maxAttempts metadata.
- Retained two failed browser candidates: run 45161277792 exposed a timing-sensitive state assertion; run 45161634271 exposed that page reload correctly cleared the peer URL. Both were fixed in the fixture and remain non-passing history.
- Final product candidate `fb300b9df50a59768c64ee0d8f7c01389d74f27f` passed build, app tests, inference/source/consent/API tests, pinned runtime verification, runtime tests, independent peer tests and Chromium: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45161898243.
- Verified P026-01/07/08/09/10; Phase 026 closes. New total **247/1000**, **16 fully verified phases**.
- Corrected stale documentation that still named a same-registrable-domain peer proposal; peer public origin remains unset and must use a different registrable domain.
- Next independent task: P036-04 private-context upstream/downstream handling. P030-02 live router CORS/account, public HTTPS, original media/rights, factual review, physical-device evidence, release and submission remain open.


## SUTRA-SESSION-0010 — Separate upstream/downstream private context and receipt boundary

- Observed 2026-11-23T16:56:19+05:45; tested candidate `621520e1636deb39686e7aef462e8b481c4558cd`.
- Converted the caller-local peer resolver to use the per-tool-call context already supplied by the pinned runner, without changing vendored runtime files or their hashes.
- Upstream private context now requires intersection of the peer front agent's `allow.to_upstream.sly_data` and the caller host's exact peer-URL `upstream` allow-list. Returned values merge only into that call's private snapshot; trace export records names only.
- Tests cover caller narrower than peer, peer narrower than caller, absent downstream secret not recreated upstream, and no private values in result/events.
- Added receipt-smuggling integration: an extra `apiKey` field proposed for a receipt is rejected as `UNKNOWN_FIELD` without echoing its value.
- Full build/runtime/peer/Chromium workflow passed: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45162744214.
- Verified P036-04/06/10; Phase 036 closes. New total **250/1000**, **17 fully verified phases**.
- Next P037-01 redirect origin/policy handling. Existing fail-closed redirect behavior remains; no public release or provider claim.


## SUTRA-SESSION-0011 — Redirect destination re-consent and bounded policy

- Observed 2026-11-23T17:00:00+05:45; tested source candidate `be03c617a437366792d128d312ecc537856fe621`.
- Rechecked Profile 0.3 commit `a0ceda34e4f2e653223e13e63282abc9b60eaf7c`: normal browser redirects are allowed, but a redirect to a different origin must be treated as a new destination under the same consent policy.
- Preserved native browser `redirect:error` when JavaScript cannot inspect a changed origin before contact. Added bounded continuation only for transports that expose a raw 3xx Location before another request.
- Redirect policy now caps hops, rejects cycles/credentials/fragments/unsafe schemes, creates a new consent tuple for changed origin/path, and requires approval before the next request.
- Tests cover changed-origin deny with zero second-origin contact, explicit second-origin approval, same-origin changed-path re-evaluation despite session memory, cycles and hop limits. Existing browser/loopback no-credential/fail-closed/local-lesson tests remain green.
- Full shell/Chromium passed: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45163356204; register/evidence runs 45163356065 / 45163356138 passed on the tested candidate.
- Verified P037-01/02/03/04/09/10; Phase 037 closes. New total **256/1000**, **18 fully verified phases**.
- Same-URL byte replacement without a declared content binding is not treated as a redirect scope change; integrity/versioning remains a separate concern and no stronger claim is made.
- Next: Phase 022 publication bundle/inventory audit. Live P030-02 router CORS/account and public HTTPS P034 remain external gates. No release or submission.


## SUTRA-SESSION-0012 — Caller public artifact bundle and manifest boundary

- Observed 2026-11-23T17:05:44+05:45; tested publication source candidate `47f84a1f8ee47cf7f9a049aaa8286d3142d8648c`.
- Added top-site `llm_router` metadata to the public manifest, separately from `allowed_peers` and `peer_policy`: same-origin `/api/infer`, `mock:false`, and direct BYOK router `https://openrouter.ai/api/v1`. No credential is published and the default endpoint remains operator-disabled.
- Updated `links.json` to explicitly include `learner` and `source_learner` with empty publisher-owned maps. This is intentional: the graphs have no symbolic external-network reference and the distinct public peer URL is not yet established. No fake binding was added.
- Added `PUBLIC_ARTIFACT_INVENTORY.md` covering the manifest, both graphs, links, browser runtime and APIs, with every proposed public URL labeled undeployed/unverified and peer origin unset.
- Added build tests for router/peer metadata separation, exact empty link maps, secret absence and inventory coverage.
- Full product shell/Chromium passed on https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45164065404. That candidate's register job failed only because Session 0011 had not yet been appended; the checkpoint transaction was corrected in later commits and the failed register run remains historical.
- Verified P022-04/06/08/09/10; Phase 022 closes. New total **261/1000**, **19 fully verified phases**.
- Next: P023-05 browser action boundary; live router CORS/account, public HTTPS/CORS and all release gates remain open.


## SUTRA-SESSION-0013 — Shared execution budgets and visible diagnostics

- Observed 2026-11-23T17:11:35+05:45; tested source candidate `37d0a45371db717b5f44c2f839b8bbb8345538e7`.
- Nested peer agents share caller composition/model/deadline budgets. A too-small caller agent budget stops nested peer work under the same `agent_calls` category.
- Runtime events map fixed budget failures to sanitized categories. `COMPOSITION_LIMIT` carries the category and a bounded control-character-stripped partial text; learner UI labels that text incomplete and never claims a completed result.
- An intermediate assertion incorrectly assumed partial model text itself would mention the limit; the model had already produced “test complete”. The corrected invariant is authoritative runtime/UI incomplete labeling rather than rewriting model text.
- Full shell/Chromium passed: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45165087393.
- Verified P028-04/07/10; Phase 028 closes. New total **264/1000**, **20 fully verified phases**.
- Next browser action registration/review work; live provider/public HTTPS gates remain open.


## SUTRA-SESSION-0014 — Host action registry and reviewed local writes

- Observed 2026-11-23T17:21:26+05:45; tested source candidate `0e0c42c9ab2e060a61f299ff23b90ffcd9ffc52c`.
- Exposed an optional host-owned ActionRegistry through `runNetwork`; malformed registries fail before model execution.
- Opted the learner graph into exact CRUSE v1 and bounded the compiler to that exact presentation metadata shape. The pinned runner then exposes only the exact caller/network action catalog as proposals, never executable functions.
- Registered `save-review-card` and `export-receipt` as local-only `write` actions with strict nested receipt schemas, immutable plans and revalidation against the source catalog.
- Refactored the visible review flow to execute confirmed save/export through the registry. Chromium observes cancel/no write, one saved review, one local JSON download, reload persistence and no duplicate saved card from export.
- Retained failures: run 45165924184 showed the graph had not opted into CRUSE; run 45166333206 showed `innerText` on a closed details element was an invalid observability assertion. Both were fixed without weakening the runtime.
- Final shell/Chromium passed: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45166574357.
- Verified P023-05/P023-09 and P029-01/P029-10. Phase 029 closes; Phase 023 remains open on real configured inference P023-03.


## SUTRA-SESSION-0015 — Review-card learner-flow reconciliation

- Observed 2026-11-23T17:23:27+05:45; source/evidence remains `0e0c42c9ab2e060a61f299ff23b90ffcd9ffc52c`.
- Reconciled the now-tested registry flow plus existing review-store tests against Phase 046. This is accounting of observed behavior, not ten newly implemented features.
- Verified preview-before-effect, exact cue/source-version receipt fields, browser-only storage disclosure, immutable confirmed payload, quota/unknown/export failure handling, reload/stale-data validation, deletion and export isolation from prompts/router credentials.
- Session 0015 evidence: `docs/sutra/evidence/implementation/SESSION-0015.md`.
- Verified P046-01..10; Phase 046 closes. New total **278/1000**, **22 fully verified phases**.
- Next independent learner-quality work: provenance inspector, ordinary media-control/browser checks or transcript experience. Live provider/public HTTPS/release remain blocked.
