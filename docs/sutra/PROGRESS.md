# SUTRA progress register

[Checklist](CHECKLIST.md) | [Machine state](progress.json) | [Sessions](SESSIONS.md)

## Session 0006 checkpoint

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

## Resume

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
