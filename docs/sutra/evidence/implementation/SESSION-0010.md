# SUTRA session 0010 — runtime hardening, resilience, accessibility and measured performance

- Final tested implementation revision: `e1122ec58c7a773b41e4470dc0139a897049f912`.
- Passing learner/build/browser workflow: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45294044575/job/138109800543
- Workflow completed: 2026-11-24T00:04:41Z (2026-11-24T05:49:41+05:45).
- Development branch: `sutra/caller-peer-failure-boundary`, draft PR #49.
- Previous credited checkpoint before this session: 263 / 1,000 checks, 16 complete phases.
- **No public deployment, DNS/route change, paid provider activation, release ZIP or Devpost submission occurred.**

A few documentation-only commits follow the tested source revision. They do not alter runtime behavior and are not substituted for exact implementation evidence.

## Exact green verification

At `e1122ec58c7a773b41e4470dc0139a897049f912` the workflow passed:

- **46 / 46** learner-app Node tests;
- **46 / 46** consent, inference, source-tool and API/quota tests;
- **96 / 96** runtime, peer, private-context, loader, MCP and trace-policy tests;
- **7 / 7** independent peer-package tests;
- **10 / 10** pinned upstream nsDeploy integrity hashes unchanged;
- eight browser/integration profiles: core learner/media/review, consent, two-origin peer, cross-origin MCP, targeted accessibility, production static CSP, offline/recovery, and low-bandwidth performance.

The same workflow logged a 20-session synthetic concurrency lab: **4 accepted, 16 concurrency-limited, 4 provider calls, 0 automatic retries, 0 cross-session canary leakage**. This is local CI, not staging or internet-scale capacity.

## Private context — phase 036

SUTRA now has an explicit host-owned side channel rather than implicit prompt forwarding:

- exact peer URL **and** network identity bind a grant;
- `toPeer` and `toCaller` permissions are independent;
- wildcard grants and unsafe/accessor-backed values are rejected;
- default forwarding is empty;
- the same network name at another origin inherits no grant;
- the Chromium fixture sends an allowed non-secret `locale` only to the exact peer model boundary;
- the private canary is absent from peer artifact requests, peer/local prompts where unapproved, runtime events and exported execution receipts;
- a peer-returned private field appears only under a separate caller-owned return grant.

Residual limitation: ordinary delegated text is not a secret classifier. If a user types a secret into ordinary request text, the private-context policy cannot magically remove it.

## Host containment of untrusted peer instructions — phase 038

Every caller-local peer model call receives a host-owned security boundary after public peer instructions. Tests include public hostile instructions asking the model to leak caller fields, change model, perform external writes and call an unapproved destination.

The public attack marker reaches the model, proving the hostile input is present, while the private canary does not. More importantly, runtime policy—not prompt wording—continues to reject nested remote peers, arbitrary MCP, coded tools, REST/write surfaces, graph-declared private allow blocks and peer model overrides.

This is defense in depth. It is **not** a claim of universal prompt-injection immunity.

## Read-only MCP — phase 039

The real-browser loopback MCP fixture now demonstrates all required controlled-path states:

1. approved discovery + call returns an exact source-backed synthetic catalog excerpt;
2. discovery of an unapproved/destructive tool fails before `tools/call`;
3. a real held-open HTTP response crosses the fixed five-second operation deadline and is aborted without fallback;
4. discovery denial sends zero POSTs;
5. call denial sends no `tools/call`;
6. browser CORS failure fails closed;
7. cookies, model authorization and fake BYOK canaries never enter the MCP request.

This is a controlled source-backed compatibility service, not a third-party production publisher, OAuth/session/SSE compatibility claim or public HTTPS deployment.

## Learner states and optional execution inspector

The visible peer workbench now distinguishes idle, loading, awaiting consent, completed, denied, cancelled, invalid-input and error states. Technical execution detail is behind an optional inspector rather than the main learner path.

The inspector reports only bounded public metadata:

- scripted/no-live-provider router identity;
- agent invocations / 12 limit;
- model calls / 8 limit;
- canonical runtime tool names;
- elapsed time / 60-second hard limit;
- approved external operation count;
- sanitized caller/peer events.

Raw prompts, tool arguments/results and credentials remain excluded from UI/export. Denial/error restores keyboard focus to the initiating control.

## Media, transcript and evidence seek

The player path now has direct browser evidence for:

