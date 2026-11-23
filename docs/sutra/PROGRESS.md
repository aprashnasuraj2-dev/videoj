# SUTRA progress register

[Checklist](CHECKLIST.md) | [Machine state](progress.json) | [Sessions](SESSIONS.md)

## Session 0008 checkpoint — 2026-11-23

**203 / 1,000 verified checks; 12 phases complete.** Phase 032 remains closed. Phase 033 is one uncredited exit check from completion; phase 039 is partially verified only against a synthetic read-only MCP fixture.

**Observed:** The exact code candidate `e2766f1ca8bc1b09d2495af977f749e4a8317de1` passed [GitHub Actions](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45178921845/job/137707320526), including SUTRA app/runtime tests, pinned upstream checks and four Chromium integration scripts. A separate-loopback-origin MCP server accepted only JSON-RPC 2025-06-18 read-public discovery/call traffic. Tests observed **zero external POSTs on denied discovery**, zero tool calls after call denial, four credentialless approved RPCs and a browser CORS rejection that did not claim success. No real outside service was contacted.

**Implemented:** `thirdPartyMcp` host injection requires exact `/mcp` URL and reusable inspector, narrow read-only tool schema, 32 KiB response cap and disabled cookies/redirects. Discovery and calls each receive independent consent; failure aborts the invoking run. The untrusted result is labelled unverified.

**Not verified:** actual third-party publisher rights/availability, full streaming/session-based MCP compatibility, real provider/BYOK secret isolation, production HTTPS CORS and factual truth. A later same-page browser case confirming the original video/evidence remains usable after denied MCP contact is still awaiting an observed passing run; keep `SUTRA-P033-10` pending.

