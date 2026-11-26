# 07. Resilience and cost control

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **21-25 Dec 2026**. This is a target window, not proof of work.

Bounded execution, tested failure states and predictable hosting costs.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 061 - Exercise missing and broken dependencies

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 26,40,50,60. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Test offline start, lost network mid-run, missing media, absent transcript, 404 graph, malformed JSON and a peer that times out. Keep the transcript/player path useful where possible.
- **Phase exit:** Failures identify the affected capability; replayed or cached data is labeled and never passed off as a live agent run.

- [x] `SUTRA-P061-01` Test missing media, transcript and poster independently
- [x] `SUTRA-P061-02` Test offline startup and network loss during a model run
- [x] `SUTRA-P061-03` Test 404 manifest, malformed graph and timed-out peer
- [x] `SUTRA-P061-04` Distinguish unavailable capability from invalid user request
- [x] `SUTRA-P061-05` Retain usable player/transcript features wherever possible
- [x] `SUTRA-P061-06` Label replayed, cached or deterministic fallback behavior visibly
- [x] `SUTRA-P061-07` Prevent a fallback from impersonating a live agent result
- [x] `SUTRA-P061-08` Verify recovery actions respect consent and bounded retry policy
- [x] `SUTRA-P061-09` Produce and review the phase artifact: Failure-mode results and recovery UI fixes.
- [x] `SUTRA-P061-10` Close phase 061 only after its applicable tasks have evidence and its exit condition is observed: Failures identify the affected capability; replayed or cached data is labeled and never passed off as a live agent run.

## Phase 062 - Test ambiguous action outcomes

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 29,46,61. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Inject a failure after a write may have begun. Ensure the runtime reports unknown outcome and does not independently retry. Test local-save exceptions separately from the integration fixture.
- **Phase exit:** Observed success, rejection and unknown outcome stay distinct; replay cannot double-execute the reviewed write.

- [x] `SUTRA-P062-01` Inject failure before any write begins and verify no effect
- [x] `SUTRA-P062-02` Inject failure after a write may already have begun
- [x] `SUTRA-P062-03` Represent the latter as unknown outcome rather than definite failure
- [x] `SUTRA-P062-04` Prevent automatic runtime retries of ambiguous writes
- [x] `SUTRA-P062-05` Keep request identifiers and reviewed payloads bound to receipts
- [x] `SUTRA-P062-06` Test local storage exceptions separately from integration-write fixtures
- [x] `SUTRA-P062-07` Offer outcome checking only where an actual read can verify state
- [x] `SUTRA-P062-08` Preserve rejected, completed and unknown states in UI and exports
- [x] `SUTRA-P062-09` Produce and review the phase artifact: Action receipt state tests and recovery text.
- [x] `SUTRA-P062-10` Close phase 062 only after its applicable tasks have evidence and its exit condition is observed: Observed success, rejection and unknown outcome stay distinct; replay cannot double-execute the reviewed write.

## Phase 063 - Harden the inference proxy

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 25,28,38. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Enforce fixed upstream destinations, input sizes, model allowlist, token caps and per-session abuse limits. Test concurrent and anonymous calls; do not rely on Origin headers alone for abuse prevention.
- **Phase exit:** Oversized and forbidden requests are rejected before inference; budget exhaustion has a readable error and no secret leakage.

- [x] `SUTRA-P063-01` Reject arbitrary upstream URLs and unapproved model identifiers
- [x] `SUTRA-P063-02` Bound body bytes, context size and output-token settings
- [x] `SUTRA-P063-03` Apply per-session or equivalent abuse controls beyond Origin checks
- [x] `SUTRA-P063-04` Test direct anonymous calls bypassing the visible UI
- [x] `SUTRA-P063-05` Bound concurrent upstream requests and failure retries
- [x] `SUTRA-P063-06` Verify provider errors never echo credentials or sensitive headers
- [x] `SUTRA-P063-07` Ensure rejected payloads cause zero paid inference requests
- [x] `SUTRA-P063-08` Exercise the approved global spend stop mechanism
- [x] `SUTRA-P063-09` Produce and review the phase artifact: Proxy controls and bounded abuse results.
- [x] `SUTRA-P063-10` Close phase 063 only after its applicable tasks have evidence and its exit condition is observed: Oversized and forbidden requests are rejected before inference; budget exhaustion has a readable error and no secret leakage.

## Phase 064 - Apply a minimal browser security policy

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 30,38,47,63. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Remove third-party ads and analytics scripts from the new agent origins. Set CSP, referrer and embedding policies appropriate to runtime modules, inference, peers and media.
- **Phase exit:** Expected capabilities work under CSP; unexpected script or connection destinations are blocked in the tested build.

