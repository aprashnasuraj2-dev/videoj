# Session 0004: bounded SUTRA engineering session

Started 23 November 2026 at 07:43:18 UTC /13:28:18 Nepal time; requested budget approximately 30 minutes. Current observation 2026-11-23T13:51:05+05:45. Inspected main 0da257c6a31f33ceba7c825755e94b51a5bd4338; no divergent user source work found. User clarified the work is SUTRA: all changes remain scoped to its app, runtime and records. Existing DHAGO reusable source, demos, deployments and DETOUR are unchanged.

## Implemented

- Ten unchanged nsDeploy core/generated modules pinned at 486ecf26aa8775963f9b765f894734bef1ac9817, with Apache-2.0 license, source inventory and matching upstream Git blob/SHA-256 checks. Separate restricted SUTRA host reuses AgentNetwork/runAgent; it does not introduce a second agent framework.
- Resolved two-agent JSON and local publication index/links. Same-origin exact-name loader bounds bytes/time, rejects redirects/external capability metadata, and never silently selects another network.
- Graph/schema/tool-call preflight, cancellation, time/model/agent/output/concurrency limits, cycle/depth refusal, safe events and an explicitly scripted model test driver. No funded live provider or peer is connected.
- Isolated app imports the existing reusable player through an explicit lazy adapter with its own pinned dependencies. A byte-checked synthetic timing fixture drives real native decode/clock/play/pause/seek; it is not an instructional lesson or submission video.
- Synthetic review receipt preview, cancellation, confirmed browser-local save, reload/delete and one-shot persistence attempts. Completed writes are not repeated on duplicate confirmation; known rejection and uncertain side-effect outcomes are distinct. Agent action registration remains pending.

## Actual verification

- Local runtime/loader suite: 53 tests passed, including two-agent reference-loop execution, malformed graph rejection before calls, cancellation of noncooperating adapters, finite limits/concurrency and redacted trace projection.
- Local app suite: 17 tests passed (seven build/source/fixture checks plus ten review-store cases). Build passed with isolated Video.js dependency resolution; existing reusable source hashes match the baseline.
- Vendor check: all ten original module bytes match upstream. No upstream module patch or optional LangChain bundle is shipped.
- Initial candidate 90f3dbebb52f7171e6c9e0946d42fcf6613a168c: GitHub shell and register CI succeeded. Shell job https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45135065110/job/137559293760 covers scripted browser-local delegation and native media behavior before the later review-card/accessor-hardening changes.
- Current candidate includes extra data-accessor safeguards, local review behavior and invalid-graph browser assertions. Its final CI result must be observed separately before those browser claims are credited.
- Local Chromium remains blocked by the earlier environment socket restriction; no physical-device, Safari/Firefox or human visual review is claimed.

## Failures retained

The first runtime tests detected an unhandled rejection for pre-start cancellation; the rejection observer and early abort path fixed it, and the full suite passed. Shared-player compilation initially failed on its optional Mux build peer; app-local pinned dependency resolution fixed the build without editing reusable source. A large one-shot source-materialization command exceeded the command-argument limit; files were then materialized in small unchanged batches. No remote or user files were lost.

## Limits and next work

The live model route, grounded agent-callable site-action catalog, consent-aware peers, original footage/factual reviewer, real user/builder trials and public deployment remain pending. Source consistency is not factual truth. The browser test driver is explicitly scripted, never a keyless live-AI fallback. The Mux bundle has a Vite size warning and is kept lazy; native fixture tests assert it is not requested.

Next: a safe default-inference adapter/proxy with operator-approved funding/provider configuration, and read-only source actions. Do not fabricate keys, rights, participant eligibility or success results to close those gaps. Finite budgets apply locally; cross-origin nested-budget behavior remains unverified because this profile refuses peers entirely.

## Final CI observation 2026-11-23T13:54:20+05:45

Candidate `9100c0e4ebd2fde2c8827f3a5cb6e709873ec8a1`: [shell job](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45136028109/job/137562391347) and [register job](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45136028147/job/137562391205) both succeeded. Step inspection confirmed locked install/build, 17 app tests, vendor drift check, 53 runtime tests and actual Chromium browser command all passed. Browser checks include scripted internal delegation, invalid-graph CYCLE refusal with zero agent trace entries, failed artifact load, native decode/play/pause/seek, review cancel/confirm/reload/delete, 360px no-overflow interaction, no page errors/external requests, and no native-fixture load of the optional Mux chunk.

The previously environment-blocked local browser attempt is not relabeled as passed. This CI proves controlled functional checks; human visual review, physical devices, other browsers, live inference, source truth, peers and production release remain unverified. Final tracker: 135/1000 checks and nine fully verified phases; other gates remain open.