**Next:** observe the additional browser case and only then close phase 033 if green; identify an approved real public-read MCP service for bounded compatibility/timeouts; continue `SUTRA-P035-05` credential canaries. No public release, paid inference, domain/route assignment, final ZIP or Devpost filing. [Session evidence](evidence/implementation/SESSION-0008.md). Development remains [draft PR #49](https://github.com/aprashnasuraj2-dev/videoj/pull/49).

---

## Session 0007 checkpoint (historical) — 2026-11-23

**196/1,000 checks verified; 12 phases complete.** Phase 032 (exact peer resolution and invoking-network errors) closes. Phase 035 caller-local peer execution advances eight checks, but its credential-canary and exit gates remain open.

The strict host requires `peerRuntime.inspector` before accepting exact external network references. Two individually consented credentialless artifact GETs load the published manifest and graph, and the graph executes **locally** using the caller's injected model, shared model/agent budgets, deadline and sanitized event stream. Wrong-name, denied, unavailable-manifest, unavailable-graph and malformed-peer conditions stop the invoking network with specific error codes; no model-summarized success is accepted.

**Observed green evidence:** [CI 45176985173](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45176985173/job/137700681281) tested code candidate `3b37a73db0a03577b81f3d34346ea70ff46ea0a5`. The run passed 21 learner-app tests, 37 consent/inference/source/API tests, 72 runtime tests, 7 independent peer-package tests, all 10 pinned reference hashes, and all three Chromium browser scripts. The new Chromium run used two distinct **loopback** origins; denial sent zero peer requests, approval sent precisely manifest and graph GETs, and peer delegation used three caller-local agents and five scripted model steps. [Detailed evidence and retained failures](evidence/implementation/SESSION-0007.md).

**Still open:** real provider credential-canary and BYOK boundary (`SUTRA-P035-05`), third-party MCP discovery/call consent (`SUTRA-P033-03`), real HTTPS/CORS on staging and separate public peer, rights-cleared learner corpus, factual review and eligible participant testing. The proposed peer origin remains same-project-owner rather than demonstrated independent adoption.

**Next:** implement `SUTRA-P033-03` through a read-only external MCP transport injected into the host, with separate discovery and actual call approval, bounded result validation and denial-before-transport tests. Then close synthetic credential-canary checks before considering phase 035 exit. Do **not** move to public release, route/domain assignment, paid inference, promotional materials or Devpost submission before major gates have fresh evidence.

Development branch: [draft PR #49](https://github.com/aprashnasuraj2-dev/videoj/pull/49). No public SUTRA deployment.

---

## Session 0006 checkpoint (historical)

**186/1,000 checks verified**; eleven phases complete. Phase 058 (reusable peer-consent
inspector) is closed. Phase 032 exact peer loading and phase 033 consent are materially
advanced but intentionally remain open.

Implemented `packages/sutra-consent/`: a framework-neutral default-deny policy,
explicit one-contact/session scope, public origin/purpose/disclosure display, redacted
events and a bounded credentialless JSON helper. The learner now exposes a consent
preview, and a separate plain-browser example proves the component runs outside the
learner app, DHAGO player and SUTRA corpus.

Added a data-only Profile 0.3 peer artifact loader. It derives the site base from the
peer-network URL, loads the manifest only after approval, selects the exact network
name, resolves the declared graph and requires a separate approval when that graph is
on another origin. Query/fragment/trailing-slash ambiguity, missing/duplicate names,
executable metadata and malformed graphs fail closed. Redirects remain deliberately
blocked until phase 037 defines changed-origin handling.

## Observed checks

Final code candidate `70fe330b92dc22ba3dd9fc60cc3166c1d7ae42d7` passed:

- production app build and app tests;
- 37 consent/inference/source/API tests;
- 65 runtime/loader/source-MCP tests;
- all ten pinned upstream module hashes;
- learner Chromium with consent denial/session scope, prior evidence/runtime/media
  behavior, 360 px no-overflow and no external requests;
- standalone consent-example Chromium with denial-before-transport and exact remembered
  session approval.

Intermediate CI failures are retained in
[evidence/implementation/SESSION-0006.md](evidence/implementation/SESSION-0006.md).
They were test-fixture/assertion failures and were not counted as passing evidence.

## Independent peer package

Added zero-dependency `apps/sutra-peer/` with its own static build, human guide page,
exact `checklist` manifest/graph, narrow `source_select` helper and explicit links map.
The local preview and real consent-aware loader integration passed in CI on
`4acb6e1aeddcba3bbf44b240069a4afe5a0f4ceb`. P031-03 remains open for actual
rights-cleared corpus provenance; P031-10 remains open for a distinct public HTTPS
origin. The proposed caller/peer origins are disclosed as same-project-owner and do
not demonstrate independent adoption.

## Boundaries still open

No real second HTTPS peer origin has been published or contacted. Cross-origin CORS,
caller-local peer execution, third-party MCP discovery/call consent, redirect
re-consent, private-context peer canaries and router inheritance remain unverified.
Consent visibility does not prove publisher trust, factual truth or independent
adoption. Phase 025 model selection/live keyless visitor also remains open.

## Public release gate

User direction remains unchanged: no public release until all applicable major
checklist product/security/conformance/acceptance gates are complete with current
evidence. Public routes, public inference, promotion and official submission stay
closed. The prior Wrangler dry-run is packaging evidence only.

## Historical session 0006 resume

Next independent engineering queue:

1. `SUTRA-P032-08` — preserve a specific peer-load failure through the invoking
   network rather than only the loader API.
2. `SUTRA-P033-03` — connect the consent boundary to third-party MCP discovery and
   calls; phase 039 still requires an authorized read-only endpoint and real browser
   behavior.
3. `SUTRA-P035-01` — instantiate the already validated peer data in the caller runtime
   once the failure/consent path is preserved.

Original media/rights/factual reviewer, entrant eligibility, approved live-model
spend, consenting learners/builders/devices, public release, final ZIP and Devpost
filing remain pending.

[Final consent/loader workflow](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45145022530/job/137592064940). [Final independent-peer workflow](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45146010597/job/137595359493).
No public release is implied.