- [x] `SUTRA-P064-01` Inventory every script, connection, worker and embedding destination
- [x] `SUTRA-P064-02` Remove ads and unnecessary third-party analytics from agent origins
- [x] `SUTRA-P064-03` Set a restrictive CSP compatible with selected runtime modules
- [x] `SUTRA-P064-04` Configure referrer, framing and relevant content-type protections
- [x] `SUTRA-P064-05` Keep allowed model, peer and media connections explicit
- [x] `SUTRA-P064-06` Verify intended runtime features still work under production headers
- [x] `SUTRA-P064-07` Test a disallowed script and connection destination
- [x] `SUTRA-P064-08` Document residual same-origin JavaScript exposure for optional BYOK
- [x] `SUTRA-P064-09` Produce and review the phase artifact: Header configuration and compatibility report.
- [x] `SUTRA-P064-10` Close phase 064 only after its applicable tasks have evidence and its exit condition is observed: Expected capabilities work under CSP; unexpected script or connection destinations are blocked in the tested build.

## Phase 065 - Protect shared Cloudflare capacity

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 08,19,63-64. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Review account-wide Worker headroom and existing route precedence. Serve HTML, graphs, runtime modules and transcripts statically. Keep only inference dynamic and avoid loading the existing Patro Worker.
- **Phase exit:** A static visit does not invoke the main Patro application Worker; inference calls are counted separately from asset and media requests.

- [x] `SUTRA-P065-01` Inspect actual Cloudflare account usage and route ownership read-only
- [x] `SUTRA-P065-02` Separate static asset, inference, media and unrelated Patro traffic
- [x] `SUTRA-P065-03` Check request precedence for the two proposed subdomains
- [x] `SUTRA-P065-04` Serve graphs, runtime modules, transcripts and public HTML statically
- [x] `SUTRA-P065-05` Avoid run-worker-first patterns that unnecessarily invoke dynamic code
- [x] `SUTRA-P065-06` Keep media delivery outside the main Patro application Worker
- [ ] `SUTRA-P065-07` Calculate headroom using account-wide usage and retry assumptions
- [x] `SUTRA-P065-08` Record a dated request sample showing which requests invoke Workers
- [x] `SUTRA-P065-09` Produce and review the phase artifact: Route/quota budget and before/after request sample.
- [ ] `SUTRA-P065-10` Close phase 065 only after its applicable tasks have evidence and its exit condition is observed: A static visit does not invoke the main Patro application Worker; inference calls are counted separately from asset and media requests.

## Phase 066 - Measure model usage and enforce spend

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 07,25,54,63. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Record model, token counts, retries, request counts and measured run cost. Use configured provider prices; cap sponsored runs and preserve readable non-AI content after exhaustion.
- **Phase exit:** Projected monthly cost derives from observed runs; disabling sponsored inference stops additional paid requests.

- [ ] `SUTRA-P066-01` Measure model calls, input/output tokens and retries per completed run
- [ ] `SUTRA-P066-02` Record provider model identifier and the actual price basis
- [ ] `SUTRA-P066-03` Calculate mean and high-percentile observed run cost
- [ ] `SUTRA-P066-04` Check the effect of doubled context and retry usage
- [ ] `SUTRA-P066-05` Configure funded run/token caps and a readable exhaustion state
- [x] `SUTRA-P066-06` Verify the stop control prevents new paid upstream requests
- [ ] `SUTRA-P066-07` Reserve funds for judging after development use
- [x] `SUTRA-P066-08` Keep static learning content usable when sponsored inference stops
- [ ] `SUTRA-P066-09` Produce and review the phase artifact: Measured cost report and budget kill switch.
- [ ] `SUTRA-P066-10` Close phase 066 only after its applicable tasks have evidence and its exit condition is observed: Projected monthly cost derives from observed runs; disabling sponsored inference stops additional paid requests.

## Phase 067 - Benchmark low-bandwidth interaction

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 19,42-44,65. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Measure initial text/JS transfer, first usable transcript and seek behavior under a documented 1 Mbps/150ms laboratory profile. Compare transcript-only and video-enabled paths.
- **Phase exit:** Target shell <=700 KiB compressed excluding runtime/model/media; transcript usable within 5 seconds in the stated lab profile.

- [x] `SUTRA-P067-01` State device, browser and network-shaping conditions for measurements
- [x] `SUTRA-P067-02` Measure shell compressed bytes separately from runtime and media
- [x] `SUTRA-P067-03` Measure first usable transcript rather than only a synthetic page score
- [x] `SUTRA-P067-04` Test the stated 1 Mbps and 150ms latency profile
- [x] `SUTRA-P067-05` Compare transcript-only and video-enabled transfer behavior
- [x] `SUTRA-P067-06` Measure real seek response on the selected media host
- [x] `SUTRA-P067-07` Avoid autoloading full media when the viewer only needs text
- [x] `SUTRA-P067-08` Report achieved numbers and failures instead of rewriting the targets
- [x] `SUTRA-P067-09` Produce and review the phase artifact: Performance table with device/browser and network conditions.
- [x] `SUTRA-P067-10` Close phase 067 only after its applicable tasks have evidence and its exit condition is observed: Target shell <=700 KiB compressed excluding runtime/model/media; transcript usable within 5 seconds in the stated lab profile.