- missing MP4 and explicit manual retry;
- HTTP 200 with stale/wrong media bytes rejected by SHA-256 before player mount;
- independently missing poster while valid video remains usable;
- native play/pause;
- mute/unmute and native volume change;
- caption-track activation;
- fullscreen enter/exit through actual player controls;
- finite-range native seek and observed currentTime;
- live/unknown-duration, empty/gapped and invalid seek ranges failing honestly.

Transcript search is available **before video transfer**. Clicking a cue before media load reports unavailable seek and does not autoload the MP4.

## Accessibility

Targeted Chromium automation passed:

- unique IDs and accessible names;
- keyboard order and modal focus restoration;
- live-region discipline;
- sampled text contrast >=4.5:1;
- reduced-motion preference;
- >=24 px core target sizes;
- 200% Chromium CSS zoom without horizontal clipping;
- 360 px layout without horizontal overflow.

Chromium Headless version observed in CI: **151.0.7922.34**. Physical touch hardware and human screen-reader testing remain open and are not inferred from emulation.

## Ambiguous local writes — phase 062

The local review action now preserves three distinct receipts:

- `completed`: local storage returned success;
- `rejected`: known rejection before success;
- `unknown`: an exception occurred after a write may already have happened.

The browser tests inject both quota rejection and “write side effect then exception.” Unknown state is not retried automatically; later reload may reveal the prior side effect. The attempt receipt preserves the approved request ID and exact evidence receipt while excluding unrelated prompt/key fields.

This is local browser persistence, not a hosted integration-write claim.

## Inference proxy hardening — phase 063

The Worker inference path now combines:

- fixed upstream destination;
- caller/provider model allowlist and fixed `approvedModel`;
- request/message/tool/output ceilings;
- server-only provider key;
- HMAC client identity quota beyond Origin checks;
- global/client daily quotas;
- active paid-call leases with default **2 concurrent** and hard max 10;
- 45-second stale lease pruning;
- release on completion, cancellation and provider failure;
- no provider retries and no daily-quota refund after admitted provider work;
- global kill switch.

A direct non-browser request spoofing the allowed Origin still hits the client quota. Forbidden/disabled calls make zero provider requests.

A full synthetic integration test exercises the **real browser provider adapter contract -> same-origin inference handler -> synthetic provider SSE -> multi-agent runtime**: two agents, three provider model calls, three reserve/release cycles, fixed `operator-approved` model and no server-key disclosure.

A separate test drops the caller-to-proxy connection on the second delegated model call. The run fails incomplete, the lost client request makes no second quota reservation, and only a fresh explicit retry completes.

No paid provider was contacted.

## Browser security policy — phase 064

The static learner is protected at the static-asset layer by `apps/sutra/public/_headers`, because `run_worker_first` is intentionally restricted to `/api/*`. API responses receive the same baseline policy from Worker code.

The tested default policy includes same-origin scripts/connects, no objects/frames, no referrer, nosniff, DENY framing, restricted Permissions-Policy and COOP. The built-bundle audit finds no remote advertising/analytics script/link surface.

Chromium loads the built learner under the actual static header policy, runs local graph/media features, then attempts an unexpected third-party script and fetch. Both produce CSP violations and **zero third-party responses**.

Default external peer origins remain empty. A future approved public peer must be deliberately added to the static connect policy and retested.

Residual exposure: same-origin JavaScript remains privileged over same-origin browser state; the current build does not persist BYOK credentials in browser storage.

## Resilience — phase 061

Observed failure/recovery cases include:

- offline startup;
- network loss during local graph artifact loading;
- network loss during an actual delegated provider-mode model run;
- missing media;
- missing poster;
- stale media bytes;
- 404/malformed peer manifest;
- malformed peer graph;
- nonresponsive peer timeout.

Failures name the affected capability and do not produce a completed/live result. Loaded local evidence remains useful where possible. Recovery is explicit and user/fresh-run initiated; there is no automatic retry that can duplicate model spend or action writes.

Deterministic/scripted behavior remains visibly labelled scripted and is never presented as live inference.

## Performance — phase 067

Exact measured profile is recorded in [PERFORMANCE-2026-11-24.md](PERFORMANCE-2026-11-24.md).

At 1 Mbps down/up and 150 ms latency in Chromium Headless:

- gzip shell: **393,302 bytes**;
- transcript usable: **1,378 ms**;
- MP4 requests before explicit media action: **0**;
- video ready after click: **3,448 ms**;
- incremental encoded transfer after video action: **380,480 bytes**;
- native seek feedback: **64 ms**.

The <=700 KiB shell and <5 s transcript targets passed in this lab profile. These numbers are not field/mobile/CDN measurements.