## Phase 068 - Set bounded caching and retention

- **Baseline effort:** 1 person-hours; **owner:** E.
- **Original phase dependencies:** 56,64-67. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Use versioned graph/module URLs, appropriate HTML refresh policy and clearly scoped local storage. Do not cache model responses, credentials or private trace data in shared caches.
- **Phase exit:** Graph and media versions do not silently mismatch; deleting local cards and BYOK state removes their stored copies.

- [x] `SUTRA-P068-01` Define immutable caching for versioned graph and runtime URLs
- [x] `SUTRA-P068-02` Define a refresh policy for mutable HTML and manifest pointers
- [x] `SUTRA-P068-03` Prevent public/shared caching of model responses and credentials
- [x] `SUTRA-P068-04` Bound local trace/card storage and define deletion semantics
- [x] `SUTRA-P068-05` Test graph/media version skew after a deployment
- [x] `SUTRA-P068-06` Retain required old hashed assets through rollout where appropriate
- [x] `SUTRA-P068-07` Verify deleting BYOK and cards removes their stored copies
- [x] `SUTRA-P068-08` Document retention without claiming a hosted scheduler or backup exists
- [x] `SUTRA-P068-09` Produce and review the phase artifact: Cache/retention matrix and stale-build checks.
- [x] `SUTRA-P068-10` Close phase 068 only after its applicable tasks have evidence and its exit condition is observed: Graph and media versions do not silently mismatch; deleting local cards and BYOK state removes their stored copies.

## Phase 069 - Run narrowly scoped load checks

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 28,63,65-68. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Use a permitted synthetic load of 20 simultaneous sessions against staging with model stubs, then a small capped live run. Measure limits without consuming production quota unnecessarily.
- **Phase exit:** No cross-session state leakage occurs; server limits hold and lab load is not advertised as proven internet-scale capacity.

- [ ] `SUTRA-P069-01` Use a permitted staging environment and an explicit test ceiling
- [x] `SUTRA-P069-02` Run 20 simultaneous synthetic sessions with model stubs first
- [x] `SUTRA-P069-03` Verify per-session state and consent do not leak across sessions
- [x] `SUTRA-P069-04` Inspect concurrency and request limits under failures
- [ ] `SUTRA-P069-05` Perform only a small capped live model load sample
- [ ] `SUTRA-P069-06` Record CPU/request/token behavior and observed errors
- [x] `SUTRA-P069-07` Do not consume production quota merely to generate impressive load numbers
- [x] `SUTRA-P069-08` State that laboratory load does not establish internet-scale reliability
- [x] `SUTRA-P069-09` Produce and review the phase artifact: Load results and capacity assumptions.
- [ ] `SUTRA-P069-10` Close phase 069 only after its applicable tasks have evidence and its exit condition is observed: No cross-session state leakage occurs; server limits hold and lab load is not advertised as proven internet-scale capacity.

## Phase 070 - Close the resilience milestone

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 61-69. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Review failure, privacy, proxy, media, cost and route evidence against the acceptance baseline. Cut optional UI polish or BYOK if critical issues remain.
- **Phase exit:** No credential leak, consent bypass, double write, broken default judge path or uncontrolled spend remains open.

- [x] `SUTRA-P070-01` Review all privacy, consent and ambiguous-write results together
- [ ] `SUTRA-P070-02` Confirm the funded default judge path works after hardening
- [ ] `SUTRA-P070-03` Check media, source versions, route usage and cost caps
- [x] `SUTRA-P070-04` Fix any credential canary leak before proceeding
- [x] `SUTRA-P070-05` Cut optional BYOK or polish if critical boundaries remain unresolved
- [x] `SUTRA-P070-06` Document unresolved limitations with practical user effects
- [x] `SUTRA-P070-07` Keep waived optional work separate from failed mandatory gates
- [x] `SUTRA-P070-08` Record the resilience milestone revision and evidence links
- [x] `SUTRA-P070-09` Produce and review the phase artifact: Milestone D risk register with resolved blockers.
- [ ] `SUTRA-P070-10` Close phase 070 only after its applicable tasks have evidence and its exit condition is observed: No credential leak, consent bypass, double write, broken default judge path or uncontrolled spend remains open.