## Cache/version and browser retention

The graph manifest now points to retained physical content-versioned graph files under `/agents/v/<git-blob>/...`. CI recomputes the canonical graph Git blob identity and verifies the versioned copy is byte-identical.

Policy split:

- content-hashed JS/CSS and physical versioned graphs: immutable;
- HTML, manifests, links and mutable aliases: revalidate;
- inference/API responses: no-store;
- media: explicit source-version query plus receipt SHA-256 before player mount; static media remains revalidated rather than claiming immutable filename semantics.

A first-party source audit permits browser persistence only through the explicit local review controller. No sessionStorage, IndexedDB or first-party cookie store is used by the SUTRA runtime/inference/consent packages.

Full rollout retention and BYOK deletion remain open because there is no released multi-version deployment and no browser-stored BYOK feature.

## Cloudflare shared-capacity read-only audit

Read-only connected-account evidence is recorded in [CLOUDFLARE-CAPACITY-2026-11-24.md](CLOUDFLARE-CAPACITY-2026-11-24.md).

For 17–23 Nov UTC, Workers observability returned **532,550 events**:

- `patro`: 485,860 (~91.2%);
- `patro-date-pages`: 30,110;
- `aafnai-library-phase1`: 16,580.

The account returned 49 Worker scripts and 35 Worker custom domains; no SUTRA domain was present. Billing usage could **not** be read because the connector OAuth grant lacks Billing Read, so exact plan tier, billed request count and remaining headroom are unknown.

The repository keeps static SUTRA requests outside Worker-first routing and invokes Worker code only for `/api/*`. This is configuration evidence, not production traffic proof.

## 20-session laboratory concurrency

The local direct-handler lab holds admitted provider streams open while all 20 sessions request service:

- 4 accepted under the test ceiling;
- 16 rejected by active concurrency;
- 4 provider calls;
- 0 provider retries;
- unique session canaries do not cross payloads;
- active leases return to zero after streams finish.

This is deliberately synthetic CI and not staging, live-model or internet-scale capacity.

## Retained intermediate failures

No failed run is counted as evidence. Important failures/fixes from this session:

- private-context nested-message assertion incorrectly searched escaped JSON; direct message-content assertion replaced it;
- hostile peer fixture mistakenly placed the private canary in public peer instructions; split into a public attack marker and private canary;
- hidden inspector state was read with visibility-sensitive `innerText`; corrected to `textContent`;
- accessibility audit assumed input `textContent` was non-null;
- fullscreen exit via Escape was unreliable in headless Chromium; test now uses the actual fullscreen control;
- MCP/provider quota fixtures initially lacked lease-aware response contracts;
- CSP test initially ran through an unnecessary Vite preview and Fetch-forbidden port; replaced by a static dist server;
- CSP proof initially equated Playwright request events with network transport; final proof uses CSP violations plus zero responses;
- review-attempt test expected mutation inside a strict evidence receipt to be stripped; policy correctly rejects mutated receipts;
- load lab first omitted required `stream:true`, then used nonserialized storage and immediately completed streams; final lab serializes transaction fixtures and holds admitted streams open;
- graph versioning first used only query strings, then was strengthened to retained physical content-version paths;
- peer inspector test guessed display tool names rather than canonical runtime names.

## Checklist consequence

This final session credits only checks supported by the exact tested revision and dated read-only Cloudflare audit. Synthetic checks are not substituted for external/human requirements.

Final intended register after reconciliation: **358 / 1,000 verified checks; 25 / 100 phases complete.**

Newly closed phases in the final reconciliation beyond the earlier partial checkpoint:

- 038 — untrusted peer containment
- 043 — evidence-to-native-seek
- 061 — missing/broken dependency resilience
- 062 — ambiguous local action outcomes
- 063 — inference proxy hardening
- 064 — tested-build browser security policy
- 067 — low-bandwidth performance

Already closed earlier in session 0010: 036 and 039.

## Major gates still open

- rights-cleared original lesson/video and written guide;
- human factual reviewer and real semantic comparison evidence;
- physical touch device + human screen-reader acceptance;
- public HTTPS caller/peer origins and independent publisher/adoption;
- real external production MCP compatibility/auth;
- paid provider/model budget approval and small capped live test;
- Cloudflare billing/request headroom with sufficient account permission;
- final SUTRA hostname/route precedence and real production static-vs-Worker request sample;
- multi-version deployment/rollback evidence;
- participant/user testing and challenge eligibility evidence;
- release, promotion, ZIP and Devpost submission.

The participant release gate remains unchanged.
